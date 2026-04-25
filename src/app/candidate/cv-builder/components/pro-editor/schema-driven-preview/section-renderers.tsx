"use client";

import { SectionRenderer, type SectionRenderMode } from "./SectionRenderer";
import type {
  CVPreviewSection,
  CVPreviewSectionType,
  CVTemplateIconToken,
  CVResolvedSectionStyleConfig,
  CVTemplateConfig,
} from "./types";

const ICON_TOKEN_SET: ReadonlySet<CVTemplateIconToken> = new Set<CVTemplateIconToken>([
  "summary",
  "target",
  "experience",
  "education",
  "skills",
  "languages",
  "projects",
  "certificates",
  "awards",
  "activities",
  "custom",
]);

function resolveExplicitIconToken(iconValue: unknown): CVTemplateIconToken | null {
  if (typeof iconValue !== "string") {
    return null;
  }

  const normalized = iconValue.trim().toLowerCase();

  if (!ICON_TOKEN_SET.has(normalized as CVTemplateIconToken)) {
    return null;
  }

  return normalized as CVTemplateIconToken;
}

export function resolveSectionStyleConfig(
  template: CVTemplateConfig,
  sectionType: CVPreviewSectionType,
  explicitTitle?: string,
  explicitIcon?: unknown,
): CVResolvedSectionStyleConfig {
  const baseStyle = template.sectionStyleRules[sectionType];
  const resolvedIcon = resolveExplicitIconToken(explicitIcon) ?? baseStyle.icon;

  return {
    ...baseStyle,
    title: explicitTitle?.trim() ? explicitTitle : baseStyle.title,
    icon: resolvedIcon,
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
