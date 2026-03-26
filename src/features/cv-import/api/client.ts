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
  UpdateEditableBlockRequest,
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

  const response = await fetch("/api/cv-imports", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });

  return parseJSONResponse<CVImportSummaryResponse>(response);
}

export async function fetchCVImport(documentId: string): Promise<CVDocumentDetailResponse> {
  const response = await fetch(`/api/cv-imports/${documentId}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseJSONResponse<CVDocumentDetailResponse>(response);
}

export async function retryCVImport(documentId: string): Promise<CVImportSummaryResponse> {
  const response = await fetch(`/api/cv-imports/${documentId}/retry`, {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJSONResponse<CVImportSummaryResponse>(response);
}

export async function saveEditableCV(
  documentId: string,
  payload: SaveEditableCVRequest
): Promise<SaveEditableCVResponse> {
  const response = await fetch(`/api/cv-imports/${documentId}/save-editable`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<SaveEditableCVResponse>(response);
}

export async function fetchEditableCV(editableCvId: string): Promise<EditableCVDetailResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}`, {
    cache: "no-store",
  });
  return parseJSONResponse<EditableCVDetailResponse>(response);
}

export async function updateEditableBlock(
  editableCvId: string,
  blockId: string,
  payload: UpdateEditableBlockRequest
): Promise<UpdateEditableBlockResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}/blocks/${blockId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<UpdateEditableBlockResponse>(response);
}

export async function updateEditableJSON(
  editableCvId: string,
  payload: UpdateEditableJSONRequest
): Promise<UpdateEditableJSONResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}/json`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<UpdateEditableJSONResponse>(response);
}

export async function createEditableVersion(
  editableCvId: string,
  payload: CreateEditableVersionRequest
): Promise<CreateEditableVersionResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<CreateEditableVersionResponse>(response);
}

export async function restoreEditableVersion(
  editableCvId: string,
  payload: RestoreEditableVersionRequest
): Promise<RestoreEditableVersionResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}/restore-version`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<RestoreEditableVersionResponse>(response);
}

export async function exportEditableCV(
  editableCvId: string,
  payload: ExportEditableCVRequest
): Promise<ExportEditableCVResponse> {
  const response = await fetch(`/api/editable-cvs/${editableCvId}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<ExportEditableCVResponse>(response);
}
