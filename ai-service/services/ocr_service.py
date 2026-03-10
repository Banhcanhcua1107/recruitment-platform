"""
ocr_service.py - RapidOCR (PP-OCRv4 via ONNX Runtime) text detection pipeline.

Supports: PNG, JPG, WEBP, PDF, DOCX

Why RapidOCR instead of PaddleOCR:
  PaddlePaddle has no Python >=3.12 wheel. RapidOCR runs the identical
  PP-OCR detection + recognition models through ONNX Runtime (Python-version agnostic).

Pipeline:
  1. Normalise file -> list[PIL.Image]
  2. rapidocr_onnxruntime.RapidOCR.predict(numpy_array)
  3. Parse output -> OCRPageResult with 0-100 normalised rects
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Optional

import mimetypes
from PIL import Image, ImageDraw, ImageOps

logger = logging.getLogger("ocr_service")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_CV_SUGGEST_MODEL", "qwen3:4b")

# ── Vietnamese OCR text normalization ────────────────────────────────────────
# PP-OCR models (trained mainly on Chinese + Latin) frequently drop or swap
# Vietnamese diacritical marks. The corrections below fix the most common cases
# so that the frontend receives cleaner text from the start.
_VI_CORRECTIONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bCir\b"),                "Cử"),
    (re.compile(r"\bcir\b"),                "cử"),
    (re.compile(r"\bngur\b"),               "ngữ"),
    (re.compile(r"\bKy\b(?![\s]*[a-zA-Z])"), "Kỹ"),
    (re.compile(r"\bky\b(?![\s]*[a-zA-Z])"), "kỹ"),
    (re.compile(r"\bHoc\b"),                "Học"),
    (re.compile(r"\bhoc\b"),                "học"),
    # Phrase-level corrections (safe, unambiguous in CV context)
    (re.compile(r"\bKinh\s*nghiem\b", re.I),  "Kinh nghiệm"),
    (re.compile(r"\bHoat\s+dong\b",   re.I),  "Hoạt động"),
    (re.compile(r"\bNgoai\s+khoa\b",  re.I),  "Ngoại khóa"),
    (re.compile(r"\bThong\s+tin\b",   re.I),  "Thông tin"),
    (re.compile(r"\bLien\s+he\b",     re.I),  "Liên hệ"),
    (re.compile(r"\bVe\s+ban\s+than\b", re.I), "Về bản thân"),
    (re.compile(r"\bDai\s+hoc\b",     re.I),  "Đại học"),
    (re.compile(r"\bCao\s+dang\b",    re.I),  "Cao đẳng"),
    (re.compile(r"\bhien\s*tai\b",    re.I),  "hiện tại"),
    (re.compile(r"\bcu\s+nhan\b",     re.I),  "cử nhân"),
    (re.compile(r"\bky\s+nang\b",     re.I),  "kỹ năng"),
    (re.compile(r"\bso\s+dien\s+thoai\b", re.I), "số điện thoại"),
    (re.compile(r"\bdia\s+diem\b", re.I),    "Địa điểm"),
    (re.compile(r"\bdia\s+chi\b",     re.I),  "địa chỉ"),
    (re.compile(r"\bNgon\s*ngu\b",    re.I),  "Ngôn ngữ"),
    (re.compile(r"\bnang\s+dong\b",   re.I),  "năng động"),
    (re.compile(r"\btiep\s+thi\b",    re.I),  "tiếp thị"),
    (re.compile(r"\bsan\s+pham\b",    re.I),  "sản phẩm"),
    (re.compile(r"\bxay\s+dung\b",    re.I),  "xây dựng"),
    (re.compile(r"\bquan\s*he\b",     re.I),  "quan hệ"),
    (re.compile(r"\bdoi\s*tac\b",     re.I),  "đối tác"),
    (re.compile(r"\bnuoc\s+ngoai\b",  re.I),  "nước ngoài"),
    (re.compile(r"\bHo\s+Chi\s+Minh\b"),       "Hồ Chí Minh"),
    (re.compile(r"\btrung\s*binh\b",  re.I),  "trung bình"),
    (re.compile(r"\bnoi\s+bat\b",     re.I),  "nổi bật"),
    (re.compile(r"\bhoc\s+tap\b",     re.I),  "học tập"),
    (re.compile(r"\bthanh\s+tich\b",  re.I),  "thành tích"),
    (re.compile(r"\bban\s+hang\b",    re.I),  "bán hàng"),
    (re.compile(r"\btruc\s+tiep\b",   re.I),  "trực tiếp"),
    (re.compile(r"\bcua\s+hang\b",    re.I),  "cửa hàng"),
    (re.compile(r"\bTu\s+van\b",      re.I),  "Tư vấn"),
    (re.compile(r"\bthuong\s+hieu\b", re.I),  "thương hiệu"),
    (re.compile(r"\bgiang\s+day\b",   re.I),  "giảng dạy"),
    (re.compile(r"\bgiao\s+trinh\b",  re.I),  "giáo trình"),
    (re.compile(r"\btieng\s+Anh\b",   re.I),  "tiếng Anh"),
    (re.compile(r"\bdi\s+lam\b",      re.I),  "đi làm"),
    (re.compile(r"\bquan\s+tri\b",    re.I),  "quản trị"),
    (re.compile(r"\btuong\s+lai\b",   re.I),  "tương lai"),
    (re.compile(r"\bthanh\s+vien\b",  re.I),  "thành viên"),
    (re.compile(r"\btich\s+cuc\b",    re.I),  "tích cực"),
    (re.compile(r"\bdam\s+nhiem\b",   re.I),  "đảm nhiệm"),
    (re.compile(r"\bvi\s+tri\b",      re.I),  "vị trí"),
    (re.compile(r"\btruong\s+nhom\b", re.I),  "trưởng nhóm"),
    (re.compile(r"\bto\s+chuc\b",     re.I),  "tổ chức"),
    (re.compile(r"\bdoi\s+moi\b",     re.I),  "đổi mới"),
    (re.compile(r"\blien\s+lac\b",    re.I),  "liên lạc"),
    (re.compile(r"\bket\s+noi\b",     re.I),  "kết nối"),
    (re.compile(r"\bhoi\s+vien\b",    re.I),  "hội viên"),
    (re.compile(r"\bdoanh\s+nghiep\b",re.I),  "doanh nghiệp"),
    (re.compile(r"\bnhan\s+vien\b",   re.I),  "nhân viên"),
    (re.compile(r"\bcong\s+ty\b",     re.I),  "công ty"),
    (re.compile(r"\bgioi\s+thieu\b",  re.I),  "giới thiệu"),
    (re.compile(r"\bkhach\s+hang\b",  re.I),  "khách hàng"),
    (re.compile(r"\bkhong\s+chi\b",   re.I),  "không chỉ"),
    (re.compile(r"\bChuan\s+bi\b",    re.I),  "Chuẩn bị"),
    (re.compile(r"\bho\s+tro\b",      re.I),  "hỗ trợ"),
    (re.compile(r"\bTrung\s+tam\b",   re.I),  "Trung tâm"),
    (re.compile(r"\bAnh\s+ngu\b",     re.I),  "Anh ngữ"),
    (re.compile(r"\blam\s+viec\b",    re.I),  "làm việc"),
    (re.compile(r"\bDiem\s+trung\b",  re.I),  "Điểm trung"),
    (re.compile(r"\bhoc\s+luc\b",     re.I),  "học lực"),
    (re.compile(r"\bcuoi\s+cung\b",   re.I),  "cuối cùng"),
    (re.compile(r"\bnha\s+quan\b",    re.I),  "nhà quản"),
    (re.compile(r"\bnguoi\b"),                 "người"),
    (re.compile(r"\bduoc\b"),                  "được"),
    (re.compile(r"\bcac\b"),                   "các"),
]


def _normalize_vi(text: str) -> str:
    """Apply Vietnamese OCR post-processing corrections."""
    text = text.strip()
    text = re.sub(r"([a-zA-ZÀ-ỹ]{2,})\s+([a-zA-ZÀ-ỹ])(?=[\s.,;:!?]|$)", r"\1\2", text)
    text = re.sub(r"(^|[\s.,;:!?])([a-zA-ZÀ-ỹ])\s+([a-zA-ZÀ-ỹ]{2,})", r"\1\2\3", text)
    text = re.sub(r"([A-Za-zĐđ]{2,})\s+([àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ])", r"\1\2", text)
    text = re.sub(r"([a-zà-ỹ])([A-ZÀ-Ỹ])", r"\1 \2", text)
    text = re.sub(r"(?<=\w)\s+(?=@)", "", text)
    text = re.sub(r"(?<=@)\s+(?=\w)", "", text)
    text = re.sub(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+)\.\s+([A-Z]{2,})", r"\1.\2", text, flags=re.I)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([,.;:!?])(?![\s\n]|$)", r"\1 ", text)
    for pattern, replacement in _VI_CORRECTIONS:
        text = pattern.sub(replacement, text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


_ocr_engine: Optional[object] = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
            logger.info("RapidOCR (PP-OCR via ONNX) engine initialised")
        except ImportError as exc:
            raise RuntimeError(
                "RapidOCR is not installed. Run: pip install rapidocr-onnxruntime"
            ) from exc
    return _ocr_engine


@dataclass
class OCRBlock:
    text: str
    bbox: list[list[int]]   # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    confidence: float
    page: int = 1
    rect_x: float = 0.0
    rect_y: float = 0.0
    rect_w: float = 0.0
    rect_h: float = 0.0


@dataclass
class OCRPageResult:
    page: int
    image_width: int
    image_height: int
    blocks: list[OCRBlock] = field(default_factory=list)



def guess_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def _prepare_image_for_ocr(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    if image.mode != "RGB":
        return image.convert("RGB")
    return image
# ── File normalisation ────────────────────────────────────────────

def _pdf_to_images(pdf_bytes: bytes) -> list[Image.Image]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF support requires PyMuPDF: pip install pymupdf") from exc
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page in doc:
        mat = fitz.Matrix(200 / 72, 200 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        images.append(_prepare_image_for_ocr(Image.frombytes("RGB", (pix.width, pix.height), pix.samples)))
    doc.close()
    return images


def _docx_to_images(docx_bytes: bytes) -> list[Image.Image]:
    import subprocess, shutil
    if not shutil.which("soffice"):
        raise RuntimeError("LibreOffice (soffice) is required for DOCX conversion.")
    with tempfile.TemporaryDirectory() as tmp:
        docx_path = os.path.join(tmp, "input.docx")
        pdf_path  = os.path.join(tmp, "input.pdf")
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)
        ret = subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, docx_path],
            capture_output=True, timeout=60,
        )
        if ret.returncode != 0 or not os.path.exists(pdf_path):
            raise RuntimeError(f"LibreOffice failed: {ret.stderr.decode(errors='replace')}")
        with open(pdf_path, "rb") as f:
            return _pdf_to_images(f.read())


def normalise_to_images(file_bytes: bytes, content_type: str, filename: str = "") -> list[Image.Image]:
    ct  = content_type.lower()
    ext = os.path.splitext(filename)[-1].lower() if filename else ""
    if ct.startswith("image/") or ext in (".png", ".jpg", ".jpeg", ".webp"):
        return [_prepare_image_for_ocr(Image.open(io.BytesIO(file_bytes)))]
    if ct == "application/pdf" or ext == ".pdf":
        return _pdf_to_images(file_bytes)
    if ct in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    ) or ext == ".docx":
        return _docx_to_images(file_bytes)
    raise ValueError(f"Unsupported file type: {content_type!r} (ext={ext!r})")


# ── Coordinate helpers ────────────────────────────────────────────

def _clamp(val: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, val))


def _bbox_to_rect(bbox: list[list[int]], img_w: int, img_h: int) -> tuple[float, float, float, float]:
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    x = _clamp(x_min / img_w) * 100
    y = _clamp(y_min / img_h) * 100
    w = min(_clamp((x_max - x_min) / img_w) * 100, 100.0 - x)
    h = min(_clamp((y_max - y_min) / img_h) * 100, 100.0 - y)
    return x, y, w, h


# ── Reading order helpers ──────────────────────────────────────────

def _block_bounds(block: OCRBlock) -> tuple[float, float, float, float]:
    xs = [p[0] for p in block.bbox]
    ys = [p[1] for p in block.bbox]
    return min(xs), min(ys), max(xs), max(ys)


def _block_center_y(block: OCRBlock) -> float:
    _, y_min, _, y_max = _block_bounds(block)
    return (y_min + y_max) / 2.0


def _block_height(block: OCRBlock) -> float:
    _, y_min, _, y_max = _block_bounds(block)
    return max(1.0, y_max - y_min)


def _group_blocks_into_lines(blocks: list[OCRBlock]) -> list[list[OCRBlock]]:
    lines: list[list[OCRBlock]] = []
    sorted_blocks = sorted(blocks, key=lambda b: (_block_center_y(b), _block_bounds(b)[0]))
    for block in sorted_blocks:
        block_center = _block_center_y(block)
        matched = None
        for line in reversed(lines):
            line_center = sum(_block_center_y(item) for item in line) / len(line)
            avg_height = sum(_block_height(item) for item in line) / len(line)
            if abs(block_center - line_center) <= max(avg_height, _block_height(block)) * 0.6:
                matched = line
                break
        if matched is None:
            lines.append([block])
        else:
            matched.append(block)

    for line in lines:
        line.sort(key=lambda b: _block_bounds(b)[0])
    lines.sort(key=lambda line: min(_block_bounds(item)[1] for item in line))
    return lines


def _ordered_blocks(blocks: list[OCRBlock]) -> list[OCRBlock]:
    ordered: list[OCRBlock] = []
    for line in _group_blocks_into_lines(blocks):
        ordered.extend(line)
    return ordered
# ── OCR inference ─────────────────────────────────────────────────

def _run_ocr_on_image(image: Image.Image, page_num: int) -> OCRPageResult:
    """
    Run PP-OCR on a single PIL image via RapidOCR.

    RapidOCR output: (result, elapse)
      result: list of [bbox, text, confidence]
        bbox: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    """
    engine = _get_engine()
    image = _prepare_image_for_ocr(image)
    img_w, img_h = image.size
    import numpy as np
    img_np = np.array(image)

    result, _ = engine(img_np)

    blocks: list[OCRBlock] = []
    for item in (result or []):
        # item = [bbox, text, score]
        bbox_raw, text, score = item[0], item[1], item[2]
        if not text or not text.strip():
            continue
        bbox = [[int(round(float(p[0]))), int(round(float(p[1])))] for p in bbox_raw]
        rx, ry, rw, rh = _bbox_to_rect(bbox, img_w, img_h)
        blocks.append(OCRBlock(
            text=_normalize_vi(text.strip()),
            bbox=bbox,
            confidence=round(float(score), 4),
            page=page_num,
            rect_x=round(rx, 3),
            rect_y=round(ry, 3),
            rect_w=round(rw, 3),
            rect_h=round(rh, 3),
        ))

    ordered_blocks = _ordered_blocks(blocks)
    return OCRPageResult(page=page_num, image_width=img_w, image_height=img_h, blocks=ordered_blocks)


# ── Public API ────────────────────────────────────────────────────

def run_ocr(file_bytes: bytes, content_type: str, filename: str = "", min_confidence: float = 0.0, apply_llm_correction: bool = False) -> list[OCRPageResult]:
    """Main entry point. Returns one OCRPageResult per page."""
    images = normalise_to_images(file_bytes, content_type, filename)
    logger.info("OCR: %d page(s) to process", len(images))
    results = []
    for i, img in enumerate(images, start=1):
        page_result = _run_ocr_on_image(img, page_num=i)
        
        # Filter blocks by min_confidence
        if min_confidence > 0.0:
            page_result.blocks = [b for b in page_result.blocks if b.confidence >= min_confidence]
            
        logger.info("  page %d -> %d blocks detected", i, len(page_result.blocks))
        results.append(page_result)

    if apply_llm_correction:
        _correct_vietnamese_with_llm(results)

    return results


# ── Shared OCR exports ────────────────────────────────────────────

def extract_full_text(page_results: list[OCRPageResult]) -> str:
    pages_text: list[str] = []
    for page in page_results:
        lines_out: list[str] = []
        previous_bottom: float | None = None
        for line in _group_blocks_into_lines(page.blocks):
            line_text = " ".join(block.text.strip() for block in line if block.text.strip()).strip()
            if not line_text:
                continue
            line_top = min(_block_bounds(block)[1] for block in line)
            line_bottom = max(_block_bounds(block)[3] for block in line)
            avg_height = sum(_block_height(block) for block in line) / len(line)
            if previous_bottom is not None and line_top - previous_bottom > avg_height * 1.2:
                lines_out.append("")
            lines_out.append(line_text)
            previous_bottom = line_bottom
        page_text = "\n".join(lines_out).strip()
        if page_text:
            pages_text.append(page_text)
    return "\n\n".join(pages_text).strip()


def page_statistics(page_results: list[OCRPageResult]) -> dict[str, float | int]:
    blocks = [block for page in page_results for block in page.blocks]
    avg_conf = round(sum(block.confidence for block in blocks) / len(blocks), 4) if blocks else 0.0
    return {
        "total_pages": len(page_results),
        "total_blocks": len(blocks),
        "total_words": sum(len(block.text.split()) for block in blocks),
        "average_confidence": avg_conf,
    }


def render_annotated_pages(file_bytes: bytes, content_type: str, page_results: Optional[list[OCRPageResult]] = None, filename: str = "") -> list[Image.Image]:
    images = normalise_to_images(file_bytes, content_type, filename)
    if page_results is None:
        page_results = run_ocr(file_bytes, content_type=content_type, filename=filename, apply_llm_correction=False)

    annotated_pages: list[Image.Image] = []
    for image, page_result in zip(images, page_results):
        canvas = image.copy()
        draw = ImageDraw.Draw(canvas)
        for block in page_result.blocks:
            polygon = [tuple(point) for point in block.bbox]
            draw.polygon(polygon, outline=(15, 118, 255), width=2)
            x_min, y_min, _, _ = _block_bounds(block)
            draw.text((x_min, max(0, y_min - 14)), f"{block.confidence:.2f} {block.text[:40]}", fill=(220, 30, 30))
        annotated_pages.append(canvas)
    return annotated_pages
# ── LLM-based Vietnamese correction ──────────────────────────────────────

_VI_CORRECTION_PROMPT = """Bạn đang sửa lỗi OCR tiếng Việt theo từng block.

