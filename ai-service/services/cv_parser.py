"""
CV Parser Service
─────────────────
1. Primary:   pdfplumber  – extracts selectable text from digital PDFs.
2. Fallback:  Ollama qwen3-vl:4b  – multimodal OCR for scanned/image PDFs.
3. Output:    Structured ParsedCV model via regex + heuristic sectioning.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import urllib.error
import urllib.request

import pdfplumber

from models import (
    CertificationEntry,
    ContactInfo,
    EducationEntry,
    ExperienceEntry,
    ExtractionMethod,
    ParsedCV,
    ProjectEntry,
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# qwen3-vl:4b → quét & đọc CV (multimodal OCR)
OLLAMA_OCR_MODEL = os.getenv("OLLAMA_CV_PARSER_MODEL", "qwen3-vl:4b")


# ── helpers ─────────────────────────────────────────────── = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?")

# Section headings commonly found in CVs (case-insensitive)
_SECTION_PATTERNS: dict[str, re.Pattern[str]] = {
    "summary": re.compile(
        r"^(?:summary|objective|profile|about\s*me|giới\s*thiệu|tóm\s*tắt)",
        re.IGNORECASE,
    ),
    "experience": re.compile(
        r"^(?:experience|work\s*experience|employment|kinh\s*nghiệm|professional\s*experience)",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^(?:education|academic|học\s*vấn|trình\s*độ)",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^(?:skills|technical\s*skills|competencies|kỹ\s*năng)",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^(?:projects|personal\s*projects|dự\s*án)",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^(?:certifications?|licenses?|chứng\s*chỉ)",
        re.IGNORECASE,
    ),
    "languages": re.compile(
        r"^(?:languages|ngôn\s*ngữ)",
        re.IGNORECASE,
    ),
}


# ═════════════════════════════════════════════════════════════
# 1. Text extraction
# ═════════════════════════════════════════════════════════════


def extract_text_with_pdfplumber(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract selectable text from a PDF using pdfplumber.

    Returns
    -------
    (text, page_count)
    """
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip(), page_count


