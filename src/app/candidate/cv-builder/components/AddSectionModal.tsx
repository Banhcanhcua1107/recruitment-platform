"use client";

import React, { useState } from "react";
import { useCVStore } from "../store";
import { SectionType } from "../types";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Section type catalog ─────────────────────────── */
interface SectionOption {
  type: SectionType;
  label: string;
  icon: string; // material-symbols icon name
  description: string;
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    type: "personal_info",
    label: "Thông tin liên hệ",
    icon: "contact_page",
    description: "Email, số điện thoại, địa chỉ",
  },
  {
    type: "summary",
    label: "Tổng quan",
    icon: "article",
    description: "Giới thiệu bản thân, mục tiêu nghề nghiệp",
  },
  {
    type: "experience_list",
    label: "Kinh nghiệm làm việc",
    icon: "work",
    description: "Lịch sử công việc, vị trí đã đảm nhận",
  },
  {
    type: "skill_list",
    label: "Kỹ năng",
    icon: "psychology",
    description: "Kỹ năng chuyên môn, công cụ, ngôn ngữ",
  },
  {
    type: "education_list",
    label: "Học vấn",
    icon: "school",
    description: "Bằng cấp, trường học, thời gian học",
  },
  {
    type: "project_list",
    label: "Dự án",
    icon: "code",
    description: "Dự án cá nhân hoặc công việc đã tham gia",
  },
  {
    type: "award_list",
    label: "Giải thưởng",
    icon: "emoji_events",
    description: "Giải thưởng, danh hiệu đã đạt được",
  },
  {
    type: "certificate_list",
    label: "Chứng chỉ",
    icon: "workspace_premium",
    description: "Chứng chỉ chuyên môn, khóa học",
  },
  {
    type: "custom_text",
    label: "Mục tùy chỉnh",
    icon: "notes",
    description: "Thêm nội dung bất kỳ theo ý bạn",
  },
];

/* ── "Add Section" trigger button ────────────────── */
export function AddSectionButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/60 rounded-xl py-3 text-slate-400 hover:text-emerald-600 transition-all text-sm font-semibold print:hidden",
          className
        )}
      >
        <Plus size={18} />
        Thêm mục mới
      </button>

      {isOpen && <AddSectionModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

/* ── Modal ────────────────────────────────────────── */
function AddSectionModal({ onClose }: { onClose: () => void }) {
  const { addSection, cv } = useCVStore();

  // Sections already present (to mark them)
  const existingTypes = new Set(cv.sections.map((s) => s.type));

  const handleAdd = (type: SectionType) => {
    addSection(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Thêm mục mới
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn loại mục bạn muốn thêm vào CV
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options grid */}
        <div className="px-6 py-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {SECTION_OPTIONS.map((opt) => {
            const exists = existingTypes.has(opt.type);
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleAdd(opt.type)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all",
                  exists
                    ? "border-slate-100 bg-slate-50/50 hover:border-emerald-200 hover:bg-emerald-50/40"
                    : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-xl mt-0.5 shrink-0",
                    exists ? "text-slate-300" : "text-emerald-500"
                  )}
                >
                  {opt.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    {opt.label}
                    {exists && (
                      <span className="text-[9px] font-semibold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                        ĐÃ CÓ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
