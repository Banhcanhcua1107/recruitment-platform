from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import requests

ACTIVE_STATUSES = {
    "queued",
    "normalizing",
    "rendering_preview",
    "ocr_running",
    "layout_running",
    "vl_running",
    "parsing_structured",
    "persisting",
    "retrying",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DocumentRepository:
    def __init__(self) -> None:
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL") or ""
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.supabase_url or not self.service_role_key:
            raise RuntimeError(
                "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for ai-service."
            )

        self.rest_url = self.supabase_url.rstrip("/") + "/rest/v1"
        self.storage_url = self.supabase_url.rstrip("/") + "/storage/v1/object"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
            }
        )

    def _table_url(self, table: str) -> str:
        return f"{self.rest_url}/{table}"

    def _request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        response = self.session.request(method, url, timeout=120, **kwargs)
        if response.status_code >= 400:
            raise RuntimeError(
                f"Supabase request failed ({response.status_code}): {response.text[:600]}"
            )
        return response

    def fetch_one(self, table: str, **filters: str) -> dict[str, Any] | None:
        params = {"select": "*", **{key: f"eq.{value}" for key, value in filters.items()}}
        response = self._request("GET", self._table_url(table), params=params)
        payload = response.json()
        if not payload:
            return None
        return payload[0]

    def fetch_many(self, table: str, *, order: str | None = None, **filters: str) -> list[dict[str, Any]]:
        params: dict[str, str] = {"select": "*", **{key: f"eq.{value}" for key, value in filters.items()}}
        if order:
            params["order"] = order
        response = self._request("GET", self._table_url(table), params=params)
        return list(response.json())

    def update_rows(self, table: str, payload: dict[str, Any], **filters: str) -> list[dict[str, Any]]:
        params = {key: f"eq.{value}" for key, value in filters.items()}
        headers = {"Prefer": "return=representation"}
        response = self._request(
            "PATCH",
            self._table_url(table),
            params=params,
            headers=headers,
            data=json.dumps(payload),
        )
        return list(response.json())

    def insert_rows(
        self,
        table: str,
        payload: list[dict[str, Any]] | dict[str, Any],
        *,
        on_conflict: str | None = None,
        ignore_duplicates: bool = False,
    ) -> list[dict[str, Any]]:
        headers = {"Prefer": "return=representation"}
        if on_conflict:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        if ignore_duplicates:
            headers["Prefer"] = "resolution=ignore-duplicates,return=representation"

        params: dict[str, str] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict

        response = self._request(
            "POST",
            self._table_url(table),
            params=params,
            headers=headers,
            data=json.dumps(payload),
        )
        return list(response.json())

    def delete_rows(self, table: str, **filters: str) -> None:
        params = {key: f"eq.{value}" for key, value in filters.items()}
        self._request("DELETE", self._table_url(table), params=params)

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        return self.fetch_one("cv_documents", id=document_id)

    def get_document_artifact(self, document_id: str, kind: str) -> dict[str, Any] | None:
        params = {
            "select": "*",
            "document_id": f"eq.{document_id}",
            "kind": f"eq.{kind}",
            "order": "created_at.desc",
            "limit": "1",
        }
        response = self._request("GET", self._table_url("cv_document_artifacts"), params=params)
        payload = response.json()
        return payload[0] if payload else None

    def claim_document(self, document_id: str, job_id: str, lock_token: str) -> dict[str, Any] | None:
        document = self.get_document(document_id)
        if not document:
            return None

        heartbeat_value = document.get("last_heartbeat_at")
        heartbeat = None
        if heartbeat_value:
            heartbeat = datetime.fromisoformat(heartbeat_value.replace("Z", "+00:00"))

        is_stale = not heartbeat or utcnow() - heartbeat > timedelta(seconds=60)
        has_other_active_job = (
            document.get("job_id")
            and document.get("job_id") != job_id
            and document.get("status") in ACTIVE_STATUSES
            and not is_stale
        )

        if has_other_active_job:
            return None

        updated = self.update_rows(
            "cv_documents",
            {
                "status": "normalizing",
                "job_id": job_id,
                "processing_lock_token": lock_token,
                "processing_started_at": document.get("processing_started_at") or utcnow().isoformat(),
                "last_heartbeat_at": utcnow().isoformat(),
                "failure_stage": None,
                "failure_code": None,
            },
            id=document_id,
        )
        return updated[0] if updated else self.get_document(document_id)

    def heartbeat_document(self, document_id: str, job_id: str) -> None:
        self.update_rows(
            "cv_documents",
            {
                "last_heartbeat_at": utcnow().isoformat(),
            },
            id=document_id,
            job_id=job_id,
        )

    def update_document_status(
        self,
        document_id: str,
        status: str,
        *,
        failure_stage: str | None = None,
        failure_code: str | None = None,
        **extras: Any,
    ) -> dict[str, Any]:
        payload = {
            "status": status,
            "failure_stage": failure_stage,
            "failure_code": failure_code,
            **extras,
        }
        updated = self.update_rows("cv_documents", payload, id=document_id)
        return updated[0]

    def create_stage_run(
        self,
        document_id: str,
        job_id: str,
        stage_name: str,
        attempt: int,
        state: str,
        metrics: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "document_id": document_id,
            "job_id": job_id,
            "stage_name": stage_name,
            "attempt": attempt,
            "state": state,
            "started_at": utcnow().isoformat(),
            "metrics": metrics or {},
        }
        created = self.insert_rows("cv_document_stage_runs", payload)
        return created[0]

    def finish_stage_run(
        self,
        stage_run_id: str,
        *,
        state: str,
        duration_ms: int,
        metrics: dict[str, Any] | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> None:
        self.update_rows(
            "cv_document_stage_runs",
            {
                "state": state,
                "ended_at": utcnow().isoformat(),
                "duration_ms": duration_ms,
                "metrics": metrics or {},
                "error_code": error_code,
                "error_message": error_message,
            },
            id=stage_run_id,
        )

    def upsert_artifact(self, payload: dict[str, Any]) -> dict[str, Any]:
        created = self.insert_rows(
            "cv_document_artifacts",
            payload,
            on_conflict="artifact_key",
        )
        return created[0]

    def upsert_pages(self, payload: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not payload:
            return []
        return self.insert_rows("cv_document_pages", payload, on_conflict="document_id,page_number")

    def replace_ocr_blocks(self, document_id: str, payload: list[dict[str, Any]]) -> None:
        self.delete_rows("cv_ocr_blocks", document_id=document_id)
        if payload:
            self.insert_rows("cv_ocr_blocks", payload)

    def replace_layout_blocks(self, document_id: str, payload: list[dict[str, Any]]) -> None:
        self.delete_rows("cv_layout_blocks", document_id=document_id)
        if payload:
            self.insert_rows("cv_layout_blocks", payload)

    def download_storage_object(self, bucket: str, path: str) -> bytes:
        safe_path = "/".join(quote(part, safe="") for part in path.split("/"))
        response = self._request("GET", f"{self.storage_url}/authenticated/{bucket}/{safe_path}")
        return response.content
