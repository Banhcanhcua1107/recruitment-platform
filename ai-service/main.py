"""
CV Processing API  –  FastAPI Application
==========================================

Endpoints
---------
POST /parse-cv      Extract and structure a CV from an uploaded PDF.
POST /match-job     Compute semantic similarity between CV text and a JD.
GET  /health        Liveness probe.

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

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    ErrorResponse,
    MatchJobRequest,
    MatchJobResponse,
    OCRUploadResponse,
    ParseCVResponse,
)
from services.cv_parser import parse_cv
# job_matcher uses lazy imports for heavy ML libs (Python 3.14 compat)

# ── Logging ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cv-processing")


# ── Lifespan (warm-up model on startup) ─────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: verify Ollama connectivity (non-blocking)."""
    import urllib.request, urllib.error
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        with urllib.request.urlopen(f"{ollama_url}/api/tags", timeout=3):
            logger.info("✅ Ollama is reachable at %s", ollama_url)
    except Exception:
        logger.warning(
            "⚠️  Ollama not found at %s – start it with 'ollama serve'", ollama_url
        )
    yield
    logger.info("🛑 Shutting down")


# ── App factory ──────────────────────────────────────────────

app = FastAPI(
    title="CV Processing API",
    description=(
        "AI-powered CV parsing (pdfplumber + Ollama qwen3-vl:4b) "
        "and job-matching (Ollama qwen3:4b)."
    ),
    version="2.0.0",
    lifespan=lifespan,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

# CORS – allow the Next.js frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ────────────────────────────────

@app.exception_handler(Exception)
async def _global_exception_handler(request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc),
        ).model_dump(),
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  GET /health                                                 ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "cv-processing-api"}


# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /parse-cv                                              ║
# ╚══════════════════════════════════════════════════════════════╝


MAX_PDF_SIZE_MB = 10


@app.post(
    "/parse-cv",
    response_model=ParseCVResponse,
    tags=["cv"],
    summary="Parse a PDF CV into structured JSON",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file"},
    },
)
async def endpoint_parse_cv(
    file: UploadFile = File(..., description="PDF file of the CV"),
):
    """
    Upload a CV in PDF format.

    - Extracts text via **pdfplumber**.
    - Falls back to **Ollama qwen3-vl:4b** OCR if the PDF is image-based / scanned.
    - Returns a fully structured JSON representation.
    """
    # ── Validate file type ───────────────────────────────────
    allowed_types = (
        "application/pdf", 
        "application/octet-stream",
        "image/jpeg",
        "image/png",
        "image/webp"
    )
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Expected a PDF or Image file, received '{file.content_type}'.",
        )

    # ── Read & size-check ────────────────────────────────────
    pdf_bytes = await file.read()
    size_mb = len(pdf_bytes) / (1024 * 1024)
    if size_mb > MAX_PDF_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_PDF_SIZE_MB} MB.",
        )

    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Parse ────────────────────────────────────────────────
    start = time.perf_counter()
    try:
        parsed_cv, method, page_count, warnings = parse_cv(
            pdf_bytes, 
            content_type=file.content_type
        )
    except Exception as exc:
        logger.exception("CV parsing failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse CV: {exc}",
        ) from exc

    elapsed = time.perf_counter() - start
    logger.info(
        "Parsed CV (%s) – %d pages, %d words in %.2fs",
        method.value,
        page_count,
        len(parsed_cv.raw_text.split()),
        elapsed,
    )

    return ParseCVResponse(
        success=True,
        extraction_method=method,
        data=parsed_cv,
        page_count=page_count,
        warnings=warnings,
    )


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
    """
    Accepts **cv_text** and **job_description**, encodes them with
    `all-MiniLM-L6-v2`, and returns:

    - **match_percentage** – cosine similarity scaled to 0–100 %.
    - **missing_keywords** – JD keywords absent from the CV.
    - **common_keywords** – keywords found in both texts.
    """
    start = time.perf_counter()
    try:
        from services.job_matcher import match_cv_to_job

        match_pct, missing, common = match_cv_to_job(
            cv_text=payload.cv_text,
            job_description=payload.job_description,
        )
    except Exception as exc:
        logger.exception("Job matching failed")
        raise HTTPException(
            status_code=500,
            detail=f"Matching failed: {exc}",
        ) from exc

    elapsed = time.perf_counter() - start
    logger.info(
        "Match complete – %.1f%% similarity, %d missing keywords in %.2fs",
        match_pct,
        len(missing),
        elapsed,
    )

    return MatchJobResponse(
        success=True,
        match_percentage=match_pct,
        missing_keywords=missing,
        common_keywords=common,
        model_used=f"ollama/{os.getenv('OLLAMA_CV_SUGGEST_MODEL', 'qwen3:4b')}",
    )

# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /ocr/upload                                              ║
# ╚══════════════════════════════════════════════════════════════╝


MAX_OCR_SIZE_MB = 10

ALLOWED_OCR_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",   # browsers sometimes send this for DOCX
}


@app.post(
    "/ocr/upload",
    response_model=OCRUploadResponse,
    tags=["ocr"],
    summary="PaddleOCR: detect and recognise text regions in a CV",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file"},
        503: {"model": ErrorResponse, "description": "OCR engine not available"},
    },
)
async def endpoint_ocr_upload(
    file: UploadFile = File(..., description="CV file (PNG / JPG / WEBP / PDF / DOCX)"),
):
    """
    Upload a CV document and receive pixel-precise bounding boxes for every
    detected text region.

    - **PNG / JPG / WEBP** → processed directly.
    - **PDF** → each page is rasterised at 200 dpi before OCR.
    - **DOCX** → converted to PDF via LibreOffice then rasterised.

    Response includes:
    - Per-page ``blocks`` with ``text``, ``bbox`` (4-point polygon in pixels),
      ``confidence``, and ``rect`` (0–100 normalised for frontend overlay).
    """
    # ── Validate content type ──────────────────────────────────
    ct = (file.content_type or "").lower()
    fname = file.filename or ""
    ext = os.path.splitext(fname)[-1].lower()

    is_docx = ext == ".docx" or "wordprocessingml" in ct
    is_known = ct in ALLOWED_OCR_TYPES or ext in {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx"}
    if not is_known:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Accepted: PNG, JPG, WEBP, PDF, DOCX.",
        )

    # ── Read & size-check ─────────────────────────────────────
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_OCR_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_OCR_SIZE_MB} MB.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Run OCR pipeline ──────────────────────────────────────
    start = time.perf_counter()
    warnings: list[str] = []

    try:
        from services.ocr_service import run_ocr, OCRBlock
        from models import OCRBlockModel, OCRPageModel

        effective_ct = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if is_docx
            else ct
        )
        page_results = run_ocr(file_bytes, content_type=effective_ct, filename=fname)

    except RuntimeError as exc:
        # PaddleOCR not installed, LibreOffice missing, etc.
        logger.error("OCR pipeline error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("OCR inference failed")
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}") from exc

    elapsed = time.perf_counter() - start
    total_blocks = sum(len(p.blocks) for p in page_results)
    logger.info(
        "OCR done – %d page(s), %d blocks in %.2fs",
        len(page_results),
        total_blocks,
        elapsed,
    )

    if elapsed > 2.0:
        warnings.append(f"Processing took {elapsed:.1f}s (target < 2s).")

    # ── Serialise ──────────────────────────────────────
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
        pages_out.append(
            OCRPageModel(
                page=pr.page,
                image_width=pr.image_width,
                image_height=pr.image_height,
                blocks=blocks_out,
            )
        )

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
