from __future__ import annotations

import base64
import io
import logging
import os
import re
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
        return background
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _detect_file_type(content_type: str | None, filename: str | None, file_bytes: bytes) -> str:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type == "application/pdf" or filename.endswith(".pdf") or file_bytes.startswith(b"%PDF"):
        return "pdf"
    if content_type.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")):
        return "image"
    raise InvalidCVFormatError("Unsupported CV format. Only PDF and image uploads are supported.")


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


def _run_ppocrv5_on_pages(prepared_pages: list[PreparedPage], min_confidence: float) -> dict[str, Any]:
    start = time.perf_counter()
    pages: list[OCRPageResult] = []
    raw_results: list[dict[str, Any]] = []

    for prepared_page in prepared_pages:
        payload = {
            "file": _encode_payload(prepared_page.file_bytes),
            "fileType": prepared_page.file_type,
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useTextlineOrientation": False,
        }
        response_body = _post_paddle_request(PP_OCR_V5_URL, payload)
        result = response_body.get("result") or {}
        page_payloads = result.get("ocrResults") or [result]
        page_payload = page_payloads[0] if page_payloads else {}
        pages.append(_parse_ppocr_page(page_payload, prepared_page.page, prepared_page.image, min_confidence))
        raw_results.append(page_payload)

    elapsed = time.perf_counter() - start
    logger.info("PP-OCRv5 completed in %.2fs for %d page(s)", elapsed, len(prepared_pages))
    return {
        "pages": pages,
        "raw_results": raw_results,
        "elapsed_seconds": elapsed,
    }


def _run_ppstructure_on_pages(prepared_pages: list[PreparedPage]) -> dict[str, Any]:
    start = time.perf_counter()
    structure_pages: list[dict[str, Any]] = []
    markdown_pages: list[str] = []
    layout_blocks: list[dict[str, Any]] = []

    for prepared_page in prepared_pages:
        payload = {
            "file": _encode_payload(prepared_page.file_bytes),
            "fileType": prepared_page.file_type,
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useTextlineOrientation": False,
            "useChartRecognition": False,
        }
        response_body = _post_paddle_request(PP_STRUCTURE_V3_URL, payload)
        result = response_body.get("result") or {}
        page_payloads = result.get("layoutParsingResults") or [result]
        page_payload = page_payloads[0] if page_payloads else {}
        markdown_text = ((page_payload.get("markdown") or {}).get("text") or "").strip()
        markdown_pages.append(markdown_text)

        page_layout_blocks: list[dict[str, Any]] = []
        _collect_layout_items(page_payload, prepared_page.page, page_layout_blocks)
        for block in page_layout_blocks:
            layout_blocks.append(block)

        structure_pages.append(
            {
                "page": prepared_page.page,
                "markdown": markdown_text,
                "layout_blocks": page_layout_blocks,
                "raw_result": page_payload,
            }
        )

    elapsed = time.perf_counter() - start
    logger.info("PP-StructureV3 completed in %.2fs for %d page(s)", elapsed, len(prepared_pages))
    return {
        "pages": structure_pages,
        "layout_blocks": layout_blocks,
        "markdown_pages": markdown_pages,
        "elapsed_seconds": elapsed,
    }


def run_ppocrv5(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    prepared_pages = _prepare_document_pages(file_bytes, content_type=content_type, filename=filename)
    return _run_ppocrv5_on_pages(prepared_pages, min_confidence=min_confidence)


def run_ppstructure(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
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


def process_cv(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    start = time.perf_counter()
    prepared_pages = _prepare_document_pages(file_bytes, content_type=content_type, filename=filename)
    ocr_result = _run_ppocrv5_on_pages(prepared_pages, min_confidence=min_confidence)
    structure_result = _run_ppstructure_on_pages(prepared_pages)

    page_results: list[OCRPageResult] = ocr_result["pages"]
    parsed = parse_structured_cv_from_ocr(page_results)
    structured_blocks = _build_structured_blocks(page_results, parsed, structure_result["layout_blocks"])
    total_elapsed = time.perf_counter() - start

    return {
        "success": True,
        "extraction_method": "paddle_ppocrv5_ppstructurev3",
        "ocr_provider": "PP-OCRv5 + PP-StructureV3",
        "page_results": page_results,
        "page_count": len(page_results),
        "total_blocks": sum(len(page.blocks) for page in page_results),
        "blocks": structured_blocks,
        "data": parsed["data"],
        "detected_sections": parsed["detected_sections"],
        "builder_sections": parsed["builder_sections"],
        "layout": parsed["layout"],
        "raw_text": parsed["raw_text"],
        "markdown_pages": structure_result["markdown_pages"],
        "layout_blocks": structure_result["layout_blocks"],
        "timings": {
            "ocr_seconds": round(ocr_result["elapsed_seconds"], 3),
            "layout_seconds": round(structure_result["elapsed_seconds"], 3),
            "total_seconds": round(total_elapsed, 3),
        },
    }