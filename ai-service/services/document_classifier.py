from __future__ import annotations

from typing import Any


def classify_document(raw_text: str, parsed_payload: dict[str, Any] | None = None) -> dict[str, Any]:
    text = (raw_text or "").lower()
    parsed_payload = parsed_payload or {}
    data = parsed_payload.get("data") or {}
    contact = data.get("contact") or {}
    experience = data.get("experience") or []
    education = data.get("education") or []
    skills = data.get("skills") or []

    signals: list[str] = []
    score = 0.0

    if "@" in text or contact.get("email"):
        score += 1.5
        signals.append("email")
    if contact.get("phone"):
        score += 1.25
        signals.append("phone")
    if experience:
        score += 1.5
        signals.append("experience_entries")
    if education:
        score += 1.25
        signals.append("education_entries")
    if skills:
        score += 1.0
        signals.append("skills_entries")
    if any(keyword in text for keyword in ("experience", "kinh nghiem", "education", "hoc van", "skills", "ky nang")):
        score += 1.5
        signals.append("section_keywords")

    confidence = min(1.0, score / 6.0)
    document_type = "cv" if score >= 3.0 else "non_cv_document"

    return {
        "document_type": document_type,
        "confidence": round(confidence, 4),
        "signals": signals,
        "review_required": document_type != "cv",
        "review_reason_code": None if document_type == "cv" else "non_cv_document",
    }
