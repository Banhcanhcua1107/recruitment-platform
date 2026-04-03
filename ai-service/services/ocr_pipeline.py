from __future__ import annotations

import base64
import concurrent.futures
import hashlib
import io
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pdf2image import convert_from_bytes
from PIL import Image, ImageOps

from services.cv_layout_parser import parse_structured_cv_from_ocr
from services.cv_content_cleaner import postprocess_mapped_sections
from services.cv_html_renderer import render_clean_cv_html
from services.cv_parser import _call_llm, parse_cv_json
from services.google_vision_ocr import extract_clean_text, run_google_vision_on_pages
from services.mapped_sections import (
    build_builder_sections_from_mapped_sections,
    build_empty_document_analysis,
    build_empty_mapped_sections,
    has_meaningful_mapped_sections,
    normalize_document_analysis,
    mapped_sections_to_structured_data,
    normalize_mapped_sections,
)
from services.ocr_service import OCRBlock, OCRPageResult

logger = logging.getLogger("ocr_pipeline")

# ──────────────────────────────────────────────────────────────────────────────
# HTTP Session — shared across all requests for connection pooling
# ──────────────────────────────────────────────────────────────────────────────

def _build_http_session(max_retries: int = 3, backoff_factor: float = 1.0) -> requests.Session:
    """Create a reusable Session with retry strategy for transient errors."""
    session = requests.Session()
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=backoff_factor,
        # Retry on server errors and rate-limits; NOT on 4xx auth errors.
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=4, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

_HTTP_SESSION: requests.Session | None = None


def _get_session() -> requests.Session:
    """Return (or lazily create) the global shared HTTP session."""
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        max_retries = int(os.getenv("PADDLE_OCR_MAX_RETRIES", "3"))
        _HTTP_SESSION = _build_http_session(max_retries=max_retries)
    return _HTTP_SESSION


