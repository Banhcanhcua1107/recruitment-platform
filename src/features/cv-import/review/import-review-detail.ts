import type {
  CVDocumentDetailResponse,
  CVDocumentStatus,
  CVImportSummaryResponse,
} from "@/types/cv-import";
import { normalizeParsedJsonRecord } from "@/features/cv-import/normalize-parsed-json";

const ACTIVE_REVIEW_STATUSES = new Set<CVDocumentStatus>([
  "uploaded",
  "queued",
  "normalizing",
  "rendering_preview",
  "ocr_running",
  "layout_running",
  "vl_running",
  "parsing_structured",
  "persisting",
  "retrying",
  "partial_ready",
]);

function buildEligibilityReason(
  status: CVDocumentStatus,
  documentType: CVImportSummaryResponse["document"]["document_type"],
) {
  if (documentType === "non_cv_document") {
    return "non_cv_document_requires_override";
  }

  if (status === "partial_ready") {
    return "partial_results_require_override";
  }

  if (status !== "ready") {
    return "document_not_ready";
  }

  return null;
}

export function buildOptimisticImportReviewDetail(
  summary: CVImportSummaryResponse,
): CVDocumentDetailResponse {
  const emptyParsed = normalizeParsedJsonRecord({});
  const eligibilityReason = buildEligibilityReason(
    summary.document.status,
    summary.document.document_type,
  );

  return {
    document: {
      id: summary.document.id,
      status: summary.document.status,
      document_type: summary.document.document_type,
      classification_confidence: null,
      classification_signals: [],
      review_required: summary.document.review_required,
      failure_stage: null,
      failure_code: null,
      retry_count: summary.document.retry_count,
      job_id: summary.document.job_id,
      last_heartbeat_at: null,
      queue_wait_ms: null,
      total_processing_ms: null,
      stage_durations: {},
    },
    pages: [],
    parsed_json: emptyParsed,
    artifacts: [],
    editor_eligibility: {
      can_save_original: true,
      can_save_editable: summary.document.status === "ready" && summary.document.document_type === "cv",
      reason: eligibilityReason,
    },
  };
}

export function shouldDeferReviewFetchError(
  status: number | null | undefined,
  currentDetail: CVDocumentDetailResponse | null,
) {
  return status === 404 && Boolean(currentDetail && ACTIVE_REVIEW_STATUSES.has(currentDetail.document.status));
}
