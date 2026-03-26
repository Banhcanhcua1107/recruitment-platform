from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable

from services.mapped_sections import (
    build_empty_document_analysis,
    build_empty_mapped_sections,
    normalize_document_analysis,
    normalize_mapped_sections,
)

logger = logging.getLogger("cv_content_cleaner")


def build_empty_cleaning_result(mapped_sections: Any | None = None) -> dict[str, Any]:
    return {
        "correction_log": [],
        "cleaned_json": normalize_mapped_sections(mapped_sections or {}),
    }


def build_empty_postprocess_result(mapped_sections: Any | None = None) -> dict[str, Any]:
    normalized_sections = normalize_mapped_sections(mapped_sections or {})
    return {
        "document_analysis": normalize_document_analysis(
            {},
            mapped_sections=normalized_sections,
        ),
        "correction_log": [],
        "mapped_sections": normalized_sections,
    }


def cleaning_result_schema_json() -> str:
    return json.dumps(
        {
            "correction_log": [
                {
                    "field": "",
                    "before": "",
                    "after": "",
                    "reason": "",
                }
            ],
            "cleaned_json": build_empty_mapped_sections(),
        },
        ensure_ascii=False,
        indent=2,
    )


def postprocess_result_schema_json() -> str:
    return json.dumps(
        {
            "document_analysis": build_empty_document_analysis(),
            "correction_log": [
                {
                    "field": "",
                    "before": "",
                    "after": "",
                    "reason": "",
                }
            ],
            "mapped_sections": build_empty_mapped_sections(),
        },
        ensure_ascii=False,
        indent=2,
    )


def _extract_first_json_object(raw: str) -> dict[str, Any]:
    content = raw.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        return json.loads(content[start : end + 1])
    except json.JSONDecodeError:
        return {}


def _is_meaningful(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(_is_meaningful(item) for item in value)
    if isinstance(value, dict):
        return any(_is_meaningful(item) for item in value.values())
    return True


def _merge_cleaned_over_original(original: Any, candidate: Any) -> Any:
    if isinstance(original, dict) and isinstance(candidate, dict):
        return {
            key: _merge_cleaned_over_original(original.get(key), candidate.get(key))
            for key in original.keys() | candidate.keys()
        }

    if isinstance(original, list) and isinstance(candidate, list):
        if not candidate and original:
            return original
        merged: list[Any] = []
        total = max(len(original), len(candidate))
        for index in range(total):
            if index < len(candidate):
                if index < len(original):
                    merged.append(_merge_cleaned_over_original(original[index], candidate[index]))
                elif _is_meaningful(candidate[index]):
                    merged.append(candidate[index])
            elif index < len(original):
                merged.append(original[index])
        return merged

    if isinstance(candidate, str):
        return candidate if candidate.strip() or not isinstance(original, str) else original

    if _is_meaningful(candidate):
        return candidate

    return original


def _normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def _field_name_from_path(path: str) -> str:
    trimmed = re.sub(r"\[\d+\]", "", path)
    return trimmed.rsplit(".", 1)[-1]


def _apply_sensitive_scalar_guard(path: str, original: Any, cleaned: Any) -> Any:
    if not isinstance(original, str) or not isinstance(cleaned, str):
        return cleaned

    field_name = _field_name_from_path(path)
    original_text = original.strip()
    cleaned_text = cleaned.strip()

    if not original_text:
        return cleaned_text

    if field_name in {"email", "url", "github", "avatar_url"}:
        return cleaned_text if _normalize_spaces(cleaned_text) == _normalize_spaces(original_text) else original_text

    if field_name == "phone":
        return cleaned_text if re.sub(r"\D", "", cleaned_text) == re.sub(r"\D", "", original_text) else original_text

    if field_name in {"year", "gpa", "start_date", "end_date"}:
        return cleaned_text if _normalize_spaces(cleaned_text) == _normalize_spaces(original_text) else original_text

    return cleaned


def _apply_safety_guards(original: Any, cleaned: Any, path: str = "") -> Any:
    if isinstance(original, dict) and isinstance(cleaned, dict):
        return {
            key: _apply_safety_guards(
                original.get(key),
                cleaned.get(key),
                f"{path}.{key}" if path else key,
            )
            for key in original.keys() | cleaned.keys()
        }

    if isinstance(original, list) and isinstance(cleaned, list):
        guarded: list[Any] = []
        total = max(len(original), len(cleaned))
        for index in range(total):
            current_path = f"{path}[{index}]"
            if index < len(cleaned):
                original_value = original[index] if index < len(original) else None
                guarded.append(_apply_safety_guards(original_value, cleaned[index], current_path))
            elif index < len(original):
                guarded.append(original[index])
        return guarded

    return _apply_sensitive_scalar_guard(path, original, cleaned)


def _normalize_correction_log(raw_log: Any) -> list[dict[str, str]]:
    if not isinstance(raw_log, list):
        return []

    normalized: list[dict[str, str]] = []
    for item in raw_log:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "field": str(item.get("field") or "").strip(),
                "before": str(item.get("before") or "").strip(),
                "after": str(item.get("after") or "").strip(),
                "reason": str(item.get("reason") or "").strip(),
            }
        )
    return normalized


