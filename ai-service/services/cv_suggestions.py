from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import requests

logger = logging.getLogger("cv_suggestions")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_SUGGEST_MODEL = os.getenv("OLLAMA_CV_SUGGEST_MODEL", "qwen3:4b")


def _dedupe_suggestions(items: list[str], max_items: int) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = " ".join(str(item or "").strip().split())
        if not cleaned:
            continue
        key = re.sub(r"\W+", "", cleaned).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(cleaned)
        if len(output) >= max_items:
            break
    return output


def _extract_json_array(raw: str) -> list[str]:
    text = str(raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return []

    try:
        payload = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []

    if not isinstance(payload, list):
        return []

    values: list[str] = []
    for item in payload:
        if isinstance(item, str):
            values.append(item)
            continue
        if isinstance(item, dict):
            values.append(str(item.get("suggestion") or item.get("text") or ""))
    return values


def suggest_cv_improvements(
    *,
    clean_html: str,
    structured_json: dict[str, Any] | None,
    raw_text: str,
    max_items: int = 5,
) -> dict[str, Any]:
    normalized_max = max(1, min(10, int(max_items)))

    system_prompt = (
        "You are a CV quality reviewer. "
        "Return only a JSON array of concise improvement suggestions. "
        "Each suggestion must be actionable and non-duplicated. "
        "Do not include markdown, explanations, or extra keys."
    )

    user_prompt = (
        f"Target count: {normalized_max}\n"
        "Review this CV content and suggest improvements for clarity, impact, quantification, and relevance.\n"
        "Avoid repeating ideas.\n\n"
        f"Structured JSON:\n{json.dumps(structured_json or {}, ensure_ascii=False)[:6000]}\n\n"
        f"Clean HTML:\n{clean_html[:5000]}\n\n"
        f"Raw OCR text:\n{raw_text[:2500]}"
    )

    payload = {
        "model": OLLAMA_SUGGEST_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "options": {
            "temperature": 0.3,
            "top_p": 0.8,
            "num_predict": 400,
        },
    }

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        content = ((response.json() or {}).get("message") or {}).get("content") or ""
        suggestions = _extract_json_array(content)
        deduped = _dedupe_suggestions(suggestions, normalized_max)
        return {
            "suggestions": deduped,
            "model_used": f"ollama/{OLLAMA_SUGGEST_MODEL}",
        }
    except Exception as exc:
        logger.warning("Failed to generate CV suggestions with Ollama: %s", exc)
        return {
            "suggestions": [],
            "model_used": f"ollama/{OLLAMA_SUGGEST_MODEL}",
        }
