"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { getMyResumes, deleteResume, renameResume, createResume, ResumeRow } from "./api";
import { Plus, FileText, MoreVertical, Trash2, Pencil, ExternalLink, Clock, ScanLine, Upload } from "lucide-react";
import { OCRPreviewModal } from "./components/ocr/OCRPreviewModal";
import type { CVSection } from "./types";

export default function CVDashboardPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

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

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameResume(id, renameValue.trim());
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: renameValue.trim() } : r))
      );
      setRenamingId(null);
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
            href="/candidate/cv-builder/new"
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
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse">
                <div className="h-45 bg-slate-100 rounded-t-2xl" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CREATE NEW CARD */}
            <Link
              href="/candidate/cv-builder/new"
              className="group flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="size-16 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center transition-colors mb-4">
                <Plus size={28} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Tạo CV mới</h3>
              <p className="text-slate-400 text-sm mt-1">Chọn từ thư viện mẫu</p>
            </Link>

            {/* UPLOAD CV CARD */}
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="group flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-white hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer text-left"
            >
              <div className="size-16 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors mb-4">
                <Upload size={28} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Upload CV có sẵn</h3>
              <p className="text-slate-400 text-sm mt-1 text-center px-4">AI quét và nhập dữ liệu tự động</p>
              <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-blue-100/60 border border-blue-200/60">
                <ScanLine size={12} className="text-blue-600" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">PDF • JPG • PNG</span>
              </div>
            </button>

            {/* EXISTING CVs */}
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-80 relative"
              >
                {/* THUMBNAIL */}
                <div className="h-45 bg-linear-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                  <FileText size={64} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />

                  {/* STATUS BADGE */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${
                      resume.is_public
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {resume.is_public ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>

                  {/* MENU BUTTON */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      title="Menu"
                      aria-label="Menu CV"
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenMenuId(openMenuId === resume.id ? null : resume.id);
                      }}
                      className="size-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* DROPDOWN MENU */}
                    {openMenuId === resume.id && (
                      <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44 z-20">
                        <Link
                          href={`/candidate/cv-builder/${resume.id}/edit`}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          <Pencil size={14} />Chỉnh sửa
                        </Link>
                        <button
                          onClick={() => {
                            setRenamingId(resume.id);
                            setRenameValue(resume.title);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          <ExternalLink size={14} />Đổi tên
                        </button>
                        <hr className="my-1 border-slate-100" />
                        <button
                          onClick={() => { handleDelete(resume.id); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 font-medium"
                          disabled={deletingId === resume.id}
                        >
                          <Trash2 size={14} />
                          {deletingId === resume.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Link
                      href={`/candidate/cv-builder/${resume.id}/edit`}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-bold hover:bg-emerald-500 hover:text-white transition-colors shadow-lg pointer-events-auto"
                    >
                      <Pencil size={14} />
                      Chỉnh sửa
                    </Link>
                  </div>
                </div>

                {/* INFO */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Rename inline */}
                  {renamingId === resume.id ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        autoFocus
                        placeholder="Tên CV"
                        title="Đổi tên CV"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(resume.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 text-sm border border-emerald-400 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                      <button
                        onClick={() => handleRename(resume.id)}
                        className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-slate-900 text-base truncate mb-1">
                      {resume.title}
                    </h3>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(resume.updated_at), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {resume.template?.name || "Tùy chỉnh"}
                    </span>
                    <Link
                      href={`/candidate/cv-builder/${resume.id}/edit`}
                      className="text-emerald-600 text-sm font-bold hover:underline flex items-center gap-1"
                    >
                      Tiếp tục
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
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
              href="/candidate/cv-builder/new"
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