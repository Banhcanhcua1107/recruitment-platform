import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { MoreVertical, Trash2, Pencil, ExternalLink, Globe, Lock } from "lucide-react";
import { getTemplatePreview } from "@/lib/cv-template-preview";
import { ResumeRow } from "../../api";

interface CVCardProps {
  resume: ResumeRow;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  isDeleting?: boolean;
}

export function CVCard({ resume, onDelete, onRename, isDeleting }: CVCardProps) {
  const [openMenu, setOpenMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.title);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== resume.title) {
      onRename(resume.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  // Safe fallback for thumbnail
  // Preferred: cv.thumbnail_url (from backend if supported)
  // Fallback: template's thumbnail or a default image
  const thumbnailUrl =
    getTemplatePreview({
      templateId: resume.template_id,
      templateName: resume.template?.name,
      thumbnailUrl: resume.thumbnail_url || resume.template?.thumbnail_url,
    });

  return (
    <div className="group bg-white rounded-2xl shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col h-[340px] relative">
      {/* THUMBNAIL AREA */}
      <div className="h-[220px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(241,245,249,0.96)_48%,_rgba(226,232,240,0.92))] flex-shrink-0 relative overflow-hidden transition-colors">
        <div className="absolute inset-x-10 bottom-4 h-8 rounded-full bg-slate-900/10 blur-xl transition-all duration-300 group-hover:bg-slate-900/15" />
        <div className="absolute inset-x-4 top-4 bottom-0 overflow-hidden rounded-t-xl border border-slate-200/80 bg-white shadow-[0_24px_40px_-28px_rgba(15,23,42,0.45)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[0.3deg]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={`Preview of ${resume.title}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getTemplatePreview({});
            }}
            className="h-full w-full object-contain object-top bg-white"
          />
        </div>

        {/* STATUS BADGE */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-md bg-white/90">
          {resume.is_public ? (
            <>
              <Globe size={12} className="text-emerald-600" />
              <span className="text-slate-700">Công khai</span>
            </>
          ) : (
            <>
              <Lock size={12} className="text-slate-500" />
              <span className="text-slate-600">Riêng tư</span>
            </>
          )}
        </div>

        {/* MENU BUTTON */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            title="Menu"
            onClick={(e) => {
              e.preventDefault();
              setOpenMenu(!openMenu);
            }}
            className="size-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center hover:bg-white text-slate-700 shadow-sm transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {/* DROPDOWN MENU */}
          {openMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 w-48 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              <Link
                href={`/candidate/cv-builder/${resume.id}/edit`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                <Pencil size={15} /> Chỉnh sửa
              </Link>
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setOpenMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                <ExternalLink size={15} /> Đổi tên
              </button>
              <hr className="my-1 border-slate-100 mx-2" />
              <button
                onClick={() => {
                  setOpenMenu(false);
                  onDelete(resume.id);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 font-medium transition-colors"
                disabled={isDeleting}
              >
                <Trash2 size={15} />
                {isDeleting ? "Đang xóa..." : "Xóa CV"}
              </button>
            </div>
          )}

          {/* Click away overlay for menu */}
          {openMenu && (
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(false);
              }}
            />
          )}
        </div>

        {/* HOVER OVERLAY: Continue Editing */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <Link
            href={`/candidate/cv-builder/${resume.id}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-full text-sm font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:scale-105 transition-all shadow-xl pointer-events-auto"
          >
            Tiếp tục
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* CARD INFO AREA */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        {isRenaming ? (
          <div className="flex gap-2 mb-2 w-full">
            <input
              autoFocus
              placeholder="Tên CV..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              onBlur={handleRename}
              className="flex-1 text-sm border-2 border-emerald-400 rounded-lg px-2.5 py-1 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold text-slate-800"
            />
          </div>
        ) : (
          <h3
            className="font-bold text-slate-900 text-[15px] truncate mb-1"
            title={resume.title}
          >
            {resume.title}
          </h3>
        )}

        <p className="text-[13px] text-slate-500 mb-1">
          Cập nhật {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true, locale: vi })}
        </p>

        <p className="text-[13px] text-slate-500 font-medium flex items-center gap-1.5 mt-auto">
          Mẫu: <span className="text-slate-800">{resume.template?.name || "Cơ bản"}</span>
        </p>
      </div>
    </div>
  );
}