Mục tiêu:
- chỉ sửa block CURRENT
- dùng PREV và NEXT làm ngữ cảnh
- sửa dấu tiếng Việt, khoảng trắng và lỗi OCR phổ biến

Ràng buộc:
- không thêm thông tin mới
- không đổi email, số điện thoại, URL, ngày tháng, phần trăm, placeholder
- không viết lại sang câu khác
- nếu CURRENT đã đúng thì giữ nguyên
- trả về đúng một dòng cho mỗi id theo format: [id] nội dung đã sửa
"""

_PROTECTED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("EMAIL", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("URL", re.compile(r"(https?://\S+|www\.\S+)", re.I)),
    ("PHONE", re.compile(r"(?:(?:\+?\d[\d().\-\s]{7,}\d))")),
    ("DATE", re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}\s*[-/]\s*(?:\d{4}|nay|hiện tại)\b", re.I)),
    ("PERCENT", re.compile(r"\b\d{1,3}%\b")),
]


def _protect_entities(text: str) -> tuple[str, dict[str, str]]:
    protected = text
    mapping: dict[str, str] = {}
    counter = 0

    for prefix, pattern in _PROTECTED_PATTERNS:
        def repl(match: re.Match[str]) -> str:
            nonlocal counter
            placeholder = f"__{prefix}_{counter}__"
            mapping[placeholder] = match.group(0)
            counter += 1
            return placeholder

        protected = pattern.sub(repl, protected)

    return protected, mapping


def _restore_entities(text: str, mapping: dict[str, str]) -> str:
    restored = text
    for placeholder, original in mapping.items():
        restored = restored.replace(placeholder, original)
    return restored


def _should_skip_llm_line(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if len(stripped) <= 2:
        return True
    if re.fullmatch(r"[\W\d_]+", stripped):
        return True
    return False


def _build_contextual_prompt(blocks: list[OCRBlock], start: int, end: int) -> tuple[str, dict[int, dict[str, str]]]:
    lines: list[str] = []
    placeholder_maps: dict[int, dict[str, str]] = {}

    for idx in range(start, end):
        prev_text = blocks[idx - 1].text if idx > 0 else ""
        current_text = blocks[idx].text
        next_text = blocks[idx + 1].text if idx + 1 < len(blocks) else ""

        protected_prev, _ = _protect_entities(prev_text)
        protected_current, mapping = _protect_entities(current_text)
        protected_next, _ = _protect_entities(next_text)
        placeholder_maps[idx] = mapping

        lines.append(
            "\n".join(
                [
                    f"[{idx}]",
                    f"PREV: {protected_prev or '(empty)'}",
                    f"CURRENT: {protected_current}",
                    f"NEXT: {protected_next or '(empty)'}",
                ]
            )
        )

    return "\n\n".join(lines), placeholder_maps


def _request_llm_corrections(prompt: str) -> str:
    payload = json.dumps({
        "model": OLLAMA_TEXT_MODEL,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.0, "num_predict": 4096},
        "messages": [
            {"role": "system", "content": _VI_CORRECTION_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=90) as resp:
        body = json.loads(resp.read().decode())
        return (body.get("message", {}).get("content") or "").strip()


def _parse_llm_corrections(content: str) -> dict[int, str]:
    corrected: dict[int, str] = {}
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^\[(\d+)\]\s*(.+)$", line)
        if not match:
            continue
        text = match.group(2).strip().strip('"')
        text = re.sub(r"^CURRENT:\s*", "", text, flags=re.I)
        if "not provided in the user's message" in text.lower():
            continue
        corrected[int(match.group(1))] = text
    return corrected


def _correct_vietnamese_with_llm(results: list[OCRPageResult]) -> None:
    """
    Context-aware Vietnamese OCR correction using Ollama.
    Each block is corrected with previous/next block as context.
    """
    all_blocks = [
        block
        for page_result in results
        for block in page_result.blocks
        if block.text.strip()
    ]

    if not all_blocks:
        return

    chunk_size = 24
    applied = 0
    attempted = 0

    try:
        for start in range(0, len(all_blocks), chunk_size):
            end = min(start + chunk_size, len(all_blocks))
            prompt, placeholder_maps = _build_contextual_prompt(all_blocks, start, end)
            response = _request_llm_corrections(prompt)
            corrected = _parse_llm_corrections(response)

            for idx in range(start, end):
                block = all_blocks[idx]
                if _should_skip_llm_line(block.text):
                    continue

                attempted += 1
                candidate = corrected.get(idx)
                if not candidate:
                    continue

                restored = _restore_entities(candidate, placeholder_maps.get(idx, {}))
                normalized = _normalize_vi(restored)
                if normalized and normalized != block.text:
                    block.text = normalized
                    applied += 1

        logger.info(
            "Vietnamese LLM correction: %d/%d blocks updated",
            applied,
            attempted,
        )

    except urllib.error.URLError as exc:
        logger.warning("Vietnamese LLM correction unavailable (Ollama): %s", exc)
    except Exception as exc:
        logger.warning("Vietnamese LLM correction failed: %s", exc)




