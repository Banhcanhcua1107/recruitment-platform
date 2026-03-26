import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import type {
  CVArtifactKind,
  CVArtifactRecord,
  CVDocumentDetailResponse,
  CVDocumentPageRecord,
  CVDocumentRecord,
  CVDocumentStatus,
  CVFailureStage,
  CVImportSummaryResponse,
  CVDocumentArtifactView,
  CVDocumentPageView,
  NormalizedParsedCV,
} from "@/types/cv-import";
import { normalizeParsedJsonRecord } from "@/features/cv-import/normalize-parsed-json";
import { logger, measureAsync } from "@/lib/observability";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

const AI_SERVICE_INTERNAL_TOKEN =
  process.env.AI_SERVICE_INTERNAL_TOKEN || process.env.CV_IMPORTS_INTERNAL_TOKEN || "";

const ORIGINALS_BUCKET = "cv-originals";
const DEFAULT_SIGNED_URL_SECONDS = 60 * 60;
const ACTIVE_PROCESSING_TIMEOUT_MS = 60_000;

const ACTIVE_PROCESSING_STATUSES = new Set<CVDocumentStatus>([
  "queued",
  "normalizing",
  "rendering_preview",
  "ocr_running",
  "layout_running",
  "vl_running",
  "parsing_structured",
  "persisting",
  "retrying",
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function detectSourceKind(mimeType: string, fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName)) {
    return "image";
  }
  if (mimeType.includes("wordprocessingml") || lowerName.endsWith(".docx")) return "docx";
  return "unknown";
}

function computeSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function buildOriginalStoragePath(userId: string, documentId: string, fileName: string) {
  return `${userId}/${documentId}/original/${sanitizeFileName(fileName)}`;
}

function buildArtifactKey(documentId: string, kind: CVArtifactKind, fingerprint: string, pageNumber?: number | null) {
  return [
    documentId,
    kind,
    pageNumber == null ? "all" : `page-${pageNumber}`,
    fingerprint,
  ].join(":");
}

function isActiveHeartbeat(lastHeartbeatAt: string | null) {
  if (!lastHeartbeatAt) return false;
  const ageMs = Date.now() - new Date(lastHeartbeatAt).getTime();
  return ageMs <= ACTIVE_PROCESSING_TIMEOUT_MS;
}

export function normalizeParsedJSON(input: unknown): NormalizedParsedCV {
  return normalizeParsedJsonRecord(input);
}

async function enqueueProcessing(documentId: string, jobId: string) {
  const response = await fetch(`${AI_SERVICE_URL}/internal/jobs/cv-documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AI_SERVICE_INTERNAL_TOKEN ? { Authorization: `Bearer ${AI_SERVICE_INTERNAL_TOKEN}` } : {}),
    },
    body: JSON.stringify({ document_id: documentId, job_id: jobId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to enqueue CV document ${documentId}`);
  }
}

async function createSignedUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, DEFAULT_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    logger.warn("cv-imports.signed-url.failed", {
      bucket,
      path,
      error: error?.message ?? "missing_signed_url",
    });
    return null;
  }
  return data.signedUrl;
}

async function getArtifactMapByIds(artifactIds: string[]) {
  if (artifactIds.length === 0) return new Map<string, CVArtifactRecord>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_document_artifacts")
    .select("*")
    .in("id", artifactIds);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((artifact) => [artifact.id, artifact as CVArtifactRecord]));
}

