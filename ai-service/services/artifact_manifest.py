from __future__ import annotations

import hashlib
import json
from typing import Any


def fingerprint_payload(payload: Any) -> str:
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


def build_artifact_key(
    document_id: str,
    kind: str,
    fingerprint: str,
    *,
    page_number: int | None = None,
) -> str:
    scope = "all" if page_number is None else f"page-{page_number}"
    return f"{document_id}:{kind}:{scope}:{fingerprint}"


def build_storage_path(
    user_id: str,
    document_id: str,
    kind: str,
    fingerprint: str,
    *,
    extension: str,
    page_number: int | None = None,
) -> str:
    page_segment = "all" if page_number is None else f"page-{page_number}"
    return f"{user_id}/{document_id}/{kind}/{page_segment}-{fingerprint}.{extension.lstrip('.')}"
