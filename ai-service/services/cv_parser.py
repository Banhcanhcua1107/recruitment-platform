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
import unicodedata
from json import JSONDecodeError

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
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_CV_SUGGEST_MODEL", "qwen3:4b")
OLLAMA_CORRECTION_MODEL = os.getenv("OLLAMA_CV_CORRECTION_MODEL", OLLAMA_TEXT_MODEL)

_CV_TEXT_CORRECTION_PROMPT = """Bạn là hệ thống sửa lỗi văn bản tiếng Việt từ OCR.

Nhiệm vụ:
- sửa dấu tiếng Việt
- sửa lỗi chính tả
- sửa lỗi spacing
- sửa lỗi OCR như thiếu chữ, sai chữ, mất ký tự
- giữ nguyên nội dung gốc

Quy tắc:
- Không thêm thông tin mới
- Không thay đổi email, số điện thoại, URL
- Không thay đổi tên riêng
- Chỉ chỉnh sửa nội dung bị lỗi, không viết lại theo ý khác
- Ưu tiên sửa các lỗi OCR thường gặp trong CV như mất dấu, mất chữ, sai chữ, dính chữ, vỡ dòng
- Input là từng block ở dạng JSON lines: {"index": number, "text": string, "protected_tokens": object}
- Output phải giữ nguyên định dạng JSON lines tương ứng, mỗi dòng là 1 object JSON hợp lệ
- Không được đổi giá trị trong protected_tokens

Ví dụ lỗi cần sửa:
- "Lap trinh vien" -> "Lập trình viên"
- "Muc tieu nghe nghiep" -> "Mục tiêu nghề nghiệp"
- "thurc tap" -> "thực tập"
- "kien thrc" -> "kiến thức"
- "xay durng" -> "xây dựng"

Chỉ trả về JSON lines đã sửa, không giải thích."""

_CV_NORMALIZATION_PROMPT = """Bạn là một hệ thống AI chuyên phân tích và chuẩn hóa nội dung CV.

Nhiệm vụ của bạn là:
1. Phân tích văn bản CV được trích xuất từ OCR hoặc PDF.
2. Chuẩn hóa nội dung để đúng chính tả, đúng dấu tiếng Việt và đúng ngữ nghĩa.
3. Sửa lỗi dấu câu, lỗi chính tả và lỗi OCR.
4. Giữ nguyên ý nghĩa ban đầu của nội dung CV.
5. Không tự ý thêm thông tin mới không có trong CV.

QUY TẮC XỬ LÝ

1. Chuẩn hóa dấu tiếng Việt.
2. Sửa lỗi OCR phổ biến.
3. Sửa lỗi spacing.
4. Chuẩn hóa dấu câu.
5. Chuẩn hóa ngữ nghĩa nhưng không làm sai nội dung.
6. Không thêm thông tin mới.
7. Không thay đổi email, số điện thoại, URL, ngày tháng, tên riêng.
8. Giữ nguyên nội dung gốc và chỉ chuẩn hóa phần bị lỗi.
6. Nhận diện và phân loại nội dung vào các phần: full_name, job_title, contact, summary, skills, experience, education, projects, certifications, languages.
7. Nếu một trường không tồn tại, trả về null cho trường đơn và mảng rỗng cho trường dạng danh sách.

FORMAT OUTPUT
- Chỉ trả về JSON hợp lệ.
- Không giải thích.
- Không viết thêm mô tả ngoài JSON.

Schema mong muốn:
{
    "full_name": string | null,
    "job_title": string | null,
    "contact": {
        "email": string | null,
        "phone": string | null,
        "linkedin": string | null,
        "address": string | null
    },
    "summary": string | null,
    "skills": string[],
    "experience": [
        {
            "company": string | null,
            "title": string | null,
            "start_date": string | null,
            "end_date": string | null,
            "description": string | null
        }
    ],
    "education": [
        {
            "institution": string | null,
            "degree": string | null,
            "field_of_study": string | null,
            "start_date": string | null,
            "end_date": string | null,
            "gpa": string | null
        }
    ],
    "projects": [
        {
            "name": string | null,
            "description": string | null,
            "technologies": string[],
            "role": string | null,
            "url": string | null
        }
    ],
    "certifications": [
        {
            "name": string | null,
            "issuer": string | null,
            "date_obtained": string | null
        }
    ],
    "languages": string[]
}"""


