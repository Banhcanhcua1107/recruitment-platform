"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Loader2, Search, UploadCloud } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DataTableShell,
  EmptyState,
  StatusBadge,
} from "@/components/app-shell";
import {
  createResume,
  deleteResume,
  getMyResumes,
  type ResumeRow,
} from "./api";
import { startCVImportAnalysis, uploadCVImport } from "@/features/cv-import/api/client";
import { buildOptimisticImportReviewDetail } from "@/features/cv-import/review/import-review-detail";
import type { CVDocumentDetailResponse, CVImportSummaryResponse } from "@/types/cv-import";
import { resolveDefaultResumeId } from "@/components/candidate/candidateWorkspaceContentModel";
import {
  shouldLoadResumeList,
  shouldStartTemplateCreation,
} from "./template-creation";

const ImportReviewOverlayModal = dynamic(
  () =>
    import("@/features/cv-import/components/ImportReviewOverlayModal").then(
      (module) => module.ImportReviewOverlayModal,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

const PaddleOcrWorkspaceModal = dynamic(
  () => import("@/features/ocr-viewer").then((module) => module.PaddleOcrWorkspaceModal),
  {
    ssr: false,
    loading: () => null,
  },
);

const DEFAULT_RESUME_STORAGE_KEY = "talentflow:candidate:default-resume-id";

const IMPORT_STATUS_LABELS: Record<CVImportSummaryResponse["document"]["status"], string> = {
  uploaded: "Đã upload",
  queued: "Đang chờ",
  normalizing: "Đang chuẩn hóa",
  rendering_preview: "Đang dựng preview",
  ocr_running: "Đang OCR",
  layout_running: "Đang phân tích bố cục",
  vl_running: "Đang hiểu nội dung",
  parsing_structured: "Đang trích xuất JSON",
  persisting: "Đang lưu kết quả",
  ready: "Sẵn sàng review",
  partial_ready: "Có kết quả một phần",
  failed: "Phân tích lỗi",
  retrying: "Đang thử lại",
};

const ACTIVE_IMPORT_STATUSES = new Set<CVImportSummaryResponse["document"]["status"]>([
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

function formatAbsoluteDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Chua ro thoi gian";
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Khong ro dung luong";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type CandidateCvOptionItem = {
  path: string;
  label: string;
  createdAt: string;
  source: "profile" | "uploaded" | "builder";
  resumeId?: string;
  downloadUrl?: string | null;
};

type CVDashboardListItem =
  | {
      kind: "builder";
      updatedAt: string;
      resume: ResumeRow;
    }
  | {
      kind: "external";
      id: string;
      updatedAt: string;
      option: CandidateCvOptionItem;
    };

type CVSourceFilter = "all" | "template" | "profile" | "application";

type BuilderDashboardListItem = Extract<CVDashboardListItem, { kind: "builder" }>;
type ExternalDashboardListItem = Extract<CVDashboardListItem, { kind: "external" }>;

async function fetchCandidateCvOptions(): Promise<CandidateCvOptionItem[]> {
  const response = await fetch("/api/candidate/cv-options", {
    cache: "no-store",
    credentials: "same-origin",
  });

  const payload = (await response.json()) as {
    items?: CandidateCvOptionItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Khong the tai danh sach CV da upload.");
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

function CVDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [externalCvOptions, setExternalCvOptions] = useState<CandidateCvOptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<CVSourceFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState<"latest" | "name">("latest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [templateRedirectLoading, setTemplateRedirectLoading] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [importUploading, setImportUploading] = useState(false);
  const [importAnalyzingId, setImportAnalyzingId] = useState<string | null>(null);
  const [uploadedImport, setUploadedImport] = useState<CVImportSummaryResponse | null>(null);
  const [optimisticReviewDetail, setOptimisticReviewDetail] =
    useState<CVDocumentDetailResponse | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const startedTemplateIdRef = useRef<string | null>(null);
  const importReviewDocumentId = searchParams.get("importReview");
  const templateId = searchParams.get("template");

  const setImportReviewQuery = useCallback(
    (documentId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (documentId) {
        params.set("importReview", documentId);
      } else {
        params.delete("importReview");
      }

      const query = params.toString();
      router.replace(query ? `/candidate/cv-builder?${query}` : "/candidate/cv-builder", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const loadResumes = useCallback(async () => {
    try {
      setLoading(true);
      const [resumeResult, optionsResult] = await Promise.allSettled([
        getMyResumes(),
        fetchCandidateCvOptions(),
      ]);

      if (resumeResult.status === "rejected") {
        throw resumeResult.reason;
      }

      setResumes(resumeResult.value);

      if (optionsResult.status === "fulfilled") {
        setExternalCvOptions(optionsResult.value.filter((item) => item.source !== "builder"));
      } else {
        console.error("Khong the tai danh sach CV upload:", optionsResult.reason);
        setExternalCvOptions([]);
      }
    } catch (error) {
      console.error("Khong the tai danh sach CV:", error);
      setExternalCvOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoadResumeList(templateId)) {
      setLoading(false);
      return;
    }

    void loadResumes();
  }, [loadResumes, templateId]);

  useEffect(() => {
    if (!saveNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveNotice(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  useEffect(() => {
    if (
      !shouldStartTemplateCreation({
        templateId,
        isCreating: templateRedirectLoading,
        startedTemplateId: startedTemplateIdRef.current,
      })
    ) {
      return;
    }

    startedTemplateIdRef.current = templateId;
    let cancelled = false;

    const createFromTemplate = async () => {
      try {
        setTemplateRedirectLoading(true);
        const resume = await createResume(templateId as string, "CV cua toi");
        if (!cancelled && resume) {
          router.replace(`/candidate/cv-builder/${resume.id}/edit`);
        }
      } catch (error) {
        console.error("Khong the tao CV tu mau:", error);
        startedTemplateIdRef.current = null;
        if (!cancelled) {
          alert("Khong the tao CV tu mau da chon. Vui long thu lai.");
          router.replace("/candidate/templates");
        }
      } finally {
        if (!cancelled) {
          setTemplateRedirectLoading(false);
        }
      }
    };

    void createFromTemplate();

    return () => {
      cancelled = true;
    };
  }, [router, templateId, templateRedirectLoading]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) {
      return;
    }

    const storedResumeId = window.localStorage.getItem(DEFAULT_RESUME_STORAGE_KEY);
    const resolvedDefaultId = resolveDefaultResumeId({ storedResumeId, resumes });

    if (resolvedDefaultId) {
      window.localStorage.setItem(DEFAULT_RESUME_STORAGE_KEY, resolvedDefaultId);
    } else {
      window.localStorage.removeItem(DEFAULT_RESUME_STORAGE_KEY);
    }

    setDefaultResumeId(resolvedDefaultId);
    setSelectedResumeId((current) => {
      if (current && resumes.some((resume) => resume.id === current)) {
        return current;
      }

      return resolvedDefaultId;
    });
  }, [loading, resumes]);

  const allDisplayItems = useMemo(() => {
    const builderItems: BuilderDashboardListItem[] = resumes.map((resume) => ({
      kind: "builder",
      updatedAt: resume.updated_at,
      resume,
    }));

    const externalItems: ExternalDashboardListItem[] = externalCvOptions.map((option, index) => ({
      kind: "external",
      id: option.path || `${option.source}:${option.label}:${option.createdAt}:${option.resumeId || index}`,
      updatedAt: option.createdAt,
      option,
    }));

    return [...builderItems, ...externalItems];
  }, [externalCvOptions, resumes]);

  const sourceCounts = useMemo(() => {
    const templateCount = allDisplayItems.filter((item) => item.kind === "builder").length;
    const profileCount = allDisplayItems.filter(
      (item) => item.kind === "external" && item.option.source === "profile",
    ).length;
    const applicationCount = allDisplayItems.filter(
      (item) => item.kind === "external" && item.option.source === "uploaded",
    ).length;

    return {
      all: allDisplayItems.length,
      template: templateCount,
      profile: profileCount,
      application: applicationCount,
    };
  }, [allDisplayItems]);

  const filteredDisplayItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const sourceFiltered = allDisplayItems.filter((item) => {
      if (sourceFilter === "all") {
        return true;
      }

      if (sourceFilter === "template") {
        return item.kind === "builder";
      }

      if (sourceFilter === "profile") {
        return item.kind === "external" && item.option.source === "profile";
      }

      return item.kind === "external" && item.option.source === "uploaded";
    });

    const keywordFiltered = sourceFiltered.filter((item) => {
      const title = item.kind === "builder" ? item.resume.title : item.option.label;
      const sourceLabel = item.kind === "builder" ? "template" : item.option.source;

      if (!keyword) {
        return true;
      }

      return `${title} ${sourceLabel}`.toLowerCase().includes(keyword);
    });

    return [...keywordFiltered].sort((left, right) => {
      if (sortMode === "name") {
        const leftName = left.kind === "builder" ? left.resume.title : left.option.label;
        const rightName = right.kind === "builder" ? right.resume.title : right.option.label;
        return leftName.localeCompare(rightName, "vi", { sensitivity: "base" });
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [allDisplayItems, searchKeyword, sortMode, sourceFilter]);

  const primaryResume = useMemo(() => {
    const fallbackResume = [...resumes].sort(
      (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )[0];

    if (!defaultResumeId) {
      return fallbackResume || null;
    }

    return resumes.find((resume) => resume.id === defaultResumeId) || fallbackResume || null;
  }, [defaultResumeId, resumes]);

  const stats = useMemo(
    () => ({
      total: resumes.length + externalCvOptions.length,
      publicCount: resumes.filter((resume) => resume.is_public).length,
      defaultCount: defaultResumeId ? 1 : 0,
    }),
    [defaultResumeId, externalCvOptions.length, resumes],
  );

  const handleImportUpload = async (file: File) => {
    try {
      setImportUploading(true);
      setSaveNotice("Dang tai CV len he thong...");
      const response = await uploadCVImport(file, { startProcessing: false });
      setUploadedImport(response);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setSaveNotice("CV da duoc tai len. Bam Trich xuat JSON de bat dau OCR va phan tich.");
      setImportReviewQuery(null);
    } catch (error) {
      console.error("Import CV that bai:", error);
      alert("Khong the bat dau quy trinh import CV. Vui long thu lai.");
      setSaveNotice(null);
    } finally {
      setImportUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  const handleStartImportAnalysis = useCallback(async () => {
    if (!uploadedImport || uploadedImport.document.status !== "uploaded") {
      return;
    }

    try {
      setImportAnalyzingId(uploadedImport.document.id);
      setSaveNotice("Dang bat dau OCR va trich xuat JSON...");
      const response = await startCVImportAnalysis(uploadedImport.document.id);
      setUploadedImport(response);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setImportReviewQuery(response.document.id);
      setSaveNotice("Da bat dau phan tich CV. Ban co the theo doi tien trinh trong hop review.");
    } catch (error) {
      console.error("Khong the bat dau phan tich CV:", error);
      setSaveNotice("Khong the bat dau OCR. Vui long thu lai.");
    } finally {
      setImportAnalyzingId(null);
    }
  }, [setImportReviewQuery, uploadedImport]);

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm("Ban chac chan muon xoa CV nay?")) {
      return;
    }

    try {
      setDeletingId(resumeId);
      await deleteResume(resumeId);
      setResumes((current) => current.filter((resume) => resume.id !== resumeId));
      setSaveNotice("Da xoa CV khoi danh sach.");

      if (resumeId === defaultResumeId && typeof window !== "undefined") {
        window.localStorage.removeItem(DEFAULT_RESUME_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Xoa CV that bai:", error);
      setSaveNotice("Khong the xoa CV. Vui long thu lai.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefaultResumeById = (resumeId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(DEFAULT_RESUME_STORAGE_KEY, resumeId);
    setDefaultResumeId(resumeId);
    setSelectedResumeId(resumeId);
    setSaveNotice("Da dat CV mac dinh cho thiet bi hien tai.");
  };

  const openExternalCv = (externalUrl: string | null) => {
    if (!externalUrl) {
      setSaveNotice("Khong tim thay tep CV nay trong kho luu tru.");
      return;
    }

    window.open(externalUrl, "_blank", "noopener,noreferrer");
  };

  const sourceFilterOptions: Array<{ value: CVSourceFilter; label: string; count: number }> = [
    { value: "all", label: "Tất cả", count: sourceCounts.all },
    { value: "template", label: "Template web", count: sourceCounts.template },
    { value: "profile", label: "Hồ sơ ứng viên", count: sourceCounts.profile },
    { value: "application", label: "Đơn ứng tuyển", count: sourceCounts.application },
  ];

  const renderUnifiedCard = (item: CVDashboardListItem) => {
    const isBuilder = item.kind === "builder";
    const title = isBuilder ? item.resume.title : item.option.label;
    const subtitle = isBuilder
      ? item.resume.template?.name
        ? `${item.resume.template.name} • CV Builder`
        : "Online Editor • TalentFlow"
      : item.option.source === "profile"
        ? "Nguồn: CV đã lưu trong hồ sơ ứng viên"
        : "Nguồn: CV từ đơn ứng tuyển";
    const icon = isBuilder ? "description" : item.option.source === "profile" ? "person" : "upload_file";
    const sourceBadge = isBuilder
      ? {
          label: "Template web",
          className: "border-blue-200 bg-blue-50 text-[#0052CC]",
        }
      : item.option.source === "profile"
        ? {
            label: "Hồ sơ ứng viên",
            className: "border-emerald-200 bg-emerald-50 text-emerald-700",
          }
        : {
            label: "Đơn ứng tuyển",
            className: "border-amber-200 bg-amber-50 text-amber-700",
          };
    const externalUrl =
      item.kind === "external"
        ? item.option.downloadUrl ||
          (item.option.source === "profile" ? "/api/candidate/profile/cv" : null)
        : null;
    const isDefault = isBuilder && item.resume.id === defaultResumeId;
    const isSelected = isBuilder && item.resume.id === selectedResumeId;
    const isRecent = Date.now() - new Date(item.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7;

    return (
      <article
        key={isBuilder ? item.resume.id : item.id}
        className={`rounded-2xl border px-4 py-3 transition-all sm:px-5 ${
          isSelected
            ? "border-blue-200 bg-blue-50/60 shadow-[0_12px_30px_rgba(37,99,235,0.14)]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="overflow-hidden text-ellipsis text-[16px] font-bold leading-6 text-[#0052CC] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {title}
                </p>
                <p className="mt-1 overflow-hidden text-sm leading-5 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-left lg:text-right">
              <p className="text-sm font-semibold text-slate-700">{formatAbsoluteDate(item.updatedAt)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {formatDistanceToNow(new Date(item.updatedAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={sourceBadge.label} tone="neutral" className={sourceBadge.className} />
              {isDefault ? (
                <StatusBadge
                  label="CV chính"
                  tone="primary"
                  className="border-cyan-200 bg-cyan-50 text-cyan-700"
                />
              ) : null}
              {isRecent ? (
                <StatusBadge
                  label="Mới cập nhật"
                  tone="primary"
                  className="border-sky-200 bg-sky-50 text-sky-700"
                />
              ) : null}
              {isBuilder ? (
                <StatusBadge
                  label={item.resume.is_public ? "Công khai" : "Riêng tư"}
                  tone={item.resume.is_public ? "success" : "neutral"}
                  className={
                    item.resume.is_public
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }
                />
              ) : null}
            </div>

            <div className="flex lg:justify-end">
              <div className="inline-flex items-center justify-end gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
                {item.kind === "builder" ? (
                  <>
                    <ActionIconButton
                      icon="edit"
                      label="Chỉnh sửa"
                      onClick={() => router.push(`/candidate/cv-builder/${item.resume.id}/edit`)}
                    />
                    <ActionIconButton
                      icon="visibility"
                      label="Xem nhanh"
                      onClick={() => setSelectedResumeId(item.resume.id)}
                    />
                    <ActionIconButton
                      icon="star"
                      label="Đặt mặc định"
                      onClick={() => handleSetDefaultResumeById(item.resume.id)}
                      disabled={isDefault}
                    />
                    <ActionIconButton
                      icon="delete"
                      label="Xóa"
                      onClick={() => void handleDeleteResume(item.resume.id)}
                      disabled={deletingId === item.resume.id}
                      tone="danger"
                    />
                  </>
                ) : (
                  <>
                    <ActionIconButton
                      icon="visibility"
                      label="Xem nhanh"
                      onClick={() => openExternalCv(externalUrl)}
                      disabled={!externalUrl}
                    />
                    <ActionIconButton
                      icon="download"
                      label="Tải xuống"
                      onClick={() => openExternalCv(externalUrl)}
                      disabled={!externalUrl}
                    />
                    {item.option.source === "profile" ? (
                      <ActionIconButton
                        icon="person"
                        label="Mở hồ sơ"
                        onClick={() => router.push("/candidate/profile")}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {templateRedirectLoading ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin" />
            Dang tao CV tu mau ban vua chon...
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-semibold text-sky-900">
          {saveNotice}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-slate-900">Quản lý CV</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Tối ưu hóa hồ sơ để tiếp cận nhà tuyển dụng tốt hơn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            onClick={() => uploadInputRef.current?.click()}
            variant="secondary"
            disabled={importUploading || importAnalyzingId !== null}
            icon={<span className="material-symbols-outlined text-[18px]">upload</span>}
          >
            Tải CV lên
          </ActionButton>
          <ActionButton
            href="/candidate/templates"
            variant="primary"
            icon={<span className="material-symbols-outlined text-[18px]">add</span>}
          >
            Tạo CV mới
          </ActionButton>
        </div>
      </section>

      {uploadedImport ? (
        <section className="rounded-2xl border border-cyan-200/70 bg-cyan-50/70 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">CV mới tải lên</p>
              <p className="text-sm text-slate-600">{uploadedImport.document.file_name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {formatFileSize(uploadedImport.document.file_size)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {IMPORT_STATUS_LABELS[uploadedImport.document.status] || uploadedImport.document.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {uploadedImport.document.status === "uploaded"
                  ? "File da duoc luu. He thong se chi OCR khi ban bam Trich xuat JSON."
                  : ACTIVE_IMPORT_STATUSES.has(uploadedImport.document.status)
                    ? "OCR dang chay. Bam Mo review de theo doi tien trinh."
                    : "Ket qua OCR da co san. Bam Mo review de xem toan bo parsed JSON."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {uploadedImport.document.status === "uploaded" ? (
                <ActionButton
                  onClick={() => void handleStartImportAnalysis()}
                  variant="primary"
                  size="sm"
                  disabled={importAnalyzingId === uploadedImport.document.id}
                  icon={
                    importAnalyzingId === uploadedImport.document.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    )
                  }
                >
                  Trích xuất JSON
                </ActionButton>
              ) : null}

              <ActionButton
                onClick={() => {
                  setOptimisticReviewDetail(buildOptimisticImportReviewDetail(uploadedImport));
                  setImportReviewQuery(uploadedImport.document.id);
                }}
                variant="secondary"
                size="sm"
                icon={<span className="material-symbols-outlined text-[18px]">visibility</span>}
              >
                Mở review
              </ActionButton>

              <ActionButton
                href={uploadedImport.links.review}
                variant="ghost"
                size="sm"
                icon={<span className="material-symbols-outlined text-[18px]">open_in_new</span>}
              >
                Trang review
              </ActionButton>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          label="Tổng số CV"
          value={loading ? "--" : String(stats.total)}
          className="rounded-xl border border-white bg-white shadow-[0px_12px_32px_rgba(25,28,30,0.04)]"
          icon={<span className="material-symbols-outlined text-[20px]">description</span>}
        />
        <DashboardCard
          label="CV công khai"
          value={loading ? "--" : String(stats.publicCount)}
          className="rounded-xl border border-white bg-white shadow-[0px_12px_32px_rgba(25,28,30,0.04)]"
          toneClassName="bg-emerald-50 text-emerald-700"
          icon={<span className="material-symbols-outlined text-[20px]">public</span>}
        />
        <DashboardCard
          label="CV mặc định"
          value={loading ? "--" : String(stats.defaultCount).padStart(2, "0")}
          className="rounded-xl border border-white bg-white shadow-[0px_12px_32px_rgba(25,28,30,0.04)]"
          toneClassName="bg-amber-50 text-amber-700"
          icon={<span className="material-symbols-outlined text-[20px]">star</span>}
        />
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-blue-200/70 bg-linear-to-br from-[#0E2D79] via-[#1849AE] to-[#0B265F] px-6 py-6 text-white shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-cyan-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              CV chính / mặc định
            </span>

            {primaryResume ? (
              <>
                <h2 className="overflow-hidden text-ellipsis text-2xl font-bold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {primaryResume.title}
                </h2>
                <p className="text-sm text-white/80">
                  {primaryResume.template?.name
                    ? `${primaryResume.template.name} • CV Builder`
                    : "Online Editor • TalentFlow"}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label="Template web"
                    tone="neutral"
                    className="border-white/25 bg-white/10 text-white"
                  />
                  {defaultResumeId === primaryResume.id ? (
                    <StatusBadge
                      label="Đang là CV chính"
                      tone="neutral"
                      className="border-cyan-200/70 bg-cyan-100/20 text-cyan-100"
                    />
                  ) : (
                    <StatusBadge
                      label="Đề xuất làm CV chính"
                      tone="neutral"
                      className="border-amber-200/70 bg-amber-100/20 text-amber-100"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold leading-tight">Chưa có CV builder để đặt làm CV chính</h2>
                <p className="text-sm text-white/80">
                  Tạo CV mới từ template để mở khóa chỉnh sửa online và đặt CV mặc định nhanh hơn.
                </p>
              </>
            )}
          </div>

          <div className="space-y-2 text-left lg:text-right">
            {primaryResume ? (
              <>
                <p className="text-sm font-semibold text-white">{formatAbsoluteDate(primaryResume.updated_at)}</p>
                <p className="text-xs font-medium text-white/80">
                  {formatDistanceToNow(new Date(primaryResume.updated_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <ActionButton
                    href={`/candidate/cv-builder/${primaryResume.id}/edit`}
                    size="sm"
                    variant="secondary"
                    icon={<span className="material-symbols-outlined text-[18px]">edit</span>}
                  >
                    Chỉnh sửa CV chính
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleSetDefaultResumeById(primaryResume.id)}
                    size="sm"
                    variant="primary"
                    disabled={defaultResumeId === primaryResume.id}
                    icon={<span className="material-symbols-outlined text-[18px]">star</span>}
                  >
                    {defaultResumeId === primaryResume.id ? "Đã là mặc định" : "Đặt làm mặc định"}
                  </ActionButton>
                </div>
              </>
            ) : (
              <ActionButton
                href="/candidate/templates"
                size="sm"
                variant="primary"
                icon={<span className="material-symbols-outlined text-[18px]">add</span>}
              >
                Tạo CV đầu tiên
              </ActionButton>
            )}
          </div>
        </div>
      </section>

      <DataTableShell
        title="Kho CV đồng bộ"
        description="Toàn bộ CV được gom vào một danh sách duy nhất để tìm nhanh, lọc theo nguồn và thao tác trực tiếp."
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm shadow-[0_4px_16px_rgba(59,130,246,0.12)]">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0052CC]">
              {filteredDisplayItems.length}/{sourceCounts.all} CV
            </span>
            <select
              aria-label="Sắp xếp CV"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value === "name" ? "name" : "latest")}
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-[#0052CC] outline-none transition-colors focus:border-[#0052CC]"
            >
              <option value="latest">Mới nhất</option>
              <option value="name">Tên A-Z</option>
            </select>
          </div>
        }
      >
        <div className="space-y-4 px-3 py-3 sm:px-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="Tìm theo tên CV hoặc nguồn..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="flex items-center gap-2 lg:justify-end">
              <ActionButton
                href="/candidate/templates"
                variant="secondary"
                size="sm"
                icon={<span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
              >
                Mở thư viện template
              </ActionButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sourceFilterOptions.map((option) => {
              const isActive = option.value === sourceFilter;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceFilter(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#0B3A98] bg-[#0B3A98] text-white shadow-[0_8px_20px_rgba(11,58,152,0.26)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`list-loading-${index}`} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))
          ) : filteredDisplayItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-8">
              <EmptyState
                icon={<FileText size={28} />}
                title={
                  sourceFilter !== "all" || searchKeyword.trim().length > 0
                    ? "Không tìm thấy CV phù hợp"
                    : "Bạn chưa có CV nào"
                }
                description={
                  sourceFilter !== "all" || searchKeyword.trim().length > 0
                    ? "Thử đổi bộ lọc hoặc từ khóa để mở rộng kết quả."
                    : "Bắt đầu từ thư viện mẫu hoặc tải CV sẵn có để đưa nội dung vào hệ thống."
                }
              />
              {sourceFilter !== "all" || searchKeyword.trim().length > 0 ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceFilter("all");
                      setSearchKeyword("");
                    }}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">{filteredDisplayItems.map((item) => renderUnifiedCard(item))}</div>
          )}
        </div>
      </DataTableShell>

      <section className="rounded-2xl border border-primary/10 bg-primary/5 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">lightbulb</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Mẹo nhỏ cho bạn</p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Cập nhật CV thường xuyên giúp tăng cơ hội được nhà tuyển dụng liên hệ trực tiếp.
              </p>
            </div>
          </div>

          <ActionButton
            onClick={() => setOcrModalOpen(true)}
            size="sm"
            variant="secondary"
            icon={<UploadCloud size={16} />}
          >
            Mở OCR viewer
          </ActionButton>
        </div>
      </section>

      <PaddleOcrWorkspaceModal isOpen={ocrModalOpen} onClose={() => setOcrModalOpen(false)} />

      <ImportReviewOverlayModal
        documentId={importReviewDocumentId}
        initialDetail={
          importReviewDocumentId && optimisticReviewDetail?.document.id === importReviewDocumentId
            ? optimisticReviewDetail
            : null
        }
        onClose={() => {
          setOptimisticReviewDetail(null);
          setImportReviewQuery(null);
        }}
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        aria-label="Upload CV file"
        title="Upload CV file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportUpload(file);
          }
        }}
        disabled={importUploading || importAnalyzingId !== null}
      />
    </div>
  );
}

function CVDashboardPageFallback() {
  return <div className="min-h-80 rounded-[28px] bg-slate-50" />;
}

type ActionIconButtonTone = "default" | "danger";

interface ActionIconButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: ActionIconButtonTone;
}

function ActionIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  tone = "default",
}: ActionIconButtonProps) {
  const toneClassName =
    tone === "danger"
      ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600"
      : "text-slate-500 hover:bg-blue-50 hover:text-[#0052CC]";

  return (
    <div className="group/action relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${toneClassName} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </button>
      <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/action:opacity-100">
        {label}
      </span>
    </div>
  );
}

export default function CVDashboardPage() {
  return (
    <Suspense fallback={<CVDashboardPageFallback />}>
      <CVDashboardPageContent />
    </Suspense>
  );
}
