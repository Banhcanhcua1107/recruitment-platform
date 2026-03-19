from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Iterator

from services.document_repository import DocumentRepository


class StageRunner:
    def __init__(self, repository: DocumentRepository, document_id: str, job_id: str) -> None:
        self.repository = repository
        self.document_id = document_id
        self.job_id = job_id

    @contextmanager
    def run(self, stage_name: str, attempt: int = 1, metrics: dict[str, Any] | None = None) -> Iterator[dict[str, Any]]:
        started = time.perf_counter()
        stage_run = self.repository.create_stage_run(
            self.document_id,
            self.job_id,
            stage_name,
            attempt,
            "started",
            metrics,
        )
        try:
            yield stage_run
        except Exception as exc:
            self.repository.finish_stage_run(
                stage_run["id"],
                state="failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error_code=type(exc).__name__,
                error_message=str(exc),
            )
            raise
        else:
            self.repository.finish_stage_run(
                stage_run["id"],
                state="completed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                metrics=metrics or {},
            )