# ── helpers ───────────────────────────────────────────────
logger = logging.getLogger("cv_parser")
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?")
_URL_RE = re.compile(r"(?:https?://|www\.)\S+|(?:facebook|github|linkedin)\.com/\S+", re.IGNORECASE)
_DATE_RANGE_RE = re.compile(r"\b\d{1,2}/\d{4}\s*[-–/]\s*\d{1,2}/\d{4}\b|\b\d{4}\s*[-–/]\s*\d{4}\b")
_BULLET_LINE_RE = re.compile(r"^(?:[-•●▪►]|\d+[.)])\s*")
_SECTION_LINE_RE = re.compile(
    r"^(?:ứng viên|học vấn|kỹ năng|khác|thông tin cá nhân|dự án học tập|chứng chỉ|sở thích|front-end|back-end|database|triển khai|ngôn ngữ lập trình|mục tiêu nghề nghiệp)\b",
    re.IGNORECASE,
)

_CV_OCR_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bUng\s+vien\b", re.IGNORECASE), "Ứng viên"),
    (re.compile(r"\bLap\s+trinh\s+vien\b", re.IGNORECASE), "Lập trình viên"),
    (re.compile(r"\bMuc\s+tieu\s+nghe\s+nghiep\b", re.IGNORECASE), "Mục tiêu nghề nghiệp"),
    (re.compile(r"\btham\s+gia\b", re.IGNORECASE), "tham gia"),
    (re.compile(r"\bky\s+thur?c\s+tap\b", re.IGNORECASE), "kỳ thực tập"),
    (re.compile(r"\bthur?c\s+tap\b", re.IGNORECASE), "thực tập"),
    (re.compile(r"\bcong\s+nghe\b", re.IGNORECASE), "công nghệ"),
    (re.compile(r"\btrai\s+nghiem\b", re.IGNORECASE), "trải nghiệm"),
    (re.compile(r"\bmoi\s+truong\b", re.IGNORECASE), "môi trường"),
    (re.compile(r"\blam\s+viec\b", re.IGNORECASE), "làm việc"),
    (re.compile(r"\bap\s+dung\b", re.IGNORECASE), "áp dụng"),
    (re.compile(r"\bki[ée]n\s+thr?c\b", re.IGNORECASE), "kiến thức"),
    (re.compile(r"\bk[ií]e?n\s+thrc\b", re.IGNORECASE), "kiến thức"),
    (re.compile(r"\bdu\s+an\b", re.IGNORECASE), "dự án"),
    (re.compile(r"\bren\s+luyen\b", re.IGNORECASE), "rèn luyện"),
    (re.compile(r"\bky\s+nang\b", re.IGNORECASE), "kỹ năng"),
    (re.compile(r"\bchuyen\s+mon\b", re.IGNORECASE), "chuyên môn"),
    (re.compile(r"\blam\s+viec\s+nhom\b", re.IGNORECASE), "làm việc nhóm"),
    (re.compile(r"\bhuong\s+toi\b", re.IGNORECASE), "hướng tới"),
    (re.compile(r"\btoi\s+la\b", re.IGNORECASE), "tôi là"),
    (re.compile(r"\btro\s+thanh\b", re.IGNORECASE), "trở thành"),
    (re.compile(r"\bHien\s+dang\b", re.IGNORECASE), "Hiện đang"),
    (re.compile(r"\btim\s+kiem\b", re.IGNORECASE), "tìm kiếm"),
    (re.compile(r"\bco\s+hoi\b", re.IGNORECASE), "cơ hội"),
    (re.compile(r"\bHoc\s+van\b", re.IGNORECASE), "Học vấn"),
    (re.compile(r"\bNgon\s+ngu\s+lap\s+trinh\b", re.IGNORECASE), "Ngôn ngữ lập trình"),
    (re.compile(r"\bTrien\s+khai\b", re.IGNORECASE), "Triển khai"),
    (re.compile(r"\bChung\s+chi\b", re.IGNORECASE), "Chứng chỉ"),
    (re.compile(r"\bSo\s+thich\b", re.IGNORECASE), "Sở thích"),
    (re.compile(r"\bThong\s+tin\s+ca\s+nhan\b", re.IGNORECASE), "Thông tin cá nhân"),
    (re.compile(r"\bDai\s+hoc\b", re.IGNORECASE), "Đại học"),
    (re.compile(r"\bHung\s+Vuong\b", re.IGNORECASE), "Hùng Vương"),
    (re.compile(r"\bSinh\s+vien\s+nam\s+3\b", re.IGNORECASE), "Sinh viên năm 3"),
    (re.compile(r"\bChuyen\s+nganh\b", re.IGNORECASE), "Chuyên ngành"),
    (re.compile(r"\bphan\s+mem\b", re.IGNORECASE), "phần mềm"),
    (re.compile(r"\bDo\s+an\s+hoc\s+tap\b", re.IGNORECASE), "Dự án học tập"),
    (re.compile(r"\bMo\s+ta\b", re.IGNORECASE), "Mô tả"),
    (re.compile(r"\bCong\s+nghe\b", re.IGNORECASE), "Công nghệ"),
    (re.compile(r"\bVai\s+tro\b", re.IGNORECASE), "Vai trò"),
    (re.compile(r"\bPhat\s+trien\b", re.IGNORECASE), "Phát triển"),
    (re.compile(r"\bthiet\s+ke\b", re.IGNORECASE), "thiết kế"),
    (re.compile(r"\bgiao\s+dien\b", re.IGNORECASE), "giao diện"),
    (re.compile(r"\bxay\s+d[uư]n[gq]\b", re.IGNORECASE), "xây dựng"),
    (re.compile(r"\bket\s+noi\b", re.IGNORECASE), "kết nối"),
    (re.compile(r"\bco\s+so\s+d[uữ]\s+lieu\b", re.IGNORECASE), "cơ sở dữ liệu"),
    (re.compile(r"\bquan\s+ly\b", re.IGNORECASE), "quản lý"),
    (re.compile(r"\bhoa\s+don\b", re.IGNORECASE), "hóa đơn"),
    (re.compile(r"\bthong\s+ke\b", re.IGNORECASE), "thống kê"),
    (re.compile(r"\btim\s+kiem\s+nang\s+cao\b", re.IGNORECASE), "tìm kiếm nâng cao"),
    (re.compile(r"\bxuat\s+file\s+Excel\b", re.IGNORECASE), "xuất file Excel"),
    (re.compile(r"\bHe\s+thong\b", re.IGNORECASE), "Hệ thống"),
    (re.compile(r"\bchuc\s+nang\b", re.IGNORECASE), "chức năng"),
    (re.compile(r"\bgui\s+email\b", re.IGNORECASE), "gửi email"),
    (re.compile(r"\bbao\s+mat\b", re.IGNORECASE), "bảo mật"),
    (re.compile(r"\bma\s+hoa\s+mat\s+khau\b", re.IGNORECASE), "mã hóa mật khẩu"),
]

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


