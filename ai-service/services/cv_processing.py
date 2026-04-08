from __future__ import annotations

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
from typing import Any

from pdf2image import convert_from_bytes
from PIL import Image, ImageOps

from services.cv_content_cleaner import postprocess_mapped_sections
from services.cv_html_renderer import render_clean_cv_html
from services.cv_layout_parser import parse_structured_cv_from_ocr
from services.cv_parser import _call_llm, parse_cv_json
from services.google_vision_ocr import extract_clean_text, run_google_vision_on_pages
from services.mapped_sections import (
    build_builder_sections_from_mapped_sections,
    build_empty_document_analysis,
    build_empty_mapped_sections,
    has_meaningful_mapped_sections,
    mapped_sections_to_structured_data,
    normalize_document_analysis,
    normalize_mapped_sections,
)
from services.ocr_common import OCRPageResult

logger = logging.getLogger("cv_processing")

PDF_RENDER_DPI = int(os.getenv("CV_OCR_PDF_DPI", os.getenv("PADDLE_OCR_PDF_DPI", "200")))
OCR_MAX_IMAGE_EDGE = max(1200, int(os.getenv("OCR_MAX_IMAGE_EDGE", "1800")))
SOFFICE_TIMEOUT_SECONDS = max(15, int(os.getenv("SOFFICE_TIMEOUT_SECONDS", "35")))
DOCX_PDF_CACHE_TTL_SECONDS = max(60, int(os.getenv("DOCX_PDF_CACHE_TTL_SECONDS", "900")))
DOCX_PDF_CACHE_MAX_ITEMS = max(4, int(os.getenv("DOCX_PDF_CACHE_MAX_ITEMS", "16")))
_DOCX_PDF_CACHE: dict[str, tuple[float, bytes]] = {}


class CVProcessingError(RuntimeError):
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
    configured_path = (os.getenv("SOFFICE_PATH") or "").strip().strip('"')
    if configured_path:
        return [configured_path]

    for candidate in ("soffice", "soffice.com", "soffice.exe", "libreoffice"):
        resolved = shutil.which(candidate)
        if resolved:
            return [resolved]

    windows_candidates = [
        r"C:\Program Files\LibreOffice\program\soffice.com",
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.com",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for candidate in windows_candidates:
        if os.path.exists(candidate):
            return [candidate]

    raise CVProcessingError(
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
    cached = _get_cached_docx_pdf_bytes(docx_bytes)
    if cached is not None:
        logger.info("DOCX to PDF cache hit")
        return cached

    soffice_cmd = _resolve_soffice_command()
    with tempfile.TemporaryDirectory() as tmp:
        docx_path = os.path.join(tmp, "input.docx")
        out_dir = os.path.join(tmp, "out")
        os.makedirs(out_dir, exist_ok=True)
        user_profile_dir = os.path.join(tmp, "lo-profile")
        os.makedirs(user_profile_dir, exist_ok=True)
        with open(docx_path, "wb") as docx_file:
            docx_file.write(docx_bytes)

        command = soffice_cmd + [
            f"-env:UserInstallation=file:///{user_profile_dir.replace(os.sep, '/')}",
            "--headless",
            "--invisible",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--norestore",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            out_dir,
            docx_path,
        ]

        try:
            started_at = time.perf_counter()
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                timeout=SOFFICE_TIMEOUT_SECONDS,
            )
            elapsed = time.perf_counter() - started_at
            logger.info("LibreOffice DOCX to PDF finished in %.2fs", elapsed)
        except subprocess.TimeoutExpired as exc:
            raise CVProcessingError(
                f"DOCX conversion timed out after {SOFFICE_TIMEOUT_SECONDS}s. "
                "Check LibreOffice headless execution or increase SOFFICE_TIMEOUT_SECONDS."
            ) from exc
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or b"").decode("utf-8", errors="replace").strip()
            stdout = (exc.stdout or b"").decode("utf-8", errors="replace").strip()
            detail = stderr or stdout or str(exc)
            raise CVProcessingError(f"LibreOffice DOCX conversion failed: {detail}") from exc

        pdf_candidates = [
            os.path.join(out_dir, name)
            for name in os.listdir(out_dir)
            if name.lower().endswith(".pdf")
        ]
        if not pdf_candidates:
            stdout = (result.stdout or b"").decode("utf-8", errors="replace").strip()
            stderr = (result.stderr or b"").decode("utf-8", errors="replace").strip()
            detail = stderr or stdout or "No PDF output generated"
            raise CVProcessingError(f"LibreOffice did not generate PDF output: {detail}")

        with open(pdf_candidates[0], "rb") as pdf_file:
            pdf_bytes = pdf_file.read()

        if not pdf_bytes:
            raise CVProcessingError("LibreOffice generated an empty PDF output.")

        _store_cached_docx_pdf_bytes(docx_bytes, pdf_bytes)
        return pdf_bytes


