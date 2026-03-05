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

from PIL import Image

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
    (re.compile(r"\bKinh\s+nghiem\b", re.I),  "Kinh nghiệm"),
    (re.compile(r"\bHoat\s+dong\b",   re.I),  "Hoạt động"),
    (re.compile(r"\bNgoai\s+khoa\b",  re.I),  "Ngoại khóa"),
    (re.compile(r"\bThong\s+tin\b",   re.I),  "Thông tin"),
    (re.compile(r"\bLien\s+he\b",     re.I),  "Liên hệ"),
    (re.compile(r"\bVe\s+ban\s+than\b", re.I), "Về bản thân"),
    (re.compile(r"\bDai\s+hoc\b",     re.I),  "Đại học"),
    (re.compile(r"\bCao\s+dang\b",    re.I),  "Cao đẳng"),
    (re.compile(r"\bhien\s+tai\b",    re.I),  "hiện tại"),
    (re.compile(r"\bcu\s+nhan\b",     re.I),  "cử nhân"),
    (re.compile(r"\bky\s+nang\b",     re.I),  "kỹ năng"),
    (re.compile(r"\bso\s+dien\s+thoai\b", re.I), "số điện thoại"),
    (re.compile(r"\bdia\s+chi\b",     re.I),  "địa chỉ"),
    (re.compile(r"\bNgon\s+ngu\b",    re.I),  "Ngôn ngữ"),
    (re.compile(r"\bnang\s+dong\b",   re.I),  "năng động"),
    (re.compile(r"\btiep\s+thi\b",    re.I),  "tiếp thị"),
    (re.compile(r"\bsan\s+pham\b",    re.I),  "sản phẩm"),
    (re.compile(r"\bxay\s+dung\b",    re.I),  "xây dựng"),
    (re.compile(r"\bquan\s+he\b",     re.I),  "quan hệ"),
    (re.compile(r"\bdoi\s+tac\b",     re.I),  "đối tác"),
    (re.compile(r"\bnuoc\s+ngoai\b",  re.I),  "nước ngoài"),
    (re.compile(r"\bHo\s+Chi\s+Minh\b"),       "Hồ Chí Minh"),
    (re.compile(r"\btrung\s+binh\b",  re.I),  "trung bình"),
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
    for pattern, replacement in _VI_CORRECTIONS:
        text = pattern.sub(replacement, text)
    return text


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
        images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
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
        return [Image.open(io.BytesIO(file_bytes)).convert("RGB")]
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


# ── OCR inference ─────────────────────────────────────────────────

def _run_ocr_on_image(image: Image.Image, page_num: int) -> OCRPageResult:
    """
    Run PP-OCR on a single PIL image via RapidOCR.

    RapidOCR output: (result, elapse)
      result: list of [bbox, text, confidence]
        bbox: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    """
    engine = _get_engine()
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

    # Reading order: top-to-bottom, left-to-right
    blocks.sort(key=lambda b: (b.rect_y, b.rect_x))
    return OCRPageResult(page=page_num, image_width=img_w, image_height=img_h, blocks=blocks)


# ── Public API ────────────────────────────────────────────────────

def run_ocr(file_bytes: bytes, content_type: str, filename: str = "") -> list[OCRPageResult]:
    """Main entry point. Returns one OCRPageResult per page."""
    images = normalise_to_images(file_bytes, content_type, filename)
    logger.info("OCR: %d page(s) to process", len(images))
    results = []
    for i, img in enumerate(images, start=1):
        page_result = _run_ocr_on_image(img, page_num=i)
        logger.info("  page %d -> %d blocks detected", i, len(page_result.blocks))
        results.append(page_result)

    # Post-process: correct Vietnamese text using LLM (Ollama)
    _correct_vietnamese_with_llm(results)

    return results


# ── LLM-based Vietnamese correction ──────────────────────────────────────

_VI_CORRECTION_PROMPT = """You are a Vietnamese language correction assistant.

The input text comes from OCR and may contain recognition errors such as:
* missing Vietnamese diacritics
* incorrect Vietnamese characters
* broken words
* spacing errors

Your task is to correct the text so that it becomes natural and grammatically correct Vietnamese.

Rules:
1. Preserve the original meaning.
2. Do not invent new information.
3. Only fix spelling, diacritics, and grammar.
4. Keep the sentence structure similar to the original.
5. Maintain professional CV language.
6. Return ONLY the corrected lines in the EXACT same numbered format.
7. Keep numbers, dates, percentages, emails, phone numbers, and URLs unchanged.
8. If a line is already correct Vietnamese, return it unchanged.

Return only the corrected Vietnamese text."""


def _correct_vietnamese_with_llm(results: list[OCRPageResult]) -> None:
    """
    Batch-correct Vietnamese OCR text using Ollama LLM.
    Modifies blocks in-place. Fails silently if Ollama is unavailable.
    """
    # Collect all non-empty blocks across all pages
    all_blocks: list[OCRBlock] = []
    for page_result in results:
        for block in page_result.blocks:
            if block.text.strip():
                all_blocks.append(block)

    if not all_blocks:
        return

    # Build numbered input
    lines = [f"{i + 1}. {block.text}" for i, block in enumerate(all_blocks)]
    input_text = "\n".join(lines)

    payload = json.dumps({
        "model": OLLAMA_TEXT_MODEL,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.0, "num_predict": 8192},
        "messages": [
            {"role": "system", "content": _VI_CORRECTION_PROMPT},
            {"role": "user", "content": input_text},
        ],
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            body = json.loads(resp.read().decode())
            content = (body.get("message", {}).get("content") or "").strip()

            # Parse numbered lines from response
            corrected: dict[int, str] = {}
            for line in content.split("\n"):
                line = line.strip()
                if not line:
                    continue
                m = re.match(r"^(\d+)\.\s*(.+)$", line)
                if m:
                    idx = int(m.group(1)) - 1  # 0-based
                    text = m.group(2).strip()
                    if 0 <= idx < len(all_blocks) and text:
                        corrected[idx] = text

            # Apply corrections
            applied = 0
            for idx, text in corrected.items():
                block = all_blocks[idx]
                if text != block.text:
                    block.text = text
                    applied += 1

            logger.info(
                "Vietnamese LLM correction: %d/%d blocks updated",
                applied, len(all_blocks),
            )

    except urllib.error.URLError as exc:
        logger.warning("Vietnamese LLM correction unavailable (Ollama): %s", exc)
    except Exception as exc:
        logger.warning("Vietnamese LLM correction failed: %s", exc)
