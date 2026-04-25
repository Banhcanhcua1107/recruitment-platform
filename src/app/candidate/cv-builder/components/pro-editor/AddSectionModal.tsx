"use client";

import { useEffect } from "react";
import {
  Award,
  BriefcaseBusiness,
  ContactRound,
  FileText,
  FolderKanban,
  GraduationCap,
  Languages,
  Medal,
  Settings2,
  Target,
  Trophy,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CVSection, SectionType } from "../../types";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";
import {
  getModalSectionCatalog,
  type ModalCatalogIcon,
  type ModalSectionCatalogItem,
} from "./template-schema";

interface AddSectionModalProps {
  isOpen: boolean;
  insertPosition: {
    sectionId: string;
    position: "above" | "below";
  } | null;
  selectedSectionType: SectionType | null;
  sections: CVSection[];
  onClose: () => void;
  onSelectSectionType: (type: SectionType | null) => void;
  onAddSection: (item: ModalSectionCatalogItem) => void;
}

const ICON_MAP: Record<ModalCatalogIcon, LucideIcon> = {
  contact: ContactRound,
  summary: UserCircle2,
  objective: Target,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  skills: Settings2,
  language: Languages,
  project: FolderKanban,
  certificate: Award,
  award: Trophy,
  activity: Medal,
  custom: FileText,
};

export function AddSectionModal({
  isOpen,
  insertPosition,
  selectedSectionType,
  sections,
  onClose,
  onSelectSectionType,
  onAddSection,
}: AddSectionModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    onSelectSectionType(null);
    onClose();
  };

  const items = getModalSectionCatalog(sections);
  const insertHint = insertPosition
    ? insertPosition.position === "above"
      ? "Vị trí chèn: phía trên section đang chọn"
      : "Vị trí chèn: phía dưới section đang chọn"
    : "Vị trí chèn: cuối CV";

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label={EDITOR_UI_TEXTS.addSectionModal.closeAriaLabel}
        className="absolute inset-0 bg-slate-900/24 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      <div
        className="relative z-91 w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,#fcfefd_0%,#f4f7f6_100%)] shadow-[0_48px_120px_-58px_rgba(2,6,23,0.9)]"
      >
        <button
          type="button"
          onClick={handleClose}
          title="Đóng"
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/90 bg-white/95 text-slate-500 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] transition hover:border-slate-400 hover:bg-white hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="px-8 pb-8 pt-7 sm:px-10">
          <h3 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-800 sm:text-[38px]">Thêm thành phần mới</h3>
          <p className="mt-2 inline-flex rounded-full border border-slate-300/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">
            {insertHint}
          </p>

          <div className="mt-6 grid max-h-[64dvh] grid-cols-2 gap-3.5 overflow-y-auto pr-1.5 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isSelected = selectedSectionType === item.type;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => {
                    onSelectSectionType(item.type);
                    onAddSection(item);
                    handleClose();
                  }}
                  className={cn(
                    "group rounded-[18px] border px-4 py-4.5 text-center transition duration-200",
                    item.isDisabled
                      ? "cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400"
                      : "border-slate-200/90 bg-white/92 text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] hover:-translate-y-0.5 hover:border-emerald-300/85 hover:bg-emerald-50/45 hover:shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)]",
                    isSelected && !item.isDisabled && "border-emerald-400/85 bg-emerald-50/55 shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_16px_28px_-22px_rgba(16,185,129,0.45)]",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition",
                      !item.isDisabled && "group-hover:border-emerald-300/90 group-hover:bg-emerald-100/55 group-hover:text-emerald-700",
                      isSelected && !item.isDisabled && "border-emerald-300 bg-emerald-100/70 text-emerald-700",
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <p className="mt-3 text-[15px] font-semibold leading-5 text-slate-700">{item.label}</p>
                  {item.isDisabled ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Đã thêm</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
