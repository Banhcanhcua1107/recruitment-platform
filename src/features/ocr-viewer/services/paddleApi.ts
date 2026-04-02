"use client";

import type { AsyncParseProgress } from "@/features/ocr-viewer/types";

export class PaddleApiError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = "PaddleApiError";
    this.status = status;
    this.details = details;
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const SYNC_PARSE_TIMEOUT_MS = 75_000;
const ASYNC_SUBMIT_TIMEOUT_MS = 20_000;
const ASYNC_STATUS_TIMEOUT_MS = 12_000;
const RESULT_DOWNLOAD_TIMEOUT_MS = 25_000;

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort(new DOMException("Request timeout", "TimeoutError"));
  }, timeoutMs);

  return {
    controller,
    clear: () => window.clearTimeout(timer),
  };
}

function bindAbortSignal(target: AbortController, source?: AbortSignal) {
  if (!source) {
    return () => {};
  }

  if (source.aborted) {
    target.abort(source.reason);
    return () => {};
  }

  const onAbort = () => target.abort(source.reason);
  source.addEventListener("abort", onAbort, { once: true });
  return () => source.removeEventListener("abort", onAbort);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: { timeoutMs?: number; timeoutMessage?: string },
) {
  const timeoutMs =
    typeof options?.timeoutMs === "number" && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? Math.floor(options.timeoutMs)
      : DEFAULT_REQUEST_TIMEOUT_MS;
  const timeoutController = createTimeoutController(timeoutMs);
  const unbindAbort = bindAbortSignal(timeoutController.controller, init.signal);
  const startedAt = Date.now();

  try {
    return await fetch(input, {
      ...init,
      signal: timeoutController.controller.signal,
    });
  } catch (error) {
    const timeoutExceeded = Date.now() - startedAt >= timeoutMs;
    const timeoutAbort =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError") &&
      timeoutExceeded;

    if (timeoutAbort) {
      throw new PaddleApiError(
        options?.timeoutMessage || `Request timed out after ${timeoutMs}ms.`,
        504,
      );
    }

    throw error;
  } finally {
    timeoutController.clear();
    unbindAbort();
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let details: Record<string, unknown> | undefined;

    try {
      const payload = (await response.json()) as {
        error?: string;
        detail?: string;
        details?: Record<string, unknown>;
      };
      message = payload.detail || payload.error || message;
      details = payload.details;
    } catch {
      // Keep the status-based fallback when no JSON body exists.
    }

    throw new PaddleApiError(message, response.status, details);
  }

  return (await response.json()) as T;
}

export function detectFileType(file: File) {
  const lowerName = file.name.toLowerCase();
  if (file.type.includes("pdf") || lowerName.endsWith(".pdf")) return 0;
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName)) return 1;
  throw new PaddleApiError("Only PDF and image files are supported by this viewer.", 400);
}

export async function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new PaddleApiError("Unable to read the selected file.", 400));
        return;
      }
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };

    reader.onerror = () => {
      reject(new PaddleApiError("Unable to read the selected file.", 400));
    };

    reader.readAsDataURL(file);
  });
}

export async function parseSync(file: File, signal?: AbortSignal) {
  const payload = {
    file: await readFileAsBase64(file),
    fileType: detectFileType(file),
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useChartRecognition: false,
  };

  const response = await fetchWithTimeout(
    "/api/paddle-ocr/sync",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    },
    {
      timeoutMs: SYNC_PARSE_TIMEOUT_MS,
      timeoutMessage: "Sync OCR is taking too long. Please try again.",
    },
  );

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function createAsyncJob(fileOrUrl: File | string, signal?: AbortSignal) {
  const payload =
    typeof fileOrUrl === "string"
      ? { fileUrl: fileOrUrl.trim() }
      : {
          fileData: await readFileAsBase64(fileOrUrl),
          fileName: fileOrUrl.name,
          fileMimeType: fileOrUrl.type || "application/octet-stream",
        };

  const response = await fetchWithTimeout(
    "/api/paddle-ocr/async/jobs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    },
    {
      timeoutMs: ASYNC_SUBMIT_TIMEOUT_MS,
      timeoutMessage: "Async OCR submit timed out. Please retry.",
    },
  );

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function getJobStatus(jobId: string, signal?: AbortSignal) {
  const response = await fetchWithTimeout(
    `/api/paddle-ocr/async/jobs/${encodeURIComponent(jobId)}`,
    {
      cache: "no-store",
      signal,
    },
    {
      timeoutMs: ASYNC_STATUS_TIMEOUT_MS,
      timeoutMessage: "Timed out while checking OCR job status.",
    },
  );

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function fetchJsonlResult(url: string, signal?: AbortSignal) {
  const response = await fetchWithTimeout(
    `/api/paddle-ocr/result?url=${encodeURIComponent(url)}`,
    {
      cache: "no-store",
      signal,
    },
    {
      timeoutMs: RESULT_DOWNLOAD_TIMEOUT_MS,
      timeoutMessage: "Timed out while downloading OCR result.",
    },
  );

  if (!response.ok) {
    throw new PaddleApiError(`Failed to download OCR result (${response.status}).`, response.status);
  }

  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed) as Record<string, unknown> | Array<Record<string, unknown>>;
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

export function normalizeAsyncProgress(raw: Record<string, unknown>): AsyncParseProgress {
  const payload = (raw.result as Record<string, unknown>) ?? raw;
  const resultUrl = (payload.resultUrl as Record<string, unknown> | undefined) ?? undefined;
  const legacyResultUrl = (payload.result_url as Record<string, unknown> | undefined) ?? undefined;

  return {
    jobId: firstString(payload.jobId, payload.id, payload.task_id, raw.jobId, raw.id),
    status:
      firstString(payload.status, payload.state, payload.task_status, raw.status, raw.state) || "pending",
    totalPages: firstNumber(
      payload.totalPages,
      payload.total_pages,
      payload.pageCount,
      payload.page_count,
      payload.total_page_count,
    ),
    extractedPages: firstNumber(
      payload.extractedPages,
      payload.extracted_pages,
      payload.finishedPages,
      payload.finished_pages,
      payload.progress_pages,
    ),
    message: firstString(payload.message, payload.errorMessage, payload.task_error, payload.error),
    jsonUrl: firstString(
      resultUrl?.jsonUrl,
      resultUrl?.jsonlUrl,
      legacyResultUrl?.jsonUrl,
      payload.jsonUrl,
      payload.parse_result_url,
      payload.resultUrl as string | undefined,
    ),
  };
}
