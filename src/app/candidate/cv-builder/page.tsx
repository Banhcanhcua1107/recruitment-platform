"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Loader2, UploadCloud } from "lucide-react";
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
import { uploadCVImport } from "@/features/cv-import/api/client";
import { ImportReviewOverlayModal } from "@/features/cv-import/components/ImportReviewOverlayModal";
import { buildOptimisticImportReviewDetail } from "@/features/cv-import/review/import-review-detail";
import { PaddleOcrWorkspaceModal } from "@/features/ocr-viewer";
import type { CVDocumentDetailResponse } from "@/types/cv-import";
import { resolveDefaultResumeId } from "@/components/candidate/candidateWorkspaceContentModel";
import {
  shouldLoadResumeList,
  shouldStartTemplateCreation,
} from "./template-creation";

const DEFAULT_RESUME_STORAGE_KEY = "talentflow:candidate:default-resume-id";

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
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [templateRedirectLoading, setTemplateRedirectLoading] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [importUploading, setImportUploading] = useState(false);
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

  const displayItems = useMemo<CVDashboardListItem[]>(() => {
    const builderItems: CVDashboardListItem[] = resumes.map((resume) => ({
      kind: "builder",
      updatedAt: resume.updated_at,
      resume,
    }));

    const externalItems: CVDashboardListItem[] = externalCvOptions.map((option, index) => ({
      kind: "external",
      id: option.path || `${option.source}:${option.label}:${option.createdAt}:${option.resumeId || index}`,
      updatedAt: option.createdAt,
      option,
    }));

    const mergedItems = [...builderItems, ...externalItems];

    mergedItems.sort((a, b) => {
      const left = new Date(a.updatedAt).getTime();
      const right = new Date(b.updatedAt).getTime();

      if (sortOrder === "oldest") {
        return left - right;
      }

      return right - left;
    });

    return mergedItems;
  }, [externalCvOptions, resumes, sortOrder]);

  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId) || null;

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
      setSaveNotice("Dang dua CV vao quy trinh import...");
      const response = await uploadCVImport(file);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setSaveNotice("CV da duoc tai len. Ban co the xem lai ket qua import trong hop kiem tra.");
      setImportReviewQuery(response.document.id);
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

      <DataTableShell
        title="Danh sách CV"
        description="CV đã lưu và tải lên từ CV Builder, hồ sơ ứng viên và các đơn ứng tuyển."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm shadow-[0_4px_16px_rgba(59,130,246,0.12)]">
            <span className="font-semibold text-[#0052CC]">Sắp xếp theo:</span>
            <select
              aria-label="Sắp xếp CV"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value === "oldest" ? "oldest" : "latest")
              }
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-[#0052CC] outline-none transition-colors focus:border-[#0052CC]"
            >
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        }
        footer={
          displayItems.length > 0 ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setSortOrder("latest")}
                className="text-sm font-bold text-primary hover:underline"
              >
                Xem thêm danh sách
              </button>
            </div>
          ) : null
        }
      >
        <div className="overflow-x-auto px-3 py-3 sm:px-4">
          <table className="min-w-245 w-full border-separate border-spacing-y-2 text-left">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Tên CV
                </th>
                <th className="px-7 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Trạng thái
                </th>
                <th className="px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Cập nhật lần cuối
                </th>
                <th className="px-7 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    <td colSpan={4} className="px-7 py-4">
                      <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-7 py-8">
                    <EmptyState
                      icon={<FileText size={28} />}
                      title="Bạn chưa có CV nào"
                      description="Bắt đầu từ thư viện mẫu hoặc tải CV sẵn có để đưa nội dung vào hệ thống."
                    />
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  if (item.kind === "builder") {
                    const resume = item.resume;
                    const isSelected = resume.id === selectedResume?.id;
                    const isDefault = resume.id === defaultResumeId;
                    const rowSurfaceClass = isSelected
                      ? "bg-blue-50/80"
                      : "bg-white group-hover:bg-blue-50/80";
                    const rowBorderClass = isSelected ? "border-blue-200" : "border-slate-100";

                    return (
                      <tr key={resume.id} className="group transition-colors">
                        <td
                          className={`rounded-l-2xl border-y border-l px-7 py-6 ${rowSurfaceClass} ${rowBorderClass}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <span className="material-symbols-outlined text-[18px]">description</span>
                            </div>
                            <div className="min-w-0">
                              <p className="overflow-hidden text-ellipsis text-[15px] font-bold leading-5 text-[#0052CC] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                {resume.title}
                              </p>
                              <p className="mt-1 overflow-hidden text-ellipsis text-xs text-slate-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                {resume.template?.name
                                  ? `${resume.template.name} • CV Builder`
                                  : "Online Editor • TalentFlow"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className={`border-y px-7 py-6 text-center ${rowSurfaceClass} ${rowBorderClass}`}>
                          <div className="flex flex-wrap justify-center gap-2">
                            <StatusBadge
                              label="CV Builder"
                              tone="primary"
                              className="border-blue-200 bg-blue-50 text-[#0052CC]"
                            />
                            {isDefault ? (
                              <StatusBadge
                                label="Mặc định"
                                tone="primary"
                                className="border-cyan-200 bg-cyan-50 text-cyan-700"
                              />
                            ) : null}
                            <StatusBadge
                              label={resume.is_public ? "Công khai" : "Riêng tư"}
                              tone={resume.is_public ? "success" : "neutral"}
                              className={
                                resume.is_public
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-700"
                              }
                            />
                          </div>
                        </td>

                        <td className={`border-y px-7 py-6 ${rowSurfaceClass} ${rowBorderClass}`}>
                          <p className="text-sm font-medium text-slate-600">
                            {formatAbsoluteDate(resume.updated_at)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDistanceToNow(new Date(resume.updated_at), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                        </td>

                        <td
                          className={`rounded-r-2xl border-y border-r px-7 py-6 ${rowSurfaceClass} ${rowBorderClass}`}
                        >
                          <div className="flex justify-end">
                            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 px-2 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
                              <ActionIconButton
                                icon="edit"
                                label="Chỉnh sửa"
                                onClick={() => router.push(`/candidate/cv-builder/${resume.id}/edit`)}
                              />
                              <ActionIconButton
                                icon="visibility"
                                label="Xem nhanh"
                                onClick={() => setSelectedResumeId(resume.id)}
                              />
                              <ActionIconButton
                                icon="star"
                                label="Đặt mặc định"
                                onClick={() => handleSetDefaultResumeById(resume.id)}
                                disabled={isDefault}
                              />
                              <ActionIconButton
                                icon="delete"
                                label="Xóa"
                                onClick={() => void handleDeleteResume(resume.id)}
                                disabled={deletingId === resume.id}
                                tone="danger"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const sourceLabel =
                    item.option.source === "profile" ? "Hồ sơ ứng viên" : "Từ đơn ứng tuyển";
                  const sourceTone = item.option.source === "profile" ? "success" : "warning";
                  const externalUrl =
                    item.option.downloadUrl ||
                    (item.option.source === "profile" ? "/api/candidate/profile/cv" : null);
                  const sourceSubLabel =
                    item.option.source === "profile"
                      ? "Nguồn: CV đã lưu trong hồ sơ ứng viên"
                      : "Nguồn: CV tải từ đơn ứng tuyển";
                  const rowSurfaceClass = "bg-white group-hover:bg-blue-50/80";

                  return (
                    <tr key={item.id} className="group transition-colors">
                      <td className={`rounded-l-2xl border-y border-l border-slate-100 px-7 py-6 ${rowSurfaceClass}`}>
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <span className="material-symbols-outlined text-[18px]">upload_file</span>
                          </div>
                          <div className="min-w-0">
                            <p className="overflow-hidden text-ellipsis text-[15px] font-bold leading-5 text-[#0052CC] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                              {item.option.label}
                            </p>
                            <p className="mt-1 overflow-hidden text-ellipsis text-xs text-slate-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                              {sourceSubLabel}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className={`border-y border-slate-100 px-7 py-6 text-center ${rowSurfaceClass}`}>
                        <div className="flex flex-wrap justify-center gap-2">
                          <StatusBadge
                            label={sourceLabel}
                            tone={sourceTone}
                            className={
                              sourceTone === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          />
                          <StatusBadge
                            label="Tệp đã upload"
                            tone="neutral"
                            className="border-slate-200 bg-slate-100 text-slate-700"
                          />
                        </div>
                      </td>

                      <td className={`border-y border-slate-100 px-7 py-6 ${rowSurfaceClass}`}>
                        <p className="text-sm font-medium text-slate-600">
                          {formatAbsoluteDate(item.updatedAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDistanceToNow(new Date(item.updatedAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </p>
                      </td>

                      <td
                        className={`rounded-r-2xl border-y border-r border-slate-100 px-7 py-6 ${rowSurfaceClass}`}
                      >
                        <div className="flex justify-end">
                          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 px-2 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
                            <ActionIconButton
                              icon="visibility"
                              label="Xem nhanh"
                              onClick={() => {
                                if (!externalUrl) {
                                  setSaveNotice("Khong tim thay tep CV nay trong kho luu tru.");
                                  return;
                                }

                                window.open(externalUrl, "_blank", "noopener,noreferrer");
                              }}
                              disabled={!externalUrl}
                            />
                            <ActionIconButton
                              icon="download"
                              label="Tải xuống"
                              onClick={() => {
                                if (!externalUrl) {
                                  setSaveNotice("Khong tim thay tep CV nay trong kho luu tru.");
                                  return;
                                }

                                window.open(externalUrl, "_blank", "noopener,noreferrer");
                              }}
                              disabled={!externalUrl}
                            />
                            {item.option.source === "profile" ? (
                              <ActionIconButton
                                icon="person"
                                label="Mở hồ sơ"
                                onClick={() => router.push("/candidate/profile")}
                              />
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
        disabled={importUploading}
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
