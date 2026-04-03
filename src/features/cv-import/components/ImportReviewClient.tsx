"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, FilePenLine, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CVArtifactKind, CVDocumentArtifactView, CVDocumentDetailResponse, CVDocumentStatus } from "@/types/cv-import";
import {
  fetchCVImport,
  retryCVImport,
  saveEditableCV,
  saveOriginalCVFromImport,
} from "@/features/cv-import/api/client";
import { createResumeFromSections } from "@/app/candidate/cv-builder/api";
import { ImportDocumentPreview } from "@/features/cv-import/components/ImportDocumentPreview";
import { ImportStatusBadge } from "@/features/cv-import/components/ImportStatusBadge";
import { buildResumeSectionsFromParsedJson } from "@/features/cv-import/transforms/parsed-json-to-builder-sections";
import { PersistedOcrReviewPanel } from "@/features/ocr-viewer";
import type { SaveOriginalCVResponse } from "@/types/cv-import";

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

const AUTO_REFRESH_INTERVAL_MS = 3_000;
const AUTO_REFRESH_MAX_MS = 4 * 60_000;
const HEARTBEAT_STALE_MS = 90_000;

interface ImportReviewClientProps {
  documentId: string;
  initialData: CVDocumentDetailResponse;
}

function getArtifactByKind(artifacts: CVDocumentArtifactView[], kind: CVArtifactKind) {
  return artifacts.find((artifact) => artifact.kind === kind && artifact.status === "ready");
}

function localizeEligibilityReason(reason: string | null): string | null {
  if (!reason) return null;

  const labels: Record<string, string> = {
    non_cv_document_requires_override:
      "Tai lieu nay chua duoc phan loai la CV. Ban van co the tiep tuc neu xac nhan cho phep.",
    partial_results_require_override:
      "Hien chi co mot phan du lieu OCR/layout. Hay cho phep dung ket qua mot phan truoc khi mo editor.",
    document_not_ready: "Tai lieu chua san sang de mo editor.",
  };

  return labels[reason] ?? "Tai lieu van can xac nhan them truoc khi mo editor.";
}

function localizeFailureCode(code: string | null): string | null {
  if (!code) return null;

  const labels: Record<string, string> = {
    non_cv_document: "Tai lieu da upload duoc phan loai la khong phai CV.",
    structured_parse_incomplete: "Buoc parse co cau truc chua hoan tat hoan toan.",
    timeout: "Mot buoc xu ly da bi qua thoi gian.",
    transient_exhausted: "Dich vu xu ly tam thoi khong phan hoi sau nhieu lan thu lai.",
    unhandled: "Pipeline gap loi ngoai du kien.",
  };

  return labels[code] ?? code.replace(/_/g, " ");
}

