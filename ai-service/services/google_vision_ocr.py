from __future__ import annotations

import base64
import io
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Protocol

import requests
from PIL import Image

from services.ocr_common import OCRBlock, OCRPageResult, extract_full_text, normalise_to_images

logger = logging.getLogger("google_vision_ocr")

GOOGLE_VISION_ENDPOINT = os.getenv("GOOGLE_VISION_ENDPOINT", "https://vision.googleapis.com/v1/images:annotate")
GOOGLE_VISION_API_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
GOOGLE_VISION_TIMEOUT_SECONDS = float(os.getenv("GOOGLE_VISION_TIMEOUT_SECONDS", "30"))


class OCRPreparedPage(Protocol):
    page: int
    image: Image.Image
    file_bytes: bytes


@dataclass
class _NormalizedPage:
    page: int
    image: Image.Image
    file_bytes: bytes


def _image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _vertices_to_bbox(vertices: list[dict[str, Any]]) -> list[list[int]]:
    points: list[list[int]] = []
    for vertex in vertices or []:
        x = int(round(float(vertex.get("x", 0) or 0)))
        y = int(round(float(vertex.get("y", 0) or 0)))
        points.append([x, y])

    if not points:
        return [[0, 0], [0, 0], [0, 0], [0, 0]]

    if len(points) >= 4:
        return points[:4]

    x_values = [point[0] for point in points]
    y_values = [point[1] for point in points]
    return [
        [min(x_values), min(y_values)],
        [max(x_values), min(y_values)],
        [max(x_values), max(y_values)],
        [min(x_values), max(y_values)],
    ]


def _bbox_to_rect(bbox: list[list[int]], image_width: int, image_height: int) -> tuple[float, float, float, float]:
    x_values = [point[0] for point in bbox]
    y_values = [point[1] for point in bbox]
    x_min, x_max = min(x_values), max(x_values)
    y_min, y_max = min(y_values), max(y_values)

    rect_x = max(0.0, min(100.0, (x_min / max(1, image_width)) * 100.0))
    rect_y = max(0.0, min(100.0, (y_min / max(1, image_height)) * 100.0))
    rect_w = max(0.0, min(100.0 - rect_x, ((x_max - x_min) / max(1, image_width)) * 100.0))
    rect_h = max(0.0, min(100.0 - rect_y, ((y_max - y_min) / max(1, image_height)) * 100.0))
    return rect_x, rect_y, rect_w, rect_h


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


def _remove_duplicate_blocks(blocks: list[OCRBlock]) -> list[OCRBlock]:
    unique_blocks: list[OCRBlock] = []

    for block in sorted(blocks, key=lambda item: (item.rect_y, item.rect_x, -_block_area(item))):
        normalized = _normalize_text(block.text)
        if not normalized:
            continue

        duplicate_index: int | None = None
        for index, existing in enumerate(unique_blocks):
            if _normalize_text(existing.text) != normalized:
                continue
            if _block_iou(existing, block) < 0.72:
                continue
            duplicate_index = index
            break

        if duplicate_index is None:
            unique_blocks.append(block)
            continue

        current = unique_blocks[duplicate_index]
        if block.confidence > current.confidence:
            unique_blocks[duplicate_index] = block

    return sorted(unique_blocks, key=lambda item: (item.rect_y, item.rect_x))


def _extract_word_text(word_payload: dict[str, Any]) -> str:
    symbols = word_payload.get("symbols") or []
    if symbols:
        text = "".join(str(symbol.get("text") or "") for symbol in symbols)
        return _normalize_text(text)
    return _normalize_text(str(word_payload.get("text") or ""))


def _build_blocks_from_full_annotation(response_payload: dict[str, Any], page_number: int, image: Image.Image, min_confidence: float) -> list[OCRBlock]:
    image_width, image_height = image.size
    full_annotation = response_payload.get("fullTextAnnotation") or {}
    pages = full_annotation.get("pages") or []

    blocks: list[OCRBlock] = []
    for page_payload in pages:
        for block_payload in page_payload.get("blocks") or []:
            block_confidence = float(block_payload.get("confidence") or 0.0)
            for paragraph in block_payload.get("paragraphs") or []:
                words = paragraph.get("words") or []
                words_text = [_extract_word_text(word) for word in words]
                text = _normalize_text(" ".join(word for word in words_text if word))
                if not text:
                    continue

                confidence = float(paragraph.get("confidence") or block_confidence or 0.0)
                if confidence < min_confidence:
                    continue

                vertices = (paragraph.get("boundingBox") or {}).get("vertices") or []
                bbox = _vertices_to_bbox(vertices)
                rect_x, rect_y, rect_w, rect_h = _bbox_to_rect(bbox, image_width, image_height)
                blocks.append(
                    OCRBlock(
                        text=text,
                        bbox=bbox,
                        confidence=round(confidence, 4),
                        page=page_number,
                        rect_x=round(rect_x, 3),
                        rect_y=round(rect_y, 3),
                        rect_w=round(rect_w, 3),
                        rect_h=round(rect_h, 3),
                    )
                )

    if blocks:
        return _remove_duplicate_blocks(blocks)

    text_annotations = response_payload.get("textAnnotations") or []
    for annotation in text_annotations[1:]:
        text = _normalize_text(str(annotation.get("description") or ""))
        if not text:
            continue

        confidence = float(annotation.get("confidence") or 1.0)
        if confidence < min_confidence:
            continue

        vertices = (annotation.get("boundingPoly") or {}).get("vertices") or []
        bbox = _vertices_to_bbox(vertices)
        rect_x, rect_y, rect_w, rect_h = _bbox_to_rect(bbox, image_width, image_height)
        blocks.append(
            OCRBlock(
                text=text,
                bbox=bbox,
                confidence=round(confidence, 4),
                page=page_number,
                rect_x=round(rect_x, 3),
                rect_y=round(rect_y, 3),
                rect_w=round(rect_w, 3),
                rect_h=round(rect_h, 3),
            )
        )

    return _remove_duplicate_blocks(blocks)


