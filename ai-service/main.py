"""
CV Processing API  –  FastAPI Application
==========================================

Endpoints
---------
POST /parse-cv      Extract and structure a CV from uploaded file.
POST /match-job     Compute semantic similarity between CV text and JD.
GET  /health        Liveness probe.
POST /ocr/upload    Raw OCR (PP-OCRv5 bounding boxes) — kept for editor.

Run
---
    cd ai-service
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import Body, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    DetectedSectionModel,
    ErrorResponse,
    MatchJobRequest,
    MatchJobResponse,
    ParseOCRBlocksRequest,
    OCRUploadResponse,
    ParseCVResponse,
    OCRProcessingTimingsModel,
    StructuredOCRBlockModel,
    UploadCVResponse,
)
from services.cv_parser import parse_cv
from services.cv_layout_parser import parse_structured_cv_from_ocr
from services.ocr_pipeline import InvalidCVFormatError, OCRPipelineError, process_cv, run_ppocrv5

# ── Logging ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cv-processing")


# ── Lifespan ─────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    import urllib.request, urllib.error
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        with urllib.request.urlopen(f"{ollama_url}/api/tags", timeout=3):
            logger.info("✅ Ollama is reachable at %s", ollama_url)
    except Exception:
        logger.warning("⚠️  Ollama not found at %s – start it with 'ollama serve'", ollama_url)
    yield
    logger.info("🛑 Shutting down")


# ── App factory ───────────────────────────────────────────────

app = FastAPI(
    title="CV Processing API",
    description="AI-powered CV parsing (PP-OCRv5 / PP-StructureV3) and job-matching (Ollama).",
    version="3.0.0",
    lifespan=lifespan,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _global_exception_handler(request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="Internal server error", detail=str(exc)).model_dump(),
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  GET /health                                                 ║
# ╚══════════════════════════════════════════════════════════════╝

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "cv-processing-api", "version": "3.0.0"}


# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /parse-cv                                              ║
# ╚══════════════════════════════════════════════════════════════╝

MAX_FILE_SIZE_MB = 15

ALLOWED_CV_TYPES = {
    "application/pdf",
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@app.post(
    "/parse-cv",
    response_model=ParseCVResponse,
    tags=["cv"],
    summary="Parse a CV (PDF / image / DOCX) into structured JSON",
    responses={400: {"model": ErrorResponse}},
)
async def endpoint_parse_cv(
    file: UploadFile = File(..., description="CV file: PDF, PNG, JPG, or DOCX"),
):
    """
    Upload a CV and receive:
    - **raw_text** – extracted text (pre-normalization)
    - **clean_text** – LLM-normalized text
    - **cv_json** – structured data dict
    - **avatar_url** – data-URI of the detected avatar (PDF only)

    Routing:
    - **PDF** → pdfplumber text layer (+ RapidOCR fallback for scanned PDFs)
    - **Image** → RapidOCR sorted by bbox position
    - **DOCX** → python-docx
    """
    ct = (file.content_type or "").lower()
    fname = file.filename or ""
    ext = os.path.splitext(fname)[-1].lower()

    is_known_type = ct in ALLOWED_CV_TYPES or ext in {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".docx"}
    if not is_known_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Accepted: PDF, PNG, JPG, WEBP, DOCX.",
        )

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB.",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    start = time.perf_counter()
    try:
        result = parse_cv(file_bytes, content_type=ct, filename=fname)
    except Exception as exc:
        logger.exception("CV parsing failed")
        raise HTTPException(status_code=500, detail=f"Failed to parse CV: {exc}") from exc

    elapsed = time.perf_counter() - start
    word_count = len((result.get("raw_text") or "").split())
    logger.info("Parsed CV – %d words extracted in %.2fs", word_count, elapsed)

    return ParseCVResponse(**result)


# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /match-job                                             ║
# ╚══════════════════════════════════════════════════════════════╝

@app.post(
    "/match-job",
    response_model=MatchJobResponse,
    tags=["matching"],
    summary="Compute CV ↔ Job Description similarity",
)
async def endpoint_match_job(payload: MatchJobRequest):
    start = time.perf_counter()
    try:
        from services.job_matcher import match_cv_to_job
        match_pct, missing, common = match_cv_to_job(
            cv_text=payload.cv_text,
            job_description=payload.job_description,
        )
    except Exception as exc:
        logger.exception("Job matching failed")
        raise HTTPException(status_code=500, detail=f"Matching failed: {exc}") from exc

    elapsed = time.perf_counter() - start
    logger.info("Match – %.1f%% similarity in %.2fs", match_pct, elapsed)

    return MatchJobResponse(
        success=True,
        match_percentage=match_pct,
        missing_keywords=missing,
        common_keywords=common,
        model_used=f"ollama/{os.getenv('OLLAMA_CV_SUGGEST_MODEL', 'qwen3:4b')}",
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /ocr/upload  (raw OCR for editor overlay)             ║
# ╚══════════════════════════════════════════════════════════════╝

MAX_OCR_SIZE_MB = 10

ALLOWED_OCR_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}


def _validate_upload_bytes(
    file_bytes: bytes,
    max_size_mb: int,
    allowed: set[str],
    content_type: str,
    filename: str,
    allowed_exts: set[str],
) -> tuple[str, str]:
    ct = (content_type or "").lower()
    fname = filename or ""
    ext = os.path.splitext(fname)[-1].lower()

    is_known = ct in allowed or ext in allowed_exts
    if not is_known:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Accepted: PNG, JPG, WEBP, PDF.",
        )

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {max_size_mb} MB.",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return ct, ext


def _run_ocr_pipeline(
    file_bytes: bytes,
    content_type: str,
    filename: str,
    min_confidence: float,
    apply_llm_correction: bool,
):
    del apply_llm_correction
    result = run_ppocrv5(
        file_bytes,
        content_type=content_type,
        filename=filename,
        min_confidence=min_confidence,
    )
    return result["pages"]


def _build_page_results_from_blocks(blocks: list) -> list:
    from services.ocr_service import OCRBlock, OCRPageResult

    pages_by_number: dict[int, list] = {}
    for block in blocks:
        page_number = int(getattr(block, "page", 1) or 1)
        pages_by_number.setdefault(page_number, []).append(block)

    page_results: list[OCRPageResult] = []
    for page_number in sorted(pages_by_number):
        block_models = pages_by_number[page_number]
        page_blocks: list[OCRBlock] = []
        image_width = 1000
        image_height = 1400

        for block_model in block_models:
            rect = getattr(block_model, "rect", {}) or {}
            rect_x = float(rect.get("x", 0.0))
            rect_y = float(rect.get("y", 0.0))
            rect_w = float(rect.get("width", 0.0))
            rect_h = float(rect.get("height", 0.0))
            x1 = int((rect_x / 100.0) * image_width)
            y1 = int((rect_y / 100.0) * image_height)
            x2 = int(((rect_x + rect_w) / 100.0) * image_width)
            y2 = int(((rect_y + rect_h) / 100.0) * image_height)
            page_blocks.append(
                OCRBlock(
                    text=block_model.text,
                    bbox=[[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                    confidence=float(getattr(block_model, "confidence", 1.0) or 1.0),
                    page=page_number,
                    rect_x=rect_x,
                    rect_y=rect_y,
                    rect_w=rect_w,
                    rect_h=rect_h,
                )
            )

        page_results.append(
            OCRPageResult(
                page=page_number,
                image_width=image_width,
                image_height=image_height,
                blocks=page_blocks,
            )
        )

    return page_results


def _build_upload_cv_response(page_results, parsed: dict, elapsed: float, warnings: list[str]) -> UploadCVResponse:
    from models import OCRBlockModel, OCRPageModel

    total_blocks = sum(len(page.blocks) for page in page_results)
    column_lookup: dict[tuple[int, float, float, float, float], str] = {}
    for column_name in ("left", "right", "full_width"):
        for item in parsed["layout"].get("columns", {}).get(column_name, []):
            rect = item.get("rect", {})
            key = (
                int(item.get("page", 1)),
                round(float(rect.get("x", 0.0)), 3),
                round(float(rect.get("y", 0.0)), 3),
                round(float(rect.get("width", 0.0)), 3),
                round(float(rect.get("height", 0.0)), 3),
            )
            column_lookup[key] = column_name

    pages_out: list[OCRPageModel] = []
    for page_result in page_results:
        pages_out.append(
            OCRPageModel(
                page=page_result.page,
                image_width=page_result.image_width,
                image_height=page_result.image_height,
                blocks=[
                    OCRBlockModel(
                        text=block.text,
                        bbox=block.bbox,
                        confidence=block.confidence,
                        page=block.page,
                        column=column_lookup.get(
                            (
                                int(block.page),
                                round(block.rect_x, 3),
                                round(block.rect_y, 3),
                                round(block.rect_w, 3),
                                round(block.rect_h, 3),
                            )
                        ),
                        rect={
                            "x": block.rect_x,
                            "y": block.rect_y,
                            "width": block.rect_w,
                            "height": block.rect_h,
                        },
                    )
                    for block in page_result.blocks
                ],
            )
        )

    detected_sections = [
        DetectedSectionModel(**section)
        for section in parsed["detected_sections"]
    ]

    return UploadCVResponse(
        success=True,
        extraction_method="ocr_layout",
        ocr_provider="",
        page_count=len(pages_out),
        total_blocks=total_blocks,
        blocks=[],
        pages=pages_out,
        elapsed_seconds=round(elapsed, 3),
        timings=OCRProcessingTimingsModel(total_seconds=round(elapsed, 3)),
        warnings=warnings,
        data=parsed["data"],
        detected_sections=detected_sections,
        builder_sections=parsed["builder_sections"],
        layout=parsed["layout"],
        markdown_pages=[],
        raw_text=parsed["raw_text"],
    )


def _build_upload_cv_response_from_pipeline(result: dict[str, object], warnings: list[str]) -> UploadCVResponse:
    from models import OCRBlockModel, OCRPageModel

    page_results = result["page_results"]
    pages_out: list[OCRPageModel] = []
    for page_result in page_results:
        pages_out.append(
            OCRPageModel(
                page=page_result.page,
                image_width=page_result.image_width,
                image_height=page_result.image_height,
                blocks=[
                    OCRBlockModel(
                        text=block.text,
                        bbox=block.bbox,
                        confidence=block.confidence,
                        page=block.page,
                        rect={
                            "x": block.rect_x,
                            "y": block.rect_y,
                            "width": block.rect_w,
                            "height": block.rect_h,
                        },
                    )
                    for block in page_result.blocks
                ],
            )
        )

    detected_sections = [DetectedSectionModel(**section) for section in result["detected_sections"]]
    structured_blocks = [StructuredOCRBlockModel(**block) for block in result["blocks"]]

    return UploadCVResponse(
        success=True,
        extraction_method=str(result["extraction_method"]),
        ocr_provider=str(result["ocr_provider"]),
        page_count=int(result["page_count"]),
        total_blocks=int(result["total_blocks"]),
        blocks=structured_blocks,
        pages=pages_out,
        elapsed_seconds=float(result["timings"]["total_seconds"]),
        timings=OCRProcessingTimingsModel(**result["timings"]),
        warnings=warnings,
        data=result["data"],
        detected_sections=detected_sections,
        builder_sections=result["builder_sections"],
        layout=result["layout"],
        markdown_pages=result["markdown_pages"],
        raw_text=str(result["raw_text"]),
    )


@app.post(
    "/upload-cv",
    response_model=UploadCVResponse,
    tags=["cv"],
    summary="PP-OCRv5 + PP-StructureV3 CV extraction in one pass",
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def endpoint_upload_cv(
    file: UploadFile = File(...),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
):
    file_bytes = await file.read()
    ct, _ = _validate_upload_bytes(
        file_bytes=file_bytes,
        max_size_mb=MAX_OCR_SIZE_MB,
        allowed={"image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf", "application/octet-stream"},
        content_type=file.content_type or "",
        filename=file.filename or "",
        allowed_exts={".png", ".jpg", ".jpeg", ".webp", ".pdf"},
    )

    start = time.perf_counter()
    warnings: list[str] = []

    try:
        pipeline_result = process_cv(
            file_bytes=file_bytes,
            content_type=ct,
            filename=file.filename or "",
            min_confidence=min_confidence,
        )
    except InvalidCVFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OCRPipelineError as exc:
        logger.error("Upload CV OCR pipeline error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Upload CV pipeline failed")
        raise HTTPException(status_code=500, detail=f"Failed to process CV: {exc}") from exc

    elapsed = time.perf_counter() - start
    if elapsed > 2.0:
        warnings.append(f"Processing took {elapsed:.1f}s (target < 2s).")
    return _build_upload_cv_response_from_pipeline(
        result=pipeline_result,
        warnings=warnings,
    )


@app.post(
    "/parse-ocr-blocks",
    response_model=UploadCVResponse,
    tags=["cv"],
    summary="Re-parse edited OCR blocks into structured CV sections",
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def endpoint_parse_ocr_blocks(
    payload: ParseOCRBlocksRequest = Body(...),
):
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="Missing OCR blocks.")

    start = time.perf_counter()
    warnings: list[str] = []

    try:
        page_results = _build_page_results_from_blocks(payload.blocks)
        parsed = parse_structured_cv_from_ocr(page_results)
    except RuntimeError as exc:
        logger.error("Parse OCR blocks pipeline error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Parse OCR blocks failed")
        raise HTTPException(status_code=500, detail=f"Failed to parse OCR blocks: {exc}") from exc

    elapsed = time.perf_counter() - start
    if elapsed > 2.0:
        warnings.append(f"Re-parse took {elapsed:.1f}s (target < 2s).")

    return _build_upload_cv_response(
        page_results=page_results,
        parsed=parsed,
        elapsed=elapsed,
        warnings=warnings,
    )


@app.post(
    "/ocr",
    response_model=OCRUploadResponse,
    tags=["ocr"],
    include_in_schema=False,
)
@app.post(
    "/ocr/upload",
    response_model=OCRUploadResponse,
    tags=["ocr"],
    summary="PP-OCRv5: detect and return text-region bounding boxes",
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def endpoint_ocr_upload(
    file: UploadFile = File(...),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
):
    file_bytes = await file.read()
    ct, _ = _validate_upload_bytes(
        file_bytes=file_bytes,
        max_size_mb=MAX_OCR_SIZE_MB,
        allowed={"image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf", "application/octet-stream"},
        content_type=file.content_type or "",
        filename=file.filename or "",
        allowed_exts={".png", ".jpg", ".jpeg", ".webp", ".pdf"},
    )

    start = time.perf_counter()
    warnings: list[str] = []

    try:
        from models import OCRBlockModel, OCRPageModel
        page_results = _run_ocr_pipeline(
            file_bytes=file_bytes,
            content_type=ct,
            filename=file.filename or "",
            min_confidence=min_confidence,
            apply_llm_correction=False,
        )

    except InvalidCVFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OCRPipelineError as exc:
        logger.error("OCR pipeline error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("OCR inference failed")
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}") from exc

    elapsed = time.perf_counter() - start
    total_blocks = sum(len(p.blocks) for p in page_results)
    logger.info("OCR done – %d page(s), %d blocks in %.2fs", len(page_results), total_blocks, elapsed)

    if elapsed > 2.0:
        warnings.append(f"Processing took {elapsed:.1f}s (target < 2s).")

    pages_out: list[OCRPageModel] = []
    for pr in page_results:
        blocks_out = [
            OCRBlockModel(
                text=b.text,
                bbox=b.bbox,
                confidence=b.confidence,
                page=b.page,
                rect={"x": b.rect_x, "y": b.rect_y, "width": b.rect_w, "height": b.rect_h},
            )
            for b in pr.blocks
        ]
        pages_out.append(OCRPageModel(page=pr.page, image_width=pr.image_width, image_height=pr.image_height, blocks=blocks_out))

    return OCRUploadResponse(
        success=True,
        page_count=len(pages_out),
        total_blocks=total_blocks,
        pages=pages_out,
        elapsed_seconds=round(elapsed, 3),
        warnings=warnings,
    )


# ── Entry point ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