def _load_repo_default_token() -> str:
    api_doc_path = Path(__file__).resolve().parents[2] / "docs" / "OCR" / "api.txt"
    if not api_doc_path.exists():
        return ""

    try:
        content = api_doc_path.read_text(encoding="utf-8")
    except OSError:
        return ""

    match = re.search(r'^TOKEN\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if not match:
        return ""

    logger.warning("Using PaddleOCR token fallback from docs/OCR/api.txt. Prefer PADDLE_OCR_API_TOKEN in the environment.")
    return match.group(1).strip()

PP_OCR_V5_URL = os.getenv("PADDLE_PP_OCR_V5_URL", "https://qbqfuacdn9c9ebc3.aistudio-app.com/ocr")
PP_STRUCTURE_V3_URL = os.getenv("PADDLE_PP_STRUCTURE_V3_URL", "https://mc0ftft1w3b1haw0.aistudio-app.com/layout-parsing")
PADDLE_API_TOKEN = os.getenv("PADDLE_OCR_API_TOKEN", "") or _load_repo_default_token()
PADDLE_TIMEOUT_SECONDS = float(os.getenv("PADDLE_OCR_TIMEOUT_SECONDS", "60"))
PDF_RENDER_DPI = int(os.getenv("PADDLE_OCR_PDF_DPI", "200"))
PADDLE_MAX_RETRIES = int(os.getenv("PADDLE_OCR_MAX_RETRIES", "3"))
PADDLE_PAGE_BATCH_SIZE = max(1, int(os.getenv("PADDLE_OCR_PAGE_BATCH_SIZE", "2")))
PADDLE_MAX_PARALLEL_PAGES = max(1, int(os.getenv("PADDLE_OCR_MAX_PARALLEL_PAGES", "3")))
OCR_MAX_IMAGE_EDGE = max(1200, int(os.getenv("PADDLE_OCR_MAX_IMAGE_EDGE", "1800")))
SOFFICE_TIMEOUT_SECONDS = max(15, int(os.getenv("SOFFICE_TIMEOUT_SECONDS", "35")))
DOCX_PDF_CACHE_TTL_SECONDS = max(60, int(os.getenv("DOCX_PDF_CACHE_TTL_SECONDS", "900")))
DOCX_PDF_CACHE_MAX_ITEMS = max(4, int(os.getenv("DOCX_PDF_CACHE_MAX_ITEMS", "16")))
_DOCX_PDF_CACHE: dict[str, tuple[float, bytes]] = {}


class OCRPipelineError(RuntimeError):
    pass


class InvalidCVFormatError(ValueError):
    pass


@dataclass
class PreparedPage:
    page: int
    image: Image.Image
    file_bytes: bytes
    file_type: int = 1
    filename: str = "page.png"


def _prepare_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    longest_edge = max(image.size)
    if longest_edge > OCR_MAX_IMAGE_EDGE:
        scale = OCR_MAX_IMAGE_EDGE / float(longest_edge)
        resized = (
            max(1, int(round(image.size[0] * scale))),
            max(1, int(round(image.size[1] * scale))),
        )
        image = image.resize(resized, Image.Resampling.LANCZOS)

    return image


def _resolve_soffice_command() -> list[str]:
    """Resolve a usable LibreOffice command (or raise a clear error)."""
    configured_path = (os.getenv("SOFFICE_PATH") or "").strip().strip('"')
    if configured_path:
        return [configured_path]

    for candidate in ("soffice", "soffice.com", "soffice.exe", "libreoffice"):
        resolved = shutil.which(candidate)
        if resolved:
            return [resolved]

    # Common Windows installation paths for LibreOffice.
    windows_candidates = [
        r"C:\Program Files\LibreOffice\program\soffice.com",
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.com",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for candidate in windows_candidates:
        if os.path.exists(candidate):
            return [candidate]

    raise OCRPipelineError(
        "LibreOffice executable was not found. Install LibreOffice, add 'soffice' to PATH, "
        "or set SOFFICE_PATH to the full soffice executable path."
    )


def _cleanup_docx_pdf_cache(now: float | None = None) -> None:
    current = now or time.time()
    expired = [
        key
        for key, (expires_at, _) in _DOCX_PDF_CACHE.items()
        if expires_at <= current
    ]
    for key in expired:
        _DOCX_PDF_CACHE.pop(key, None)

    if len(_DOCX_PDF_CACHE) <= DOCX_PDF_CACHE_MAX_ITEMS:
        return

    for key, _ in sorted(_DOCX_PDF_CACHE.items(), key=lambda item: item[1][0])[
        : max(0, len(_DOCX_PDF_CACHE) - DOCX_PDF_CACHE_MAX_ITEMS)
    ]:
        _DOCX_PDF_CACHE.pop(key, None)


def _get_cached_docx_pdf_bytes(docx_bytes: bytes) -> bytes | None:
    _cleanup_docx_pdf_cache()
    cache_key = hashlib.sha256(docx_bytes).hexdigest()
    cached = _DOCX_PDF_CACHE.get(cache_key)
    if not cached:
        return None

    expires_at, pdf_bytes = cached
    if expires_at <= time.time():
        _DOCX_PDF_CACHE.pop(cache_key, None)
        return None
    return pdf_bytes


def _store_cached_docx_pdf_bytes(docx_bytes: bytes, pdf_bytes: bytes) -> None:
    _cleanup_docx_pdf_cache()
    cache_key = hashlib.sha256(docx_bytes).hexdigest()
    _DOCX_PDF_CACHE[cache_key] = (
        time.time() + DOCX_PDF_CACHE_TTL_SECONDS,
        pdf_bytes,
    )


def _docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    """Convert DOCX to PDF bytes using LibreOffice headless."""
    cached = _get_cached_docx_pdf_bytes(docx_bytes)
    if cached is not None:
        logger.info("DOCX -> PDF cache hit")
        return cached

    soffice_cmd = _resolve_soffice_command()
    with tempfile.TemporaryDirectory() as tmp:
        docx_path = Path(tmp) / "input.docx"
        out_dir = Path(tmp) / "out"
        out_dir.mkdir(parents=True, exist_ok=True)
        user_profile_dir = Path(tmp) / "lo-profile"
        user_profile_dir.mkdir(parents=True, exist_ok=True)
        docx_path.write_bytes(docx_bytes)
        command = soffice_cmd + [
            f"-env:UserInstallation={user_profile_dir.resolve().as_uri()}",
            "--headless",
            "--invisible",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--norestore",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            str(out_dir),
            str(docx_path),
        ]

        try:
            started_at = time.perf_counter()
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                timeout=SOFFICE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            raise OCRPipelineError(
                f"DOCX conversion timed out after {SOFFICE_TIMEOUT_SECONDS}s. "
                "Check LibreOffice headless execution or increase SOFFICE_TIMEOUT_SECONDS."
            ) from exc
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or b"").decode("utf-8", errors="replace").strip()
            stdout = (exc.stdout or b"").decode("utf-8", errors="replace").strip()
            detail = stderr or stdout or str(exc)
            raise OCRPipelineError(f"LibreOffice DOCX conversion failed: {detail}") from exc

        elapsed = time.perf_counter() - started_at
        logger.info("LibreOffice DOCX -> PDF finished in %.2fs", elapsed)

        pdf_candidates = list(out_dir.glob("*.pdf"))
        if not pdf_candidates:
            stdout = (result.stdout or b"").decode("utf-8", errors="replace").strip()
            stderr = (result.stderr or b"").decode("utf-8", errors="replace").strip()
            detail = stderr or stdout or "No PDF output generated"
            raise OCRPipelineError(f"LibreOffice did not generate PDF output: {detail}")

        pdf_path = pdf_candidates[0]
        pdf_bytes = pdf_path.read_bytes()
        if not pdf_bytes:
            raise OCRPipelineError("LibreOffice generated an empty PDF output.")

        _store_cached_docx_pdf_bytes(docx_bytes, pdf_bytes)
        return pdf_bytes


def _detect_file_type(content_type: str | None, filename: str | None, file_bytes: bytes) -> str:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type == "application/pdf" or filename.endswith(".pdf") or file_bytes.startswith(b"%PDF"):
        return "pdf"
    if content_type.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")):
        return "image"
    if "wordprocessingml.document" in content_type or filename.endswith(".docx"):
        return "docx"
    raise InvalidCVFormatError("Unsupported CV format. Only PDF, image, and DOCX uploads are supported.")


def build_preview_payload(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
    """Return preview bytes and metadata, converting DOCX to PDF when needed."""
    file_kind = _detect_file_type(content_type, filename, file_bytes)

    if file_kind == "docx":
        pdf_bytes = _docx_to_pdf_bytes(file_bytes)
        preview_name = (filename or "document").removesuffix(".docx") + ".pdf"
        return {
            "file_type": "docx",
            "preview_mime": "application/pdf",
            "preview_filename": preview_name,
            "preview_bytes": pdf_bytes,
        }

    if file_kind == "pdf":
        preview_name = filename or "upload.pdf"
        return {
            "file_type": "pdf",
            "preview_mime": "application/pdf",
            "preview_filename": preview_name,
            "preview_bytes": file_bytes,
        }

    image_mime = (content_type or "image/png").lower()
    if not image_mime.startswith("image/"):
        image_mime = "image/png"
    preview_name = filename or "upload.png"
    return {
        "file_type": "image",
        "preview_mime": image_mime,
        "preview_filename": preview_name,
        "preview_bytes": file_bytes,
    }


def _image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _prepare_document_pages(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
) -> list[PreparedPage]:
    file_kind = _detect_file_type(content_type, filename, file_bytes)

    if file_kind == "docx":
        try:
            file_bytes = _docx_to_pdf_bytes(file_bytes)
        except Exception as exc:
            raise OCRPipelineError(f"Failed to convert DOCX to PDF: {exc}") from exc
        file_kind = "pdf"
        content_type = "application/pdf"
        filename = (filename or "document").removesuffix(".docx") + ".pdf"

    if file_kind == "image":
        image = _prepare_image(Image.open(io.BytesIO(file_bytes)))
        image_bytes = _image_to_png_bytes(image)
        return [PreparedPage(page=1, image=image, file_bytes=image_bytes, filename=filename or "upload.png")]

    images: list[Image.Image] | None = None

    try:
        import fitz

        pdf = fitz.open(stream=file_bytes, filetype="pdf")
        scale = PDF_RENDER_DPI / 72.0
        matrix = fitz.Matrix(scale, scale)
        rendered_pages: list[Image.Image] = []
        for page in pdf:
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            rendered_pages.append(
                Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            )
        pdf.close()
        images = rendered_pages
    except Exception as fitz_exc:
        logger.warning("PyMuPDF PDF rendering failed, falling back to pdf2image: %s", fitz_exc)
        try:
            images = convert_from_bytes(file_bytes, dpi=PDF_RENDER_DPI, fmt="png")
        except Exception as pdf2image_exc:
            raise OCRPipelineError(
                "Failed to render PDF pages. PyMuPDF and pdf2image rendering both failed. Install Poppler if you need the pdf2image fallback."
            ) from pdf2image_exc

    prepared_pages: list[PreparedPage] = []
    for index, image in enumerate(images or [], start=1):
        prepared_image = _prepare_image(image)
        prepared_pages.append(
            PreparedPage(
                page=index,
                image=prepared_image,
                file_bytes=_image_to_png_bytes(prepared_image),
                filename=f"page-{index}.png",
            )
        )
    return prepared_pages


def _encode_payload(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("ascii")


def _auth_headers(token: str) -> tuple[dict[str, str], dict[str, str]]:
    """Return (bearer_headers, token_headers) for the given token."""
    normalized = token.strip()
    if not normalized:
        raise OCRPipelineError(
            "Missing PaddleOCR API token. "
            "Set PADDLE_OCR_API_TOKEN in your .env.local file."
        )
    if " " in normalized:
        # Already a full 'Bearer xxx' or 'token xxx' style string
        single = {"Authorization": normalized, "Content-Type": "application/json"}
        return single, single
    return (
        {"Authorization": f"Bearer {normalized}", "Content-Type": "application/json"},
        {"Authorization": f"token {normalized}", "Content-Type": "application/json"},
    )


def _post_paddle_request(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    """
    POST to a PaddleOCR cloud endpoint.

    - Uses a shared requests.Session with connection pooling.
    - urllib3 retry handles transient 5xx / 429 automatically.
    - Falls back from Bearer → token auth on 401.
    """
    session = _get_session()
    bearer_headers, token_headers = _auth_headers(PADDLE_API_TOKEN)

    last_status: int | None = None
    last_detail: str = ""

    for attempt, headers in enumerate((bearer_headers, token_headers), start=1):
        try:
            t0 = time.perf_counter()
            response = session.post(
                url,
                json=payload,
                headers=headers,
                timeout=PADDLE_TIMEOUT_SECONDS,
            )
            elapsed = time.perf_counter() - t0
            logger.debug("PaddleOCR %s → HTTP %d in %.2fs", url.rsplit("/", 1)[-1], response.status_code, elapsed)

            last_status = response.status_code
            last_detail = response.text[:600]

            if response.status_code == 401:
                # Bearer failed → try token auth on next loop iteration
                if attempt == 1 and bearer_headers is not token_headers:
                    logger.debug("Bearer auth returned 401, retrying with token auth…")
                    continue
                raise OCRPipelineError(
                    "PaddleOCR API authentication failed (401). "
                    "Check your PADDLE_OCR_API_TOKEN value."
                )

            if response.status_code == 429:
                raise OCRPipelineError(
                    "PaddleOCR API rate-limit hit (429). "
                    "Reduce request frequency or upgrade your plan."
                )

            response.raise_for_status()

            body = response.json()
            if not isinstance(body, dict):
                raise OCRPipelineError(
                    f"PaddleOCR API returned unexpected response type: {type(body).__name__}."
                )
            return body

        except requests.Timeout as exc:
            raise OCRPipelineError(
                f"PaddleOCR API timed out after {PADDLE_TIMEOUT_SECONDS}s. "
                "Increase PADDLE_OCR_TIMEOUT_SECONDS or check your network."
            ) from exc
        except OCRPipelineError:
            raise
        except requests.RequestException as exc:
            error_response = getattr(exc, "response", None)
            if error_response is not None:
                last_status = error_response.status_code
                last_detail = error_response.text[:600]
                if error_response.status_code == 401 and attempt == 1 and bearer_headers is not token_headers:
                    continue
            raise OCRPipelineError(f"PaddleOCR API network error: {exc}") from exc
        break  # Both auth variants exhausted without success

    if last_status is not None:
        raise OCRPipelineError(
            f"PaddleOCR API request failed — HTTP {last_status}. "
            f"Detail: {last_detail}"
        )
    raise OCRPipelineError("PaddleOCR API request failed for an unknown reason.")


def _bbox_to_rect(bbox: list[list[int]], image_width: int, image_height: int) -> tuple[float, float, float, float]:
    x_values = [point[0] for point in bbox]
    y_values = [point[1] for point in bbox]
    x_min, x_max = min(x_values), max(x_values)
    y_min, y_max = min(y_values), max(y_values)

    rect_x = max(0.0, min(100.0, (x_min / image_width) * 100.0))
    rect_y = max(0.0, min(100.0, (y_min / image_height) * 100.0))
    rect_w = max(0.0, min(100.0 - rect_x, ((x_max - x_min) / image_width) * 100.0))
    rect_h = max(0.0, min(100.0 - rect_y, ((y_max - y_min) / image_height) * 100.0))
    return rect_x, rect_y, rect_w, rect_h


def _normalize_block_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _block_area(block: OCRBlock) -> float:
    return max(0.0, block.rect_w) * max(0.0, block.rect_h)


def _block_iou(left: OCRBlock, right: OCRBlock) -> float:
    left_x1 = left.rect_x
    left_y1 = left.rect_y
    left_x2 = left.rect_x + left.rect_w
    left_y2 = left.rect_y + left.rect_h

    right_x1 = right.rect_x
    right_y1 = right.rect_y
    right_x2 = right.rect_x + right.rect_w
    right_y2 = right.rect_y + right.rect_h

    inter_x1 = max(left_x1, right_x1)
    inter_y1 = max(left_y1, right_y1)
    inter_x2 = min(left_x2, right_x2)
    inter_y2 = min(left_y2, right_y2)
    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0

    intersection = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    union = _block_area(left) + _block_area(right) - intersection
    if union <= 0:
        return 0.0
    return intersection / union


def _looks_like_heading_text(text: str) -> bool:
    normalized = _normalize_block_text(text)
    if not normalized or len(normalized) > 80:
        return False
    if len(normalized.split()) > 8:
        return False
    if re.search(r"[.!?]", normalized):
        return False

    uppercase_letters = [char for char in normalized if char.isalpha() and char.isupper()]
    total_letters = [char for char in normalized if char.isalpha()]
    uppercase_ratio = (len(uppercase_letters) / len(total_letters)) if total_letters else 0.0

    heading_tokens = {
        "HOCVAN",
        "DUAN",
        "PROJECT",
        "PROJECTS",
        "KYNANG",
        "SKILL",
        "SKILLS",
        "KINHNGHIEM",
        "EXPERIENCE",
        "LIENHE",
        "CONTACT",
        "CHUNGCHI",
        "CERTIFICATE",
        "CERTIFICATES",
        "CERTIFICATION",
    }
    compact = re.sub(r"\s+", "", _strip_accents(normalized)).upper()
    if any(token in compact for token in heading_tokens):
        return True
    return uppercase_ratio >= 0.65


def _preferred_block(left: OCRBlock, right: OCRBlock) -> OCRBlock:
    left_text = _normalize_block_text(left.text)
    right_text = _normalize_block_text(right.text)
    if left_text == right_text and _looks_like_heading_text(left_text):
        return left if _block_area(left) >= _block_area(right) else right
    if left.confidence != right.confidence:
        return left if left.confidence >= right.confidence else right
    return left if _block_area(left) >= _block_area(right) else right


def remove_duplicate_blocks(blocks: list[OCRBlock]) -> list[OCRBlock]:
    unique_blocks: list[OCRBlock] = []

    for block in sorted(blocks, key=lambda item: (item.rect_y, item.rect_x, -_block_area(item))):
        normalized_text = _normalize_block_text(block.text)
        if not normalized_text:
            continue

        duplicate_index: int | None = None
        for index, existing in enumerate(unique_blocks):
            if _normalize_block_text(existing.text) != normalized_text:
                continue
            if _block_iou(existing, block) <= 0.7:
                continue
            duplicate_index = index
            break

        if duplicate_index is None:
            unique_blocks.append(block)
            continue

        preferred = _preferred_block(unique_blocks[duplicate_index], block)
        unique_blocks[duplicate_index] = preferred

    return sorted(unique_blocks, key=lambda item: (item.rect_y, item.rect_x))


def _parse_ocr_lines(pruned_result: Any) -> list[tuple[list[list[int]], str, float]]:
    lines: list[tuple[list[list[int]], str, float]] = []

    if isinstance(pruned_result, dict):
        rec_texts = pruned_result.get("rec_texts") or []
        rec_scores = pruned_result.get("rec_scores") or []
        rec_polys = pruned_result.get("rec_polys") or pruned_result.get("dt_polys") or []
        rec_boxes = pruned_result.get("rec_boxes") or []

        for index, raw_text in enumerate(rec_texts):
            text = str(raw_text or "").strip()
            if not text:
                continue

            confidence = float(rec_scores[index] or 0.0) if index < len(rec_scores) else 0.0
            bbox: list[list[int]] | None = None

            if index < len(rec_polys) and isinstance(rec_polys[index], list):
                polygon = rec_polys[index]
                if polygon and isinstance(polygon[0], (list, tuple)):
                    bbox = [[int(round(float(point[0]))), int(round(float(point[1])))] for point in polygon]

            if bbox is None and index < len(rec_boxes) and isinstance(rec_boxes[index], list) and len(rec_boxes[index]) == 4:
                x1, y1, x2, y2 = [int(round(float(value))) for value in rec_boxes[index]]
                bbox = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]

            if bbox:
                lines.append((bbox, text, confidence))

        return lines

    if not isinstance(pruned_result, list):
        return lines

    for item in pruned_result:
        bbox: list[list[int]] | None = None
        text = ""
        confidence = 1.0

        if isinstance(item, list) and len(item) >= 2:
            if isinstance(item[0], list):
                bbox = [[int(round(float(point[0]))), int(round(float(point[1])))] for point in item[0]]
            if isinstance(item[1], (list, tuple)) and len(item[1]) >= 2:
                text = str(item[1][0] or "")
                confidence = float(item[1][1] or 0.0)
            elif len(item) >= 3:
                text = str(item[1] or "")
                confidence = float(item[2] or 0.0)
        elif isinstance(item, dict):
            raw_bbox = item.get("bbox") or item.get("box") or item.get("polygon") or item.get("points")
            if isinstance(raw_bbox, list):
                if raw_bbox and isinstance(raw_bbox[0], dict):
                    bbox = [[int(round(float(point.get("x", 0)))), int(round(float(point.get("y", 0))))] for point in raw_bbox]
                elif raw_bbox and isinstance(raw_bbox[0], (list, tuple)):
                    bbox = [[int(round(float(point[0]))), int(round(float(point[1])))] for point in raw_bbox]
                elif len(raw_bbox) == 4:
                    x1, y1, x2, y2 = [int(round(float(value))) for value in raw_bbox]
                    bbox = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
            text = str(item.get("text") or item.get("value") or item.get("content") or "")
            confidence = float(item.get("score") or item.get("confidence") or 0.0)

        if bbox and text.strip():
            lines.append((bbox, text.strip(), confidence))

    return lines


def _parse_ppocr_page(page_payload: dict[str, Any], page_number: int, image: Image.Image, min_confidence: float) -> OCRPageResult:
    image_width, image_height = image.size
    ocr_blocks: list[OCRBlock] = []

    line_candidates = page_payload.get("prunedResult") or page_payload.get("ocrResult") or page_payload.get("lines") or []
    for bbox, text, confidence in _parse_ocr_lines(line_candidates):
        if confidence < min_confidence:
            continue
        rect_x, rect_y, rect_w, rect_h = _bbox_to_rect(bbox, image_width, image_height)
        ocr_blocks.append(
            OCRBlock(
                text=text,
                bbox=bbox,
                confidence=round(float(confidence), 4),
                page=page_number,
                rect_x=round(rect_x, 3),
                rect_y=round(rect_y, 3),
                rect_w=round(rect_w, 3),
                rect_h=round(rect_h, 3),
            )
        )

    ocr_blocks = remove_duplicate_blocks(ocr_blocks)
    return OCRPageResult(page=page_number, image_width=image_width, image_height=image_height, blocks=ocr_blocks)


def _ocr_single_page(
    prepared_page: PreparedPage,
    min_confidence: float,
) -> tuple[int, OCRPageResult | None, dict[str, Any] | None, str | None]:
    payload = {
        "file": _encode_payload(prepared_page.file_bytes),
        "fileType": prepared_page.file_type,
        "useDocOrientationClassify": False,
        "useDocUnwarping": False,
        "useTextlineOrientation": False,
    }
    try:
        response_body = _post_paddle_request(PP_OCR_V5_URL, payload)
        result = response_body.get("result") or {}
        page_payloads = result.get("ocrResults") or [result]
        page_payload = page_payloads[0] if page_payloads else {}
        parsed_page = _parse_ppocr_page(
            page_payload,
            prepared_page.page,
            prepared_page.image,
            min_confidence,
        )
        return prepared_page.page, parsed_page, page_payload, None
    except Exception as exc:
        return prepared_page.page, None, None, f"OCR failed on page {prepared_page.page}: {exc}"


def _normalize_bbox(value: Any) -> list[float] | None:
    if isinstance(value, dict):
        if {"x", "y", "width", "height"}.issubset(value.keys()):
            x = float(value["x"])
            y = float(value["y"])
            width = float(value["width"])
            height = float(value["height"])
            return [x, y, x + width, y + height]
        if {"left", "top", "right", "bottom"}.issubset(value.keys()):
            return [float(value["left"]), float(value["top"]), float(value["right"]), float(value["bottom"])]

    if isinstance(value, list):
        if len(value) == 4 and all(isinstance(item, (int, float)) for item in value):
            x1, y1, x2, y2 = [float(item) for item in value]
            if x2 >= x1 and y2 >= y1:
                return [x1, y1, x2, y2]
            return [x1, y1, x1 + x2, y1 + y2]
        if value and all(isinstance(item, dict) for item in value):
            x_values = [float(item.get("x", 0.0)) for item in value]
            y_values = [float(item.get("y", 0.0)) for item in value]
            return [min(x_values), min(y_values), max(x_values), max(y_values)]
        if value and all(isinstance(item, (list, tuple)) and len(item) >= 2 for item in value):
            x_values = [float(item[0]) for item in value]
            y_values = [float(item[1]) for item in value]
            return [min(x_values), min(y_values), max(x_values), max(y_values)]
    return None


def _collect_layout_items(node: Any, page_number: int, output: list[dict[str, Any]]) -> None:
    if isinstance(node, dict):
        label = node.get("label") or node.get("type") or node.get("layoutType") or node.get("blockType") or node.get("category")
        bbox = _normalize_bbox(node.get("bbox") or node.get("box") or node.get("rect") or node.get("polygon") or node.get("points"))
        text = node.get("text") or node.get("content") or node.get("value") or ""
        score = node.get("score") or node.get("confidence") or None

        if label and bbox:
            output.append(
                {
                    "page": page_number,
                    "type": str(label).lower().replace(" ", "_"),
                    "text": str(text).strip(),
                    "bbox": [round(float(coord), 3) for coord in bbox],
                    "confidence": round(float(score), 4) if score is not None else None,
                }
            )

        for value in node.values():
            _collect_layout_items(value, page_number, output)
        return

    if isinstance(node, list):
        for item in node:
            _collect_layout_items(item, page_number, output)


def _layout_single_page(
    prepared_page: PreparedPage,
) -> tuple[int, dict[str, Any] | None, str, list[dict[str, Any]] | None, str | None]:
    payload = {
        "file": _encode_payload(prepared_page.file_bytes),
        "fileType": prepared_page.file_type,
        "useDocOrientationClassify": False,
        "useDocUnwarping": False,
        "useTextlineOrientation": False,
        "useChartRecognition": False,
    }
    try:
        response_body = _post_paddle_request(PP_STRUCTURE_V3_URL, payload)
        result = response_body.get("result") or {}
        page_payloads = result.get("layoutParsingResults") or [result]
        page_payload = page_payloads[0] if page_payloads else {}
        markdown_text = ((page_payload.get("markdown") or {}).get("text") or "").strip()
        page_layout_blocks: list[dict[str, Any]] = []
        _collect_layout_items(page_payload, prepared_page.page, page_layout_blocks)
        return prepared_page.page, page_payload, markdown_text, page_layout_blocks, None
    except Exception as exc:
        return (
            prepared_page.page,
            None,
            "",
            None,
            f"Layout parsing failed on page {prepared_page.page}: {exc}",
        )


def _run_ppocrv5_on_pages(prepared_pages: list[PreparedPage], min_confidence: float) -> dict[str, Any]:
    start = time.perf_counter()
    pages: list[OCRPageResult] = []
    raw_results: list[dict[str, Any]] = []
    warnings: list[str] = []

    max_workers = min(PADDLE_MAX_PARALLEL_PAGES, len(prepared_pages))
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_ocr_single_page, prepared_page, min_confidence)
            for prepared_page in prepared_pages
        ]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]

    for _page_number, parsed_page, page_payload, warning in sorted(
        results,
        key=lambda item: item[0],
    ):
        if warning:
            warnings.append(warning)
            logger.warning(warning)
            continue
        if parsed_page is not None:
            pages.append(parsed_page)
        if page_payload is not None:
            raw_results.append(page_payload)

    if not pages:
        raise OCRPipelineError("OCR failed on all document pages.")

    elapsed = time.perf_counter() - start
    logger.info("PP-OCRv5 completed in %.2fs for %d/%d page(s)", elapsed, len(pages), len(prepared_pages))
    return {
        "pages": pages,
        "raw_results": raw_results,
        "elapsed_seconds": elapsed,
        "warnings": warnings,
        "total_pages": len(prepared_pages),
    }