export function ImportReviewClient({ documentId, initialData }: ImportReviewClientProps) {
  const router = useRouter();
  const autoRefreshStartedAtRef = useRef<number | null>(null);
  const [detail, setDetail] = useState(initialData);
  const [allowPartial, setAllowPartial] = useState(false);
  const [overrideNonCv, setOverrideNonCv] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSavingOriginal, setIsSavingOriginal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedOriginal, setSavedOriginal] = useState<SaveOriginalCVResponse | null>(null);

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
  const canOpenSourceEditor = ["ready", "partial_ready"].includes(detail.document.status);
  const eligibilityNote = localizeEligibilityReason(detail.editor_eligibility.reason);
  const failureNote = localizeFailureCode(detail.document.failure_code);
  const isLikelyStalled = useMemo(() => {
    if (!isActive || !detail.document.last_heartbeat_at) return false;
    const heartbeatAge = Date.now() - new Date(detail.document.last_heartbeat_at).getTime();
    if (!Number.isFinite(heartbeatAge) || heartbeatAge < 0) return false;
    return heartbeatAge > HEARTBEAT_STALE_MS;
  }, [detail.document.last_heartbeat_at, isActive]);

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
        setStaleMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Khong the tai lai du lieu review.");
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
    autoRefreshStartedAtRef.current = null;
    setStaleMessage(null);
  }, [initialData]);

  useEffect(() => {
    if (!isActive) {
      autoRefreshStartedAtRef.current = null;
      return undefined;
    }

    if (isLikelyStalled) {
      setStaleMessage("Pipeline dang cham hon binh thuong. Ban co the bam Thu lai hoac Tai lai de kiem tra trang thai moi nhat.");
      return undefined;
    }

    setStaleMessage(null);
    if (autoRefreshStartedAtRef.current == null) {
      autoRefreshStartedAtRef.current = Date.now();
    }

    const timer = window.setInterval(() => {
      const startedAt = autoRefreshStartedAtRef.current ?? Date.now();
      if (Date.now() - startedAt > AUTO_REFRESH_MAX_MS) {
        window.clearInterval(timer);
        setStaleMessage("Da dung auto-refresh sau 4 phut de tranh cho vo han. Hay bam Tai lai hoac Thu lai.");
        return;
      }

      void loadDocument({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isActive, isLikelyStalled, loadDocument]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setStaleMessage(null);
    try {
      await retryCVImport(documentId);
      autoRefreshStartedAtRef.current = Date.now();
      await loadDocument();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Khong the chay lai pipeline import.");
    } finally {
      setIsRetrying(false);
    }
  }, [documentId, loadDocument]);

  const handleSaveOriginal = useCallback(async () => {
    if (!detail.editor_eligibility.can_save_original) return;

    setIsSavingOriginal(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavedOriginal(null);

    try {
      const response = await saveOriginalCVFromImport(documentId);
      setSuccessMessage(response.message || "Đã lưu CV để dùng khi ứng tuyển.");
      setSavedOriginal(response);
      await loadDocument({ silent: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể lưu CV gốc.");
      setSavedOriginal(null);
    } finally {
      setIsSavingOriginal(false);
    }
  }, [detail.editor_eligibility.can_save_original, documentId, loadDocument]);

  const handleOpenEditor = useCallback(async () => {
    if (!canOpenEditor) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await saveEditableCV(documentId, {
        allow_partial: allowPartial,
        override_non_cv: overrideNonCv,
      });

      const { sections, title } = buildResumeSectionsFromParsedJson(detail.parsed_json);
      if (!sections.length) {
        router.push(response.links.editor);
        return;
      }

      try {
        const resume = await createResumeFromSections(sections, {
          title,
        });

        if (resume?.id) {
          router.push(`/candidate/cv-builder/${resume.id}/edit`);
          return;
        }
      } catch (createResumeError) {
        console.warn("TipTap resume creation failed, fallback to editable editor", createResumeError);
      }

      router.push(response.links.editor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Khong the tao ban CV de chinh sua.");
    } finally {
      setIsSaving(false);
    }
  }, [allowPartial, canOpenEditor, detail.parsed_json, documentId, overrideNonCv, router]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef4fb] p-2.5 md:p-3">
      {(successMessage || errorMessage || staleMessage) && (
        <div className="mb-2.5 rounded-2xl border bg-white px-3 py-2.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.35)] md:px-4">
          {successMessage ? (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-emerald-700">{successMessage}</p>
              <p className="text-[12px] leading-5 text-slate-600">
                CV vừa lưu được ghi vào Hồ sơ cá nhân để dùng khi ứng tuyển. Mục này không tự tạo bản mới trong danh sách CV Builder.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={savedOriginal?.links?.cvDownload || savedOriginal?.cvUrl || "/api/candidate/profile/cv"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                >
                  Xem CV đã lưu
                </a>
                <button
                  type="button"
                  onClick={() => router.push(savedOriginal?.links?.profile || "/candidate/profile")}
                  className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Mở Hồ sơ cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => router.push(savedOriginal?.links?.cvBuilder || "/candidate/cv-builder")}
                  className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Về danh sách CV Builder
                </button>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-rose-700">Không thể lưu CV ứng tuyển</p>
              <p className="text-[12px] leading-5 text-rose-700">{errorMessage}</p>
            </div>
          ) : null}

          {staleMessage && !errorMessage ? (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-amber-700">Tiến trình xử lý đang chậm</p>
              <p className="text-[12px] leading-5 text-amber-700">{staleMessage}</p>
            </div>
          ) : null}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <PersistedOcrReviewPanel
          key={detail.document.id}
          detail={detail}
          headerActions={
            <>
              <ImportStatusBadge status={detail.document.status} />

              {requiresPartial ? (
                <button
                  type="button"
                  onClick={() => setAllowPartial((current) => !current)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-2xl border px-3 text-[12px] font-medium transition-colors",
                    allowPartial
                      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  title="Cho phep dung ket qua OCR/layout mot phan"
                >
                  OCR mot phan
                </button>
              ) : null}

              {requiresNonCv ? (
                <button
                  type="button"
                  onClick={() => setOverrideNonCv((current) => !current)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-2xl border px-3 text-[12px] font-medium transition-colors",
                    overrideNonCv
                      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  title="Tiep tuc ngay ca khi tai lieu khong duoc phan loai la CV"
                >
                  Bo qua phan loai
                </button>
              ) : null}

              {failureNote ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-700">
                  {failureNote}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => void loadDocument()}
                disabled={isRefreshing}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Tai lai review"
                title="Tai lai"
              >
                <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
              </button>

              {detail.document.status === "failed" ? (
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={isRetrying}
                  className="inline-flex h-8 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Thu lai
                </button>
              ) : null}

              {originalArtifact?.download_url ? (
                <a
                  href={originalArtifact.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  File goc
                  <ExternalLink size={14} />
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSaveOriginal()}
                disabled={!detail.editor_eligibility.can_save_original || isSavingOriginal}
                className="inline-flex h-8 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Lưu CV gốc vào Hồ sơ cá nhân để dùng khi ứng tuyển"
              >
                {isSavingOriginal ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Lưu vào hồ sơ ứng viên
              </button>

              <button
                type="button"
                onClick={() => router.push(`/documents/${documentId}/edit`)}
                disabled={!canOpenSourceEditor}
                className="inline-flex h-8 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FilePenLine size={14} />
                Edit source file
              </button>

              <button
                type="button"
                onClick={() => void handleOpenEditor()}
                disabled={!canOpenEditor || isSaving}
                title={eligibilityNote || errorMessage || undefined}
                className="inline-flex h-8 items-center gap-2 rounded-2xl bg-slate-900 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Chuyen sang TipTap
              </button>
            </>
          }
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
