from __future__ import annotations

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "cv_documents",
    broker=os.getenv("CELERY_BROKER_URL", REDIS_URL),
    backend=os.getenv("CELERY_RESULT_BACKEND", REDIS_URL),
    include=["tasks.cv_documents"],
)

celery_app.conf.update(
    task_default_queue="cv-documents",
    task_track_started=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=os.getenv("TZ", "Asia/Saigon"),
    enable_utc=False,
    broker_connection_retry_on_startup=True,
    imports=("tasks.cv_documents",),
)

celery_app.autodiscover_tasks(["tasks"])

# Force task registration on Windows/dev boot. Celery's autodiscovery has been
# flaky in this codebase, and the worker can start without loading our task
# module, which leads to "Received unregistered task" at runtime.
import tasks.cv_documents  # noqa: E402,F401