def _run_ppstructure_on_pages(prepared_pages: list[PreparedPage]) -> dict[str, Any]:
    start = time.perf_counter()
    structure_pages: list[dict[str, Any]] = []
    markdown_pages: list[str] = []
    layout_blocks: list[dict[str, Any]] = []
    warnings: list[str] = []

    max_workers = min(PADDLE_MAX_PARALLEL_PAGES, len(prepared_pages))
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_layout_single_page, prepared_page)
            for prepared_page in prepared_pages
        ]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]

    for page_number, page_payload, markdown_text, page_layout_blocks, warning in sorted(
        results,
        key=lambda item: item[0],
    ):
        if warning:
            warnings.append(warning)
            logger.warning(warning)
            continue

        markdown_pages.append(markdown_text)
        for block in page_layout_blocks or []:
            layout_blocks.append(block)

        structure_pages.append(
            {
                "page": page_number,
                "markdown": markdown_text,
                "layout_blocks": page_layout_blocks or [],
                "raw_result": page_payload or {},
            }
        )

    elapsed = time.perf_counter() - start
    logger.info("PP-StructureV3 completed in %.2fs for %d/%d page(s)", elapsed, len(structure_pages), len(prepared_pages))
    return {
        "pages": structure_pages,
        "layout_blocks": layout_blocks,
        "markdown_pages": markdown_pages,
        "elapsed_seconds": elapsed,
        "warnings": warnings,
        "total_pages": len(prepared_pages),
    }


