from __future__ import annotations

import os
from typing import Any

from services.mapped_sections import (
    has_meaningful_mapped_sections,
    mapped_sections_to_structured_data,
    normalize_document_analysis,
    normalize_mapped_sections,
)


def _resolve_parser_model() -> str:
    return (
        os.getenv("CV_PARSER_MODEL")
        or os.getenv("OLLAMA_CV_PARSER_MODEL")
        or "qwen3:4b"
    )


def _normalize_correction_log(entries: Any) -> list[dict[str, str]]:
    if not isinstance(entries, list):
        return []

    normalized: list[dict[str, str]] = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "field": str(item.get("field") or ""),
                "before": str(item.get("before") or ""),
                "after": str(item.get("after") or ""),
                "reason": str(item.get("reason") or ""),
            }
        )
    return normalized


def build_normalized_json(processed: dict[str, Any], vl_result: dict[str, Any]) -> dict[str, Any]:
    mapped_sections = normalize_mapped_sections(
        processed.get("mapped_sections") or processed.get("data") or {},
        avatar_url=(
            processed.get("avatar_url")
            if isinstance(processed.get("avatar_url"), str)
            else None
        ),
    )
    cleaned_json = normalize_mapped_sections(
        processed.get("cleaned_json") or mapped_sections,
        avatar_url=(
            processed.get("avatar_url")
            if isinstance(processed.get("avatar_url"), str)
            else None
        ),
    )
    effective_sections = cleaned_json if has_meaningful_mapped_sections(cleaned_json) else mapped_sections
    document_analysis = normalize_document_analysis(
        processed.get("document_analysis"),
        mapped_sections=effective_sections,
    )
    correction_log = _normalize_correction_log(processed.get("correction_log"))
    data = (
        mapped_sections_to_structured_data(
            effective_sections,
            raw_text=str(processed.get("raw_text") or ""),
        )
        if has_meaningful_mapped_sections(effective_sections)
        else processed.get("data")
        or mapped_sections_to_structured_data(
            effective_sections,
            raw_text=str(processed.get("raw_text") or ""),
        )
    )
    return {
        "profile": data.get("profile") or {
            "full_name": data.get("full_name"),
            "job_title": data.get("job_title"),
        },
        "contacts": data.get("contact") or {},
        "summary": data.get("summary") or "",
        "career_objective": data.get("career_objective") or "",
        "experience": data.get("experience") or [],
        "education": data.get("education") or [],
        "skills": data.get("skills") or [],
        "projects": data.get("projects") or [],
        "certifications": data.get("certifications") or [],
        "languages": data.get("languages") or [],
        "awards": data.get("awards") or [],
        "hobbies": data.get("hobbies") or [],
        "others": data.get("others") or [],
        "mapped_sections": mapped_sections,
        "cleaned_json": cleaned_json,
        "document_analysis": document_analysis,
        "correction_log": correction_log,
        "avatar": {
            "detected": bool(vl_result.get("signals", {}).get("has_avatar_candidate")),
        },
        "raw_ocr_blocks": processed.get("blocks") or [],
        "layout_blocks": processed.get("layout_blocks") or [],
        "_meta": {
            "parser_model": _resolve_parser_model(),
            "prompt_version": "v2",
        },
    }


def build_parser_raw_response(processed: dict[str, Any], normalized_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "model": _resolve_parser_model(),
        "prompt_version": "v2",
        "input_summary": {
            "page_count": processed.get("page_count", 0),
            "total_blocks": processed.get("total_blocks", 0),
        },
        "mapped_sections": normalized_json.get("mapped_sections") or {},
        "cleaned_json": normalized_json.get("cleaned_json") or {},
        "document_analysis": normalized_json.get("document_analysis") or {},
        "correction_log": normalized_json.get("correction_log") or [],
        "normalized_json": normalized_json,
    }
