"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyResumes, deleteResume, renameResume, createResume, ResumeRow } from "./api";
import { Loader2, Plus, FileText } from "lucide-react";
import { OCRPreviewModal } from "./components/ocr/OCRPreviewModal";
import { CVCard } from "./components/cv/CVCard";
import { CreateCard } from "./components/cv/CreateCard";
import { UploadCard } from "./components/cv/UploadCard";
import type { CVSection } from "./types";

export default function CVDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [templateRedirectLoading, setTemplateRedirectLoading] = useState(false);

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
    loadResumes();
  }, []);

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
        console.error("Không thể tạo CV từ template:", err);
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
      setResumes((prev) => prev.filter((r) => r.id !== id));
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
        prev.map((r) => (r.id === id ? { ...r, title: newTitle } : r))
      );
    } catch (err) {
      console.error("Đổi tên thất bại:", err);
    }
  };

  // Handle OCR scan — create a new resume from OCR data and navigate to edit
  const handleOCRConfirm = async (sections: CVSection[]) => {
    try {
      // Use a default template ID (or null for custom)
      const defaultTemplateId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const newResume = await createResume(defaultTemplateId, "CV từ Upload");
      if (newResume) {
        // Navigate to edit page — the sections will be loaded via store
        // We store OCR sections in sessionStorage so the edit page can pick them up
        sessionStorage.setItem("ocr_sections", JSON.stringify(sections));
        router.push(`/candidate/cv-builder/${newResume.id}/edit?ocr=1`);
      }
    } catch (err) {
      console.error("Tạo CV từ OCR thất bại:", err);
    }
    setOcrModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Manrope'] pb-20">
      {templateRedirectLoading && (
        <div className="border-b border-emerald-100 bg-emerald-50/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3 px-6 py-3 text-sm font-medium text-emerald-800">
            <Loader2 size={16} className="animate-spin" />
            Đang tạo CV từ mẫu bạn đã chọn...
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CV của tôi</h1>
            <p className="text-slate-500 font-medium text-sm">
              {loading ? "Đang tải..." : `${resumes.length} CV`}
            </p>
          </div>
          <Link
            href="/candidate/templates"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            <Plus size={18} />
            Tạo CV mới
          </Link>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          // Skeleton loading
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-[340px] animate-pulse overflow-hidden flex flex-col">
                <div className="h-[220px] bg-slate-100/80" />
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-end">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3 mt-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CreateCard />
            <UploadCard onClick={() => setOcrModalOpen(true)} />

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
        )}

        {/* EMPTY STATE */}
        {!loading && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
              <FileText size={36} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa có CV nào</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-xs">
              Bắt đầu tạo CV chuyên nghiệp đầu tiên của bạn từ thư viện mẫu có sẵn.
            </p>
            <Link
              href="/candidate/templates"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              <Plus size={18} />
              Tạo CV đầu tiên
            </Link>
          </div>
        )}
      </div>

      {/* OCR Preview Modal */}
      <OCRPreviewModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onConfirm={handleOCRConfirm}
      />
    </div>
  );
}