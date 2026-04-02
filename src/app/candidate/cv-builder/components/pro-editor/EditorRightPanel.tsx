"use client";

import { useMemo } from "react";
import type { CVSection } from "../../types";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";
import { OutlinePanel } from "./OutlinePanel";
import { RightGuidancePanel } from "./RightGuidancePanel";
import { SectionFormRenderer } from "./SectionFormRenderer";
import { getSectionSchema } from "./template-schema";

export interface EditorRightPanelProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onAddListItem: (sectionId: string) => void;
  onRemoveListItem: (sectionId: string, itemIndex: number) => void;
  onOpenAddSection: () => void;
}

function scoreSectionCompletion(section: CVSection) {
  const schema = getSectionSchema(section.type);
  if (!schema) {
    return 100;
  }

  if (schema.fields?.length) {
    const data = section.data as Record<string, unknown>;
    const filled = schema.fields.filter((field) => String(data[field.key] ?? "").trim().length > 0).length;
    return Math.round((filled / schema.fields.length) * 100);
  }

  if (schema.list) {
    const data = section.data as Record<string, unknown>;
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) {
      return 0;
    }

    const expected = items.length * schema.list.fields.length;
    const filled = items.reduce((count, item) => {
      if (!item || typeof item !== "object") {
        return count;
      }

      return (
        count +
        schema.list!.fields.filter((field) => String((item as Record<string, unknown>)[field.key] ?? "").trim().length > 0).length
      );
    }, 0);

    return Math.round((filled / expected) * 100);
  }

  return 100;
}

export function EditorRightPanel({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleVisibility,
  onUpdateSectionData,
  onAddListItem,
  onRemoveListItem,
  onOpenAddSection,
}: EditorRightPanelProps) {
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null;

  const completionStats = useMemo(() => {
    const scores = sections.map((section) => scoreSectionCompletion(section));
    const total = scores.length ? Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length) : 0;
    return {
      total,
      done: scores.filter((score) => score >= 80).length,
      all: scores.length,
    };
  }, [sections]);

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[var(--app-shadow-soft)]">
      <div className="border-b border-slate-100 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {EDITOR_UI_TEXTS.rightPanel.guideTitle}
        </p>
        <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {EDITOR_UI_TEXTS.rightPanel.qualityTitle}
            </p>
            <p className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              {completionStats.total}%
            </p>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            {completionStats.done}/{completionStats.all} muc dat muc hoan thien tot.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <OutlinePanel
          sections={sections}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
          onToggleVisibility={onToggleVisibility}
          onOpenAddSection={onOpenAddSection}
        />

        <section className="mt-8">
          <RightGuidancePanel activeSection={selectedSection} />
        </section>

        <div className="mt-8">
          <SectionFormRenderer
            selectedSection={selectedSection}
            onUpdateSectionData={onUpdateSectionData}
            onAddListItem={onAddListItem}
            onRemoveListItem={onRemoveListItem}
          />
        </div>
      </div>
    </aside>
  );
}
