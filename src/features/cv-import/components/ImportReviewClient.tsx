"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import type { CVArtifactKind, CVDocumentArtifactView, CVDocumentDetailResponse, CVDocumentStatus } from "@/types/cv-import";
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

interface ImportReviewClientProps {
  documentId: string;
  initialData: CVDocumentDetailResponse;
}

function getArtifactByKind(artifacts: CVDocumentArtifactView[], kind: CVArtifactKind) {
  return artifacts.find((artifact) => artifact.kind === kind && artifact.status === "ready");
}

function localizeDocumentType(type: CVDocumentDetailResponse["document"]["document_type"]) {
  if (type === "cv") return "CV";
  if (type === "non_cv_document") return "Tài liệu không phải CV";
  return "Chưa xác định loại tài liệu";
}

function localizeEligibilityReason(reason: string | null): string | null {
  if (!reason) return null;

  const labels: Record<string, string> = {
    non_cv_document_requires_override:
      "Tài liệu này chưa được phân loại là CV. Bạn vẫn có thể tiếp tục nếu xác nhận cho phép.",
    partial_results_require_override:
      "Hiện chỉ có một phần dữ liệu OCR/layout. Hãy cho phép dùng kết quả một phần trước khi mở editor.",
    document_not_ready: "Tài liệu chưa sẵn sàng để mở editor.",
  };

  return labels[reason] ?? "Tài liệu vẫn cần xác nhận thêm trước khi mở editor.";
}

function localizeFailureCode(code: string | null): string | null {
  if (!code) return null;

  const labels: Record<string, string> = {
    non_cv_document: "Tài liệu đã upload được phân loại là không phải CV.",
    structured_parse_incomplete: "Bước parse có cấu trúc chưa hoàn tất hoàn toàn.",
    timeout: "Một bước xử lý đã bị quá thời gian.",
    transient_exhausted: "Dịch vụ xử lý tạm thời không phản hồi sau nhiều lần thử lại.",
    unhandled: "Pipeline gặp lỗi ngoài dự kiến.",
  };

  return labels[code] ?? code.replace(/_/g, " ");
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
    [detail.artifacts],
  );
  const requiresPartial = detail.document.status === "partial_ready";
  const requiresNonCv = detail.document.document_type === "non_cv_document";
  const canOpenEditor =
    ["ready", "partial_ready"].includes(detail.document.status) &&
    (!requiresPartial || allowPartial) &&
    (!requiresNonCv || overrideNonCv);
  const eligibilityNote = localizeEligibilityReason(detail.editor_eligibility.reason);
  const failureNote = localizeFailureCode(detail.document.failure_code);

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
        setErrorMessage(error instanceof Error ? error.message : "Không thể tải lại dữ liệu review.");
      } finally {
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [documentId],
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
      setErrorMessage(error instanceof Error ? error.message : "Không thể chạy lại pipeline import.");
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
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo bản CV để chỉnh sửa.");
    } finally {
      setIsSaving(false);
    }
  }, [allowPartial, canOpenEditor, documentId, overrideNonCv, router]);

  const reviewMessage =
    detail.document.document_type === "non_cv_document"
      ? "Bên trái là tài liệu gốc, bên phải chỉ giữ lại nội dung OCR thực sự hữu ích để review."
      : "Bên trái là CV gốc, bên phải là nội dung OCR cần review trước khi mở editor.";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f8fb]">
      <div className="border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:px-3.5 md:py-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">OCR Review</p>
              <h1 className="mt-1 text-lg font-semibold text-slate-900">Không gian review tối giản</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">{reviewMessage}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ImportStatusBadge status={detail.document.status} />
              <span className="text-[13px] text-slate-500">{localizeDocumentType(detail.document.document_type)}</span>
              <button
                type="button"
                onClick={() => void loadDocument()}
                disabled={isRefreshing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Tải lại review"
              >
                <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {failureNote || eligibilityNote || errorMessage ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  {failureNote ? <p>{failureNote}</p> : null}
                  {eligibilityNote ? <p>{eligibilityNote}</p> : null}
                  {errorMessage ? <p className="text-rose-700">{errorMessage}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {requiresPartial ? (
              <label className="inline-flex items-center gap-2.5 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={allowPartial}
                  onChange={(event) => setAllowPartial(event.target.checked)}
                />
                <span>Cho phép dùng kết quả OCR/layout một phần</span>
              </label>
            ) : null}

            {requiresNonCv ? (
              <label className="inline-flex items-center gap-2.5 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={overrideNonCv}
                  onChange={(event) => setOverrideNonCv(event.target.checked)}
                />
                <span>Tiếp tục ngay cả khi tài liệu này không được phân loại là CV</span>
              </label>
            ) : null}

            {detail.document.status === "failed" ? (
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={isRetrying}
                className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRetrying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Thử lại
              </button>
            ) : null}

            {originalArtifact?.download_url ? (
              <a
                href={originalArtifact.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Mở file gốc
                <ExternalLink size={16} />
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => void handleOpenEditor()}
              disabled={!canOpenEditor || isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-[18px] bg-slate-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Mở editor
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2.5 md:p-3">
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
  );
}
