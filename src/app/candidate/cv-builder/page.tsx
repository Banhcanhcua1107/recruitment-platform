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
      console.error("Không thể tải danh sách CV:", err);
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
        const resume = await createResume(templateId, "CV của tôi");
        if (!cancelled && resume) {
          router.replace(`/candidate/cv-builder/${resume.id}/edit`);
        }
      } catch (err) {
        console.error("Không thể tạo CV từ mẫu:", err);
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
  }, [router, searchParams, templateRedirectLoading]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa CV này?")) return;

    try {
      setDeletingId(id);
      await deleteResume(id);
      setResumes((prev) => prev.filter((resume) => resume.id !== id));
      setSaveNotice("Đã xóa CV khỏi danh sách đã lưu.");
    } catch (err) {
      console.error("Xóa thất bại:", err);
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
      console.error("Đổi tên thất bại:", err);
    }
  };

  const handleImportUpload = async (file: File) => {
    try {
      setImportUploading(true);
      setSaveNotice("Đang đưa CV vào hộp xem lại import mới...");
      const response = await uploadCVImport(file);
      setOptimisticReviewDetail(buildOptimisticImportReviewDetail(response));
      setSaveNotice("CV đã được đưa vào pipeline. Hộp xem lại sẽ tự cập nhật trạng thái xử lý.");
      setImportReviewQuery(response.document.id);
    } catch (err) {
      console.error("Import CV that bai:", err);
      alert("Không thể bắt đầu quy trình import CV. Vui lòng thử lại.");
      setSaveNotice(null);
    } finally {
      setImportUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-['Manrope']">
      {templateRedirectLoading ? (
        <div className="border-b border-emerald-100 bg-emerald-50/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3 text-sm font-medium text-emerald-800">
            <Loader2 size={16} className="animate-spin" />
            Đang tạo CV từ mẫu bạn đã chọn...
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="border-b border-blue-100 bg-blue-50/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-3 text-sm font-medium text-blue-800">
            {saveNotice}
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              CV của tôi
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {loading ? "Đang tải..." : `${resumes.length} CV đã lưu`}
            </p>
          </div>
          <Link
            href="/candidate/templates"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Plus size={18} />
            Tạo CV mới
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Tạo hoặc tải CV lên
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Tạo CV mới từ thư viện mẫu hoặc tải CV có sẵn để AI quét,
                làm sạch nội dung và lưu vào hệ thống.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CreateCard />
            <UploadCard onClick={() => uploadInputRef.current?.click()} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-500">
              Mỗi file tải lên sẽ đi qua quy trình import bền vững với queue, artifact manifest và hộp xem lại riêng.
            </p>
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-[1px] hover:bg-slate-100"
            >
              OCR document viewer
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FolderOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Các CV bạn đã lưu
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Xem lại, chỉnh sửa và dùng các CV đã lưu khi ứng tuyển nhà
                tuyển dụng.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex h-[340px] animate-pulse flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-[220px] bg-slate-100/80" />
                  <div className="flex flex-1 flex-col justify-end space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                    <div className="mt-auto h-3 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : resumes.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <CVCard
                  key={resume.id}
                  resume={resume}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  isDeleting={deletingId === resume.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                <FileText size={36} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Bạn chưa lưu CV nào
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Hãy tạo CV mới từ mẫu hoặc tải CV có sẵn lên để AI quét, sau đó
                lưu lại vào hệ thống để dùng khi ứng tuyển.
              </p>
            </div>
          )}
        </section>
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
