"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createResume,
  deleteResume,
  getMyResumes,
  renameResume,
  type ResumeRow,
} from "./api";
import { FileText, FolderOpen, Loader2, Plus, UploadCloud } from "lucide-react";
import { CVCard } from "./components/cv/CVCard";
import { CreateCard } from "./components/cv/CreateCard";
import { UploadCard } from "./components/cv/UploadCard";
import { uploadCVImport } from "@/features/cv-import/api/client";
import { ImportReviewOverlayModal } from "@/features/cv-import/components/ImportReviewOverlayModal";
import { buildOptimisticImportReviewDetail } from "@/features/cv-import/review/import-review-detail";
import { PaddleOcrWorkspaceModal } from "@/features/ocr-viewer";
import type { CVDocumentDetailResponse } from "@/types/cv-import";

function CVDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [templateRedirectLoading, setTemplateRedirectLoading] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [importUploading, setImportUploading] = useState(false);
  const [optimisticReviewDetail, setOptimisticReviewDetail] =
    useState<CVDocumentDetailResponse | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const importReviewDocumentId = searchParams.get("importReview");
  const hasNoResume = !loading && resumes.length === 0;

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

  const loadResumes = async () => {
    try {
      setLoading(true);
      const data = await getMyResumes();
      setResumes(data);
    } catch (err) {
      console.error("Khong the tai danh sach CV:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResumes();
  }, []);

  useEffect(() => {
    if (!saveNotice) return;
    const timeoutId = window.setTimeout(() => setSaveNotice(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId || templateRedirectLoading) {
      return;
    }

    let cancelled = false;

    const createFromTemplate = async () => {
      try {
        setTemplateRedirectLoading(true);
        const resume = await createResume(templateId, "CV cua toi");
        if (!cancelled && resume) {
          router.replace(`/candidate/cv-builder/${resume.id}/edit`);
        }
      } catch (err) {
        console.error("Khong the tao CV tu mau:", err);
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
  }, [router, searchParams, templateRedirectLoading]);

  const handleDelete = async (id: string) => {
    if (!confirm("Ban chac chan muon xoa CV nay?")) return;

    try {
      setDeletingId(id);
      await deleteResume(id);
      setResumes((prev) => prev.filter((resume) => resume.id !== id));
      setSaveNotice("Da xoa CV khoi danh sach da luu.");
    } catch (err) {
      console.error("Xoa that bai:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      await renameResume(id, newTitle);
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === id ? { ...resume, title: newTitle } : resume,
        ),
      );
    } catch (err) {
      console.error("Doi ten that bai:", err);
    }
  };

  const handleImportUpload = async (file: File) => {
    try {
      setImportUploading(true);
      setSaveNotice("Dang dua CV vao hop xem lai import moi...");
      const response = await uploadCVImport(file);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setSaveNotice("CV da duoc dua vao pipeline. Hop xem lai se tu cap nhat trang thai xu ly.");
      setImportReviewQuery(response.document.id);
    } catch (err) {
      console.error("Import CV that bai:", err);
      alert("Khong the bat dau quy trinh import CV. Vui long thu lai.");
      setSaveNotice(null);
    } finally {
      setImportUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-['Manrope']">
      {templateRedirectLoading ? (
        <div className="border-b border-emerald-100 bg-emerald-50">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3 text-sm font-medium text-emerald-900">
            <Loader2 size={16} className="animate-spin" />
            Dang tao CV tu mau ban da chon...
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="border-b border-sky-100 bg-sky-50">
          <div className="mx-auto max-w-7xl px-6 py-3 text-sm font-medium text-sky-900">
            {saveNotice}
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-28 max-w-7xl flex-col justify-between gap-4 px-6 py-5 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Candidate Workspace
            </p>
            <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em] text-slate-950 md:text-[30px]">
              CV cua toi
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {loading ? "Dang tai..." : `${resumes.length} CV da luu`}
            </p>
          </div>
          <Link
            href="/candidate/templates"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 active:scale-[0.98] md:self-auto"
          >
            <Plus size={18} />
            Tao CV moi
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <FolderOpen size={22} />
              </div>
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                  Dashboard
                </span>
                <h2 className="text-[24px] font-bold tracking-[-0.03em] text-slate-950">
                  Cac CV ban da luu
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Xem lai, chinh sua va dung cac CV da luu khi ung tuyen nha tuyen dung.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex h-85 animate-pulse flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="h-55 bg-slate-100" />
                    <div className="flex flex-1 flex-col justify-end space-y-3 p-5">
                      <div className="h-4 w-3/4 rounded-full bg-slate-100" />
                      <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                      <div className="mt-auto h-3 w-1/3 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resumes.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="rounded-2xl border border-transparent bg-transparent transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <CVCard
                      resume={resume}
                      onDelete={handleDelete}
                      onRename={handleRename}
                      isDeleting={deletingId === resume.id}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <FileText size={34} />
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Bat dau nhanh
                </span>
                <h3 className="mt-5 text-[28px] font-bold tracking-[-0.03em] text-slate-950">
                  Tao CV dau tien cua ban
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  Chon mot mau co san de bat dau nhanh, sau do ban co the chinh sua va luu lai de ung tuyen.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                  <Link
                    href="/candidate/templates"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700"
                  >
                    <Plus size={18} />
                    Tao CV moi
                  </Link>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                  >
                    <UploadCloud size={18} />
                    Tai CV len
                  </button>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  Ban da co CV san? Tai len de bo sung noi dung nhanh hon.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            {hasNoResume ? (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <UploadCloud size={22} />
                  </div>
                  <div className="space-y-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Tai CV san co
                    </span>
                    <h2 className="text-[24px] font-bold tracking-[-0.03em] text-slate-950">
                      Import CV da co
                    </h2>
                    <p className="max-w-xl text-sm leading-6 text-slate-500">
                      Tai len CV hien tai de nhap noi dung vao he thong va tiep tuc chinh sua.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <UploadCard compact onClick={() => uploadInputRef.current?.click()} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-sm leading-6 text-slate-500">
                    Ho tro PDF, DOCX va file anh. Sau khi tai len, ban co the xem lai va tiep tuc chinh sua.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOcrModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    OCR document viewer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <UploadCloud size={22} />
                      </div>
                      <div className="space-y-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Import pipeline
                        </span>
                        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-slate-950">
                          Tao hoac tai CV len
                        </h2>
                        <p className="max-w-xl text-sm leading-6 text-slate-500">
                          Tao CV moi tu thu vien mau hoac tai CV co san de bo sung noi dung vao he thong.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:justify-items-end">
                    <div className="group w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 transition-colors duration-200 hover:border-emerald-300 hover:bg-white">
                      <CreateCard compact />
                    </div>
                    <div className="group w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 transition-colors duration-200 hover:border-sky-300 hover:bg-white">
                      <UploadCard compact onClick={() => uploadInputRef.current?.click()} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="max-w-3xl text-sm font-medium leading-6 text-slate-500">
                    Moi file tai len se di qua quy trinh import va hop xem lai rieng.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOcrModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 active:scale-[0.98]"
                  >
                    OCR document viewer
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

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
  return <div className="min-h-screen bg-slate-50" />;
}

export default function CVDashboardPage() {
  return (
    <Suspense fallback={<CVDashboardPageFallback />}>
      <CVDashboardPageContent />
    </Suspense>
  );
}
