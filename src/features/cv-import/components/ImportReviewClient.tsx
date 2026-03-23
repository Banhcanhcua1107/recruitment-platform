"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCcw,
  ScanLine,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CVArtifactKind,
  CVDocumentArtifactView,
  CVDocumentDetailResponse,
  CVDocumentStatus,
  NormalizedParsedCV,
} from "@/types/cv-import";
import { fetchCVImport, retryCVImport, saveEditableCV } from "@/features/cv-import/api/client";
import { ImportDocumentPreview } from "@/features/cv-import/components/ImportDocumentPreview";
import { ImportStatusBadge } from "@/features/cv-import/components/ImportStatusBadge";
import { PersistedOcrReviewPanel } from "@/features/ocr-viewer";

const ACTIVE_STATUSES = new Set<CVDocumentStatus>([
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
]);

type StepState = "pending" | "processing" | "done" | "failed" | "partial";

interface PipelineStepDefinition {
  key: "prepare" | "ocr" | "layout" | "final";
  label: string;
  detail: string;
}

interface SectionState {
  key: string;
  label: string;
  detail: string;
  state: Exclude<StepState, "partial" | "failed">;
}

const PIPELINE_STEPS: PipelineStepDefinition[] = [
  {
    key: "prepare",
    label: "Chuẩn bị file và dựng preview",
    detail: "Nhận file, chuẩn hóa và dựng trang xem trước để bám sát bố cục gốc.",
  },
  {
    key: "ocr",
    label: "OCR và khôi phục thứ tự đọc",
    detail: "Nhận diện chữ, nhóm block và giữ đúng luồng đọc của tài liệu.",
  },
  {
    key: "layout",
    label: "Phân tích bố cục và gom section",
    detail: "Xác định heading, cột, block nội dung và cấu trúc các phần trong CV.",
  },
  {
    key: "final",
    label: "Dựng kết quả cuối cùng",
    detail: "Tạo JSON chuẩn hóa, ghép section và chuẩn bị dữ liệu cho editor.",
  },
];

const SECTION_DEFINITIONS = [
  {
    key: "personal",
    label: "Thông tin cá nhân",
    detail: "Họ tên, tiêu đề, liên hệ và phần giới thiệu ngắn.",
  },
  {
    key: "skills",
    label: "Kỹ năng",
    detail: "Kỹ năng cứng, công cụ hoặc nhóm kỹ năng được trích xuất.",
  },
  {
    key: "education",
    label: "Học vấn",
    detail: "Trường học, bằng cấp và mốc thời gian liên quan.",
  },
  {
    key: "experience",
    label: "Kinh nghiệm",
    detail: "Công ty, vai trò, thành tựu và mô tả công việc.",
  },
] as const;

interface ImportReviewClientProps {
  documentId: string;
  initialData: CVDocumentDetailResponse;
}

