from __future__ import annotations

import io
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field

from PIL import Image, ImageOps


@dataclass
class OCRBlock:
    text: str
    bbox: list[list[int]]
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


_MAX_IMAGE_DIMENSION = 4000


def _prepare_image_for_ocr(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)

    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    width, height = image.size
    max_dimension = max(width, height)
    if max_dimension > _MAX_IMAGE_DIMENSION:
        scale = _MAX_IMAGE_DIMENSION / max_dimension
        image = image.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.Resampling.LANCZOS)

    return image


def _pdf_to_images(pdf_bytes: bytes) -> list[Image.Image]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF support requires PyMuPDF: pip install pymupdf") from exc

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images: list[Image.Image] = []
    for page in doc:
        matrix = fitz.Matrix(200 / 72, 200 / 72)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        images.append(_prepare_image_for_ocr(Image.frombytes("RGB", (pix.width, pix.height), pix.samples)))
    doc.close()
    return images


def _docx_to_images(docx_bytes: bytes) -> list[Image.Image]:
    soffice_path = shutil.which("soffice") or shutil.which("soffice.com") or shutil.which("soffice.exe")
    if not soffice_path:
        raise RuntimeError("LibreOffice (soffice) is required for DOCX conversion.")

    with tempfile.TemporaryDirectory() as tmp:
        docx_path = os.path.join(tmp, "input.docx")
        pdf_path = os.path.join(tmp, "input.pdf")

        with open(docx_path, "wb") as docx_file:
            docx_file.write(docx_bytes)

        result = subprocess.run(
            [soffice_path, "--headless", "--convert-to", "pdf", "--outdir", tmp, docx_path],
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0 or not os.path.exists(pdf_path):
            raise RuntimeError(f"LibreOffice failed: {result.stderr.decode(errors='replace')}")

        with open(pdf_path, "rb") as pdf_file:
            return _pdf_to_images(pdf_file.read())


def normalise_to_images(file_bytes: bytes, content_type: str, filename: str = "") -> list[Image.Image]:
    normalized_content_type = content_type.lower()
    extension = os.path.splitext(filename)[-1].lower() if filename else ""

    if normalized_content_type.startswith("image/") or extension in (".png", ".jpg", ".jpeg", ".webp"):
        return [_prepare_image_for_ocr(Image.open(io.BytesIO(file_bytes)))]

    if normalized_content_type == "application/pdf" or extension == ".pdf":
        return _pdf_to_images(file_bytes)

    if normalized_content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    ) or extension == ".docx":
        return _docx_to_images(file_bytes)

    raise ValueError(f"Unsupported file type: {content_type!r} (ext={extension!r})")


def _block_bounds(block: OCRBlock) -> tuple[float, float, float, float]:
    xs = [point[0] for point in block.bbox]
    ys = [point[1] for point in block.bbox]
    return min(xs), min(ys), max(xs), max(ys)


def _block_center_y(block: OCRBlock) -> float:
    _, y_min, _, y_max = _block_bounds(block)
    return (y_min + y_max) / 2.0


def _block_height(block: OCRBlock) -> float:
    _, y_min, _, y_max = _block_bounds(block)
    return max(1.0, y_max - y_min)


def _group_blocks_into_lines(blocks: list[OCRBlock]) -> list[list[OCRBlock]]:
    lines: list[list[OCRBlock]] = []
    sorted_blocks = sorted(blocks, key=lambda block: (_block_center_y(block), _block_bounds(block)[0]))

    for block in sorted_blocks:
        center = _block_center_y(block)
        matched_line: list[OCRBlock] | None = None
        for line in reversed(lines):
            line_center = sum(_block_center_y(item) for item in line) / len(line)
            avg_height = sum(_block_height(item) for item in line) / len(line)
            if abs(center - line_center) <= max(avg_height, _block_height(block)) * 0.6:
                matched_line = line
                break

        if matched_line is None:
            lines.append([block])
        else:
            matched_line.append(block)

    for line in lines:
        line.sort(key=lambda block: _block_bounds(block)[0])

    lines.sort(key=lambda line: min(_block_bounds(item)[1] for item in line))
    return lines


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
