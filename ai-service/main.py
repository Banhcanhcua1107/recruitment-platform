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


# ── Entry point ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
