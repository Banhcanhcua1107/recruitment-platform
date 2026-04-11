"use client";

import { SectionRenderer, type SectionRenderMode } from "./SectionRenderer";
import type {
  CVPreviewSection,
  CVPreviewSectionType,
  CVResolvedSectionStyleConfig,
  CVTemplateConfig,
} from "./types";

export function resolveSectionStyleConfig(
  template: CVTemplateConfig,
  sectionType: CVPreviewSectionType,
  explicitTitle?: string,
): CVResolvedSectionStyleConfig {
  const baseStyle = template.sectionStyleRules[sectionType];

  return {
    ...baseStyle,
    title: explicitTitle?.trim() ? explicitTitle : baseStyle.title,
  };
}

interface SchemaDrivenSectionRendererProps {
  section: CVPreviewSection;
  styleConfig: CVResolvedSectionStyleConfig;
  template: CVTemplateConfig;
  mode: SectionRenderMode;
  isActive: boolean;
  onEdit: (updates: Record<string, unknown>) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export function SchemaDrivenSectionRenderer({
  section,
  styleConfig,
  template,
  mode,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: SchemaDrivenSectionRendererProps) {
  return (
    <SectionRenderer
      section={section}
      styleConfig={styleConfig}
      template={template}
      mode={mode}
      isActive={isActive}
      onEdit={onEdit}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
    />
  );
}
