"use client";

import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaDrivenSectionRenderer } from "./schema-driven-preview/section-renderers";
import type { CVPreviewSection, CVResolvedSectionStyleConfig, CVTemplateConfig } from "./schema-driven-preview/types";

interface CVSectionRendererProps {
  section: CVPreviewSection;
  styleConfig: CVResolvedSectionStyleConfig;
  template: CVTemplateConfig;
  isActive: boolean;
  onSelectSection: (sectionId: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
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
  isActive,
  onSelectSection,
  onUpdateSectionData,
  onRequestAddSection,
}: CVSectionRendererProps) {
  if (!section.visible) {
    return <HiddenSectionCard title={styleConfig.title} template={template} />;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Chọn mục ${styleConfig.title}`}
      onClick={() => onSelectSection(section.sourceSectionId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectSection(section.sourceSectionId);
        }
      }}
    >
      <SchemaDrivenSectionRenderer
        section={section}
        styleConfig={styleConfig}
        isActive={isActive}
        onEdit={(updates: Record<string, unknown>) => onUpdateSectionData(section.sourceSectionId, updates)}
        onAddAbove={() => {
          if (!onRequestAddSection) {
            return;
          }
          onRequestAddSection(section.sourceSectionId, "above");
        }}
        onAddBelow={() => {
          if (!onRequestAddSection) {
            return;
          }
          onRequestAddSection(section.sourceSectionId, "below");
        }}
      />
    </div>
  );
}