def _detect_file_type(content_type: str | None, filename: str | None, file_bytes: bytes) -> str:
    normalized_content_type = (content_type or "").lower()
    normalized_filename = (filename or "").lower()

    if (
        normalized_content_type == "application/pdf"
        or normalized_filename.endswith(".pdf")
        or file_bytes.startswith(b"%PDF")
    ):
        return "pdf"

    if normalized_content_type.startswith("image/") or normalized_filename.endswith(
        (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")
    ):
        return "image"

    if "wordprocessingml.document" in normalized_content_type or normalized_filename.endswith(".docx"):
        return "docx"

    raise InvalidCVFormatError("Unsupported CV format. Only PDF, image, and DOCX uploads are supported.")


def build_preview_payload(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
    file_kind = _detect_file_type(content_type, filename, file_bytes)

    if file_kind == "docx":
        pdf_bytes = _docx_to_pdf_bytes(file_bytes)
        source_name = filename or "document.docx"
        if source_name.lower().endswith(".docx"):
            preview_name = source_name[:-5] + ".pdf"
        else:
            preview_name = source_name + ".pdf"
        return {
            "file_type": "docx",
            "preview_mime": "application/pdf",
            "preview_filename": preview_name,
            "preview_bytes": pdf_bytes,
        }

    if file_kind == "pdf":
        return {
            "file_type": "pdf",
            "preview_mime": "application/pdf",
            "preview_filename": filename or "upload.pdf",
            "preview_bytes": file_bytes,
        }

    image_mime = (content_type or "image/png").lower()
    if not image_mime.startswith("image/"):
        image_mime = "image/png"
    return {
        "file_type": "image",
        "preview_mime": image_mime,
        "preview_filename": filename or "upload.png",
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
            raise CVProcessingError(f"Failed to convert DOCX to PDF: {exc}") from exc
        file_kind = "pdf"

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
            rendered_pages.append(Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples))
        pdf.close()
        images = rendered_pages
    except Exception as fitz_exc:
        logger.warning("PyMuPDF PDF rendering failed, falling back to pdf2image: %s", fitz_exc)
        try:
            images = convert_from_bytes(file_bytes, dpi=PDF_RENDER_DPI, fmt="png")
        except Exception as pdf2image_exc:
            raise CVProcessingError(
                "Failed to render PDF pages. PyMuPDF and pdf2image rendering both failed. "
                "Install Poppler if you need the pdf2image fallback."
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


def _normalize_block_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


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


def _layout_type_for_line(page_number: int, pixel_bbox: list[int], layout_blocks: list[dict[str, Any]]) -> str | None:
    best_match: tuple[float, str] | None = None
    x1, y1, x2, y2 = pixel_bbox

    for block in layout_blocks:
        if int(block.get("page", 0)) != page_number:
            continue

        normalized_bbox = _normalize_bbox(block.get("bbox") or [0, 0, 0, 0])
        if not normalized_bbox:
            continue
        bx1, by1, bx2, by2 = [float(value) for value in normalized_bbox]

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
    page_dimensions = {page.page: (page.image_width, page.image_height) for page in page_results}
    line_type_map, block_type_map = _section_type_lookup(parsed.get("detected_sections", []))
    structured_blocks: list[dict[str, Any]] = []

    for item in parsed.get("layout", {}).get("reading_order", []):
        page_number = int(item.get("page", 1))
        image_width, image_height = page_dimensions.get(page_number, (1000, 1400))
        percent_bbox = [float(value) for value in item.get("bbox", [0, 0, 0, 0])]
        pixel_bbox = _percent_bbox_to_pixels(percent_bbox, image_width, image_height)

        block_type = line_type_map.get(str(item.get("id")))
        if block_type is None:
            for block_index in item.get("block_indices", []):
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
        re.search(
            r"(?:0?[1-9]|1[0-2])[/\-]\d{4}\s*(?:-|–|—|to)\s*(?:present|now|hien\s*tai|hiện\s*tại|(?:0?[1-9]|1[0-2])[/\-]\d{4})",
            lowered,
        )
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
    del raw_text
    return {
        "data": dict(parsed.get("data", {})),
        "mapped_sections": dict(parsed.get("mapped_sections", {})),
        "cleaned_json": dict(parsed.get("cleaned_json", parsed.get("mapped_sections", {}))),
        "document_analysis": dict(parsed.get("document_analysis", {})),
        "correction_log": list(parsed.get("correction_log", [])),
        "detected_sections": list(parsed.get("detected_sections", [])),
        "builder_sections": list(parsed.get("builder_sections", [])),
        "layout": parsed.get("layout", {}),
        "raw_text": parsed.get("raw_text", ""),
    }


def _build_non_cv_payload(
    *,
    raw_text: str,
    page_results: list[OCRPageResult],
    structured_blocks: list[dict[str, Any]],
    layout_blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

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
            "title": "Document content",
            "content": raw_text,
            "items": [{"text": line} for line in lines],
            "line_ids": [],
            "block_indices": [],
        }
    ]

    builder_sections = [
        {
            "id": "generic-document-outline",
            "type": "rich_outline",
            "title": "Document content",
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
                    for index, line in enumerate(lines)
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
        lines = [_normalize_block_text(block.text) for block in page.blocks if _normalize_block_text(block.text)]
        markdown_pages.append("\n".join(lines).strip())
    return markdown_pages


def process_cv_document(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    start = time.perf_counter()
    file_kind = _detect_file_type(content_type, filename, file_bytes)
    processing_warnings: list[str] = []
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
    except CVProcessingError as exc:
        if file_kind == "docx":
            raise CVProcessingError(f"Failed to convert DOCX to PDF for OCR: {exc}") from exc
        raise

    try:
        ocr_result = run_google_vision_on_pages(prepared_pages, min_confidence=min_confidence)
    except Exception as exc:
        raise CVProcessingError(f"Google Vision OCR failed: {exc}") from exc

    processing_warnings.extend(ocr_result.get("warnings", []))

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
            cleaned_json = normalize_mapped_sections(postprocess_result.get("mapped_sections") or llm_mapped_sections)
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
            processing_warnings.append(
                "Document looks like CV but extracted sections are weak; returning generic extracted content fallback."
            )
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
        "document_analysis": parsed.get("document_analysis") or normalize_document_analysis(build_empty_document_analysis()),
        "correction_log": parsed.get("correction_log") or [],
        "detected_sections": parsed["detected_sections"],
        "builder_sections": parsed["builder_sections"],
        "layout": parsed["layout"],
        "raw_text": raw_text,
        "content": raw_text,
        "clean_html": clean_html,
        "markdown_pages": structure_result["markdown_pages"],
        "layout_blocks": structure_result["layout_blocks"],
        "warnings": processing_warnings,
        "timings": {
            "ocr_seconds": round(ocr_result["elapsed_seconds"], 3),
            "layout_seconds": round(structure_result["elapsed_seconds"], 3),
            "total_seconds": round(total_elapsed, 3),
        },
    }
