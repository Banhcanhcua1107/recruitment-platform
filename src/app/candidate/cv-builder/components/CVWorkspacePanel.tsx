"use client";

import React from "react";
import { useCVStore } from "../store";
import { CVSection, SummarySectionData, ExperienceListSectionData, EducationListSectionData, SkillListSectionData, HeaderData, PersonalInfoData } from "../types";
import { RichTextEditor } from "./RichTextEditor";
import { Plus, GripVertical, Trash2, Eye, EyeOff } from "lucide-react";

// Section type → display label mapping
const SECTION_LABELS: Record<string, string> = {
  header: "Thông tin cá nhân",
  personal_info: "Liên hệ",
  summary: "Giới thiệu bản thân",
  experience_list: "Kinh nghiệm làm việc",
  education_list: "Học vấn",
  skill_list: "Kỹ năng",
  project_list: "Dự án",
  award_list: "Giải thưởng",
  custom_text: "Văn bản tự do",
};

const SECTION_ICONS: Record<string, string> = {
  header: "person",
  personal_info: "contact_page",
  summary: "article",
  experience_list: "work",
  education_list: "school",
  skill_list: "psychology",
  project_list: "code",
  award_list: "emoji_events",
  custom_text: "notes",
};

export function CVWorkspacePanel() {
  const {
    cv,
    selectedSectionId,
    setSelectedSection,
    updateSectionData,
    updateSection,
    removeSection,
  } = useCVStore();

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-3">
      {cv.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          isActive={selectedSectionId === section.id}
          onActivate={() => setSelectedSection(section.id)}
          onDeactivate={() => setSelectedSection(null)}
          onRemove={() => removeSection(section.id)}
          onToggleVisibility={() =>
            updateSection(section.id, { isVisible: !section.isVisible })
          }
          onDataChange={(updates) => updateSectionData(section.id, updates)}
        />
      ))}

      {/* Add Section Button */}
      <button
        onClick={() => {}}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl py-4 text-slate-400 hover:text-emerald-600 transition-all text-sm font-semibold"
      >
        <Plus size={18} />
        Thêm mục mới
      </button>
    </div>
  );
}

// ─── Individual Section Block ───────────────────────────────────────────────

interface SectionBlockProps {
  section: CVSection;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onDataChange: (updates: Record<string, unknown>) => void;
}

function SectionBlock({
  section,
  isActive,
  onActivate,
  onRemove,
  onToggleVisibility,
  onDataChange,
}: SectionBlockProps) {
  return (
    <div
      onClick={onActivate}
      className={`group relative bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
        isActive
          ? "border-emerald-500 shadow-md shadow-emerald-100"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Block Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          isActive ? "bg-emerald-50 border-b border-emerald-100" : "bg-slate-50 border-b border-slate-100"
        }`}
      >
        {/* Drag handle */}
        <GripVertical size={16} className="text-slate-300 shrink-0" />

        {/* Icon + Title */}
        <span className={`material-symbols-outlined text-lg ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
          {SECTION_ICONS[section.type] || "notes"}
        </span>
        <span className={`flex-1 text-sm font-bold ${isActive ? "text-emerald-800" : "text-slate-600"}`}>
          {section.title || SECTION_LABELS[section.type] || section.type}
        </span>

        {/* Actions (appear on hover/active) */}
        <div className={`flex items-center gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            className="p-1.5 rounded-lg hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
            title={section.isVisible ? "Ẩn mục này" : "Hiện mục này"}
          >
            {section.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Xóa mục"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div className="px-4 py-3">
        <SectionContent
          section={section}
          isActive={isActive}
          onDataChange={onDataChange}
        />
      </div>

      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-l-xl" />
      )}
    </div>
  );
}

// ─── Section Content Renderer ───────────────────────────────────────────────