def _normalize_spacing(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*([,:;])\s*", r"\1 ", text)
    text = re.sub(r"\s*([/])\s*", r" \1 ", text)
    text = re.sub(r"\s*([()])\s*", r"\1", text)
    text = re.sub(r"\s+([.,!?])", r"\1", text)
    text = re.sub(r"(?<=[a-zA-ZÀ-ỹ])(?=[A-ZÀ-Ỹ][a-zà-ỹ])", " ", text)
    return text.strip()


def _apply_cv_ocr_replacements(text: str) -> str:
    for pattern, replacement in _CV_OCR_REPLACEMENTS:
        text = pattern.sub(replacement, text)
    text = re.sub(r"\bReactS\b", "ReactJS", text)
    text = re.sub(r"\bTalwindc?SS\b", "TailwindCSS", text, flags=re.IGNORECASE)
    text = re.sub(r"\bNodeJS\b", "Node.js", text)
    text = re.sub(r"\bJavascript\b", "JavaScript", text)
    text = re.sub(r"\bNext\.js\b", "Next.js", text)
    return text


def _should_merge_lines(previous: str, current: str) -> bool:
    if not previous or not current:
        return False
    if _SECTION_LINE_RE.match(current):
        return False
    if _BULLET_LINE_RE.match(current):
        return False
    if _DATE_RANGE_RE.search(current):
        return False
    if previous.endswith(":"):
        return False
    if _SECTION_LINE_RE.match(previous):
        return False
    if re.search(r"[a-zA-ZÀ-ỹ0-9,)]$", previous) and re.match(r"^[a-zà-ỹ(]", current):
        return True
    if len(previous) < 40 and re.match(r"^[A-ZÀ-Ỹa-zà-ỹ]", current) and not current.isupper():
        return True
    return False


def _merge_broken_lines(raw_text: str) -> str:
    lines = [_normalize_spacing(line) for line in raw_text.splitlines()]
    merged: list[str] = []
    for line in lines:
        if not line:
            if merged and merged[-1] != "":
                merged.append("")
            continue
        if merged and merged[-1] and _should_merge_lines(merged[-1], line):
            merged[-1] = _normalize_spacing(f"{merged[-1]} {line}")
            continue
        merged.append(line)
    return "\n".join(merged).strip()


def _heuristic_preprocess_cv_text(raw_text: str) -> str:
    text = _merge_broken_lines(raw_text)
    text = _apply_cv_ocr_replacements(text)
    normalized_lines = []
    for line in text.splitlines():
        if not line.strip():
            normalized_lines.append("")
            continue
        normalized_lines.append(_normalize_spacing(line))
    return "\n".join(normalized_lines).strip()


def _mask_protected_tokens(text: str) -> tuple[str, dict[str, str]]:
    replacements: dict[str, str] = {}
    counter = 0

    def _replace(pattern: re.Pattern[str], value: str) -> str:
        nonlocal counter

        def repl(match: re.Match[str]) -> str:
            nonlocal counter
            token = f"__PROTECTED_{counter}__"
            replacements[token] = match.group(0)
            counter += 1
            return token

        return pattern.sub(repl, value)

    text = _replace(_EMAIL_RE, text)
    text = _replace(_PHONE_RE, text)
    text = _replace(_URL_RE, text)
    return text, replacements


def _restore_protected_tokens(text: str, replacements: dict[str, str]) -> str:
    for token, original in replacements.items():
        text = text.replace(token, original)
    return text


def _split_text_for_correction(raw_text: str, max_lines_per_block: int = 10) -> list[str]:
    lines = raw_text.splitlines()
    blocks: list[str] = []
    current: list[str] = []

    for line in lines:
        if line.strip():
            current.append(line.rstrip())
            if len(current) >= max_lines_per_block:
                blocks.append("\n".join(current))
                current = []
            continue

        if current:
            blocks.append("\n".join(current))
            current = []
        blocks.append("")

    if current:
        blocks.append("\n".join(current))

    return blocks


def _rebuild_corrected_text(blocks: list[str]) -> str:
    output: list[str] = []
    previous_blank = False
    for block in blocks:
        if block == "":
            if not previous_blank:
                output.append("")
            previous_blank = True
            continue
        output.append(block)
        previous_blank = False
    return "\n".join(output).strip()


def _correct_cv_text_with_llm(raw_text: str) -> str:
    blocks = _split_text_for_correction(raw_text)
    non_empty_blocks = [block for block in blocks if block]
    if not non_empty_blocks:
        return raw_text.strip()

    payload_blocks: list[str] = []
    for index, block in enumerate(non_empty_blocks, start=1):
        masked_block, replacements = _mask_protected_tokens(block)
        payload_blocks.append(
            json.dumps(
                {
                    "index": index,
                    "text": masked_block,
                    "protected_tokens": replacements,
                },
                ensure_ascii=False,
            )
        )

    input_text = "\n".join(payload_blocks)

    payload = json.dumps({
        "model": OLLAMA_CORRECTION_MODEL,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.0, "num_predict": 8192},
        "messages": [
            {"role": "system", "content": _CV_TEXT_CORRECTION_PROMPT},
            {"role": "user", "content": input_text},
        ],
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode())
        content = (body.get("message", {}).get("content") or "").strip()

    corrected_map: dict[int, str] = {}
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            item = json.loads(stripped)
        except JSONDecodeError:
            continue

        index = item.get("index")
        text = item.get("text")
        replacements = item.get("protected_tokens") or {}
        if isinstance(index, int) and isinstance(text, str) and isinstance(replacements, dict):
            corrected_map[index] = _restore_protected_tokens(text, replacements)

    if not corrected_map:
        raise ValueError("LLM correction did not return JSON lines")

    corrected_blocks: list[str] = []
    non_empty_index = 0
    for block in blocks:
        if block == "":
            corrected_blocks.append("")
            continue
        non_empty_index += 1
        corrected_blocks.append(corrected_map.get(non_empty_index, block))

    return _heuristic_preprocess_cv_text(_rebuild_corrected_text(corrected_blocks))


def _extract_json_object(text: str) -> str | None:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1)

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start:end + 1]


