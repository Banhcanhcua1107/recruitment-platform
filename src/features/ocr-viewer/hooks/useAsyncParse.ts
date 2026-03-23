"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAsyncJob,
  fetchJsonlResult,
  getJobStatus,
  normalizeAsyncProgress,
  PaddleApiError,
} from "@/features/ocr-viewer/services/paddleApi";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";
import type { AsyncParseProgress, AsyncParseStatus, NormalizedOcrResult } from "@/features/ocr-viewer/types";

function resolveLifecycleStatus(rawStatus: string): AsyncParseStatus {
  const normalized = rawStatus.toLowerCase();
  if (["done", "success", "completed", "complete", "succeeded"].includes(normalized)) return "done";
  if (["failed", "error", "cancelled", "canceled"].includes(normalized)) return "failed";
  if (["running", "processing", "in_progress", "executing"].includes(normalized)) return "running";
  if (["pending", "queued", "created", "submitted"].includes(normalized)) return "pending";
  return "pending";
}

function resolveJobId(raw: Record<string, unknown>) {
  const payload = (raw.result as Record<string, unknown>) ?? raw;
  const jobId = payload.jobId ?? payload.id ?? payload.task_id ?? raw.jobId ?? raw.id;
  if (typeof jobId === "string" && jobId.trim()) return jobId.trim();
  throw new PaddleApiError("Async OCR job id was not returned by the API.", 502, raw);
}

export function useAsyncParse() {
  const [status, setStatus] = useState<AsyncParseStatus>("idle");
  const [progress, setProgress] = useState<AsyncParseProgress | null>(null);
  const [result, setResult] = useState<NormalizedOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearScheduledPoll = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelJob = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    clearScheduledPoll();
    setStatus((current) => (current === "idle" ? current : "cancelled"));
  }, [clearScheduledPoll]);

  const startJob = useCallback(
    async (fileOrUrl: File | string) => {
      cancelJob();

      const runId = ++runIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("submitting");
      setProgress(null);
      setResult(null);
      setError(null);

      const poll = async (jobId: string, delayMs: number) => {
        clearScheduledPoll();
        timeoutRef.current = window.setTimeout(async () => {
          if (runIdRef.current !== runId) return;

          try {
            const statusPayload = await getJobStatus(jobId, controller.signal);
            if (runIdRef.current !== runId) return;

            const nextProgress = normalizeAsyncProgress(statusPayload);
            setProgress(nextProgress);

            const lifecycleStatus = resolveLifecycleStatus(nextProgress.status);
            if (lifecycleStatus === "failed") {
              setStatus("failed");
              setError(nextProgress.message || "Async OCR job failed.");
              return;
            }

            if (lifecycleStatus === "done") {
              if (!nextProgress.jsonUrl) {
                setStatus("failed");
                setError("Async OCR job completed without a downloadable result URL.");
                return;
              }

              const rawResult = await fetchJsonlResult(nextProgress.jsonUrl, controller.signal);
              if (runIdRef.current !== runId) return;

              setResult(normalizeOcrResult(rawResult));
              setStatus("done");
              return;
            }

            setStatus(lifecycleStatus);
            poll(jobId, 5000);
          } catch (nextError) {
            if (controller.signal.aborted || runIdRef.current !== runId) return;
            setStatus("failed");
            setError(
              nextError instanceof Error ? nextError.message : "Unable to poll async OCR job progress.",
            );
          }
        }, delayMs);
      };

      try {
        const submitPayload = await createAsyncJob(fileOrUrl, controller.signal);
        if (runIdRef.current !== runId) return;

        const jobId = resolveJobId(submitPayload);
        setProgress({
          jobId,
          status: "pending",
          totalPages: null,
          extractedPages: null,
          message: null,
          jsonUrl: null,
        });
        setStatus("pending");
        poll(jobId, 1000);
      } catch (submitError) {
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        setStatus("failed");
        setError(submitError instanceof Error ? submitError.message : "Unable to create async OCR job.");
      }
    },
    [cancelJob, clearScheduledPoll],
  );

  useEffect(() => cancelJob, [cancelJob]);

  return {
    startJob,
    cancelJob,
    status,
    progress,
    result,
    error,
  };
}
