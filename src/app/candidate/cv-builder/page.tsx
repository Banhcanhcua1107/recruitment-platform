"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Loader2, Plus, UploadCloud } from "lucide-react";
import {
  createResume,
  deleteResume,
  getMyResumes,
  renameResume,
  type ResumeRow,
} from "./api";
import { uploadCVImport } from "@/features/cv-import/api/client";
import { ImportReviewOverlayModal } from "@/features/cv-import/components/ImportReviewOverlayModal";
import { buildOptimisticImportReviewDetail } from "@/features/cv-import/review/import-review-detail";
import { PaddleOcrWorkspaceModal } from "@/features/ocr-viewer";
import { getTemplatePreview } from "@/lib/cv-template-preview";
import type { CVDocumentDetailResponse } from "@/types/cv-import";
import { resolveDefaultResumeId } from "@/components/candidate/candidateWorkspaceContentModel";
import {
  shouldLoadResumeList,
  shouldStartTemplateCreation,
} from "./template-creation";

const DEFAULT_RESUME_STORAGE_KEY = "talentflow:candidate:default-resume-id";

type ResumeFilter = "all" | "public" | "private";

function formatAbsoluteDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Chưa rõ thời gian";
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function CVDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ResumeFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
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
    [router, searchParams]
  );

  const loadResumes = useCallback(async () => {
    try {
      setLoading(true);
      setResumes(await getMyResumes());
    } catch (error) {
      console.error("Không thể tải danh sách CV:", error);
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
        const resume = await createResume(templateId as string, "CV của tôi");
        if (!cancelled && resume) {
          router.replace(`/candidate/cv-builder/${resume.id}/edit`);
        }
      } catch (error) {
        console.error("Không thể tạo CV từ mẫu:", error);
        startedTemplateIdRef.current = null;
        if (!cancelled) {
          alert("Không thể tạo CV từ mẫu đã chọn. Vui lòng thử lại.");
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

  const filteredResumes = useMemo(() => {
    return resumes.filter((resume) => {
      if (filter === "public" && !resume.is_public) {
        return false;
      }

      if (filter === "private" && resume.is_public) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      const templateName = resume.template?.name?.toLowerCase() || "";

      return resume.title.toLowerCase().includes(query) || templateName.includes(query);
    });
  }, [filter, resumes, search]);

  const selectedResume =
    filteredResumes.find((resume) => resume.id === selectedResumeId) ||
    resumes.find((resume) => resume.id === selectedResumeId) ||
    null;

  useEffect(() => {
    setRenameValue(selectedResume?.title || "");
  }, [selectedResume]);

  const stats = useMemo(
    () => ({
      total: resumes.length,
      publicCount: resumes.filter((resume) => resume.is_public).length,
      privateCount: resumes.filter((resume) => !resume.is_public).length,
    }),
    [resumes]
  );

  const selectedPreviewUrl = selectedResume
    ? getTemplatePreview({
        templateId: selectedResume.template_id,
        templateName: selectedResume.template?.name,
        thumbnailUrl: selectedResume.thumbnail_url || selectedResume.template?.thumbnail_url,
      })
    : getTemplatePreview({});

  const handleImportUpload = async (file: File) => {
    try {
      setImportUploading(true);
      setSaveNotice("Đang đưa CV vào quy trình import...");
      const response = await uploadCVImport(file);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setSaveNotice("CV đã được tải lên. Bạn có thể xem lại kết quả import ngay trong hộp kiểm tra.");
      setImportReviewQuery(response.document.id);
    } catch (error) {
      console.error("Import CV thất bại:", error);
      alert("Không thể bắt đầu quy trình import CV. Vui lòng thử lại.");
      setSaveNotice(null);
    } finally {
      setImportUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa CV này?")) {
      return;
    }

    try {
      setDeletingId(resumeId);
      await deleteResume(resumeId);
      setResumes((current) => current.filter((resume) => resume.id !== resumeId));
      setSaveNotice("Đã xóa CV khỏi danh sách.");

      if (resumeId === defaultResumeId && typeof window !== "undefined") {
        window.localStorage.removeItem(DEFAULT_RESUME_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Xóa CV thất bại:", error);
      setSaveNotice("Không thể xóa CV. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameResume = async () => {
    if (!selectedResume || !renameValue.trim() || renameValue.trim() === selectedResume.title) {
      return;
    }

    try {
      setRenamingId(selectedResume.id);
      const nextTitle = renameValue.trim();
      await renameResume(selectedResume.id, nextTitle);
      setResumes((current) =>
        current.map((resume) =>
          resume.id === selectedResume.id ? { ...resume, title: nextTitle } : resume
        )
      );
      setSaveNotice("Đã cập nhật tên CV.");
    } catch (error) {
      console.error("Đổi tên CV thất bại:", error);
      setSaveNotice("Không thể cập nhật tên CV. Vui lòng thử lại.");
    } finally {
      setRenamingId(null);
    }
  };

  const handleSetDefaultResume = () => {
    if (!selectedResume || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(DEFAULT_RESUME_STORAGE_KEY, selectedResume.id);
    setDefaultResumeId(selectedResume.id);
    setSaveNotice("Đã đặt CV mặc định cho thiết bị hiện tại.");
  };

  return (
    <div className="space-y-6 pb-8">
      {templateRedirectLoading ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin" />
            Đang tạo CV từ mẫu bạn vừa chọn...
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-semibold text-sky-900">
          {saveNotice}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Tổng số CV", value: String(stats.total), icon: "description", tone: "bg-sky-100 text-sky-700" },
          { label: "CV công khai", value: String(stats.publicCount), icon: "public", tone: "bg-emerald-100 text-emerald-700" },
          { label: "CV mặc định", value: defaultResumeId ? "Đã chọn" : "Chưa chọn", icon: "verified", tone: "bg-amber-100 text-amber-700" },
        ].map((item) => (
          <article key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <div className={`flex size-11 items-center justify-center rounded-2xl ${item.tone}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{loading ? "--" : item.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.85fr)]">
        <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Danh sách CV</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">CV đã lưu và tải lên</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Tìm nhanh theo tên hoặc mẫu CV, rồi chọn một bản để xem chi tiết ở cột bên phải.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/candidate/templates" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
                <Plus size={18} />
                Tạo CV mới
              </Link>
              <button type="button" onClick={() => uploadInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary">
                <UploadCloud size={18} />
                Tải CV lên
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "public", "private"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === value ? "bg-primary text-white shadow-lg shadow-primary/20" : "border border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary"}`}>
                  {value === "all" ? "Tất cả" : value === "public" ? "Công khai" : "Riêng tư"}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-sm">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên CV hoặc mẫu" className="w-full rounded-[20px] border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-100" />) : null}
            {!loading && filteredResumes.map((resume) => (
              <button key={resume.id} type="button" onClick={() => setSelectedResumeId(resume.id)} className={`w-full rounded-3xl border px-4 py-4 text-left transition-all ${resume.id === selectedResume?.id ? "border-primary/25 bg-primary/5 shadow-[0_20px_44px_-34px_rgba(37,99,235,0.55)]" : "border-slate-200 bg-white hover:border-primary/20 hover:bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-black text-slate-950">{resume.title}</h3>
                      {resume.id === defaultResumeId ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Mặc định</span> : null}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${resume.is_public ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{resume.is_public ? "Công khai" : "Riêng tư"}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{resume.template?.name || "CV cơ bản"}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Cập nhật {formatAbsoluteDate(resume.updated_at)} • {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true, locale: vi })}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </div>
              </button>
            ))}
            {!loading && resumes.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><FileText size={28} /></div><h3 className="mt-5 text-2xl font-black text-slate-950">Bạn chưa có CV nào</h3><p className="mt-3 text-sm font-medium leading-6 text-slate-500">Bắt đầu từ thư viện mẫu hoặc tải CV sẵn có để đưa nội dung vào hệ thống.</p></div> : null}
            {!loading && resumes.length > 0 && filteredResumes.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><p className="text-lg font-black text-slate-900">Không tìm thấy CV phù hợp.</p><p className="mt-2 text-sm font-medium text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem lại toàn bộ danh sách.</p></div> : null}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="order-2 rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Xem trước</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedResume ? selectedResume.title : "Chọn một CV để xem chi tiết"}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{selectedResume ? `Mẫu đang dùng: ${selectedResume.template?.name || "CV cơ bản"}` : "Chọn một mục ở cột bên trái để xem ảnh xem trước, trạng thái và các thao tác chính."}</p>
              </div>
              {selectedResume ? <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${selectedResume.id === defaultResumeId ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{selectedResume.id === defaultResumeId ? "CV mặc định" : "CV phụ"}</span> : null}
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(241,245,249,0.95)_48%,rgba(226,232,240,0.92))] p-4">
              <div className="mx-auto max-w-85 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_40px_-28px_rgba(15,23,42,0.45)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedPreviewUrl} alt={selectedResume ? `Preview ${selectedResume.title}` : "Preview CV"} className="h-full w-full bg-white object-contain object-top" />
              </div>
            </div>

            {selectedResume ? (
              <>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tên CV</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input type="text" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Đổi tên CV" title="Đổi tên CV" placeholder="Nhập tên CV" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" />
                      <button type="button" onClick={handleRenameResume} disabled={renamingId === selectedResume.id || !renameValue.trim() || renameValue.trim() === selectedResume.title} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary disabled:opacity-50">{renamingId === selectedResume.id ? "Đang lưu..." : "Lưu tên"}</button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Trạng thái</p><p className="mt-2 text-sm font-bold text-slate-900">{selectedResume.is_public ? "Công khai" : "Riêng tư"}</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Cập nhật gần nhất</p><p className="mt-2 text-sm font-bold text-slate-900">{formatAbsoluteDate(selectedResume.updated_at)}</p></div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href={`/candidate/cv-builder/${selectedResume.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"><span className="material-symbols-outlined text-[18px]">edit_square</span>Chỉnh sửa CV</Link>
                  <button type="button" onClick={handleSetDefaultResume} disabled={selectedResume.id === defaultResumeId} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">verified</span>Đặt làm mặc định</button>
                  <button type="button" onClick={() => uploadInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"><UploadCloud size={18} />Tải CV khác lên</button>
                  <button type="button" onClick={() => void handleDeleteResume(selectedResume.id)} disabled={deletingId === selectedResume.id} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">delete</span>{deletingId === selectedResume.id ? "Đang xóa..." : "Xóa CV"}</button>
                </div>

                <p className="mt-4 text-xs font-medium leading-5 text-slate-400">CV mặc định hiện chỉ được lưu trên thiết bị này. Pha backend sau có thể chuyển lựa chọn này thành cấu hình đồng bộ theo tài khoản.</p>
              </>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                <p className="text-base font-black text-slate-900">Chưa có CV nào được chọn.</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Hãy chọn một CV từ danh sách hoặc bắt đầu tạo mới từ thư viện mẫu.</p>
              </div>
            )}
          </section>

          <section className="order-1 rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Tác vụ nhanh</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Tạo mới hoặc nhập CV sẵn có</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Dùng thư viện mẫu để tạo nhanh, hoặc tải CV có sẵn để đưa vào quy trình import và tiếp tục chỉnh sửa.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/candidate/templates" className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 transition-colors hover:border-primary/20 hover:bg-white"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plus size={20} /></div><p className="mt-4 text-lg font-black text-slate-950">Tạo CV mới</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Chọn một mẫu phù hợp rồi đi thẳng vào trình chỉnh sửa.</p></Link>
              <button type="button" onClick={() => uploadInputRef.current?.click()} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 text-left transition-colors hover:border-primary/20 hover:bg-white"><div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UploadCloud size={20} /></div><p className="mt-4 text-lg font-black text-slate-950">Tải CV lên</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Hỗ trợ PDF, DOCX và ảnh để tiếp tục pipeline import hiện có.</p></button>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium leading-6 text-slate-500">Cần kiểm tra tài liệu OCR hoặc xem kết quả import chi tiết?</p>
                <button type="button" onClick={() => setOcrModalOpen(true)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary">Mở OCR viewer</button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <PaddleOcrWorkspaceModal isOpen={ocrModalOpen} onClose={() => setOcrModalOpen(false)} />

      <ImportReviewOverlayModal
        documentId={importReviewDocumentId}
        initialDetail={importReviewDocumentId && optimisticReviewDetail?.document.id === importReviewDocumentId ? optimisticReviewDetail : null}
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
  return <div className="min-h-80 rounded-4xl bg-slate-50" />;
}

export default function CVDashboardPage() {
  return (
    <Suspense fallback={<CVDashboardPageFallback />}>
      <CVDashboardPageContent />
    </Suspense>
  );
}