def _dedupe_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        clean = value.strip()
        lowered = clean.lower()
        if clean and lowered not in seen:
            seen.add(lowered)
            output.append(clean)
    return output


def _normalise_structured_cv_payload(payload: dict) -> ParsedCV:
    contact = payload.get("contact") or {}
    experience = payload.get("experience") or []
    education = payload.get("education") or []
    projects = payload.get("projects") or []
    certifications = payload.get("certifications") or []
    skills = payload.get("skills") or []
    languages = payload.get("languages") or []

    return ParsedCV(
        full_name=payload.get("full_name"),
        job_title=payload.get("job_title"),
        contact=ContactInfo(
            email=contact.get("email"),
            phone=contact.get("phone"),
            linkedin=contact.get("linkedin"),
            address=contact.get("address"),
        ),
        summary=payload.get("summary"),
        skills=_dedupe_strings([str(item) for item in skills if item]),
        experience=[
            ExperienceEntry(
                company=item.get("company"),
                title=item.get("title"),
                start_date=item.get("start_date"),
                end_date=item.get("end_date"),
                description=item.get("description"),
            )
            for item in experience
            if isinstance(item, dict)
        ],
        education=[
            EducationEntry(
                institution=item.get("institution"),
                degree=item.get("degree"),
                field_of_study=item.get("field_of_study"),
                start_date=item.get("start_date"),
                end_date=item.get("end_date"),
                gpa=item.get("gpa"),
            )
            for item in education
            if isinstance(item, dict)
        ],
        projects=[
            ProjectEntry(
                name=item.get("name"),
                description=item.get("description"),
                technologies=_dedupe_strings([
                    str(tech) for tech in (item.get("technologies") or []) if tech
                ]),
                role=item.get("role"),
                url=item.get("url"),
            )
            for item in projects
            if isinstance(item, dict)
        ],
        certifications=[
            CertificationEntry(
                name=item.get("name"),
                issuer=item.get("issuer"),
                date_obtained=item.get("date_obtained"),
            )
            for item in certifications
            if isinstance(item, dict)
        ],
        languages=_dedupe_strings([str(item) for item in languages if item]),
    )


