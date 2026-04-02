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

const INITIAL_POLL_DELAY_MS = 1_000;
const BASE_POLL_DELAY_MS = 3_000;
const MAX_POLL_DELAY_MS = 8_000;
const MAX_JOB_WAIT_MS = 2 * 60_000;
const MAX_STALE_PROGRESS_POLLS = 14;
const MAX_TRANSIENT_POLL_FAILURES = 3;

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

function isRetryablePollError(error: unknown) {
  if (error instanceof PaddleApiError) {
    return error.status === 429 || error.status === 408 || error.status === 504 || error.status >= 500;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

function getNextPollDelay(attempt: number) {
  const boundedAttempt = Math.max(1, attempt);
  return Math.min(MAX_POLL_DELAY_MS, BASE_POLL_DELAY_MS + (boundedAttempt - 1) * 750);
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

      const startedAt = Date.now();
      let pollAttempt = 0;
      let staleProgressPolls = 0;
      let lastProgressKey: string | null = null;
      let transientFailureCount = 0;

      const poll = async (jobId: string, delayMs: number) => {
        clearScheduledPoll();
        timeoutRef.current = window.setTimeout(async () => {
          if (runIdRef.current !== runId) return;

          if (Date.now() - startedAt > MAX_JOB_WAIT_MS) {
            setStatus("failed");
            setError("Async OCR exceeded the wait limit. Please retry the job.");
            return;
          }

          try {
            const statusPayload = await getJobStatus(jobId, controller.signal);
            if (runIdRef.current !== runId) return;

            transientFailureCount = 0;
            pollAttempt += 1;

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

            const progressKey = `${lifecycleStatus}:${nextProgress.extractedPages ?? "na"}:${nextProgress.totalPages ?? "na"}`;
            if (progressKey === lastProgressKey) {
              staleProgressPolls += 1;
            } else {
              staleProgressPolls = 0;
              lastProgressKey = progressKey;
            }

            if (staleProgressPolls >= MAX_STALE_PROGRESS_POLLS) {
              setStatus("failed");
              setError("Async OCR progress stalled for too long. Please retry the job.");
              return;
            }

            setStatus(lifecycleStatus);
            poll(jobId, getNextPollDelay(pollAttempt));
          } catch (nextError) {
            if (controller.signal.aborted || runIdRef.current !== runId) return;

            if (isRetryablePollError(nextError) && transientFailureCount < MAX_TRANSIENT_POLL_FAILURES) {
              transientFailureCount += 1;
              setStatus("running");
              setProgress((current) =>
                current
                  ? {
                      ...current,
                      message: "Temporary network issue while polling OCR. Retrying...",
                    }
                  : current,
              );
              poll(jobId, getNextPollDelay(pollAttempt + transientFailureCount));
              return;
            }

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
        poll(jobId, INITIAL_POLL_DELAY_MS);
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