function hasRows(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasObjectContent(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

function localizeArtifactKind(kind: CVArtifactKind): string {
  const labels: Record<CVArtifactKind, string> = {
    original_file: "File gốc",
    normalized_source: "Nguồn đã chuẩn hóa",
    preview_page: "Trang preview",
    preview_pdf: "Preview PDF",
    thumbnail_page: "Ảnh thu nhỏ",
    markdown_pages: "Markdown theo trang",
    ocr_raw: "Kết quả OCR thô",
    layout_raw: "Kết quả layout thô",
    vl_raw: "Phản hồi thị giác thô",
    parser_raw: "Phản hồi parser thô",
    normalized_json: "JSON chuẩn hóa",
    export_pdf: "PDF xuất ra",
  };

  return labels[kind];
}

function localizeDocumentType(type: CVDocumentDetailResponse["document"]["document_type"]): string {
  if (type === "cv") return "CV";
  if (type === "non_cv_document") return "Tài liệu không phải CV";
  return "Chưa xác định loại tài liệu";
}

function localizeEligibilityReason(reason: string | null): string | null {
  if (!reason) return null;

  const labels: Record<string, string> = {
    non_cv_document_requires_override:
      "Tài liệu này chưa được hệ thống phân loại là CV. Bạn vẫn có thể mở editor nếu xác nhận dùng tiếp.",
    partial_results_require_override:
      "Kết quả hiện mới sẵn sàng một phần. Hãy xác nhận nếu muốn tiếp tục với dữ liệu OCR/layout đang có.",
    document_not_ready: "Tài liệu chưa hoàn tất pipeline nên chưa thể mở editor.",
  };

  return labels[reason] ?? "Hệ thống cần thêm xác nhận trước khi mở editor.";
}

function localizeFailureCode(code: string | null): string | null {
  if (!code) return null;

  const labels: Record<string, string> = {
    non_cv_document: "Tài liệu được nhận diện là không phải CV.",
    structured_parse_incomplete: "Bước dựng kết quả cuối cùng chưa hoàn tất hoàn toàn.",
    timeout: "Một bước xử lý bị quá thời gian.",
    transient_exhausted: "Dịch vụ xử lý tạm thời không phản hồi sau nhiều lần thử.",
    unhandled: "Có lỗi ngoài dự kiến trong pipeline.",
  };

  return labels[code] ?? code.replace(/_/g, " ");
}

function formatDuration(milliseconds: number | null): string | null {
  if (!milliseconds || milliseconds <= 0) return null;
  if (milliseconds < 1000) return `${milliseconds} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} giây`;
  return `${(milliseconds / 60_000).toFixed(1)} phút`;
}

function getArtifactByKind(artifacts: CVDocumentArtifactView[], kind: CVArtifactKind) {
  return artifacts.find((artifact) => artifact.kind === kind && artifact.status === "ready");
}

function getStepState(
  stepKey: PipelineStepDefinition["key"],
  detail: CVDocumentDetailResponse
): StepState {
  const { document, artifacts, pages } = detail;
  const hasPreview =
    pages.some((page) => Boolean(page.background_url)) ||
    artifacts.some(
      (artifact) =>
        (artifact.kind === "preview_page" || artifact.kind === "preview_pdf") &&
        artifact.status === "ready"
    );
  const hasOCR = artifacts.some((artifact) => artifact.kind === "ocr_raw" && artifact.status === "ready");
  const hasLayout = artifacts.some(
    (artifact) =>
      (artifact.kind === "layout_raw" || artifact.kind === "markdown_pages") && artifact.status === "ready"
  );
  const failureStage = document.failure_stage;

  if (stepKey === "prepare") {
    if (document.status === "failed" && ["upload", "queue", "normalize", "render_preview"].includes(failureStage ?? "")) {
      return "failed";
    }
    if (hasPreview || !["uploaded", "queued", "normalizing", "rendering_preview", "retrying"].includes(document.status)) {
      return "done";
    }
    if (["uploaded", "queued", "normalizing", "rendering_preview", "retrying"].includes(document.status)) {
      return "processing";
    }
    return "pending";
  }

  if (stepKey === "ocr") {
    if (document.status === "failed" && failureStage === "ocr") {
      return "failed";
    }
    if (
      hasOCR ||
      ["layout_running", "vl_running", "parsing_structured", "persisting", "ready", "partial_ready"].includes(
        document.status
      )
    ) {
      return "done";
    }
    if (document.status === "ocr_running") {
      return "processing";
    }
    return "pending";
  }

  if (stepKey === "layout") {
    if (document.status === "failed" && ["layout", "classification"].includes(failureStage ?? "")) {
      return "failed";
    }
    if (
      hasLayout ||
      ["vl_running", "parsing_structured", "persisting", "ready", "partial_ready"].includes(document.status)
    ) {
      return "done";
    }
    if (document.status === "layout_running") {
      return "processing";
    }
    return "pending";
  }

  if (document.status === "failed" && ["vl", "parse_structured", "persist"].includes(failureStage ?? "")) {
    return "failed";
  }
  if (document.status === "ready") {
    return "done";
  }
  if (document.status === "partial_ready") {
    return "partial";
  }
  if (["vl_running", "parsing_structured", "persisting"].includes(document.status)) {
    return "processing";
  }
  return "pending";
}

function getProgressPercent(stepStates: StepState[]): number {
  const weights: Record<StepState, number> = {
    pending: 0,
    processing: 0.56,
    done: 1,
    failed: 0.72,
    partial: 0.88,
  };

  const total = stepStates.reduce((sum, state) => sum + weights[state], 0);
  return Math.max(6, Math.min(100, Math.round((total / stepStates.length) * 100)));
}

function getStepIcon(state: StepState) {
  if (state === "done") return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (state === "processing") return <Loader2 size={16} className="animate-spin text-blue-600" />;
  if (state === "partial") return <AlertTriangle size={16} className="text-amber-500" />;
  if (state === "failed") return <XCircle size={16} className="text-rose-600" />;
  return <div className="h-3 w-3 rounded-full border border-slate-300 bg-white" />;
}

function getStepStateLabel(state: StepState): string {
  if (state === "done") return "Hoàn tất";
  if (state === "processing") return "Đang xử lý";
  if (state === "partial") return "Sẵn sàng một phần";
  if (state === "failed") return "Thất bại";
  return "Chờ xử lý";
}

function buildExtractedContentPreview(parsed: CVDocumentDetailResponse["parsed_json"]): string {
  const normalized = parsed as NormalizedParsedCV;
  const lines: string[] = [];
  const profile = normalized.profile ?? {};
  const contacts = normalized.contacts ?? {};

  const name =
    typeof profile.full_name === "string"
      ? profile.full_name
      : typeof profile.name === "string"
        ? profile.name
        : "";
  const title = typeof profile.job_title === "string" ? profile.job_title : "";
  const email = typeof contacts.email === "string" ? contacts.email : "";
  const phone = typeof contacts.phone === "string" ? contacts.phone : "";
  const address = typeof contacts.address === "string" ? contacts.address : "";

  if (name) lines.push(name);
  if (title) lines.push(title);
  if ([email, phone, address].filter(Boolean).length > 0) {
    lines.push([email, phone, address].filter(Boolean).join(" • "));
  }

  if (typeof normalized.summary === "string" && normalized.summary.trim()) {
    lines.push("");
    lines.push("Tóm tắt");
    lines.push(normalized.summary.trim());
  }

  if (hasRows(normalized.experience)) {
    lines.push("");
    lines.push("Kinh nghiệm");
    normalized.experience.slice(0, 3).forEach((item) => {
      if (!item || typeof item !== "object") return;
      const company = typeof item.company === "string" ? item.company : "";
      const role = typeof item.role === "string" ? item.role : "";
      const description = typeof item.description === "string" ? item.description : "";
      const headline = [role, company].filter(Boolean).join(" - ");
      lines.push(headline || JSON.stringify(item, null, 2));
      if (description) lines.push(description);
    });
  }

  if (hasRows(normalized.education)) {
    lines.push("");
    lines.push("Học vấn");
    normalized.education.slice(0, 2).forEach((item) => {
      if (!item || typeof item !== "object") return;
      const school = typeof item.school === "string" ? item.school : "";
      const degree = typeof item.degree === "string" ? item.degree : "";
      lines.push([degree, school].filter(Boolean).join(" - ") || JSON.stringify(item, null, 2));
    });
  }

  if (hasRows(normalized.skills)) {
    const skills = normalized.skills
      .slice(0, 8)
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item === "object" && item && typeof item.name === "string"
            ? item.name
            : JSON.stringify(item)
      )
      .filter(Boolean);

    if (skills.length > 0) {
      lines.push("");
      lines.push("Kỹ năng");
      lines.push(skills.join(", "));
    }
  }

  return lines.join("\n").trim();
}

function deriveSectionStates(
  parsed: CVDocumentDetailResponse["parsed_json"],
  status: CVDocumentStatus
): SectionState[] {
  const normalized = parsed as NormalizedParsedCV;
  const signals = {
    personal:
      hasObjectContent(normalized.profile) ||
      hasObjectContent(normalized.contacts) ||
      Boolean(normalized.summary?.trim()),
    skills: hasRows(normalized.skills),
    education: hasRows(normalized.education),
    experience: hasRows(normalized.experience),
  };

  const canShowProcessing =
    status === "layout_running" ||
    status === "vl_running" ||
    status === "parsing_structured" ||
    status === "persisting";
  let processingAssigned = false;

  return SECTION_DEFINITIONS.map((section) => {
    const completed = signals[section.key];
    let state: SectionState["state"] = "pending";

    if (completed) {
      state = "done";
    } else if (canShowProcessing && !processingAssigned) {
      state = "processing";
      processingAssigned = true;
    }

    return {
      ...section,
      state,
    };
  });
}

export function ImportReviewClient({ documentId, initialData }: ImportReviewClientProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialData);
  const [allowPartial, setAllowPartial] = useState(false);
  const [overrideNonCv, setOverrideNonCv] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isActive = ACTIVE_STATUSES.has(detail.document.status);
  const originalArtifact = useMemo(
    () => getArtifactByKind(detail.artifacts, "original_file"),
    [detail.artifacts]
  );
  const stepStates = useMemo(
    () => PIPELINE_STEPS.map((step) => getStepState(step.key, detail)),
    [detail]
  );
  const progressPercent = useMemo(() => getProgressPercent(stepStates), [stepStates]);
  const progressBarClassName = useMemo(
    () => `cv-import-progress-${detail.document.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    [detail.document.id]
  );
  const persistedBlockCount = useMemo(() => {
    const parsed = detail.parsed_json as NormalizedParsedCV;
    if (Array.isArray(parsed.raw_ocr_blocks) && parsed.raw_ocr_blocks.length > 0) {
      return parsed.raw_ocr_blocks.length;
    }

    if (Array.isArray(parsed.layout_blocks)) {
      return parsed.layout_blocks.length;
    }

    return 0;
  }, [detail.parsed_json]);
  const extractedPreview = useMemo(() => buildExtractedContentPreview(detail.parsed_json), [detail.parsed_json]);
  const sectionStates = useMemo(
    () => deriveSectionStates(detail.parsed_json, detail.document.status),
    [detail.parsed_json, detail.document.status]
  );
  const requiresPartial = detail.document.status === "partial_ready";
  const requiresNonCv = detail.document.document_type === "non_cv_document";
  const canOpenEditor =
    ["ready", "partial_ready"].includes(detail.document.status) &&
    (!requiresPartial || allowPartial) &&
    (!requiresNonCv || overrideNonCv);

  const loadDocument = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setIsRefreshing(true);
      }

      try {
        const next = await fetchCVImport(documentId);
        setDetail(next);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Không thể tải lại dữ liệu tài liệu.");
      } finally {
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [documentId]
  );

  useEffect(() => {
    setDetail(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!isActive) return undefined;

    const timer = window.setInterval(() => {
      void loadDocument({ silent: true });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isActive, loadDocument]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    try {
      await retryCVImport(documentId);
      await loadDocument();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể thử lại pipeline.");
    } finally {
      setIsRetrying(false);
    }
  }, [documentId, loadDocument]);

  const handleOpenEditor = useCallback(async () => {
    if (!canOpenEditor) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await saveEditableCV(documentId, {
        allow_partial: allowPartial,
        override_non_cv: overrideNonCv,
      });
      router.push(response.links.editor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo bản CV chỉnh sửa.");
    } finally {
      setIsSaving(false);
    }
  }, [allowPartial, canOpenEditor, documentId, overrideNonCv, router]);

  const statusHeadline =
    detail.document.document_type === "non_cv_document"
      ? "Xem lại tài liệu đã trích xuất"
      : "Xem lại CV đã trích xuất";
  const eligibilityNote = localizeEligibilityReason(detail.editor_eligibility.reason);
  const failureNote = localizeFailureCode(detail.document.failure_code);
  const classificationSignals = detail.document.classification_signals.filter(Boolean);
  const infoChips = [
    detail.document.retry_count > 0 ? `Thử lại ${detail.document.retry_count} lần` : null,
    formatDuration(detail.document.queue_wait_ms)
      ? `Chờ queue ${formatDuration(detail.document.queue_wait_ms)}`
      : null,
    formatDuration(detail.document.total_processing_ms)
      ? `Xử lý ${formatDuration(detail.document.total_processing_ms)}`
      : null,
    detail.document.job_id ? `Job ${detail.document.job_id}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="h-full overflow-hidden bg-white">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(460px,0.82fr)] 2xl:grid-cols-[minmax(0,1.24fr)_minmax(500px,0.76fr)]">
        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 md:px-5">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  OCR document viewer
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {persistedBlockCount > 0
                    ? `${persistedBlockCount} mapped block(s)`
                    : originalArtifact?.download_url
                      ? "Using persisted preview artifacts"
                      : isActive
                        ? "Waiting for OCR/layout artifacts"
                        : "No persisted OCR blocks yet"}
                </p>
              </div>
            </div>

            <p className="max-w-[380px] truncate text-right text-sm text-slate-500">
              {detail.document.id}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-[#eef3f8] px-3 py-4 md:px-4">
            <div className="min-h-0 flex-1 overflow-hidden rounded-[30px] border border-slate-200/90 bg-[#dde5ef] p-3 md:p-4">
              <PersistedOcrReviewPanel
                key={detail.document.id}
                detail={detail}
                fallbackContent={
                  <ImportDocumentPreview
                    documentId={detail.document.id}
                    pages={detail.pages}
                    artifacts={detail.artifacts}
                    status={detail.document.status}
                    selectedPage={detail.pages[0]?.page_number ?? 1}
                  />
                }
              />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 md:px-5">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ScanLine size={16} />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Bảng phân tích AI
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {isActive ? "Đang cập nhật theo pipeline" : "Đã đồng bộ trạng thái mới nhất"}
                  </p>
                </div>
                {isActive ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    Đang chạy
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadDocument()}
              disabled={isRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Làm mới dữ liệu"
            >
              <RefreshCcw size={16} className={cn(isRefreshing && "animate-spin")} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
            <div className="space-y-4">
              <section className="rounded-[26px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Sparkles size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                          {detail.document.status === "ready"
                            ? "Kết quả cuối cùng"
                            : detail.document.status === "partial_ready"
                              ? "Kết quả tạm dùng"
                              : "Đang phân tích"}
                        </p>
                        <h1 className="truncate text-2xl font-semibold text-slate-900">
                          {statusHeadline}
                        </h1>
                      </div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                      {detail.document.document_type === "non_cv_document"
                        ? "Hệ thống đã trích xuất nội dung từ tài liệu này và giữ lại trạng thái để bạn rà soát trước khi quyết định mở editor."
                        : "CV đã được gom nội dung theo pipeline OCR, layout và parsing để bạn rà soát trước khi đưa vào chế độ chỉnh sửa."}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <ImportStatusBadge status={detail.document.status} />
                    <span className="text-xs text-slate-400">{localizeDocumentType(detail.document.document_type)}</span>
                  </div>
                </div>

                {infoChips.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {infoChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}

                {detail.document.review_required || failureNote || errorMessage || eligibilityNote ? (
                  <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-4 text-sm text-amber-900">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                      <div className="space-y-2">
                        {failureNote ? <p>{failureNote}</p> : null}
                        {eligibilityNote ? <p>{eligibilityNote}</p> : null}
                        {classificationSignals.length > 0 ? (
                          <p className="text-xs leading-5 text-amber-800/80">
                            Tín hiệu phân loại: {classificationSignals.join(", ")}.
                          </p>
                        ) : null}
                        {errorMessage ? <p className="text-rose-700">{errorMessage}</p> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[26px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Tiến độ pipeline
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      {isActive ? "AI đang xử lý tài liệu..." : "Pipeline đã trả về kết quả hiện tại"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Step hiển thị theo trạng thái thật của document, giữ nguyên logic pipeline hiện tại.
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-500">{progressPercent}%</span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <style>{`.${progressBarClassName}{width:${progressPercent}%;}`}</style>
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-[width] duration-500",
                      progressBarClassName
                    )}
                  />
                </div>

                <div className="mt-5 space-y-2.5">
                  {PIPELINE_STEPS.map((step, index) => {
                    const state = stepStates[index];

                    return (
                      <div
                        key={step.key}
                        className={cn(
                          "rounded-2xl border px-4 py-3 transition-colors",
                          state === "processing" && "border-blue-200 bg-blue-50/60",
                          state === "done" && "border-emerald-200 bg-emerald-50/60",
                          state === "partial" && "border-amber-200 bg-amber-50/70",
                          state === "failed" && "border-rose-200 bg-rose-50/70",
                          state === "pending" && "border-slate-200 bg-slate-50/70"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {getStepIcon(state)}
                            <div>
                              <p className="text-sm font-medium text-slate-800">{step.label}</p>
                              <p className="text-xs leading-5 text-slate-500">{step.detail}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-500">{getStepStateLabel(state)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="rounded-[26px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Các phần nội dung đang nhận diện
                </p>
                <div className="mt-4 space-y-2.5">
                  {sectionStates.map((section) => (
                    <div key={section.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {section.state === "done" ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : section.state === "processing" ? (
                            <Loader2 size={16} className="animate-spin text-blue-600" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800">{section.label}</p>
                            <p className="text-xs leading-5 text-slate-500">{section.detail}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          {section.state === "done"
                            ? "Hoàn tất"
                            : section.state === "processing"
                              ? "Đang xử lý"
                              : "Chờ xử lý"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
                      Nội dung trích xuất
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      Bản xem nhanh kết quả hiện tại
                    </h2>
                  </div>
                </div>

                <div className="mt-4 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                  {extractedPreview ? (
                    <pre className="font-sans whitespace-pre-wrap">{extractedPreview}</pre>
                  ) : (
                    <p className="text-slate-400">
                      Nội dung cuối cùng sẽ xuất hiện ở đây ngay khi pipeline dựng xong JSON hoặc có kết quả một phần.
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <details className="group rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700">
                      Artifact bền vững của tài liệu
                      <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 space-y-2">
                      {detail.artifacts.length > 0 ? (
                        detail.artifacts.map((artifact) => (
                          <div
                            key={`${artifact.kind}-${artifact.page_number ?? "all"}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium text-slate-700">
                                {localizeArtifactKind(artifact.kind)}
                                {artifact.page_number ? ` • Trang ${artifact.page_number}` : ""}
                              </p>
                              <p className="text-xs text-slate-500">
                                {artifact.status === "ready" ? "Sẵn sàng" : "Chưa sẵn sàng"}
                              </p>
                            </div>
                            {artifact.download_url ? (
                              <a
                                href={artifact.download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                Mở
                                <ExternalLink size={13} />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">Chưa có link</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">Chưa có artifact nào được lưu bền vững.</p>
                      )}
                    </div>
                  </details>

                  <details className="group rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700">
                      JSON chuẩn hóa
                      <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/95">
                      <pre className="max-h-[280px] overflow-auto px-4 py-4 text-xs leading-6 text-slate-100">
                        {JSON.stringify(detail.parsed_json, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Hành động
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Bản gốc đã được lưu tự động ngay khi tải lên. Bạn có thể làm mới pipeline, mở file gốc hoặc chuyển sang chế độ chỉnh sửa khi đủ điều kiện.
                    </p>
                  </div>

                  {requiresPartial ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={allowPartial}
                        onChange={(event) => setAllowPartial(event.target.checked)}
                      />
                      <span>Cho phép dùng kết quả OCR/layout một phần</span>
                    </label>
                  ) : null}

                  {requiresNonCv ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={overrideNonCv}
                        onChange={(event) => setOverrideNonCv(event.target.checked)}
                      />
                      <span>Vẫn mở chế độ chỉnh sửa dù tài liệu không được phân loại là CV</span>
                    </label>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    {detail.document.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={isRetrying}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRetrying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Thử lại pipeline
                      </button>
                    ) : null}

                    {originalArtifact?.download_url ? (
                      <a
                        href={originalArtifact.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        Mở file gốc
                        <ExternalLink size={16} />
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleOpenEditor()}
                      disabled={!canOpenEditor || isSaving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Mở chế độ chỉnh sửa
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
