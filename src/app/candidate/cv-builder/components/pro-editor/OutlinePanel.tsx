"use client";

import { Eye, EyeOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CVSection } from "../../types";
import { getSectionDisplayName } from "./template-schema";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";

interface OutlinePanelProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  onOpenAddSection: () => void;
}

export function OutlinePanel({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleVisibility,
  onOpenAddSection,
}: OutlinePanelProps) {
  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {EDITOR_UI_TEXTS.rightPanel.outlineTitle}
        </p>
        <button
          type="button"
          onClick={onOpenAddSection}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:border-sky-200 hover:bg-slate-50 hover:text-primary"
        >
          <Plus size={12} />
          {EDITOR_UI_TEXTS.rightPanel.add}
        </button>
      </div>
      <div className="space-y-2">
        {sections.map((section) => {
          const active = section.id === selectedSectionId;

          return (
            <div key={section.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  "flex h-11 flex-1 items-center rounded-[18px] border px-3 text-left text-[13px] transition-all duration-200",
                  active
                    ? "border-sky-200 bg-sky-50 text-primary"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <span className="truncate">{getSectionDisplayName(section)}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleVisibility(section.id)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                title={
                  section.isVisible
                    ? EDITOR_UI_TEXTS.rightPanel.hideSection
                    : EDITOR_UI_TEXTS.rightPanel.showSection
                }
              >
                {section.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
