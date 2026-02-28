"use client";

import React from "react";
import { useCVStore } from "../store";
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  sectionId: string;
  children: React.ReactNode;
  /** Label shown in the action bar */
  label?: string;
  /** Don't show delete (e.g. for header) */
  disableDelete?: boolean;
}

/**
 * Wraps a visual CV section with hover action controls.
 * Implements single-focus editing: only the selected section shows its action bar.
 */
export const SectionWrapper = ({
  sectionId,
  children,
  label,
  disableDelete = false,
}: SectionWrapperProps) => {
  const {
    selectedSectionId,
    setSelectedSection,
    removeSection,
    duplicateSection,
    moveSectionUp,
    moveSectionDown,
    updateSection,
    cv,
  } = useCVStore();

  const isSelected = selectedSectionId === sectionId;
  const section = cv.sections.find((s) => s.id === sectionId);
  const isVisible = section?.isVisible ?? true;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSection(isSelected ? null : sectionId);
  };

  return (
    <div
      className={cn(
        "group/section relative transition-all duration-150",
        isSelected && "z-10",
        !isVisible && "opacity-40"
      )}
      onClick={handleSelect}
    >
      {/* Highlight border */}
      <div
        className={cn(
          "absolute -inset-1 rounded-lg border-2 pointer-events-none transition-colors duration-150",
          isSelected
            ? "border-emerald-400"
            : "border-transparent group-hover/section:border-emerald-200"
        )}
      />

      {/* Floating action bar — top-right */}
      <div
        className={cn(
          "absolute -top-9 right-0 flex items-center gap-0.5 bg-white border border-slate-200 shadow-lg rounded-lg px-1 py-0.5 z-20 transition-all duration-150",
          isSelected
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-1 pointer-events-none group-hover/section:opacity-100 group-hover/section:translate-y-0 group-hover/section:pointer-events-auto"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {label && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">
            {label}
          </span>
        )}
        <div className="w-px h-4 bg-slate-200" />

        {/* Move up */}
        <ActionBtn
          icon={<ChevronUp size={13} />}
          title="Di chuyển lên"
          onClick={() => moveSectionUp(sectionId)}
        />

        {/* Move down */}
        <ActionBtn
          icon={<ChevronDown size={13} />}
          title="Di chuyển xuống"
          onClick={() => moveSectionDown(sectionId)}
        />

        <div className="w-px h-4 bg-slate-200" />

        {/* Visibility toggle */}
        <ActionBtn
          icon={isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          title={isVisible ? "Ẩn" : "Hiện"}
          onClick={() => updateSection(sectionId, { isVisible: !isVisible })}
        />

        {/* Duplicate */}
        <ActionBtn
          icon={<Copy size={13} />}
          title="Nhân đôi"
          onClick={() => duplicateSection(sectionId)}
        />

        {/* Delete */}
        {!disableDelete && (
          <ActionBtn
            icon={<Trash2 size={13} />}
            title="Xóa"
            onClick={() => {
              if (isSelected) setSelectedSection(null);
              removeSection(sectionId);
            }}
            danger
          />
        )}
      </div>

      {/* Section content */}
      {children}
    </div>
  );
};

/* ── Small action button ─────────────────────────── */
function ActionBtn({
  icon,
  title,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        danger
          ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
      )}
    >
      {icon}
    </button>
  );
}