def run_ppocrv5(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    file_kind = _detect_file_type(content_type, filename, file_bytes)

    if file_kind == "docx":
        prepared_pages = _prepare_document_pages(
            file_bytes,
            content_type=content_type,
            filename=filename,
        )
        return _run_ppocrv5_on_pages(prepared_pages, min_confidence=min_confidence)

    prepared_pages = _prepare_document_pages(file_bytes, content_type=content_type, filename=filename)
    return _run_ppocrv5_on_pages(prepared_pages, min_confidence=min_confidence)


def run_ppstructure(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
    file_kind = _detect_file_type(content_type, filename, file_bytes)

    if file_kind == "docx":
        prepared_pages = _prepare_document_pages(
            file_bytes,
            content_type=content_type,
            filename=filename,
        )
        return _run_ppstructure_on_pages(prepared_pages)

    prepared_pages = _prepare_document_pages(file_bytes, content_type=content_type, filename=filename)
    return _run_ppstructure_on_pages(prepared_pages)


def _layout_type_for_line(
    page_number: int,
    pixel_bbox: list[int],
    layout_blocks: list[dict[str, Any]],
) -> str | None:
    best_match: tuple[float, str] | None = None
    x1, y1, x2, y2 = pixel_bbox

    for block in layout_blocks:
        if int(block.get("page", 0)) != page_number:
            continue
        bx1, by1, bx2, by2 = [float(value) for value in block.get("bbox", [0, 0, 0, 0])]
        ix1 = max(x1, bx1)
        iy1 = max(y1, by1)
        ix2 = min(x2, bx2)
        iy2 = min(y2, by2)
        if ix2 <= ix1 or iy2 <= iy1:
            continue
        intersection = (ix2 - ix1) * (iy2 - iy1)
        area = max(1.0, (x2 - x1) * (y2 - y1))
        score = intersection / area
        if best_match is None or score > best_match[0]:
            best_match = (score, str(block.get("type") or "text"))

    return best_match[1] if best_match and best_match[0] >= 0.2 else None


def _section_type_lookup(detected_sections: list[dict[str, Any]]) -> tuple[dict[str, str], dict[int, str]]:
    line_map: dict[str, str] = {}
    block_map: dict[int, str] = {}
    for section in detected_sections:
        section_type = str(section.get("type") or "text")
        for line_id in section.get("line_ids", []):
            line_map[str(line_id)] = section_type
        for block_index in section.get("block_indices", []):
            block_map[int(block_index)] = section_type
    return line_map, block_map


def _percent_bbox_to_pixels(bbox: list[float], image_width: int, image_height: int) -> list[int]:
    return [
        int(round((bbox[0] / 100.0) * image_width)),
        int(round((bbox[1] / 100.0) * image_height)),
        int(round((bbox[2] / 100.0) * image_width)),
        int(round((bbox[3] / 100.0) * image_height)),
    ]


def _build_structured_blocks(
    page_results: list[OCRPageResult],
    parsed: dict[str, Any],
    layout_blocks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    page_dimensions = {
        page.page: (page.image_width, page.image_height)
        for page in page_results
    }
    line_type_map, block_type_map = _section_type_lookup(parsed.get("detected_sections", []))
    structured_blocks: list[dict[str, Any]] = []

    for item in parsed.get("layout", {}).get("reading_order", []):
        page_number = int(item.get("page", 1))
        image_width, image_height = page_dimensions.get(page_number, (1000, 1400))
        percent_bbox = [float(value) for value in item.get("bbox", [0, 0, 0, 0])]
        pixel_bbox = _percent_bbox_to_pixels(percent_bbox, image_width, image_height)

        block_type = line_type_map.get(str(item.get("id")))
        if block_type is None:
            block_indices = item.get("block_indices", [])
            for block_index in block_indices:
                block_type = block_type_map.get(int(block_index))
                if block_type:
                    break
        if block_type is None:
            block_type = _layout_type_for_line(page_number, pixel_bbox, layout_blocks)
        if block_type is None:
            block_type = "header" if page_number == 1 and item.get("order", 0) < 3 else "text"

        structured_blocks.append(
            {
                "type": block_type,
                "text": str(item.get("text") or "").strip(),
                "bbox": pixel_bbox,
                "page": page_number,
                "layout_type": _layout_type_for_line(page_number, pixel_bbox, layout_blocks),
            }
        )

    return [block for block in structured_blocks if block["text"]]


def _classify_document_type(raw_text: str) -> dict[str, Any]:
    text = str(raw_text or "")
    lowered = text.lower()

    has_email = bool(re.search(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", text))
    has_phone = bool(re.search(r"(?:\+?\d[\d().\-\s]{7,}\d)", text))
    has_skills = bool(re.search(r"\b(skills?|k\s*y\s*nang|kỹ\s*năng|tech\s*stack)\b", lowered, re.I))
    has_education = bool(re.search(r"\b(education|h\s*oc\s*van|học\s*vấn|university|bachelor|master)\b", lowered, re.I))
    has_experience = bool(re.search(r"\b(experience|work\s+experience|kinh\s*nghiem|kinh\s*nghiệm)\b", lowered, re.I))
    has_employment_dates = bool(
        re.search(r"(?:0?[1-9]|1[0-2])[/\-]\d{4}\s*(?:-|–|—|to)\s*(?:present|now|hien\s*tai|hiện\s*tại|(?:0?[1-9]|1[0-2])[/\-]\d{4})", lowered)
        or re.search(r"\b(19|20)\d{2}\s*(?:-|–|—|to)\s*((19|20)\d{2}|present|now|hien\s*tai|hiện\s*tại)\b", lowered)
    )
    has_job_titles = bool(
        re.search(
            r"\b(software\s+engineer|developer|intern|manager|architect|designer|consultant|analyst|specialist|lead|director|qa|devops)\b",
            lowered,
            re.I,
        )
    )
    has_company_markers = bool(
        re.search(r"\b(company|cong\s*ty|corp\.?|inc\.?|ltd\.?|llc\.?|jsc\.?|co\.?\s*,?\s*ltd\.?|công\s*ty)\b", lowered, re.I)
    )

    section_keywords = {
        "contact": bool(re.search(r"\b(thong\s*tin\s*(lien\s*he|ca\s*nhan)|contact|email|phone|dien\s*thoai|so\s*dien\s*thoai)\b", lowered, re.I)),
        "objective": bool(re.search(r"\b(muc\s*tieu|career\s*objective|objective|ve\s*ban\s*than|gioi\s*thieu|summary)\b", lowered, re.I)),
        "skills": has_skills,
        "education": has_education,
        "experience": has_experience,
        "projects": bool(re.search(r"\b(du\s*an|projects?|do\s*an|san\s*pham)\b", lowered, re.I)),
        "certifications": bool(re.search(r"\b(chung\s*chi|certif|giay\s*chung\s*nhan)\b", lowered, re.I)),
        "interests": bool(re.search(r"\b(so\s*thich|interests?|hobbies)\b", lowered, re.I)),
    }

    score = 0.0
    signals: list[str] = []

    if has_email:
        score += 1.5
        signals.append("email")
    if has_phone:
        score += 1.5
        signals.append("phone")
    if has_skills:
        score += 1.0
        signals.append("skills_keyword")
    if has_education:
        score += 1.0
        signals.append("education_keyword")
    if has_experience:
        score += 1.0
        signals.append("experience_keyword")
    if has_employment_dates:
        score += 1.0
        signals.append("employment_dates")
    if has_job_titles:
        score += 0.75
        signals.append("job_titles")
    if has_company_markers:
        score += 0.75
        signals.append("company_markers")
    section_hit_count = sum(1 for hit in section_keywords.values() if hit)
    if section_hit_count >= 2:
        score += min(2.0, section_hit_count * 0.35)
        signals.append(f"section_hits:{section_hit_count}")

    heading_count = int(has_skills) + int(has_education) + int(has_experience)
    has_cv_profile = section_keywords["contact"] and (
        section_keywords["objective"] or section_keywords["skills"] or section_keywords["education"]
    )
    likely_cv = (
        ((has_email or has_phone) and heading_count >= 1 and score >= 3.0)
        or (heading_count >= 2 and score >= 4.0)
        or (has_cv_profile and score >= 2.8)
        or section_hit_count >= 4
    )
    cv_candidate = likely_cv or (section_hit_count >= 3 and (has_email or has_phone or has_job_titles))

    confidence = min(1.0, score / 7.5)
    return {
        "document_type": "cv" if likely_cv else "non_cv_document",
        "confidence": round(confidence, 3),
        "signals": signals,
        "score": round(score, 3),
        "section_hit_count": section_hit_count,
        "cv_candidate": cv_candidate,
    }


def _section_keyword_present(raw_text: str, section_type: str) -> bool:
    text = (raw_text or "").lower()
    patterns: dict[str, str] = {
        "education": r"\b(education|h\s*oc\s*van|học\s*vấn|university|college|bachelor|master)\b",
        "work_experience": r"\b(experience|work\s+experience|kinh\s*nghiem|kinh\s*nghiệm)\b",
        "skills": r"\b(skills?|k\s*y\s*nang|kỹ\s*năng|tech\s*stack|technologies?)\b",
    }
    pattern = patterns.get(section_type)
    if not pattern:
        return True
    return bool(re.search(pattern, text, re.I))


def _has_meaningful_cv_payload(parsed: dict[str, Any]) -> bool:
    data = parsed.get("data") or {}
    contact = data.get("contact") or {}
    profile = data.get("profile") or {}
    builder_sections = parsed.get("builder_sections") or []

    strong_signals = 0
    if str(data.get("full_name") or profile.get("full_name") or "").strip():
        strong_signals += 1
    if str(contact.get("email") or "").strip() or str(contact.get("phone") or "").strip():
        strong_signals += 1
    if len(data.get("skills") or []) >= 2:
        strong_signals += 1
    if len(data.get("education") or []) >= 1:
        strong_signals += 1
    if len(data.get("experience") or []) >= 1:
        strong_signals += 1
    if len(data.get("projects") or []) >= 1:
        strong_signals += 1
    if str(data.get("summary") or profile.get("summary") or profile.get("career_objective") or "").strip():
        strong_signals += 1

    cv_builder_types = {
        "summary",
        "personal_info",
        "skill_list",
        "education_list",
        "experience_list",
        "project_list",
        "certificate_list",
        "rich_outline",
    }
    builder_signal = any(str(section.get("type") or "") in cv_builder_types for section in builder_sections)
    return strong_signals >= 2 or builder_signal


def _filter_sections_by_keywords(parsed: dict[str, Any], raw_text: str) -> dict[str, Any]:
    # Preserve content-first behavior: once OCR/layout parsing has already
    # extracted sections, do not aggressively drop them based on keyword
    # heuristics alone. This reduces cases where legitimate CV content is
    # erased and replaced by generic output.
    return {
        "data": dict(parsed.get("data", {})),
        "mapped_sections": dict(parsed.get("mapped_sections", {})),
        "cleaned_json": dict(parsed.get("cleaned_json", parsed.get("mapped_sections", {}))),
        "document_analysis": dict(parsed.get("document_analysis", {})),
        "correction_log": list(parsed.get("correction_log", [])),
        "detected_sections": list(parsed.get("detected_sections", [])),
        "builder_sections": list(parsed.get("builder_sections", [])),
        "layout": parsed.get("layout", {}),
        "raw_text": parsed.get("raw_text", raw_text),
    }


def _build_non_cv_payload(
    *,
    raw_text: str,
    page_results: list[OCRPageResult],
    structured_blocks: list[dict[str, Any]],
    layout_blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    preview_lines = lines

    data_payload = {
        "full_name": None,
        "job_title": None,
        "profile": {
            "full_name": None,
            "job_title": None,
            "career_objective": None,
            "summary": None,
        },
        "contact": {
            "email": None,
            "phone": None,
            "linkedin": None,
            "address": None,
        },
        "summary": None,
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "languages": [],
        "raw_text": raw_text,
    }

    detected_sections = [
        {
            "type": "document_content",
            "title": "Nội dung tài liệu",
            "content": raw_text,
            "items": [{"text": line} for line in preview_lines],
            "line_ids": [],
            "block_indices": [],
        }
    ]

    builder_sections = [
        {
            "id": "generic-document-outline",
            "type": "rich_outline",
            "title": "Nội dung tài liệu",
            "containerId": "main-column",
            "order": 0,
            "data": {
                "nodes": [
                    {
                        "id": f"line-{index}",
                        "text": line,
                        "kind": "paragraph",
                        "children": [],
                    }
                    for index, line in enumerate(preview_lines)
                ]
            },
        }
    ]

    layout_payload = {
        "mode": "generic_document",
        "layout_blocks": layout_blocks,
        "pages": [
            {
                "page": page.page,
                "layout_mode": "single_column",
                "split_x": None,
            }
            for page in page_results
        ],
    }

    return {
        "data": data_payload,
        "mapped_sections": build_empty_mapped_sections(),
        "cleaned_json": build_empty_mapped_sections(),
        "document_analysis": normalize_document_analysis(build_empty_document_analysis()),
        "correction_log": [],
        "detected_sections": detected_sections,
        "builder_sections": builder_sections,
        "layout": layout_payload,
        "blocks": structured_blocks,
    }


def _build_markdown_pages_from_ocr(page_results: list[OCRPageResult]) -> list[str]:
    markdown_pages: list[str] = []
    for page in sorted(page_results, key=lambda item: item.page):
        lines = [
            _normalize_block_text(block.text)
            for block in page.blocks
            if _normalize_block_text(block.text)
        ]
        markdown_pages.append("\n".join(lines).strip())
    return markdown_pages


def process_cv(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    start = time.perf_counter()
    file_kind = _detect_file_type(content_type, filename, file_bytes)
    pipeline_warnings: list[str] = []
    extraction_method = "google_vision_document_text_detection"
    ocr_provider = "Google Vision API DOCUMENT_TEXT_DETECTION"

    try:
        prepared_pages = _prepare_document_pages(
            file_bytes,
            content_type=content_type,
            filename=filename,
        )
        if file_kind == "docx":
            extraction_method = "docx_to_pdf_google_vision_document_text_detection"
            ocr_provider = "Google Vision API DOCUMENT_TEXT_DETECTION (DOCX->PDF)"
    except OCRPipelineError as exc:
        if file_kind == "docx":
            raise OCRPipelineError(
                f"Không thể chuyển Word sang PDF để preview và OCR: {exc}"
            ) from exc
        raise

    try:
        ocr_result = run_google_vision_on_pages(prepared_pages, min_confidence=min_confidence)
    except Exception as exc:
        raise OCRPipelineError(f"Google Vision OCR failed: {exc}") from exc
    pipeline_warnings.extend(ocr_result.get("warnings", []))

    page_results: list[OCRPageResult] = ocr_result["pages"]
    raw_text = extract_clean_text(page_results)
    markdown_pages = _build_markdown_pages_from_ocr(page_results)
    structure_result = {
        "layout_blocks": [],
        "markdown_pages": markdown_pages,
        "elapsed_seconds": 0.0,
    }
    classification = _classify_document_type(raw_text)

    def _to_xyxy(points: list[list[int]]) -> list[int]:
        if not points:
            return [0, 0, 0, 0]
        xs = [int(round(point[0])) for point in points if len(point) >= 2]
        ys = [int(round(point[1])) for point in points if len(point) >= 2]
        if not xs or not ys:
            return [0, 0, 0, 0]
        return [min(xs), min(ys), max(xs), max(ys)]

    should_try_cv_parse = classification["document_type"] == "cv" or bool(classification.get("cv_candidate"))

    if should_try_cv_parse:
        parsed = parse_structured_cv_from_ocr(page_results)
        llm_mapped_sections = normalize_mapped_sections(
            parse_cv_json(
                {
                    "raw_text": raw_text,
                    "markdown_pages": structure_result["markdown_pages"],
                    "ocr_blocks": [
                        {
                            "page": block.page,
                            "text": block.text,
                            "bbox": _to_xyxy(block.bbox),
                            "confidence": block.confidence,
                        }
                        for page in page_results
                        for block in page.blocks
                        if str(block.text or "").strip()
                    ],
                    "layout_blocks": structure_result["layout_blocks"],
                    "detected_sections": [
                        {
                            "type": section.get("type"),
                            "title": section.get("title"),
                            "content": section.get("content"),
                        }
                        for section in parsed.get("detected_sections", [])
                    ],
                }
            )
        )
        if has_meaningful_mapped_sections(llm_mapped_sections):
            postprocess_result = postprocess_mapped_sections(llm_mapped_sections, call_llm=_call_llm)
            cleaned_json = normalize_mapped_sections(
                postprocess_result.get("mapped_sections") or llm_mapped_sections,
            )
            parsed["mapped_sections"] = llm_mapped_sections
            parsed["cleaned_json"] = cleaned_json
            parsed["document_analysis"] = normalize_document_analysis(
                postprocess_result.get("document_analysis"),
                mapped_sections=cleaned_json,
            )
            parsed["correction_log"] = postprocess_result.get("correction_log") or []
            parsed["data"] = mapped_sections_to_structured_data(cleaned_json, raw_text=raw_text)
            parsed["builder_sections"] = build_builder_sections_from_mapped_sections(cleaned_json)
        parsed = _filter_sections_by_keywords(parsed, raw_text)
        if _has_meaningful_cv_payload(parsed):
            structured_blocks = _build_structured_blocks(page_results, parsed, structure_result["layout_blocks"])
            classification["document_type"] = "cv"
        else:
            pipeline_warnings.append("Tài liệu có tín hiệu giống CV nhưng parse structure chưa đủ mạnh; giữ fallback full extracted content.")
            classification["document_type"] = "non_cv_document"
            structured_blocks = [
                {
                    "type": "text",
                    "text": block.text,
                    "bbox": _to_xyxy(block.bbox),
                    "page": block.page,
                    "layout_type": "text",
                }
                for page in page_results
                for block in page.blocks
                if str(block.text or "").strip()
            ]
            parsed = _build_non_cv_payload(
                raw_text=raw_text,
                page_results=page_results,
                structured_blocks=structured_blocks,
                layout_blocks=structure_result["layout_blocks"],
            )
    else:
        structured_blocks = [
            {
                "type": "text",
                "text": block.text,
                "bbox": _to_xyxy(block.bbox),
                "page": block.page,
                "layout_type": "text",
            }
            for page in page_results
            for block in page.blocks
            if str(block.text or "").strip()
        ]
        parsed = _build_non_cv_payload(
            raw_text=raw_text,
            page_results=page_results,
            structured_blocks=structured_blocks,
            layout_blocks=structure_result["layout_blocks"],
        )

    clean_html = render_clean_cv_html(
        structured_data=parsed.get("data") if isinstance(parsed.get("data"), dict) else {},
        mapped_sections=(
            parsed.get("cleaned_json")
            if isinstance(parsed.get("cleaned_json"), dict)
            else parsed.get("mapped_sections")
            if isinstance(parsed.get("mapped_sections"), dict)
            else {}
        ),
        raw_text=raw_text,
    )

    total_elapsed = time.perf_counter() - start

    return {
        "success": True,
        "document_type": classification["document_type"],
        "document_confidence": classification["confidence"],
        "document_signals": classification["signals"],
        "extraction_method": extraction_method,
        "ocr_provider": ocr_provider,
        "page_results": page_results,
        "page_count": len(page_results),
        "total_blocks": sum(len(page.blocks) for page in page_results),
        "blocks": structured_blocks,
        "data": parsed["data"],
        "mapped_sections": parsed.get("mapped_sections") or build_empty_mapped_sections(),
        "cleaned_json": parsed.get("cleaned_json") or parsed.get("mapped_sections") or build_empty_mapped_sections(),
        "document_analysis": parsed.get("document_analysis")
        or normalize_document_analysis(build_empty_document_analysis()),
        "correction_log": parsed.get("correction_log") or [],
        "detected_sections": parsed["detected_sections"],
        "builder_sections": parsed["builder_sections"],
        "layout": parsed["layout"],
        "raw_text": raw_text,
        "content": raw_text,
        "clean_html": clean_html,
        "markdown_pages": structure_result["markdown_pages"],
        "layout_blocks": structure_result["layout_blocks"],
        "warnings": pipeline_warnings,
        "timings": {
            "ocr_seconds": round(ocr_result["elapsed_seconds"], 3),
            "layout_seconds": round(structure_result["elapsed_seconds"], 3),
            "total_seconds": round(total_elapsed, 3),
        },
    }
