"""
Job Matcher Service
Uses Ollama (qwen3:4b) for semantic scoring between CV and Job Description.
Keyword gap analysis runs purely in Python (no ML dependency needed).
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from typing import TYPE_CHECKING

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# qwen3:4b → gợi ý nội dung CV & phân tích job
MODEL = os.getenv("OLLAMA_CV_SUGGEST_MODEL", "qwen3:4b")


# ── Keyword extraction ───────────────────────────────────────

# Minimal English stopwords – keeps the dependency footprint small
_STOPWORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "must", "it", "its", "this", "that", "these", "those", "i", "you",
    "we", "they", "he", "she", "me", "us", "them", "my", "your", "our",
    "their", "his", "her", "not", "no", "so", "if", "then", "than",
    "too", "very", "just", "about", "above", "after", "again", "all",
    "also", "am", "any", "because", "before", "between", "both", "each",
    "few", "more", "most", "other", "over", "own", "same", "some",
    "such", "up", "out", "into", "through", "during", "which", "what",
    "who", "whom", "where", "when", "how", "why", "etc", "per",
    # Vietnamese stopwords
    "và", "của", "là", "có", "được", "trong", "cho", "với", "các",
    "một", "những", "này", "đó", "để", "từ", "theo", "về", "hoặc",
    "không", "đã", "sẽ", "bạn", "chúng", "tôi", "như", "khi", "tại",
}


# ═════════════════════════════════════════════════════════════
# Public API
# ═════════════════════════════════════════════════════════════


def _call_ollama(system: str, user: str) -> str:
    """POST to Ollama /api/chat and return the assistant's reply text.

    Appends /no_think to suppress Qwen3 extended-thinking mode so the
    actual answer appears in message.content rather than message.thinking.
    Falls back to message.thinking if content is empty.
    """
    payload = json.dumps({
        "model": MODEL,
        "stream": False,
        "think": False,          # disable Qwen3 extended-thinking mode
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user + " /no_think"},
        ],
        "options": {"temperature": 0.2, "num_predict": 2048},
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode())
            msg = body.get("message", {})
            content = msg.get("content", "").strip()
            # Qwen3 thinking mode: actual answer may be in 'thinking' when
            # content is empty and thinking mode wasn't fully suppressed
            if not content:
                content = msg.get("thinking", "").strip()
            return content
    except urllib.error.URLError as exc:
        logger.error("Ollama request failed: %s", exc)
        return ""


def _extract_keywords(text: str) -> set[str]:
    """Return a set of meaningful words (lowercase, no stopwords)."""
    tokens = re.findall(r"[a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ0-9_+#.-]{1,}", text)
    return {t.lower() for t in tokens if t.lower() not in _STOPWORDS and len(t) > 2}


def match_cv_to_job(
    cv_text: str,
    job_description: str,
) -> tuple[float, list[str], list[str]]:
    """Compute match percentage via Ollama qwen3:4b + keyword gap analysis."""
    system = (
        "Ban la he thong danh gia do phu hop CV voi JD.\n"
        "Tra ve JSON voi 1 truong: 'score' (so nguyen 0-100).\n"
        "Khong giai thich, chi JSON thuan."
    )
    sep = '"""'
    user = (
        "CV:\n" + sep + "\n" + cv_text[:1500] + "\n" + sep + "\n\n"
        "JD:\n" + sep + "\n" + job_description[:1500] + "\n" + sep + "\n\n"
        'Danh gia do phu hop 0-100, tra ve JSON: {"score": <number>}'
    )

    raw = _call_ollama(system, user)

    # ── Parse score ──────────────────────────────────────────
    match_percentage = 0.0

    # 1) Try strict JSON  {"score": 85}
    _json_scored = False
    for chunk in re.findall(r'\{[^{}]{1,80}\}', raw):
        try:
            obj = json.loads(chunk)
            if "score" in obj:
                match_percentage = float(max(0, min(100, obj["score"])))
                _json_scored = True
                break
        except Exception:
            pass

    if not _json_scored:
        # 2) Patterns: "score: 75", "75/100", "75%", "75 out of 100", "75 points"
        _pat = re.search(
            r'(?:score[:\s]+|match[:\s]+)(\d{1,3})'
            r'|\b(\d{1,3})\s*/\s*100'
            r'|\b(\d{1,3})\s*(?:percent|points?|out\s+of\s+100|%)',
            raw, re.IGNORECASE,
        )
        if _pat:
            val = next(v for v in _pat.groups() if v is not None)
            match_percentage = float(min(100, int(val)))
        else:
            # 3) Last number in [10..99] range (most likely a realistic match %)
            candidates = [int(n) for n in re.findall(r'\b(\d{1,3})\b', raw)
                          if 10 <= int(n) <= 99]
            if candidates:
                match_percentage = float(candidates[-1])

    # Keyword gap analysis (pure Python – no ML)
    cv_keywords  = _extract_keywords(cv_text)
    jd_keywords  = _extract_keywords(job_description)
    missing = sorted(jd_keywords - cv_keywords)
    common  = sorted(jd_keywords & cv_keywords)

    return round(match_percentage, 2), missing, common
