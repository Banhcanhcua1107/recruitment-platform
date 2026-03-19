from __future__ import annotations

import os
from typing import Any


def build_normalized_json(processed: dict[str, Any], vl_result: dict[str, Any]) -> dict[str, Any]:
    data = processed.get("data") or {}
    return {
        "profile": data.get("profile") or {
            "full_name": data.get("full_name"),
            "job_title": data.get("job_title"),
        },
        "contacts": data.get("contact") or {},
        "summary": data.get("summary") or "",
        "experience": data.get("experience") or [],
        "education": data.get("education") or [],
        "skills": data.get("skills") or [],
        "projects": data.get("projects") or [],
        "certifications": data.get("certifications") or [],
        "languages": data.get("languages") or [],
        "avatar": {
            "detected": bool(vl_result.get("signals", {}).get("has_avatar_candidate")),
        },
        "raw_ocr_blocks": processed.get("blocks") or [],
        "layout_blocks": processed.get("layout_blocks") or [],
        "_meta": {
            "parser_model": os.getenv("CV_PARSER_MODEL", "qwen2.5-coder:7b"),
            "prompt_version": "v2",
        },
    }


def build_parser_raw_response(processed: dict[str, Any], normalized_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "model": os.getenv("CV_PARSER_MODEL", "qwen2.5-coder:7b"),
        "prompt_version": "v2",
        "input_summary": {
            "page_count": processed.get("page_count", 0),
            "total_blocks": processed.get("total_blocks", 0),
        },
        "normalized_json": normalized_json,
    }