def _build_reason_lookup(entries: list[dict[str, str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for entry in entries:
        field = entry.get("field") or ""
        reason = entry.get("reason") or ""
        if field and reason:
            lookup[field] = reason
    return lookup


def _canonical_compare(text: str) -> str:
    lowered = (text or "").casefold()
    lowered = re.sub(r"[^\w\s]", "", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _guess_reason(path: str, before: str, after: str, model_reason: str | None = None) -> str:
    if model_reason:
        return model_reason
    if re.sub(r"\s+", " ", before).strip() == re.sub(r"\s+", " ", after).strip():
        return "normalized whitespace"
    if _canonical_compare(before) == _canonical_compare(after):
        return "standardized casing/punctuation"
    if "skills." in path or ".technologies[" in path:
        return "standardized technology naming"
    return "corrected OCR/spelling"


def _collect_leaf_changes(
    original: Any,
    cleaned: Any,
    *,
    path: str = "",
    reason_lookup: dict[str, str] | None = None,
) -> list[dict[str, str]]:
    reason_lookup = reason_lookup or {}

    if isinstance(original, dict) and isinstance(cleaned, dict):
        changes: list[dict[str, str]] = []
        for key in sorted(original.keys() | cleaned.keys()):
            child_path = f"{path}.{key}" if path else key
            changes.extend(
                _collect_leaf_changes(
                    original.get(key),
                    cleaned.get(key),
                    path=child_path,
                    reason_lookup=reason_lookup,
                )
            )
        return changes

    if isinstance(original, list) and isinstance(cleaned, list):
        changes: list[dict[str, str]] = []
        total = max(len(original), len(cleaned))
        for index in range(total):
            child_path = f"{path}[{index}]"
            original_value = original[index] if index < len(original) else ""
            cleaned_value = cleaned[index] if index < len(cleaned) else ""
            changes.extend(
                _collect_leaf_changes(
                    original_value,
                    cleaned_value,
                    path=child_path,
                    reason_lookup=reason_lookup,
                )
            )
        return changes

    before = "" if original is None else str(original)
    after = "" if cleaned is None else str(cleaned)
    if before == after:
        return []

    return [
        {
            "field": path,
            "before": before,
            "after": after,
            "reason": _guess_reason(path, before, after, reason_lookup.get(path)),
        }
    ]


def finalize_postprocessed_result(original_mapped_sections: Any, raw_result: Any) -> dict[str, Any]:
    normalized_original = normalize_mapped_sections(original_mapped_sections or {})
    payload = raw_result if isinstance(raw_result, dict) else {}
    candidate_cleaned = normalize_mapped_sections(
        payload.get("mapped_sections") or payload.get("cleaned_json") or {},
    )
    merged_cleaned = _merge_cleaned_over_original(normalized_original, candidate_cleaned)
    guarded_cleaned = _apply_safety_guards(normalized_original, merged_cleaned)
    normalized_cleaned = normalize_mapped_sections(guarded_cleaned)
    raw_correction_log = _normalize_correction_log(payload.get("correction_log"))
    reason_lookup = _build_reason_lookup(raw_correction_log)

    return {
        "document_analysis": normalize_document_analysis(
            payload.get("document_analysis"),
            mapped_sections=normalized_cleaned,
        ),
        "correction_log": _collect_leaf_changes(
            normalized_original,
            normalized_cleaned,
            reason_lookup=reason_lookup,
        ),
        "mapped_sections": normalized_cleaned,
    }


def finalize_cleaned_result(original_mapped_sections: Any, raw_result: Any) -> dict[str, Any]:
    result = finalize_postprocessed_result(original_mapped_sections, raw_result)
    return {
        "document_analysis": result["document_analysis"],
        "correction_log": result["correction_log"],
        "cleaned_json": result["mapped_sections"],
    }


def postprocess_mapped_sections(
    mapped_sections: Any,
    *,
    call_llm: Callable[..., str] | None,
    temperature: float = 0.0,
    timeout: int = 180,
) -> dict[str, Any]:
    normalized_original = normalize_mapped_sections(mapped_sections or {})
    fallback = build_empty_postprocess_result(normalized_original)
    if call_llm is None:
        return fallback

    prompt = f"""Ban la AI chuyen xu ly JSON CV sau OCR de phuc vu render giao dien ho so ung vien.

Muc tieu cua ban:
1. Doc JSON CV da duoc map ve dung section UI.
2. Sua loi noi dung van ban.
3. Giu du lieu trong dung section UI.
4. Suy luan document_type, level, role va render_folder.
5. Tra ve JSON hop le dung schema ben duoi.

Nguyen tac:
- Sua loi chinh ta tieng Viet.
- Sua loi OCR pho bien.
- Chuan hoa viet hoa/viet thuong.
- Chuan hoa dau cau.
- Bo khoang trang thua.
- Viet lai cau cho tu nhien, ro rang, chuyen nghiep.
- Khong lam thay doi y nghia goc.
- Khong bia them du lieu moi.
- Neu khong chac, giu nguyen noi dung.
- Email, phone, URL, GitHub, GPA, year, start_date, end_date chi duoc trim/chuan hoa nhe, khong duoc doi gia tri.
- Truong hoc, chuyen nganh, cong nghe, ten ky nang chi duoc chuan hoa cach viet/dinh dang.
- document_type phai thuoc: cv | resume | profile | unknown
- level phai thuoc: student | intern | fresher | junior | middle | senior | unknown
- role phai thuoc: frontend | backend | fullstack | mobile | tester | devops | data | uiux | software-engineer | unknown
- render_folder phai co format /cv/{{level}}/{{role}}/
- Chi tra ve JSON hop le, khong markdown, khong giai thich.
- Khong them key ngoai schema.

Schema:
{postprocess_result_schema_json()}

Input JSON:
{json.dumps(normalized_original, ensure_ascii=False, indent=2)}"""

    try:
        raw = call_llm(prompt, temperature=temperature, timeout=timeout)
    except Exception as exc:
        logger.warning("CV content cleaner LLM failed, using original mapped_sections: %s", exc)
        return fallback

    parsed = _extract_first_json_object(str(raw or ""))
    if not parsed:
        return fallback

    return finalize_postprocessed_result(normalized_original, parsed)


def clean_mapped_sections(
    mapped_sections: Any,
    *,
    call_llm: Callable[..., str] | None,
    temperature: float = 0.0,
    timeout: int = 180,
) -> dict[str, Any]:
    result = postprocess_mapped_sections(
        mapped_sections,
        call_llm=call_llm,
        temperature=temperature,
        timeout=timeout,
    )
    return {
        "document_analysis": result["document_analysis"],
        "correction_log": result["correction_log"],
        "cleaned_json": result["mapped_sections"],
    }
