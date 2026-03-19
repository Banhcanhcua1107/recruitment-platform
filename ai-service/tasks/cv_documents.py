from __future__ import annotations

import json
import threading
import time
import uuid
from typing import Any

from celery.utils.log import get_task_logger

from celery_app import celery_app
from services.artifact_manifest import (
    build_artifact_key,
    build_storage_path,
    fingerprint_payload,
)
from services.document_classifier import classify_document
from services.document_repository import DocumentRepository, utcnow
from services.multimodal_vl import analyze_document
from services.ocr_pipeline import (
    _image_to_png_bytes,
    _prepare_document_pages,
    build_preview_payload,
    process_cv,
)
from services.stage_runner import StageRunner
from services.storage_client import StorageClient
from services.structured_parser import build_normalized_json, build_parser_raw_response

logger = get_task_logger(__name__)

PREVIEW_BUCKET = "cv-previews"
ASSET_BUCKET = "cv-assets"
ARTIFACT_BUCKET = "cv-artifacts"

PREVIEW_ARTIFACT_KINDS = {"preview_page", "preview_pdf", "thumbnail_page", "normalized_source"}
RAW_DATA_ARTIFACT_KINDS = {
    "ocr_raw",
    "layout_raw",
    "markdown_pages",
    "vl_raw",
    "parser_raw",
    "normalized_json",
}


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def _bbox_xywh(points: list[list[int]]) -> dict[str, float]:
    xs = [float(point[0]) for point in points if len(point) >= 2]
    ys = [float(point[1]) for point in points if len(point) >= 2]
    if not xs or not ys:
        return {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}
    left = min(xs)
    top = min(ys)
    right = max(xs)
    bottom = max(ys)
    return {
        "x": left,
        "y": top,
        "width": max(0.0, right - left),
        "height": max(0.0, bottom - top),
    }


def _normalize_bbox(bbox_px: dict[str, float], width: int, height: int) -> dict[str, float]:
    safe_width = max(1, width)
    safe_height = max(1, height)
    return {
        "x": bbox_px["x"] / safe_width,
        "y": bbox_px["y"] / safe_height,
        "width": bbox_px["width"] / safe_width,
        "height": bbox_px["height"] / safe_height,
    }


def _heartbeat_loop(repository: DocumentRepository, document_id: str, job_id: str, stop_event: threading.Event) -> None:
    while not stop_event.wait(15):
        try:
            repository.heartbeat_document(document_id, job_id)
        except Exception as exc:  # pragma: no cover - best effort heartbeat
            logger.warning("heartbeat failed for %s: %s", document_id, exc)


def _bucket_for_artifact(kind: str) -> str:
    if kind in PREVIEW_ARTIFACT_KINDS:
        return PREVIEW_BUCKET
    if kind in RAW_DATA_ARTIFACT_KINDS:
        return ARTIFACT_BUCKET
    return ASSET_BUCKET