def _call_google_vision_document_text_detection(image_bytes: bytes) -> dict[str, Any]:
    api_key = (os.getenv("GOOGLE_VISION_API_KEY") or GOOGLE_VISION_API_KEY).strip()
    if not api_key:
        raise RuntimeError(
            "Missing GOOGLE_VISION_API_KEY. Set a valid key to use Google Vision DOCUMENT_TEXT_DETECTION."
        )

    payload = {
        "requests": [
            {
                "image": {
                    "content": base64.b64encode(image_bytes).decode("ascii"),
                },
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }
        ]
    }

    response = requests.post(
        f"{GOOGLE_VISION_ENDPOINT}?key={api_key}",
        json=payload,
        timeout=GOOGLE_VISION_TIMEOUT_SECONDS,
    )

    if not response.ok:
        detail_message = ""
        reason = ""
        try:
            error_body = response.json() or {}
            error_payload = error_body.get("error") if isinstance(error_body, dict) else None
            if isinstance(error_payload, dict):
                detail_message = str(error_payload.get("message") or "").strip()
                for detail in error_payload.get("details") or []:
                    if not isinstance(detail, dict):
                        continue
                    reason = str(detail.get("reason") or "").strip()
                    if reason:
                        break
        except Exception:
            detail_message = ""

        if not detail_message:
            detail_message = (response.text or "").strip()[:600]

        if reason:
            raise RuntimeError(
                f"Google Vision API HTTP {response.status_code} ({reason}): {detail_message}"
            )
        raise RuntimeError(
            f"Google Vision API HTTP {response.status_code}: {detail_message}"
        )

    body = response.json()
    responses = body.get("responses") or []
    if not responses:
        raise RuntimeError("Google Vision returned an empty response array.")

    first = responses[0]
    error_payload = first.get("error")
    if isinstance(error_payload, dict) and error_payload.get("message"):
        raise RuntimeError(f"Google Vision API error: {error_payload.get('message')}")

    return first


def run_google_vision_on_pages(
    prepared_pages: list[OCRPreparedPage],
    *,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    start = time.perf_counter()
    pages: list[OCRPageResult] = []
    raw_results: list[dict[str, Any]] = []
    warnings: list[str] = []

    for prepared_page in prepared_pages:
        try:
            response_payload = _call_google_vision_document_text_detection(prepared_page.file_bytes)
            page_blocks = _build_blocks_from_full_annotation(
                response_payload,
                prepared_page.page,
                prepared_page.image,
                min_confidence,
            )
            pages.append(
                OCRPageResult(
                    page=prepared_page.page,
                    image_width=prepared_page.image.size[0],
                    image_height=prepared_page.image.size[1],
                    blocks=page_blocks,
                )
            )
            raw_results.append(response_payload)
        except Exception as exc:
            warning = f"Google Vision OCR failed on page {prepared_page.page}: {exc}"
            warnings.append(warning)
            logger.warning(warning)

    if not pages:
        if warnings:
            preview = " | ".join(warnings[:3])
            raise RuntimeError(f"Google Vision OCR failed on all document pages. {preview}")
        raise RuntimeError("Google Vision OCR failed on all document pages.")

    elapsed = time.perf_counter() - start
    logger.info("Google Vision OCR completed in %.2fs for %d/%d page(s)", elapsed, len(pages), len(prepared_pages))

    return {
        "pages": sorted(pages, key=lambda page: page.page),
        "raw_results": raw_results,
        "elapsed_seconds": elapsed,
        "warnings": warnings,
        "total_pages": len(prepared_pages),
    }


def run_google_vision_ocr(
    file_bytes: bytes,
    *,
    content_type: str | None = None,
    filename: str | None = None,
    min_confidence: float = 0.0,
) -> dict[str, Any]:
    images = normalise_to_images(file_bytes, (content_type or "application/octet-stream"), filename or "")
    prepared_pages = [
        _NormalizedPage(page=index, image=image, file_bytes=_image_to_png_bytes(image))
        for index, image in enumerate(images, start=1)
    ]
    return run_google_vision_on_pages(prepared_pages, min_confidence=min_confidence)


def remove_duplicate_text_lines(raw_text: str) -> str:
    paragraphs = [segment.strip() for segment in re.split(r"\n{2,}", str(raw_text or "")) if segment.strip()]
    seen_paragraphs: set[str] = set()
    cleaned_paragraphs: list[str] = []

    for paragraph in paragraphs:
        lines = [_normalize_text(line) for line in paragraph.splitlines() if _normalize_text(line)]
        deduped_lines: list[str] = []
        seen_lines: set[str] = set()
        previous_key: str | None = None

        for line in lines:
            key = re.sub(r"\W+", "", line).lower()
            if not key:
                continue
            if previous_key == key:
                continue
            if key in seen_lines and len(key) > 12:
                continue
            seen_lines.add(key)
            deduped_lines.append(line)
            previous_key = key

        if not deduped_lines:
            continue

        paragraph_text = "\n".join(deduped_lines).strip()
        paragraph_key = re.sub(r"\W+", "", paragraph_text).lower()
        if paragraph_key in seen_paragraphs:
            continue

        seen_paragraphs.add(paragraph_key)
        cleaned_paragraphs.append(paragraph_text)

    return "\n\n".join(cleaned_paragraphs).strip()


def extract_clean_text(page_results: list[OCRPageResult]) -> str:
    return remove_duplicate_text_lines(extract_full_text(page_results))
