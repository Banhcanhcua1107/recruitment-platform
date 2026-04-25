"use client";

import { ChevronDown, ChevronUp, EyeOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaDrivenSectionRenderer } from "./schema-driven-preview/section-renderers";
import type { SectionRenderMode } from "./schema-driven-preview/SectionRenderer";
import type { CVPreviewSection, CVResolvedSectionStyleConfig, CVTemplateConfig } from "./schema-driven-preview/types";

interface CVSectionRendererProps {
  section: CVPreviewSection;
  styleConfig: CVResolvedSectionStyleConfig;
  template: CVTemplateConfig;
  mode: SectionRenderMode;
  isActive: boolean;
  onSelectSection: (sectionId: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
}

function isNestedInteractiveTarget(target: EventTarget | null, currentTarget: EventTarget | null) {
  if (!(target instanceof HTMLElement) || !(currentTarget instanceof HTMLElement)) {
    return false;
  }

  if (target === currentTarget) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [contenteditable='true'], [role='textbox'], [data-cv-inline-editor='true'], [data-cv-section-action='true']",
    ),
  );
}

function HiddenSectionCard({ title, template }: { title: string; template: CVTemplateConfig }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed px-3.5 py-2.5 text-[12px] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.55)]",
        template.colorPalette.hiddenSectionBorderClassName,
        template.colorPalette.hiddenSectionBackgroundClassName,
        template.colorPalette.mutedTextClassName,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <EyeOff size={12} />
        {title} đang ẩn
      </span>
    </div>
  );
}

export function CVSectionRenderer({
  section,
  styleConfig,
  template,
  mode,
  isActive,
  onSelectSection,
  onUpdateSectionData,
  onRequestAddSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
}: CVSectionRendererProps) {
  if (!section.visible) {
    return <HiddenSectionCard title={styleConfig.title} template={template} />;
  }

  const showSectionActions = mode === "edit";
  const forceVisibleActions = isActive;

  return (
    <div
      className="group/cv-section relative"
    >
      {showSectionActions ? (
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-2 z-30 flex items-center gap-1 transition-opacity duration-150",
            forceVisibleActions ? "opacity-100" : "opacity-0 group-hover/cv-section:opacity-100",
          )}
        >
          {onMoveSectionUp ? (
            <button
              type="button"
              data-cv-section-action="true"
              onClick={(event) => {
                event.stopPropagation();
                onMoveSectionUp(section.sourceSectionId);
              }}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.45)] transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              title="Di chuyển lên"
            >
              <ChevronUp size={14} />
            </button>
          ) : null}

          {onMoveSectionDown ? (
            <button
              type="button"
              data-cv-section-action="true"
              onClick={(event) => {
                event.stopPropagation();
                onMoveSectionDown(section.sourceSectionId);
              }}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.45)] transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              title="Di chuyển xuống"
            >
              <ChevronDown size={14} />
            </button>
          ) : null}

          {onRemoveSection ? (
            <button
              type="button"
              data-cv-section-action="true"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveSection(section.sourceSectionId);
              }}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.45)] transition hover:bg-rose-50 hover:text-rose-600"
              title="Xóa mục"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        role="button"
        data-cv-editor-selectable="true"
        tabIndex={mode === "edit" ? 0 : -1}
        aria-label={`Chọn mục ${styleConfig.title}`}
        onMouseDown={(event) => {
          if (mode !== "edit") {
            return;
          }

          if (isActive) {
            return;
          }

          const target = event.target as HTMLElement;
          if (target.closest("[data-cv-section-action='true']")) {
            return;
          }

          onSelectSection(section.sourceSectionId);
        }}
        onClick={(event) => {
          if (mode !== "edit") {
            return;
          }

          // Pointer clicks already select onMouseDown; keep click selection for keyboard/assistive activation.
          if (event.detail > 0) {
            return;
          }

          if (isActive) {
            return;
          }

          onSelectSection(section.sourceSectionId);
        }}
        onKeyDown={(event) => {
          if (mode !== "edit") {
            return;
          }

          if (isNestedInteractiveTarget(event.target, event.currentTarget)) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectSection(section.sourceSectionId);
          }
        }}
      >
        <SchemaDrivenSectionRenderer
          section={section}
          styleConfig={styleConfig}
          template={template}
          mode={mode}
          isActive={isActive}
          onEdit={(updates: Record<string, unknown>) => onUpdateSectionData(section.sourceSectionId, updates)}
          onAddAbove={() => {
            if (mode !== "edit") {
              return;
            }

            if (!onRequestAddSection) {
              return;
            }
            onRequestAddSection(section.sourceSectionId, "above");
          }}
          onAddBelow={() => {
            if (mode !== "edit") {
              return;
            }

            if (!onRequestAddSection) {
              return;
            }
            onRequestAddSection(section.sourceSectionId, "below");
          }}
        />
      </div>
    </div>
  );
}