export async function createCVImportFromUpload(userId: string, file: File): Promise<CVImportSummaryResponse> {
  const admin = createAdminClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileSha256 = computeSha256(fileBuffer);
  const documentId = randomUUID();
  const jobId = `cvdoc_${Date.now()}_${documentId.slice(0, 8)}`;
  const storagePath = buildOriginalStoragePath(userId, documentId, file.name);
  const sourceKind = detectSourceKind(file.type, file.name);
  const uploadedAt = nowIso();
  const artifactKey = buildArtifactKey(documentId, "original_file", fileSha256);

  const { error: uploadError } = await admin.storage
    .from(ORIGINALS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertDocumentError } = await admin.from("cv_documents").insert({
    id: documentId,
    user_id: userId,
    status: "uploaded",
    document_type: "unknown",
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    file_sha256: fileSha256,
    source_kind: sourceKind,
    uploaded_at: uploadedAt,
    pipeline_version: "v2",
  });

  if (insertDocumentError) {
    throw new Error(insertDocumentError.message);
  }

  const { error: insertArtifactError } = await admin.from("cv_document_artifacts").insert({
    document_id: documentId,
    artifact_key: artifactKey,
    kind: "original_file",
    status: "ready",
    storage_bucket: ORIGINALS_BUCKET,
    storage_path: storagePath,
    content_type: file.type || "application/octet-stream",
    byte_size: file.size,
    sha256: fileSha256,
    source_stage: "upload",
    metadata: {
      file_name: file.name,
      source_kind: sourceKind,
    },
  });

  if (insertArtifactError) {
    throw new Error(insertArtifactError.message);
  }

  const { error: queueUpdateError } = await admin
    .from("cv_documents")
    .update({
      status: "queued",
      queued_at: nowIso(),
      job_id: jobId,
      failure_stage: null,
      failure_code: null,
      review_required: false,
      review_reason_code: null,
    })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (queueUpdateError) {
    throw new Error(queueUpdateError.message);
  }

  try {
    await measureAsync("cv-imports.enqueue", { document_id: documentId, job_id: jobId }, () =>
      enqueueProcessing(documentId, jobId)
    );
  } catch (error) {
    await admin
      .from("cv_documents")
      .update({
        status: "failed",
        failure_stage: "queue" satisfies CVFailureStage,
        failure_code: "enqueue_failed",
      })
      .eq("id", documentId)
      .eq("user_id", userId);
    throw error;
  }

  logger.info("cv-imports.created", {
    document_id: documentId,
    user_id: userId,
    job_id: jobId,
    file_name: file.name,
    file_size: file.size,
    source_kind: sourceKind,
  });

  return {
    document: {
      id: documentId,
      status: "queued",
      document_type: "unknown",
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      retry_count: 0,
      job_id: jobId,
      review_required: false,
    },
    links: {
      self: `/api/cv-imports/${documentId}`,
      review: `/candidate/cv-builder/imports/${documentId}`,
    },
  };
}

export async function getCVDocumentRecordForUser(userId: string, documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CVDocumentRecord | null) ?? null;
}

export async function getCVDocumentArtifactsForUser(userId: string, documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_document_artifacts")
    .select("*, cv_documents!inner(user_id)")
    .eq("document_id", documentId)
    .eq("cv_documents.user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const artifact = { ...(row as Record<string, unknown>) };
    delete artifact.cv_documents;
    return artifact as unknown as CVArtifactRecord;
  });
}

export async function getCVDocumentPagesForUser(userId: string, documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_document_pages")
    .select("*, cv_documents!inner(user_id)")
    .eq("document_id", documentId)
    .eq("cv_documents.user_id", userId)
    .order("page_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const page = { ...(row as Record<string, unknown>) };
    delete page.cv_documents;
    return page as unknown as CVDocumentPageRecord;
  });
}