function SectionContent({
  section,
  isActive,
  onDataChange,
}: {
  section: CVSection;
  isActive: boolean;
  onDataChange: (updates: Record<string, unknown>) => void;
}) {
  const stopPropagation = (e: React.MouseEvent) => {
    if (isActive) e.stopPropagation();
  };

  switch (section.type) {
    case "header": {
      const data = section.data as HeaderData;
      return (
        <div onClick={stopPropagation} className="grid grid-cols-2 gap-3">
          <FieldInput
            label="Họ tên"
            value={data.fullName || ""}
            placeholder="Nguyễn Văn A"
            onChange={(v) => onDataChange({ fullName: v })}
            disabled={!isActive}
          />
          <FieldInput
            label="Chức danh"
            value={data.title || ""}
            placeholder="Frontend Developer"
            onChange={(v) => onDataChange({ title: v })}
            disabled={!isActive}
          />
        </div>
      );
    }

    case "personal_info": {
      const data = section.data as PersonalInfoData;
      return (
        <div onClick={stopPropagation} className="grid grid-cols-2 gap-3">
          <FieldInput label="Email" value={data.email || ""} placeholder="email@gmail.com" onChange={(v) => onDataChange({ email: v })} disabled={!isActive} />
          <FieldInput label="Điện thoại" value={data.phone || ""} placeholder="0123 456 789" onChange={(v) => onDataChange({ phone: v })} disabled={!isActive} />
          <FieldInput label="Địa chỉ" value={data.address || ""} placeholder="Hà Nội, Việt Nam" onChange={(v) => onDataChange({ address: v })} disabled={!isActive} />
          <FieldInput label="Ngày sinh" value={data.dob || ""} placeholder="01/01/2000" onChange={(v) => onDataChange({ dob: v })} disabled={!isActive} />
        </div>
      );
    }

    case "summary": {
      const data = section.data as SummarySectionData;
      if (!isActive) {
        return (
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
            {data.text?.replace(/<[^>]*>/g, "").slice(0, 120) || "Chưa có nội dung. Click để chỉnh sửa."}…
          </p>
        );
      }
      return (
        <div onClick={stopPropagation}>
          <RichTextEditor
            content={data.text || ""}
            onChange={(html) => onDataChange({ text: html })}
            placeholder="Viết giới thiệu bản thân..."
          />
        </div>
      );
    }

    case "experience_list": {
      const data = section.data as ExperienceListSectionData;
      return (
        <div onClick={stopPropagation} className="space-y-4">
          {data.items?.map((item, i) => (
            <div key={item.id} className={`${i > 0 ? "pt-4 border-t border-slate-100" : ""}`}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <FieldInput label="Công ty" value={item.company} placeholder="Tên công ty" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], company: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
                <FieldInput label="Vị trí" value={item.position} placeholder="Developer" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], position: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
                <FieldInput label="Bắt đầu" value={item.startDate} placeholder="MM/YYYY" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], startDate: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
                <FieldInput label="Kết thúc" value={item.endDate as string} placeholder="MM/YYYY / Present" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], endDate: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
              </div>
              {isActive && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mô tả</p>
                  <RichTextEditor
                    content={item.description || ""}
                    onChange={(html) => {
                      const newItems = [...data.items];
                      newItems[i] = { ...newItems[i], description: html };
                      onDataChange({ items: newItems });
                    }}
                    placeholder="Mô tả công việc, thành tích..."
                  />
                </div>
              )}
            </div>
          ))}
          {isActive && (
            <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">
              <Plus size={14} />Thêm kinh nghiệm
            </button>
          )}
        </div>
      );
    }

    case "education_list": {
      const data = section.data as EducationListSectionData;
      return (
        <div onClick={stopPropagation} className="space-y-3">
          {data.items?.map((item, i) => (
            <div key={item.id} className={`${i > 0 ? "pt-3 border-t border-slate-100" : ""}`}>
              <div className="grid grid-cols-2 gap-2">
                <FieldInput label="Trường" value={item.institution} placeholder="Tên trường" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], institution: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
                <FieldInput label="Ngành học" value={item.degree} placeholder="Chuyên ngành" onChange={(v) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], degree: v };
                  onDataChange({ items: newItems });
                }} disabled={!isActive} />
              </div>
            </div>
          ))}
          {isActive && (
            <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">
              <Plus size={14} />Thêm học vấn
            </button>
          )}
        </div>
      );
    }

    case "skill_list": {
      const data = section.data as SkillListSectionData;
      if (!isActive) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {data.items?.slice(0, 4).map((skill) => (
              <span key={skill.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                {skill.name}
              </span>
            ))}
            {(data.items?.length || 0) > 4 && (
              <span className="px-2 py-0.5 text-slate-400 text-xs">+{(data.items?.length || 0) - 4} more</span>
            )}
          </div>
        );
      }
      return (
        <div onClick={stopPropagation} className="space-y-2">
          {data.items?.map((skill, i) => (
            <div key={skill.id} className="flex items-center gap-2">
              <input
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                value={skill.name}
                placeholder="Tên kỹ năng"
                onChange={(e) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...newItems[i], name: e.target.value };
                  onDataChange({ items: newItems });
                }}
              />
            </div>
          ))}
          <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">
            <Plus size={14} />Thêm kỹ năng
          </button>
        </div>
      );
    }

    default:
      return (
        <p className="text-xs text-slate-400 italic">
          Click để chỉnh sửa mục này...
        </p>
      );
  }
}

// ─── Reusable Field Input ────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {disabled ? (
        <p className="text-sm text-slate-600 truncate">{value || <span className="text-slate-300 italic">{placeholder}</span>}</p>
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
        />
      )}
    </div>
  );
}

