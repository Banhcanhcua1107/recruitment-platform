from __future__ import annotations

import os
from urllib.parse import quote

import requests


def _normalize_content_type(content_type: str) -> str:
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized in {"json", "text/json"}:
        return "application/json"
    if normalized in {"jpg", "image/jpg"}:
        return "image/jpeg"
    if normalized in {"pdf"}:
        return "application/pdf"
    return normalized or "application/octet-stream"


class StorageClient:
    def __init__(self) -> None:
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL") or ""
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.supabase_url or not self.service_role_key:
            raise RuntimeError(
                "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for storage access."
            )
        self.base_url = self.supabase_url.rstrip("/") + "/storage/v1/object"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
            }
        )

    def upload_bytes(self, bucket: str, path: str, content: bytes, content_type: str) -> None:
        safe_path = "/".join(quote(part, safe="") for part in path.split("/"))
        normalized_content_type = _normalize_content_type(content_type)
        response = self.session.post(
            f"{self.base_url}/{bucket}/{safe_path}",
            params={"upsert": "true"},
            data=content,
            headers={
                "Content-Type": normalized_content_type,
                "x-upsert": "true",
            },
            timeout=120,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"Supabase storage upload failed for bucket '{bucket}' with content-type '{normalized_content_type}' "
                f"({response.status_code}): {response.text[:600]}"
            )
