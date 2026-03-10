#!/usr/bin/env python
"""Production OCR CLI built on the project's RapidOCR + Ollama correction pipeline.

This script provides the practical feature set requested by the OCR docs:
- single image/document JSON export
- batch processing for folders
- CSV export
- annotated image export
- confidence filtering

Notes:
- The current repository runs on Python 3.14, so this CLI uses RapidOCR/ONNX
  instead of PaddleOCR directly because PaddlePaddle wheels are not available.
- `--lang` and `--gpu` are accepted for CLI compatibility and included in metadata,
  but the active OCR runtime is the repository's RapidOCR pipeline.
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from services.ocr_service import (
    extract_full_text,
    guess_content_type,
    page_statistics,
    render_annotated_pages,
    run_ocr,
)


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx"}


@dataclass
class OCRCLIConfig:
    lang: str = "vi"
    use_gpu: bool = False
    min_confidence: float = 0.0
    pattern: str = "*"


def _read_file_bytes(path: Path) -> bytes:
    return path.read_bytes()


def _build_document_result(path: Path, config: OCRCLIConfig) -> dict[str, Any]:
    content_type = guess_content_type(path.name)
    file_bytes = _read_file_bytes(path)

    start = time.perf_counter()
    page_results = run_ocr(
        file_bytes,
        content_type=content_type,
        filename=path.name,
        min_confidence=config.min_confidence,
    )
    elapsed = time.perf_counter() - start

    pages_payload = []
    for page in page_results:
        lines = []
        for index, block in enumerate(page.blocks):
            lines.append(
                {
                    "id": index,
                    "text": block.text,
                    "confidence": block.confidence,
                    "page": block.page,
                    "position": {
                        "x": round(sum(point[0] for point in block.bbox) / 4),
                        "y": round(sum(point[1] for point in block.bbox) / 4),
                    },
                    "bounding_box": {
                        "x_min": min(point[0] for point in block.bbox),
                        "x_max": max(point[0] for point in block.bbox),
                        "y_min": min(point[1] for point in block.bbox),
                        "y_max": max(point[1] for point in block.bbox),
                    },
                    "dimensions": {
                        "width": max(point[0] for point in block.bbox) - min(point[0] for point in block.bbox),
                        "height": max(point[1] for point in block.bbox) - min(point[1] for point in block.bbox),
                    },
                }
            )

        page_text = "\n".join(line["text"] for line in lines)
        pages_payload.append(
            {
                "page": page.page,
                "image_width": page.image_width,
                "image_height": page.image_height,
                "text_lines": lines,
                "full_text": page_text,
                "statistics": {
                    "total_lines": len(lines),
                    "total_words": sum(len(line["text"].split()) for line in lines),
                    "average_confidence": round(
                        sum(line["confidence"] for line in lines) / len(lines),
                        4,
                    )
                    if lines
                    else 0.0,
                },
            }
        )

    warnings: list[str] = []
    if config.use_gpu:
        warnings.append("`--gpu` was requested, but this repository currently uses RapidOCR/ONNX CPU-compatible runtime.")
    if config.lang != "vi":
        warnings.append(f"`--lang {config.lang}` recorded in metadata; active OCR runtime is the repository's RapidOCR pipeline.")

    return {
        "status": "success",
        "metadata": {
            "image_path": str(path),
            "filename": path.name,
            "language": config.lang,
            "gpu_requested": config.use_gpu,
            "processing_time_seconds": round(elapsed, 3),
        },
        "results": {
            "pages": pages_payload,
            "full_text": extract_full_text(page_results),
            "statistics": page_statistics(page_results),
        },
        "warnings": warnings,
    }


def _save_json(payload: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _export_csv(results: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "file",
                "page",
                "line_id",
                "text",
                "confidence",
                "x_min",
                "x_max",
                "y_min",
                "y_max",
            ],
        )
        writer.writeheader()
        for result in results:
            file_name = result["metadata"]["filename"]
            for page in result["results"]["pages"]:
                for line in page["text_lines"]:
                    bbox = line["bounding_box"]
                    writer.writerow(
                        {
                            "file": file_name,
                            "page": page["page"],
                            "line_id": line["id"],
                            "text": line["text"],
                            "confidence": line["confidence"],
                            "x_min": bbox["x_min"],
                            "x_max": bbox["x_max"],
                            "y_min": bbox["y_min"],
                            "y_max": bbox["y_max"],
                        }
                    )


def _export_annotated_images(
    source_files: list[Path],
    results: list[dict[str, Any]],
    output_dir: Path,
    config: OCRCLIConfig,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for path in source_files:
        content_type = guess_content_type(path.name)
        file_bytes = _read_file_bytes(path)
        page_results = run_ocr(
            file_bytes,
            content_type=content_type,
            filename=path.name,
            min_confidence=config.min_confidence,
        )
        annotated_pages = render_annotated_pages(
            file_bytes,
            content_type=content_type,
            page_results=page_results,
            filename=path.name,
        )
        for index, image in enumerate(annotated_pages, start=1):
            suffix = f"_page-{index}" if len(annotated_pages) > 1 else ""
            image.save(output_dir / f"{path.stem}{suffix}_annotated.png")


def _find_input_files(path: Path, pattern: str) -> list[Path]:
    if path.is_file():
        return [path]

    files = [
        file
        for file in path.rglob(pattern)
        if file.is_file() and file.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    return sorted(files)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OCR CLI for JSON / CSV / annotated exports")
    parser.add_argument("input", help="Input file or folder")
    parser.add_argument("-o", "--output", default="ocr_result.json", help="JSON output path")
    parser.add_argument("--csv", help="Optional CSV output path")
    parser.add_argument("--annotated", help="Optional directory for annotated images")
    parser.add_argument("--pattern", default="*", help="Glob pattern for batch mode")
    parser.add_argument("--lang", default="vi", help="Metadata language tag")
    parser.add_argument("--gpu", action="store_true", help="Compatibility flag; recorded in metadata")
    parser.add_argument("--min-conf", type=float, default=0.0, help="Minimum OCR confidence (0-1)")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input path not found: {input_path}")

    config = OCRCLIConfig(
        lang=args.lang,
        use_gpu=args.gpu,
        min_confidence=args.min_conf,
        pattern=args.pattern,
    )

    source_files = _find_input_files(input_path, config.pattern)
    if not source_files:
        raise SystemExit("No supported OCR files found.")

    results = [_build_document_result(path, config) for path in source_files]

    output_path = Path(args.output)
    if len(results) == 1:
        payload: dict[str, Any] = results[0]
    else:
        payload = {
            "status": "success",
            "metadata": {
                "directory": str(input_path),
                "language": config.lang,
                "gpu_requested": config.use_gpu,
                "file_count": len(results),
            },
            "results": results,
            "summary": {
                "total_files": len(results),
                "total_blocks": sum(result["results"]["statistics"]["total_blocks"] for result in results),
                "total_words": sum(result["results"]["statistics"]["total_words"] for result in results),
            },
        }

    _save_json(payload, output_path)
    print(f"Saved JSON: {output_path}")

    if args.csv:
        csv_path = Path(args.csv)
        _export_csv(results, csv_path)
        print(f"Saved CSV: {csv_path}")

    if args.annotated:
        annotated_dir = Path(args.annotated)
        _export_annotated_images(source_files, results, annotated_dir, config)
        print(f"Saved annotated images: {annotated_dir}")


if __name__ == "__main__":
    main()