def extract_text_with_ollama_ocr(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract text from a scanned PDF using Ollama qwen3-vl:4b (multimodal OCR).

    Strategy
    --------
    1. Convert each PDF page to a PNG image via pypdfium2 (bundled with pdfplumber).
    2. Base64-encode the image.
    3. Send to Ollama /api/chat with the qwen3-vl:4b vision model.
    4. Accumulate per-page text.

    Returns
    -------
    (text, page_count)
    """
    import pypdfium2 as pdfium  # installed as pdfplumber dependency

    texts: list[str] = []
    doc = pdfium.PdfDocument(pdf_bytes)
    page_count = len(doc)

    for page_index in range(page_count):
        page   = doc[page_index]
        bitmap = page.render(scale=2.0)  # 2× scale → better OCR quality
        pil_image = bitmap.to_pil()

        buf = io.BytesIO()
        pil_image.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        payload = json.dumps({
            "model": OLLAMA_OCR_MODEL,
            "stream": False,
            "think": False,          # disable Qwen3-VL extended-thinking mode
            "options": {"temperature": 0.0, "num_predict": 4096},
            "messages": [{
                "role": "user",
                "content": (
                    "Please transcribe ALL text visible in this CV/resume image. "
                    "Preserve the original structure (sections, bullet points, dates). "
                    "Output plain text only, no commentary."
                ),
                "images": [img_b64],
            }],
        }).encode()

        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.loads(resp.read().decode())
                msg = body.get("message", {})
                page_text = (msg.get("content") or msg.get("thinking") or "").strip()
                texts.append(page_text)
                logger.info("[cv_parser] OCR page %d: %d chars", page_index + 1, len(page_text))
        except urllib.error.URLError as exc:
            logger.error("[cv_parser] Ollama OCR page %d failed: %s", page_index + 1, exc)
            texts.append("")

    doc.close()
    return "\n".join(texts).strip(), page_count


# ═════════════════════════════════════════════════════════════
# 2. Structuring
# ═════════════════════════════════════════════════════════════


def _detect_sections(text: str) -> dict[str, str]:
    """Split raw text into named sections based on heading patterns."""
    lines = text.split("\n")
    sections: dict[str, list[str]] = {}
    current_section = "header"
    sections[current_section] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        matched = False
        for section_name, pattern in _SECTION_PATTERNS.items():
            if pattern.match(stripped):
                current_section = section_name
                sections.setdefault(current_section, [])
                matched = True
                break

        if not matched:
            sections.setdefault(current_section, [])
            sections[current_section].append(stripped)

    return {k: "\n".join(v) for k, v in sections.items()}


def _extract_contact(text: str) -> ContactInfo:
    email_match = _EMAIL_RE.search(text)
    phone_match = _PHONE_RE.search(text)
    linkedin_match = _LINKEDIN_RE.search(text)
    return ContactInfo(
        email=email_match.group(0) if email_match else None,
        phone=phone_match.group(0) if phone_match else None,
        linkedin=linkedin_match.group(0) if linkedin_match else None,
    )


def _extract_name(header_text: str) -> str | None:
    """Heuristic: the first non-empty line in the header is usually the name."""
    for line in header_text.split("\n"):
        clean = line.strip()
        # Skip lines that look like emails, phones, or URLs
        if clean and not _EMAIL_RE.match(clean) and not _PHONE_RE.match(clean):
            return clean
    return None


def _parse_skills(text: str) -> list[str]:
    """Split a skills section into individual skill tokens."""
    # Common delimiters: comma, pipe, bullet, semicolon, newline
    raw = re.split(r"[,|;•·●▪►\n]", text)
    return [s.strip(" -–—") for s in raw if s.strip(" -–—")]


def _parse_experience(text: str) -> list[ExperienceEntry]:
    """
    Best-effort experience parser.
    Splits on lines that look like company names or date ranges.
    """
    entries: list[ExperienceEntry] = []
    blocks = re.split(r"\n(?=[A-Z])", text)
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
        entry = ExperienceEntry(
            company=lines[0] if lines else None,
            title=lines[1] if len(lines) > 1 else None,
            description="\n".join(lines[2:]) if len(lines) > 2 else None,
        )
        entries.append(entry)
    return entries


def _parse_education(text: str) -> list[EducationEntry]:
    entries: list[EducationEntry] = []
    blocks = re.split(r"\n(?=[A-Z])", text)
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
        entries.append(
            EducationEntry(
                institution=lines[0] if lines else None,
                degree=lines[1] if len(lines) > 1 else None,
                field_of_study=lines[2] if len(lines) > 2 else None,
            )
        )
    return entries


def _parse_projects(text: str) -> list[ProjectEntry]:
    entries: list[ProjectEntry] = []
    blocks = re.split(r"\n(?=[A-Z])", text)
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
        entries.append(
            ProjectEntry(
                name=lines[0],
                description="\n".join(lines[1:]) if len(lines) > 1 else None,
            )
        )
    return entries


def _parse_certifications(text: str) -> list[CertificationEntry]:
    entries: list[CertificationEntry] = []
    for line in text.split("\n"):
        clean = line.strip(" -–—•")
        if clean:
            entries.append(CertificationEntry(name=clean))
    return entries


def _parse_languages(text: str) -> list[str]:
    raw = re.split(r"[,|;•\n]", text)
    return [l.strip(" -–—") for l in raw if l.strip(" -–—")]


def structure_cv(raw_text: str) -> ParsedCV:
    """Convert raw CV text into a structured ParsedCV."""
    sections = _detect_sections(raw_text)

    header_text = sections.get("header", "")
    return ParsedCV(
        full_name=_extract_name(header_text),
        contact=_extract_contact(raw_text),
        summary=sections.get("summary"),
        skills=_parse_skills(sections.get("skills", "")),
        experience=_parse_experience(sections.get("experience", "")),
        education=_parse_education(sections.get("education", "")),
        projects=_parse_projects(sections.get("projects", "")),
        certifications=_parse_certifications(
            sections.get("certifications", "")
        ),
        languages=_parse_languages(sections.get("languages", "")),
        raw_text=raw_text,
    )


# ═════════════════════════════════════════════════════════════
# 3. Public orchestrator
# ═════════════════════════════════════════════════════════════


def parse_cv(
    pdf_bytes: bytes,
) -> tuple[ParsedCV, ExtractionMethod, int, list[str]]:
    """
    End-to-end pipeline: extract → structure.

    Returns
    -------
    (parsed_cv, method_used, page_count, warnings)
    """
    warnings: list[str] = []
    method = ExtractionMethod.TEXT

    # 1️⃣ Try pdfplumber (selectable text)
    raw_text, page_count = extract_text_with_pdfplumber(pdf_bytes)

    # 2️⃣ Fallback to Ollama qwen3-vl:4b if text is too short (likely scanned)
    if len(raw_text.split()) < 30:
        warnings.append(
            "Text extraction yielded minimal content – "
            f"falling back to Ollama OCR ({OLLAMA_OCR_MODEL})."
        )
        method = ExtractionMethod.OCR
        try:
            ocr_text, ocr_pages = extract_text_with_ollama_ocr(pdf_bytes)
            if ocr_text:
                raw_text = ocr_text
                page_count = ocr_pages
            else:
                warnings.append(
                    f"Ollama OCR ({OLLAMA_OCR_MODEL}) returned empty text. "
                    "Ensure Ollama is running and the model is pulled: "
                    f"ollama pull {OLLAMA_OCR_MODEL}"
                )
        except Exception as exc:
            warnings.append(f"Ollama OCR failed: {exc}")

    parsed = structure_cv(raw_text)
    return parsed, method, page_count, warnings