def _persist_binary_artifact(
    repository: DocumentRepository,
    storage: StorageClient,
    *,
    document: dict[str, Any],
    kind: str,
    content: bytes,
    content_type: str,
    source_stage: str,
    extension: str,
    producer_model: str | None = None,
    prompt_version: str | None = None,
    page_number: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    storage_bucket = _bucket_for_artifact(kind)
    fingerprint = fingerprint_payload(
        {
            "kind": kind,
            "page_number": page_number,
            "sha": document.get("file_sha256"),
            "content_sha": len(content),
            "metadata": metadata or {},
        }
    )
    artifact_key = build_artifact_key(document["id"], kind, fingerprint, page_number=page_number)
    storage_path = build_storage_path(
        document["user_id"],
        document["id"],
        kind,
        fingerprint,
        extension=extension,
        page_number=page_number,
    )
    storage.upload_bytes(
        storage_bucket,
        storage_path,
        content,
        content_type,
    )
    return repository.upsert_artifact(
        {
            "document_id": document["id"],
            "artifact_key": artifact_key,
            "kind": kind,
            "status": "ready",
            "page_number": page_number,
            "storage_bucket": storage_bucket,
            "storage_path": storage_path,
            "content_type": content_type,
            "byte_size": len(content),
            "sha256": None,
            "source_stage": source_stage,
            "producer_model": producer_model,
            "prompt_version": prompt_version,
            "input_fingerprint": fingerprint,
            "metadata": metadata or {},
        }
    )


@celery_app.task(name="tasks.cv_documents.process_document", bind=True, autoretry_for=(), retry_backoff=False)
def process_document(self, document_id: str, job_id: str) -> str:
    repository = DocumentRepository()
    storage = StorageClient()
    lock_token = f"lock_{uuid.uuid4().hex}"
    document = repository.claim_document(document_id, job_id, lock_token)
    if not document:
        logger.info("document %s skipped because another active worker owns it", document_id)
        return "skipped_duplicate_or_stale"

    original_artifact = repository.get_document_artifact(document_id, "original_file")
    if not original_artifact:
        repository.update_document_status(
            document_id,
            "failed",
            failure_stage="upload",
            failure_code="missing_original_artifact",
        )
        return "failed_missing_original"

    stop_event = threading.Event()
    heartbeat_thread = threading.Thread(
        target=_heartbeat_loop,
        args=(repository, document_id, job_id, stop_event),
        daemon=True,
    )
    heartbeat_thread.start()

    stage_runner = StageRunner(repository, document_id, job_id)
    stage_durations: dict[str, int] = {}

    try:
        file_bytes = repository.download_storage_object(
            original_artifact["storage_bucket"],
            original_artifact["storage_path"],
        )

        with stage_runner.run("normalizing"):
            repository.update_document_status(document_id, "normalizing")
            normalized = build_preview_payload(
                file_bytes,
                content_type=document.get("mime_type"),
                filename=document.get("file_name"),
            )
            if normalized["file_type"] == "docx":
                _persist_binary_artifact(
                    repository,
                    storage,
                    document=document,
                    kind="normalized_source",
                    content=normalized["preview_bytes"],
                    content_type=normalized["preview_mime"],
                    source_stage="normalize",
                    extension="pdf",
                    metadata={"source_kind": "docx"},
                )
            stage_durations["normalizing"] = 0

        with stage_runner.run("rendering_preview"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "rendering_preview")
            prepared_pages = _prepare_document_pages(
                file_bytes,
                content_type=document.get("mime_type"),
                filename=document.get("file_name"),
            )
            page_rows: list[dict[str, Any]] = []
            for prepared_page in prepared_pages:
                preview_bytes = _image_to_png_bytes(prepared_page.image)
                artifact = _persist_binary_artifact(
                    repository,
                    storage,
                    document=document,
                    kind="preview_page",
                    content=preview_bytes,
                    content_type="image/png",
                    source_stage="render_preview",
                    extension="png",
                    page_number=prepared_page.page,
                    metadata={
                        "canonical_width_px": prepared_page.image.width,
                        "canonical_height_px": prepared_page.image.height,
                    },
                )
                page_rows.append(
                    {
                        "document_id": document_id,
                        "page_number": prepared_page.page,
                        "canonical_width_px": prepared_page.image.width,
                        "canonical_height_px": prepared_page.image.height,
                        "background_artifact_id": artifact["id"],
                        "thumbnail_artifact_id": None,
                    }
                )

            repository.upsert_pages(page_rows)
            stage_durations["rendering_preview"] = int((time.perf_counter() - stage_started) * 1000)

        with stage_runner.run("ocr_running"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "ocr_running")
            processed = process_cv(
                file_bytes,
                content_type=document.get("mime_type"),
                filename=document.get("file_name"),
            )
            ocr_raw_payload = {
                "page_count": processed.get("page_count", 0),
                "pages": [
                    {
                        "page": page.page,
                        "image_width": page.image_width,
                        "image_height": page.image_height,
                        "blocks": [
                            {
                                "text": block.text,
                                "bbox": block.bbox,
                                "confidence": block.confidence,
                                "page": block.page,
                            }
                            for block in page.blocks
                        ],
                    }
                    for page in processed.get("page_results", [])
                ],
                "warnings": processed.get("warnings", []),
            }
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="ocr_raw",
                content=_json_bytes(ocr_raw_payload),
                content_type="application/json",
                source_stage="ocr",
                extension="json",
            )
            stage_durations["ocr_running"] = int((time.perf_counter() - stage_started) * 1000)

        with stage_runner.run("layout_running"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "layout_running")
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="layout_raw",
                content=_json_bytes(processed.get("layout") or {}),
                content_type="application/json",
                source_stage="layout",
                extension="json",
            )
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="markdown_pages",
                content=_json_bytes(processed.get("markdown_pages") or []),
                content_type="application/json",
                source_stage="layout",
                extension="json",
            )
            classification = classify_document(processed.get("raw_text", ""), processed)
            repository.update_document_status(
                document_id,
                "layout_running",
                review_required=classification["review_required"],
                review_reason_code=classification["review_reason_code"],
                document_type=classification["document_type"],
                classification_confidence=classification["confidence"],
                classification_signals=classification["signals"],
            )
            stage_durations["layout_running"] = int((time.perf_counter() - stage_started) * 1000)

        with stage_runner.run("vl_running"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "vl_running")
            vl_result = analyze_document(
                raw_text=processed.get("raw_text", ""),
                page_count=processed.get("page_count", 0),
                layout_blocks=processed.get("layout_blocks") or [],
            )
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="vl_raw",
                content=_json_bytes(vl_result),
                content_type="application/json",
                source_stage="vl",
                extension="json",
                producer_model=vl_result.get("model"),
                prompt_version=vl_result.get("prompt_version"),
            )
            stage_durations["vl_running"] = int((time.perf_counter() - stage_started) * 1000)

        with stage_runner.run("parsing_structured"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "parsing_structured")
            normalized_json = build_normalized_json(processed, vl_result)
            parser_raw = build_parser_raw_response(processed, normalized_json)
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="parser_raw",
                content=_json_bytes(parser_raw),
                content_type="application/json",
                source_stage="parse_structured",
                extension="json",
                producer_model=parser_raw.get("model"),
                prompt_version=parser_raw.get("prompt_version"),
            )
            _persist_binary_artifact(
                repository,
                storage,
                document=document,
                kind="normalized_json",
                content=_json_bytes(normalized_json),
                content_type="application/json",
                source_stage="parse_structured",
                extension="json",
            )
            stage_durations["parsing_structured"] = int((time.perf_counter() - stage_started) * 1000)

        with stage_runner.run("persisting"):
            stage_started = time.perf_counter()
            repository.update_document_status(document_id, "persisting")
            persisted_pages = repository.fetch_many("cv_document_pages", document_id=document_id, order="page_number.asc")
            page_id_by_number = {page["page_number"]: page["id"] for page in persisted_pages}

            ocr_rows: list[dict[str, Any]] = []
            for page in processed.get("page_results", []):
                page_id = page_id_by_number.get(page.page)
                if not page_id:
                    continue
                for sequence, block in enumerate(page.blocks):
                    bbox_px = _bbox_xywh(block.bbox)
                    ocr_rows.append(
                        {
                            "document_id": document_id,
                            "page_id": page_id,
                            "text": block.text,
                            "confidence": block.confidence,
                            "bbox_px": bbox_px,
                            "bbox_normalized": _normalize_bbox(bbox_px, page.image_width, page.image_height),
                            "polygon_px": [{"x": point[0], "y": point[1]} for point in block.bbox],
                            "type": "text",
                            "editable": True,
                            "layout_group_id": None,
                            "sequence": sequence,
                            "suggested_json_path": None,
                            "suggested_mapping_role": None,
                            "suggested_compose_strategy": None,
                            "suggested_parse_strategy": None,
                            "mapping_confidence": block.confidence,
                        }
                    )

            layout_rows: list[dict[str, Any]] = []
            for order_index, block in enumerate(processed.get("layout_blocks") or []):
                page_id = page_id_by_number.get(block.get("page"))
                if not page_id:
                    continue
                bbox = block.get("bbox") or [0, 0, 0, 0]
                bbox_px = {
                    "x": float(bbox[0]),
                    "y": float(bbox[1]),
                    "width": max(0.0, float(bbox[2]) - float(bbox[0])),
                    "height": max(0.0, float(bbox[3]) - float(bbox[1])),
                }
                page_meta = next((page for page in persisted_pages if page["id"] == page_id), None)
                layout_rows.append(
                    {
                        "document_id": document_id,
                        "page_id": page_id,
                        "type": block.get("layout_type") or block.get("type") or "section",
                        "bbox_px": bbox_px,
                        "bbox_normalized": _normalize_bbox(
                            bbox_px,
                            int(page_meta["canonical_width_px"]) if page_meta else 1,
                            int(page_meta["canonical_height_px"]) if page_meta else 1,
                        ),
                        "order_index": order_index,
                        "metadata": block,
                    }
                )

            repository.replace_ocr_blocks(document_id, ocr_rows)
            repository.replace_layout_blocks(document_id, layout_rows)

            final_status = "ready" if classification["document_type"] == "cv" else "partial_ready"
            stage_durations["persisting"] = int((time.perf_counter() - stage_started) * 1000)
            repository.update_document_status(
                document_id,
                final_status,
                page_count=processed.get("page_count"),
                raw_text=processed.get("raw_text"),
                parsed_json=normalized_json,
                processing_finished_at=utcnow().isoformat(),
                total_processing_ms=sum(stage_durations.values()),
                stage_durations=stage_durations,
                last_heartbeat_at=utcnow().isoformat(),
            )

        return "ready"

    except Exception as exc:
        logger.exception("document processing failed for %s", document_id)
        repository.update_document_status(
            document_id,
            "failed",
            failure_stage="persist",
            failure_code=type(exc).__name__,
            retry_count=(document.get("retry_count") or 0) + 1,
            processing_finished_at=utcnow().isoformat(),
            stage_durations=stage_durations,
        )
        raise
    finally:
        stop_event.set()
        heartbeat_thread.join(timeout=2)
