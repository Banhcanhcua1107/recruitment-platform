"use client";

import type {
  CreateEditableVersionRequest,
  CreateEditableVersionResponse,
  CVDocumentDetailResponse,
  CVImportSummaryResponse,
  EditableCVDetailResponse,
  ExportEditableCVRequest,
  ExportEditableCVResponse,
  RestoreEditableVersionRequest,
  RestoreEditableVersionResponse,
  SaveEditableCVRequest,
  SaveEditableCVResponse,
  SaveOriginalCVResponse,
  UpdateEditableBlockRequest,
  UpdateEditableBlockAssetResponse,
  UpdateEditableBlockResponse,
  UpdateEditableJSONRequest,
  UpdateEditableJSONResponse,
} from "@/types/cv-import";

export class APIClientError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options: { status: number; code?: string; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "APIClientError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isAPIClientError(error: unknown): error is APIClientError {
  return error instanceof APIClientError;
}

const DEFAULT_CLIENT_TIMEOUT_MS = 15_000;
const IMPORT_DETAIL_TIMEOUT_MS = 12_000;
const IMPORT_MUTATION_TIMEOUT_MS = 20_000;
const FILE_UPLOAD_TIMEOUT_MS = 45_000;

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

async function fetchWithDeadline(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: { timeoutMs?: number; timeoutMessage?: string },
) {
  const timeoutMs =
    typeof options?.timeoutMs === "number" && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? Math.floor(options.timeoutMs)
      : DEFAULT_CLIENT_TIMEOUT_MS;
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
      throw new APIClientError(
        options?.timeoutMessage || `Request timed out after ${timeoutMs}ms.`,
        {
          status: 504,
        },
      );
    }

    throw error;
  } finally {
    timeoutController.clear();
    unbindAbort();
  }
}

async function parseJSONResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;
    try {
      const payload = (await response.json()) as {
        error?: string;
        detail?: string;
        code?: string;
        details?: Record<string, unknown>;
      };
      message = payload.detail || payload.error || message;
      code = payload.code;
      details = payload.details;
    } catch {
      // Ignore JSON parse errors and keep the status-based message.
    }
    throw new APIClientError(message, {
      status: response.status,
      code,
      details,
    });
  }

  return (await response.json()) as T;
}

export async function uploadCVImport(file: File): Promise<CVImportSummaryResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithDeadline(
    "/api/cv-imports",
    {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    },
    {
      timeoutMs: FILE_UPLOAD_TIMEOUT_MS,
      timeoutMessage: "Upload is taking too long. Please retry.",
    },
  );

  return parseJSONResponse<CVImportSummaryResponse>(response);
}

export async function fetchCVImport(documentId: string): Promise<CVDocumentDetailResponse> {
  const response = await fetchWithDeadline(
    `/api/cv-imports/${documentId}`,
    {
      cache: "no-store",
      credentials: "same-origin",
    },
    {
      timeoutMs: IMPORT_DETAIL_TIMEOUT_MS,
      timeoutMessage: "Timed out while loading CV review data.",
    },
  );
  return parseJSONResponse<CVDocumentDetailResponse>(response);
}

export async function retryCVImport(documentId: string): Promise<CVImportSummaryResponse> {
  const response = await fetchWithDeadline(
    `/api/cv-imports/${documentId}/retry`,
    {
      method: "POST",
      credentials: "same-origin",
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Retry request timed out. Please try again.",
    },
  );
  return parseJSONResponse<CVImportSummaryResponse>(response);
}

export async function saveEditableCV(
  documentId: string,
  payload: SaveEditableCVRequest
): Promise<SaveEditableCVResponse> {
  const response = await fetchWithDeadline(
    `/api/cv-imports/${documentId}/save-editable`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while creating editable CV.",
    },
  );

  return parseJSONResponse<SaveEditableCVResponse>(response);
}

export async function saveOriginalCVFromImport(documentId: string): Promise<SaveOriginalCVResponse> {
  const response = await fetchWithDeadline(
    `/api/cv-imports/${documentId}/save-original`,
    {
      method: "POST",
      credentials: "same-origin",
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while saving original CV.",
    },
  );

  return parseJSONResponse<SaveOriginalCVResponse>(response);
}

export async function fetchEditableCV(editableCvId: string): Promise<EditableCVDetailResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}`,
    {
      cache: "no-store",
    },
    {
      timeoutMs: IMPORT_DETAIL_TIMEOUT_MS,
      timeoutMessage: "Timed out while loading editable CV.",
    },
  );
  return parseJSONResponse<EditableCVDetailResponse>(response);
}

export async function updateEditableBlock(
  editableCvId: string,
  blockId: string,
  payload: UpdateEditableBlockRequest
): Promise<UpdateEditableBlockResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/blocks/${blockId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while saving block changes.",
    },
  );

  return parseJSONResponse<UpdateEditableBlockResponse>(response);
}

export async function replaceEditableBlockAsset(
  editableCvId: string,
  blockId: string,
  file: File,
): Promise<UpdateEditableBlockAssetResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/blocks/${blockId}/asset`,
    {
      method: "POST",
      body: formData,
    },
    {
      timeoutMs: FILE_UPLOAD_TIMEOUT_MS,
      timeoutMessage: "Timed out while uploading replacement asset.",
    },
  );

  return parseJSONResponse<UpdateEditableBlockAssetResponse>(response);
}

export async function clearEditableBlockAsset(
  editableCvId: string,
  blockId: string,
): Promise<UpdateEditableBlockAssetResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/blocks/${blockId}/asset`,
    {
      method: "DELETE",
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while clearing block asset.",
    },
  );

  return parseJSONResponse<UpdateEditableBlockAssetResponse>(response);
}

export async function updateEditableJSON(
  editableCvId: string,
  payload: UpdateEditableJSONRequest
): Promise<UpdateEditableJSONResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/json`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while saving CV JSON.",
    },
  );

  return parseJSONResponse<UpdateEditableJSONResponse>(response);
}

export async function createEditableVersion(
  editableCvId: string,
  payload: CreateEditableVersionRequest
): Promise<CreateEditableVersionResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/versions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while creating a new CV version.",
    },
  );

  return parseJSONResponse<CreateEditableVersionResponse>(response);
}

export async function restoreEditableVersion(
  editableCvId: string,
  payload: RestoreEditableVersionRequest
): Promise<RestoreEditableVersionResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/restore-version`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: IMPORT_MUTATION_TIMEOUT_MS,
      timeoutMessage: "Timed out while restoring CV version.",
    },
  );

  return parseJSONResponse<RestoreEditableVersionResponse>(response);
}

export async function exportEditableCV(
  editableCvId: string,
  payload: ExportEditableCVRequest
): Promise<ExportEditableCVResponse> {
  const response = await fetchWithDeadline(
    `/api/editable-cvs/${editableCvId}/export`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: FILE_UPLOAD_TIMEOUT_MS,
      timeoutMessage: "Timed out while exporting CV.",
    },
  );

  return parseJSONResponse<ExportEditableCVResponse>(response);
}
