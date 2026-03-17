import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  MoreVertical,
  Trash2,
  Pencil,
  ExternalLink,
  Globe,
  Lock,
} from "lucide-react";
import { getTemplatePreview } from "@/lib/cv-template-preview";
import { ResumeRow } from "../../api";

interface CVCardProps {
  resume: ResumeRow;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  isDeleting?: boolean;
}

export function CVCard({
  resume,
  onDelete,
  onRename,
  isDeleting,
}: CVCardProps) {
  const [openMenu, setOpenMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.title);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== resume.title) {
      onRename(resume.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const thumbnailUrl = getTemplatePreview({
    templateId: resume.template_id,
    templateName: resume.template?.name,
    thumbnailUrl: resume.thumbnail_url || resume.template?.thumbnail_url,
  });

  return (
    <div className="group relative flex h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-[220px] flex-shrink-0 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(241,245,249,0.96)_48%,_rgba(226,232,240,0.92))] transition-colors">
        <div className="absolute inset-x-10 bottom-4 h-8 rounded-full bg-slate-900/10 blur-xl transition-all duration-300 group-hover:bg-slate-900/15" />
        <div className="absolute inset-x-4 bottom-0 top-4 overflow-hidden rounded-t-xl border border-slate-200/80 bg-white shadow-[0_24px_40px_-28px_rgba(15,23,42,0.45)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[0.3deg]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={`Preview of ${resume.title}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getTemplatePreview({});
            }}
            className="h-full w-full bg-white object-contain object-top"
          />
        </div>

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-md">
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

        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            title="Menu"
            onClick={(e) => {
              e.preventDefault();
              setOpenMenu(!openMenu);
            }}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
          >
            <MoreVertical size={16} />
          </button>

          {openMenu ? (
            <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl duration-200">
              <Link
                href={`/candidate/cv-builder/${resume.id}/edit`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pencil size={15} /> Chỉnh sửa
              </Link>
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setOpenMenu(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ExternalLink size={15} /> Đổi tên
              </button>
              <hr className="mx-2 my-1 border-slate-100" />
              <button
                onClick={() => {
                  setOpenMenu(false);
                  onDelete(resume.id);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                disabled={isDeleting}
              >
                <Trash2 size={15} />
                {isDeleting ? "Đang xóa..." : "Xóa CV"}
              </button>
            </div>
          ) : null}

          {openMenu ? (
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(false);
              }}
            />
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link
            href={`/candidate/cv-builder/${resume.id}/edit`}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-xl transition-all hover:scale-105 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Tiếp tục
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white p-4">
        {isRenaming ? (
          <div className="mb-2 flex w-full gap-2">
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
              className="flex-1 rounded-lg border-2 border-emerald-400 px-2.5 py-1 text-sm font-bold text-slate-800 outline-none transition-all focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        ) : (
          <h3
            className="mb-1 truncate text-[15px] font-bold text-slate-900"
            title={resume.title}
          >
            {resume.title}
          </h3>
        )}

        <p className="mb-1 text-[13px] text-slate-500">
          Cập nhật{" "}
          {formatDistanceToNow(new Date(resume.updated_at), {
            addSuffix: true,
            locale: vi,
          })}
        </p>

        <p className="mt-auto flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
          Mẫu:{" "}
          <span className="text-slate-800">
            {resume.template?.name || "Cơ bản"}
          </span>
        </p>
      </div>
    </div>
  );
}
