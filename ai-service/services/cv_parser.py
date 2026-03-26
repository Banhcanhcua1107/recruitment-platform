"""
CV Parser Service
─────────────────
Pipeline:
    Upload file
    ↓
    detect_file_type() → "pdf" | "image" | "docx"
    ↓
    extract_text_from_pdf / extract_text_from_image / extract_text_from_docx
    ↓
    normalize_text()   — LLM call 1: fix OCR noise
    ↓
    parse_cv_json()    — LLM call 2: structured JSON
    ↓
    {"raw_text", "clean_text", "cv_json", "avatar_url"}

Models (Ollama):
    OLLAMA_CV_PARSER_MODEL  = qwen2.5-coder:7b  (normalize + parse)
    OLLAMA_CV_SUGGEST_MODEL = qwen3:4b           (suggestions — untouched)
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
from typing import Any

import pdfplumber
import requests
from PIL import Image
from services.cv_content_cleaner import postprocess_mapped_sections
from services.mapped_sections import (
    build_empty_document_analysis,
    mapped_sections_schema_json,
    mapped_sections_to_structured_data,
    normalize_document_analysis,
    normalize_mapped_sections,
)
from services.ocr_service import extract_full_text, run_ocr

logger = logging.getLogger("cv_parser")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CV_PARSER_MODEL = os.getenv("OLLAMA_CV_PARSER_MODEL", "qwen2.5-coder:7b")

# ─────────────────────────────────────────────────────────────────────
# Step 1 — File-type detection
# ─────────────────────────────────────────────────────────────────────

def detect_file_type(content_type: str, filename: str) -> str:
    """Return 'pdf', 'image', or 'docx'."""
    ct = (content_type or "").lower()
    ext = os.path.splitext(filename or "")[-1].lower()

    if ct == "application/pdf" or ext == ".pdf":
        return "pdf"
    if ct.startswith("image/") or ext in (".png", ".jpg", ".jpeg", ".webp"):
        return "image"
    if "wordprocessingml" in ct or ext == ".docx":
        return "docx"
    # Fallback: try PDF by extension heuristic
    return "pdf"


# ─────────────────────────────────────────────────────────────────────
# Step 2 — Text extraction per file type
# ─────────────────────────────────────────────────────────────────────

def _extract_avatar_b64(pdf_bytes: bytes) -> str | None:
    """Crop the first page to an image and return base64, or None."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        # Render at 150 dpi
        mat = fitz.Matrix(150 / 72, 150 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        doc.close()

        # We only keep the top-left quarter where avatars typically live
        w, h = img.size
        avatar_region = img.crop((0, 0, w // 3, h // 3))

        buf = io.BytesIO()
        avatar_region.save(buf, format="JPEG", quality=80)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        logger.warning("Avatar extraction failed: %s", e)
        return None


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, str | None, int]:
    """
    Use pdfplumber to extract the selectable text layer from a PDF.
    Returns (raw_text, avatar_base64_or_None).
    """
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t.strip())

    raw_text = "\n\n".join(text_parts).strip()
    avatar_b64 = _extract_avatar_b64(pdf_bytes)
    return raw_text, avatar_b64, page_count


def extract_text_from_image(
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    filename: str = "image.jpg",
) -> tuple[str, int]:
    page_results = run_ocr(
        image_bytes,
        content_type=content_type,
        filename=filename,
        apply_llm_correction=True,
    )
    return extract_full_text(page_results), len(page_results)


def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extract plain text from a DOCX file via python-docx.

    Extracts in document order:
    - Paragraphs (including list items detected by numPr or style name)
    - Table cell contents (row-by-row, cells joined by tab)
    """
    try:
        from docx import Document  # python-docx
        from docx.oxml.ns import qn
    except ImportError as exc:
        raise RuntimeError("python-docx is not installed: pip install python-docx") from exc

    doc = Document(io.BytesIO(docx_bytes))
    parts: list[str] = []

    for element in doc.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            from docx.text.paragraph import Paragraph
            para = Paragraph(element, doc)
            text = para.text.strip()
            if not text:
                continue
            style_name = (para.style.name or "").lower()
            pPr = element.find(qn("w:pPr"))
            has_num = pPr is not None and pPr.find(qn("w:numPr")) is not None
            if has_num or "list" in style_name:
                parts.append(f"• {text}")
            else:
                parts.append(text)

        elif tag == "tbl":
            from docx.table import Table
            table = Table(element, doc)
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    parts.append("\t".join(cells))

    return "\n".join(parts)



# Patterns that indicate a Vietnamese diacritic character split across a space:
# e.g. "l àm" -> "làm", "vi ệc" -> "việc"
_BROKEN_VI_PATTERNS = [
    (re.compile(r'(?<=[a-zA-Z])(\s)(?=[àáâãèéêìíîòóôõùúûýăđêôơưÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÝĂĐÔƠƯ])'), ''),
    (re.compile(r'(?<=[àáâãèéêìíîòóôõùúûýăđêôơưÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÝĂĐÔƠƯ])(\s)(?=[a-zA-Z])'), ''),
]


def clean_ocr_text(text: str) -> str:
    """
    Pre-process raw OCR text before passing to the LLM.

    Steps:
    1. Merge characters split by OCR: "l àm vi ệc" → "làm việc"
    2. Collapse multiple spaces / tabs into a single space.
    3. Limit consecutive blank lines to 2.

    Examples:
        clean_ocr_text("l àm vi ệc")  → "làm việc"
        clean_ocr_text("c ông ty")     → "công ty"
        clean_ocr_text("ng ôn ng ữ")  → "ngôn ngữ"
    """
    t = text
    for pattern, repl in _BROKEN_VI_PATTERNS:
        t = pattern.sub(repl, t)
    # Collapse horizontal whitespace
    t = re.sub(r"[ \t]+", " ", t)
    # Collapse excess blank lines
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


# ─────────────────────────────────────────────────────────────────────
# Step 4 — LLM helper
# ─────────────────────────────────────────────────────────────────────

def _call_llm(prompt: str, temperature: float = 0.0, timeout: int = 180) -> str:
    """POST to Ollama /api/generate, return raw response text."""
    payload = {
        "model": OLLAMA_CV_PARSER_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"LLM request failed: {e}") from e


# ─────────────────────────────────────────────────────────────────────
# Step 4 — Normalize OCR / raw text
# ─────────────────────────────────────────────────────────────────────

def normalize_text(raw_text: str) -> str:
    """
    LLM call #1 — fix OCR noise, Vietnamese diacritics, spacing.

    The input is first pre-cleaned by clean_ocr_text() in parse_cv().
    Returns cleaned plain text (not JSON).
    """
    prompt = f"""You are a Vietnamese OCR text normalization system.

Tasks:
1. Fix broken characters from OCR such as:
   "l àm vi ệc" → "làm việc"
   "c ông ty" → "công ty"
   "ng ôn ng ữ" → "ngôn ngữ"

2. Fix spacing problems inside words.

3. Restore Vietnamese diacritics if possible:
   "Muc tieu nghe nghiep" → "Mục tiêu nghề nghiệp"
   "Ngon ngu lap trinh"   → "Ngôn ngữ lập trình"

4. Keep the original meaning of the CV. Do NOT invent or add information.

5. Preserve CV sections and ensure each section title is on its OWN LINE,
   separated from the paragraph content below it. For example:

   CORRECT:
   Mục tiêu nghề nghiệp
   Mong muốn tham gia kỳ thực tập tại công ty công nghệ...

   WRONG (do not merge title with content):
   Mục tiêu nghề nghiệp Mong muốn tham gia...

   Common section titles to watch for:
   - Thông tin cá nhân
   - Mục tiêu nghề nghiệp
   - Kỹ năng
   - Học vấn
   - Dự án
   - Kinh nghiệm
   - Chứng chỉ
   - Sở thích

6. Do NOT translate to another language.

7. Preserve list hierarchy and keep nested bullet points on separate lines.

8. Never move contact information into the objective/summary section.
   Email, phone, address, and URLs must stay as separate contact lines.

Return ONLY the normalized text, no explanations.

OCR TEXT:
{raw_text}"""

    try:
        return _call_llm(prompt)
    except Exception as e:
        logger.warning("Normalization LLM failed, using raw text: %s", e)
        return raw_text


# ─────────────────────────────────────────────────────────────────────
# Step 5 — Parse structured JSON
# ─────────────────────────────────────────────────────────────────────

_CV_SCHEMA = mapped_sections_schema_json()


def build_parse_cv_mapping_prompt(source_payload: Any) -> str:
    payload = source_payload if isinstance(source_payload, dict) else {"clean_text": str(source_payload or "")}
    return f"""Ban la AI map du lieu CV JSON vao dung section giao dien.

Hay doc JSON dau vao va gan tung field vao dung box hien thi sau:
- candidate
- personal_info
- summary
- career_objective
- education
- skills
- projects
- experience
- certificates
- hobbies
- languages
- awards
- others

Quy tac:
- Khong sua noi dung.
- Khong them du lieu.
- Chi phan loai dung section.
- Neu khong ro, cho vao others.
- Candidate chi chua ten ung vien, vi tri ung tuyen, avatar.
- Summary va career_objective la hai section khac nhau.
- Luon tra day du tat ca top-level keys trong schema, doi tuong rong hoac mang rong neu khong co du lieu.
- Chi tra ve JSON hop le, khong markdown, khong giai thich.

SCHEMA:
{_CV_SCHEMA}

INPUT JSON:
{json.dumps(payload, ensure_ascii=False, indent=2)}"""


def _extract_first_json_object(raw: str) -> dict[str, Any]:
    content = raw
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    content = content.strip()

    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        logger.error("LLM returned no JSON object. Raw: %s", content[:300])
        return {}

    try:
        return json.loads(content[start : end + 1])
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s | Content: %s", e, content[:300])
        return {}


def parse_cv_json(source_payload: Any) -> dict[str, Any]:
    """
    LLM call #2 — map OCR/text context into mapped_sections.
    """
    payload = source_payload if isinstance(source_payload, dict) else {"clean_text": str(source_payload or "")}
    prompt = f"""Ban la AI chuyen phan tich du lieu CV/ho so ung vien tu JSON OCR tho.

Nhiem vu:
1. Doc toan bo JSON dau vao.
2. Hieu ngu nghia tung field, ke ca khi key dat sai hoac khong chuan.
3. Phan loai du lieu vao dung nhom noi dung de hien thi tren giao dien CV.
4. Tra ve JSON hop le theo dung schema.

Quy tac:
1. Chi tra ve JSON hop le, khong them giai thich hay markdown.
2. Khong duoc bịa them du lieu.
3. Neu mot field chua ro, dua vao others.
4. Neu du lieu bi lan nhieu y trong cung field, tach logic neu co the.
5. Candidate chi chua ten ung vien, vi tri ung tuyen, avatar.
6. Summary va career_objective la hai section khac nhau.
7. Luon tra day du tat ca top-level keys trong schema, doi tuong rong hoac mang rong neu khong co du lieu.

SCHEMA:
{_CV_SCHEMA}

INPUT JSON:
{json.dumps(payload, ensure_ascii=False, indent=2)}"""
    prompt = build_parse_cv_mapping_prompt(source_payload)

    try:
        raw = _call_llm(prompt)
    except Exception as e:
        logger.error("Parse LLM failed: %s", e)
        return normalize_mapped_sections({})

    return normalize_mapped_sections(_extract_first_json_object(raw))


# ─────────────────────────────────────────────────────────────────────
# Public orchestrator
# ─────────────────────────────────────────────────────────────────────

def parse_cv(
    file_bytes: bytes,
    content_type: str = "application/pdf",
    filename: str = "",
) -> dict[str, Any]:
    """
    Full pipeline. Returns both:
    - legacy fields: raw_text, clean_text, cv_json, avatar_url
    - builder fields: success, extraction_method, data, page_count, warnings
    """
    file_type = detect_file_type(content_type, filename)
    logger.info("CV parse — file_type=%s filename=%s", file_type, filename)

    avatar_b64: str | None = None
    page_count = 0
    extraction_method = "unknown"
    warnings: list[str] = []

    # ── Extract
    if file_type == "pdf":
        raw_text, avatar_b64, page_count = extract_text_from_pdf(file_bytes)
        extraction_method = "pdf_text_layer"
        # If pdfplumber yields too little text, the PDF is likely scanned/image-based.
        # Fall back to OCR on all pages via RapidOCR.
        if len(raw_text.split()) < 30:
            logger.info("PDF text layer thin (%d words) — falling back to image OCR", len(raw_text.split()))
            try:
                page_results = run_ocr(
                    file_bytes,
                    content_type="application/pdf",
                    filename=filename or "document.pdf",
                    apply_llm_correction=True,
                )
                raw_text = extract_full_text(page_results)
                page_count = len(page_results)
                extraction_method = "pdf_ocr_fallback"
                warnings.append("PDF text layer mỏng, đã chuyển sang OCR fallback.")
            except Exception as e:
                logger.warning("Fallback OCR failed: %s", e)
                warnings.append(f"OCR fallback failed: {e}")

    elif file_type == "image":
        raw_text, page_count = extract_text_from_image(
            file_bytes,
            content_type=content_type,
            filename=filename or "image.jpg",
        )
        extraction_method = "image_ocr"

    elif file_type == "docx":
        raw_text = extract_text_from_docx(file_bytes)
        page_count = 1 if raw_text else 0
        extraction_method = "docx_text"

    else:
        raw_text = ""

    if not raw_text.strip():
        logger.warning("No text extracted from CV file.")
        return {
            "success": False,
            "extraction_method": extraction_method,
            "data": {
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
                "career_objective": None,
                "skills": [],
                "experience": [],
                "education": [],
                "projects": [],
                "certifications": [],
                "languages": [],
                "awards": [],
                "hobbies": [],
                "others": [],
                "raw_text": "",
            },
            "page_count": page_count,
            "warnings": warnings + ["Không trích xuất được văn bản từ tài liệu."],
            "raw_text": "",
            "clean_text": "",
            "cv_json": {},
            "mapped_sections": normalize_mapped_sections({}),
            "cleaned_json": normalize_mapped_sections({}),
            "document_analysis": normalize_document_analysis(build_empty_document_analysis()),
            "correction_log": [],
            "avatar_url": None,
        }

    # ── Pre-clean OCR artifacts, then normalize via LLM
    pre_cleaned = clean_ocr_text(raw_text)
    clean_text = normalize_text(pre_cleaned)

    # ── Build avatar URL string (data URI for direct <img src=...> usage)
    avatar_url: str | None = None
    if avatar_b64:
        avatar_url = f"data:image/jpeg;base64,{avatar_b64}"

    source_payload = {
        "source_kind": file_type,
        "filename": filename,
        "page_count": page_count,
        "raw_text": raw_text,
        "clean_text": clean_text,
    }
    mapped_sections = normalize_mapped_sections(
        parse_cv_json(source_payload),
        avatar_url=avatar_url,
    )
    postprocess_result = postprocess_mapped_sections(mapped_sections, call_llm=_call_llm)
    cleaned_json = normalize_mapped_sections(
        postprocess_result.get("mapped_sections") or mapped_sections,
        avatar_url=avatar_url,
    )
    document_analysis = normalize_document_analysis(
        postprocess_result.get("document_analysis"),
        mapped_sections=cleaned_json,
    )
    correction_log = postprocess_result.get("correction_log") or []
    structured_data = mapped_sections_to_structured_data(cleaned_json, raw_text=raw_text)

    return {
        "success": True,
        "extraction_method": extraction_method,
        "data": structured_data,
        "page_count": page_count,
        "warnings": warnings,
        "raw_text": raw_text,
        "clean_text": clean_text,
        "cv_json": cleaned_json,
        "mapped_sections": mapped_sections,
        "cleaned_json": cleaned_json,
        "document_analysis": document_analysis,
        "correction_log": correction_log,
        "avatar_url": avatar_url,
    }