export async function getCVDocumentDetailForUser(
  userId: string,
  documentId: string
): Promise<CVDocumentDetailResponse | null> {
  const document = await getCVDocumentRecordForUser(userId, documentId);
  if (!document) return null;

  const [artifacts, pages] = await Promise.all([
    getCVDocumentArtifactsForUser(userId, documentId),
    getCVDocumentPagesForUser(userId, documentId),
  ]);

  const artifactById = await getArtifactMapByIds(
    pages.flatMap((page) => [page.background_artifact_id, page.thumbnail_artifact_id]).filter(Boolean) as string[]
  );

  const pageViews: CVDocumentPageView[] = await Promise.all(
    pages.map(async (page) => {
      const backgroundArtifact = page.background_artifact_id
        ? artifactById.get(page.background_artifact_id)
        : null;
      const thumbnailArtifact = page.thumbnail_artifact_id
        ? artifactById.get(page.thumbnail_artifact_id)
        : null;
      return {
        page_number: page.page_number,
        canonical_width_px: page.canonical_width_px,
        canonical_height_px: page.canonical_height_px,
        background_url: await createSignedUrl(
          backgroundArtifact?.storage_bucket ?? "",
          backgroundArtifact?.storage_path ?? null
        ),
        thumbnail_url: await createSignedUrl(
          thumbnailArtifact?.storage_bucket ?? "",
          thumbnailArtifact?.storage_path ?? null
        ),
      };
    })
  );

  const artifactViews: CVDocumentArtifactView[] = await Promise.all(
    artifacts.map(async (artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      page_number: artifact.page_number,
      status: artifact.status,
      download_url: await createSignedUrl(artifact.storage_bucket, artifact.storage_path),
    }))
  );

  let canSaveEditable = document.status === "ready" && document.document_type === "cv";
  let reason: string | null = null;
  if (document.document_type === "non_cv_document") {
    canSaveEditable = false;
    reason = "non_cv_document_requires_override";
  } else if (document.status === "partial_ready") {
    canSaveEditable = false;
    reason = "partial_results_require_override";
  } else if (document.status !== "ready") {
    canSaveEditable = false;
    reason = "document_not_ready";
  }

  return {
    document: {
      id: document.id,
      status: document.status,
      document_type: document.document_type,
      classification_confidence: document.classification_confidence,
      classification_signals: document.classification_signals ?? [],
      review_required: document.review_required,
      failure_stage: document.failure_stage,
      failure_code: document.failure_code,
      retry_count: document.retry_count,
      job_id: document.job_id,
      last_heartbeat_at: document.last_heartbeat_at,
      queue_wait_ms: document.queue_wait_ms,
      total_processing_ms: document.total_processing_ms,
      stage_durations: document.stage_durations ?? {},
    },
    pages: pageViews,
    parsed_json: normalizeParsedJSON(document.parsed_json),
    artifacts: artifactViews,
    editor_eligibility: {
      can_save_original: true,
      can_save_editable: canSaveEditable,
      reason,
    },
  };
}

export async function retryCVDocumentForUser(userId: string, documentId: string) {
  const admin = createAdminClient();
  const document = await getCVDocumentRecordForUser(userId, documentId);
  if (!document) {
    throw new Error("Document not found.");
  }

  if (ACTIVE_PROCESSING_STATUSES.has(document.status) && isActiveHeartbeat(document.last_heartbeat_at)) {
    throw new Error("A processing job is still active for this document.");
  }

  const jobId = `cvdoc_${Date.now()}_${documentId.slice(0, 8)}`;
  const retryCount = (document.retry_count ?? 0) + 1;

  const { error: retryingError } = await admin
    .from("cv_documents")
    .update({
      status: "retrying",
      retry_count: retryCount,
      job_id: jobId,
      processing_lock_token: null,
      last_heartbeat_at: null,
      failure_stage: null,
      failure_code: null,
      review_required: false,
      review_reason_code: null,
    })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (retryingError) throw new Error(retryingError.message);

  const { error: queuedError } = await admin
    .from("cv_documents")
    .update({
      status: "queued",
      queued_at: nowIso(),
    })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (queuedError) throw new Error(queuedError.message);

  await enqueueProcessing(documentId, jobId);

  logger.info("cv-imports.retried", {
    document_id: documentId,
    user_id: userId,
    job_id: jobId,
    retry_count: retryCount,
  });

  return {
    document_id: documentId,
    status: "queued" as const,
    retry_count: retryCount,
    job_id: jobId,
  };
}