def _structure_cv_with_llm(raw_text: str) -> ParsedCV:
    payload = json.dumps({
        "model": OLLAMA_TEXT_MODEL,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.0, "num_predict": 4096},
        "messages": [
            {"role": "system", "content": _CV_NORMALIZATION_PROMPT},
            {"role": "user", "content": raw_text},
        ],
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode())
        content = (body.get("message", {}).get("content") or "").strip()

    json_payload = _extract_json_object(content)
    if not json_payload:
        raise ValueError("LLM did not return a JSON object")

    try:
        parsed_payload = json.loads(json_payload)
    except JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON returned by LLM: {exc}") from exc

    structured = _normalise_structured_cv_payload(parsed_payload)
    structured.raw_text = raw_text
    return structured


def structure_cv(raw_text: str) -> ParsedCV:
    """Convert raw CV text into a structured ParsedCV."""
    sections = _detect_sections(raw_text)

    header_text = sections.get("header", "")
    return ParsedCV(
        full_name=_extract_name(header_text),
        job_title=None,
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


def extract_image_with_ollama_ocr(image_bytes: bytes) -> tuple[str, int]:
    """
    Extract text directly from a single image using Ollama qwen3-vl:4b.
    """
    img_b64 = base64.b64encode(image_bytes).decode()
    payload = json.dumps({
        "model": OLLAMA_OCR_MODEL,
        "stream": False,
        "think": False,
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
            logger.info("[cv_parser] Direct Image OCR: %d chars", len(page_text))
            return page_text, 1
    except urllib.error.URLError as exc:
        logger.error("[cv_parser] Ollama Direct Image OCR failed: %s", exc)
        return "", 1


def parse_cv(
    file_bytes: bytes,
    content_type: str = "application/pdf"
) -> tuple[ParsedCV, ExtractionMethod, int, list[str]]:
    """
    End-to-end pipeline: extract → structure.

    Returns
    -------
    (parsed_cv, method_used, page_count, warnings)
    """
    warnings: list[str] = []
    method = ExtractionMethod.TEXT
    
    is_image = content_type.startswith("image/")

    if is_image:
        warnings.append(f"Image uploaded ({content_type}) - skipping PDF text extraction.")
        method = ExtractionMethod.OCR
        raw_text, page_count = extract_image_with_ollama_ocr(file_bytes)
        if not raw_text:
             warnings.append(
                f"Ollama OCR ({OLLAMA_OCR_MODEL}) returned empty text. "
                "Ensure Ollama is running and the model is pulled."
            )
    else:
        # 1️⃣ Try pdfplumber (selectable text)
        try:
            raw_text, page_count = extract_text_with_pdfplumber(file_bytes)
        except Exception as e:
            raw_text = ""
            page_count = 1
            warnings.append(f"PDF extraction failed: {e}")

        # 2️⃣ Fallback to Ollama qwen3-vl:4b if text is too short (likely scanned)
        if len(raw_text.split()) < 30:
            warnings.append(
                "Text extraction yielded minimal content – "
                f"falling back to Ollama OCR ({OLLAMA_OCR_MODEL})."
            )
            method = ExtractionMethod.OCR
            try:
                ocr_text, ocr_pages = extract_text_with_ollama_ocr(file_bytes)
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

    if raw_text.strip():
        raw_text = _heuristic_preprocess_cv_text(raw_text)
        try:
            raw_text = _correct_cv_text_with_llm(raw_text)
        except Exception as exc:
            warnings.append(f"LLM text correction skipped: {exc}")

            try:
                parsed = _structure_cv_with_llm(raw_text)
            except Exception as exc:
                warnings.append(f"LLM structuring fallback to heuristic parser: {exc}")
                parsed = structure_cv(raw_text)

    return parsed, method, page_count, warnings
