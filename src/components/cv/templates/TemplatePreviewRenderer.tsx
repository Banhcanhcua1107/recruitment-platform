"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { CVSection } from "@/app/candidate/cv-builder/types";
import { CVHeader } from "@/app/candidate/cv-builder/components/pro-editor/CVHeader";
import { CVPaper } from "@/app/candidate/cv-builder/components/pro-editor/CVPaper";
import { CVSectionRenderer } from "@/app/candidate/cv-builder/components/pro-editor/CVSectionRenderer";
import { mapBuilderSectionsToPreviewData, orderPreviewSections } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/adapters";
import { resolveSectionStyleConfig } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/section-renderers";
import {
  buildTemplatePaletteTokens,
  resolveTemplatePatternClassName,
} from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/theme-tokens";
import { getTemplateConfig } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/template-config";
import type {
  CVHeaderSummaryContentData,
  CVPreviewSection,
  CVTemplateBodyLayout,
} from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/types";
import { cn } from "@/lib/utils";
import type { CVTemplateDefinition } from "./templateCatalog";
import { buildTemplatePreviewSections } from "./templateCatalog";

const HEADER_SECTION_GAP_CLASS_NAME = "mt-2.5";
const DEFAULT_TEMPLATE_THEME_SCOPE_CLASS_NAME = [
  "[--cv-template-accent-rgb:15_118_110]",
  "[--cv-template-primary-rgb:15_118_110]",
  "[--cv-template-primary-soft-rgb:236_253_250]",
  "[--cv-template-primary-muted-rgb:58_149_139]",
  "[--cv-template-primary-border-rgb:167_243_208]",
  "[--cv-template-primary-contrast-rgb:255_255_255]",
  "[--cv-template-pattern-rgb:20_184_166]",
  "[--cv-template-sidebar-background-rgb:15_118_110]",
  "[--cv-template-sidebar-text-rgb:255_255_255]",
  "[--cv-template-sidebar-muted-rgb:206_233_228]",
  "[--cv-template-sidebar-icon-rgb:255_255_255]",
  "[--cv-template-sidebar-divider-rgb:152_196_188]",
  "[--cv-template-sidebar-overlay-rgb:92_155_145]",
  "[--cv-template-sidebar-skill-track-rgb:120_177_168]",
  "[--cv-template-sidebar-skill-fill-rgb:255_255_255]",
].join(" ");
const THUMBNAIL_SCALE_CLASS_NAME = "scale-[min(calc(100cqw/794px),calc(100cqh/1122px))]";

type BodyColumn = "left" | "right";
type TemplatePreviewMode = "thumbnail" | "full";

interface TemplatePreviewRendererProps {
  template: CVTemplateDefinition;
  mode?: TemplatePreviewMode;
  className?: string;
  paperClassName?: string;
}

function resolvePreviewFontFamilyClass(fontName: string) {
  const normalized = fontName.trim().toLowerCase();

  if (normalized.includes("times")) {
    return "cv-preview-font-times";
  }

  if (normalized.includes("courier")) {
    return "cv-preview-font-courier";
  }

  if (normalized.includes("amiri")) {
    return "cv-preview-font-amiri";
  }

  if (normalized.includes("cairo")) {
    return "cv-preview-font-cairo";
  }

  if (normalized.includes("ubuntu")) {
    return "cv-preview-font-ubuntu";
  }

  if (normalized.includes("roboto")) {
    return "cv-preview-font-roboto";
  }

  if (normalized.includes("inter")) {
    return "cv-preview-font-inter";
  }

  if (normalized.includes("manrope")) {
    return "cv-preview-font-manrope";
  }

  if (normalized.includes("ibm plex")) {
    return "cv-preview-font-ibm-plex-sans";
  }

  if (normalized.includes("jakarta")) {
    return "cv-preview-font-plus-jakarta-sans";
  }

  if (normalized.includes("source sans")) {
    return "cv-preview-font-source-sans-3";
  }

  if (normalized.includes("lora")) {
    return "cv-preview-font-lora";
  }

  return "cv-preview-font-arial";
}

function resolvePreviewTextSizeClass(spacingValue: number) {
  if (!Number.isFinite(spacingValue)) {
    return "cv-preview-text-medium";
  }

  if (spacingValue <= 3.85) {
    return "cv-preview-text-small";
  }

  if (spacingValue >= 4.2) {
    return "cv-preview-text-large";
  }

  return "cv-preview-text-medium";
}

function resolveTwoColumnGridClass(layout: CVTemplateBodyLayout | undefined) {
  if (!layout || layout.mode !== "two-column") {
    return "grid-cols-1";
  }

  if (layout.columnRatio === "left-narrow") {
    return "grid-cols-[0.78fr_1.22fr]";
  }

  if (layout.columnRatio === "left-wide") {
    return "grid-cols-[1.2fr_0.8fr]";
  }

  return "grid-cols-2";
}

function normalizeSummaryLine(line: string) {
  return line.replace(/^[-*\u2022]+\s*/, "").trim();
}

function splitSummaryTextToLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map(normalizeSummaryLine)
    .filter(Boolean);
}

function extractSummaryForHeader(input: {
  section: CVPreviewSection;
  layout: {
    summaryTitle?: string;
    summaryMaxBullets?: number;
  };
}): CVHeaderSummaryContentData | null {
  const { section, layout } = input;
  const summaryData = section.data as {
    text?: unknown;
    title?: unknown;
    items?: unknown;
  };

  const linesFromText = typeof summaryData.text === "string"
    ? splitSummaryTextToLines(summaryData.text)
    : [];

  const linesFromItems = Array.isArray(summaryData.items)
    ? summaryData.items
      .map((item) => normalizeSummaryLine(String((item as { content?: unknown }).content ?? "")))
      .filter(Boolean)
    : [];

  const mergedLines: string[] = [];
  const seen = new Set<string>();

  [...linesFromText, ...linesFromItems].forEach((line) => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    mergedLines.push(line);
  });

  if (mergedLines.length === 0) {
    return null;
  }

  const maxBullets = Number.isFinite(layout.summaryMaxBullets)
    ? Math.max(1, Math.floor(layout.summaryMaxBullets ?? 4))
    : 4;

  const intro = mergedLines[0] || "";
  const bullets = mergedLines.slice(1, 1 + maxBullets);

  return {
    title: String(summaryData.title || "").trim() || layout.summaryTitle || "Tổng quan",
    intro,
    bullets,
  };
}

function resolveBodyColumnForSection(input: {
  section: CVPreviewSection;
  bodyLayout?: CVTemplateBodyLayout;
  leftColumnSectionTypeSet: Set<CVPreviewSection["type"]>;
  rightColumnSectionTypeSet: Set<CVPreviewSection["type"]>;
}) {
  const {
    section,
    bodyLayout,
    leftColumnSectionTypeSet,
    rightColumnSectionTypeSet,
  } = input;

  if (!bodyLayout || bodyLayout.mode !== "two-column") {
    return "left" satisfies BodyColumn;
  }

  if (leftColumnSectionTypeSet.has(section.type)) {
    return "left" satisfies BodyColumn;
  }

  if (rightColumnSectionTypeSet.has(section.type)) {
    return "right" satisfies BodyColumn;
  }

  if (bodyLayout.columnRatio === "left-wide" && rightColumnSectionTypeSet.size > 0) {
    return "left" satisfies BodyColumn;
  }

  return "right" satisfies BodyColumn;
}

export const TemplatePreviewRenderer = memo(function TemplatePreviewRenderer({
  template,
  mode = "thumbnail",
  className,
  paperClassName,
}: TemplatePreviewRendererProps) {
  const templateConfig = useMemo(() => getTemplateConfig(template.id), [template.id]);
  const previewSections = useMemo(() => buildTemplatePreviewSections(template), [template]);
  const sourceSectionById = useMemo(() => {
    const entries = previewSections.map((section) => [section.id, section] as const);
    return new Map<string, CVSection>(entries);
  }, [previewSections]);

  const previewData = useMemo(() => mapBuilderSectionsToPreviewData(previewSections), [previewSections]);
  const orderedSections = useMemo(
    () => orderPreviewSections(previewData.sections, templateConfig.sectionOrder),
    [previewData.sections, templateConfig.sectionOrder],
  );

  const summaryInHeaderState = useMemo(() => {
    if (!templateConfig.headerLayout.summaryInHeader) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    const summarySection = orderedSections.find((section) => section.type === "summary" && section.visible);
    if (!summarySection) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    const summary = extractSummaryForHeader({
      section: summarySection,
      layout: {
        summaryTitle: templateConfig.headerLayout.summaryTitle,
        summaryMaxBullets: templateConfig.headerLayout.summaryMaxBullets,
      },
    });

    if (!summary) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    return {
      summary,
      sourceSectionId: summarySection.id,
    };
  }, [
    orderedSections,
    templateConfig.headerLayout.summaryInHeader,
    templateConfig.headerLayout.summaryMaxBullets,
    templateConfig.headerLayout.summaryTitle,
  ]);

  const renderedSections = useMemo(() => {
    if (!summaryInHeaderState.sourceSectionId) {
      return orderedSections;
    }

    return orderedSections.filter((section) => section.id !== summaryInHeaderState.sourceSectionId);
  }, [orderedSections, summaryInHeaderState.sourceSectionId]);

  const bodyLayout = templateConfig.bodyLayout;
  const isTwoColumnBody = bodyLayout?.mode === "two-column";
  const isSidebarHeaderLayout = templateConfig.headerLayout.variant === "sidebar-profile";
  const isThumbnailMode = mode === "thumbnail";
  const headerSectionGapClassName = templateConfig.visualFamily === "teal" ? HEADER_SECTION_GAP_CLASS_NAME : "mt-5";
  const shouldRenderTopHeader = !isSidebarHeaderLayout;
  const bodyColumnGridClassName = useMemo(() => resolveTwoColumnGridClass(bodyLayout), [bodyLayout]);
  const bodyColumnGapClassName = bodyLayout?.columnGapClassName ?? "gap-4";

  const leftColumnSectionTypeSet = useMemo(
    () => new Set(bodyLayout?.leftColumnSectionTypes ?? []),
    [bodyLayout?.leftColumnSectionTypes],
  );
  const rightColumnSectionTypeSet = useMemo(
    () => new Set(bodyLayout?.rightColumnSectionTypes ?? []),
    [bodyLayout?.rightColumnSectionTypes],
  );

  const previewFontFamilyClassName = useMemo(
    () => resolvePreviewFontFamilyClass(String(template.templateStyles.fonts.body || "Arial")),
    [template.templateStyles.fonts.body],
  );
  const previewBodyTextClassName = useMemo(
    () => resolvePreviewTextSizeClass(Number(template.templateStyles.spacing)),
    [template.templateStyles.spacing],
  );
  const paletteTokens = useMemo(
    () => buildTemplatePaletteTokens({
      primaryColor: template.templateStyles.colors.primary,
      patternColor: template.templateStyles.colors.secondary,
      syncPatternWithPrimary: false,
    }),
    [template.templateStyles.colors.primary, template.templateStyles.colors.secondary],
  );
  const previewThemeScopeClassName = DEFAULT_TEMPLATE_THEME_SCOPE_CLASS_NAME;
  const previewThemeScopeRef = useRef<HTMLDivElement | null>(null);
  const previewPatternClassName = useMemo(() => resolveTemplatePatternClassName("dots"), []);

  useLayoutEffect(() => {
    const scopeElement = previewThemeScopeRef.current;
    if (!(scopeElement instanceof HTMLDivElement)) {
      return;
    }

    scopeElement.style.setProperty("--cv-template-accent-rgb", paletteTokens.primaryRgb);
    scopeElement.style.setProperty("--cv-template-primary-rgb", paletteTokens.primaryRgb);
    scopeElement.style.setProperty("--cv-template-primary-soft-rgb", paletteTokens.primarySoftRgb);
    scopeElement.style.setProperty("--cv-template-primary-muted-rgb", paletteTokens.primaryMutedRgb);
    scopeElement.style.setProperty("--cv-template-primary-border-rgb", paletteTokens.primaryBorderRgb);
    scopeElement.style.setProperty("--cv-template-primary-contrast-rgb", paletteTokens.primaryContrastRgb);
    scopeElement.style.setProperty("--cv-template-pattern-rgb", paletteTokens.patternRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-background-rgb", paletteTokens.sidebarBackgroundRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-text-rgb", paletteTokens.sidebarTextRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-muted-rgb", paletteTokens.sidebarMutedRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-icon-rgb", paletteTokens.sidebarIconRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-divider-rgb", paletteTokens.sidebarDividerRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-overlay-rgb", paletteTokens.sidebarOverlayRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-skill-track-rgb", paletteTokens.sidebarSkillTrackRgb);
    scopeElement.style.setProperty("--cv-template-sidebar-skill-fill-rgb", paletteTokens.sidebarSkillFillRgb);
  }, [paletteTokens]);

  const renderSection = (section: CVPreviewSection) => {
    const sourceSection = sourceSectionById.get(section.sourceSectionId);
    const styleConfig = resolveSectionStyleConfig(
      templateConfig,
      section.type,
      section.title,
      (sourceSection?.data as { icon?: unknown } | undefined)?.icon,
    );

    return (
      <CVSectionRenderer
        key={`${template.id}-${section.id}`}
        section={section}
        styleConfig={styleConfig}
        template={templateConfig}
        mode="preview"
        isActive={false}
        onSelectSection={() => undefined}
        onUpdateSectionData={() => undefined}
        onRequestAddSection={undefined}
        onRemoveSection={undefined}
        onMoveSectionUp={undefined}
        onMoveSectionDown={undefined}
      />
    );
  };

  const pageContent = (
    <CVPaper
      template={templateConfig}
      fontFamilyClassName={previewFontFamilyClassName}
      bodyTextClassName={previewBodyTextClassName}
      paperPatternClassName={previewPatternClassName}
      outerClassName="!h-[1122px] !w-[794px] !max-w-none !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
      paperClassName={cn("!h-[1122px] !w-[794px] !max-w-none !shadow-none", paperClassName)}
    >
      <div className="pointer-events-none relative flex h-full flex-col overflow-hidden">
        {shouldRenderTopHeader ? (
          <CVHeader
            template={templateConfig}
            header={previewData.header}
            contact={previewData.contact}
            summary={summaryInHeaderState.summary ?? undefined}
            selected={false}
            onSelect={() => undefined}
            onEditHeader={() => undefined}
            onEditContact={() => undefined}
          />
        ) : null}

        {isTwoColumnBody ? (
          <div
            className={cn(
              shouldRenderTopHeader ? headerSectionGapClassName : "",
              "grid min-h-0 flex-1 overflow-hidden",
              isSidebarHeaderLayout ? "items-stretch" : "items-start",
              bodyColumnGridClassName,
              bodyColumnGapClassName,
            )}
          >
            <div
              className={cn(
                "min-h-0 overflow-hidden",
                templateConfig.spacingRules.sectionGapClassName,
                isSidebarHeaderLayout
                  ? "flex h-full min-h-full flex-col bg-[rgb(var(--cv-template-sidebar-background-rgb,31_90_59))] px-3 py-3 text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                  : "",
              )}
            >
              {isSidebarHeaderLayout ? (
                <CVHeader
                  template={templateConfig}
                  header={previewData.header}
                  contact={previewData.contact}
                  summary={undefined}
                  selected={false}
                  onSelect={() => undefined}
                  onEditHeader={() => undefined}
                  onEditContact={() => undefined}
                />
              ) : null}

              {renderedSections
                .filter((section) => resolveBodyColumnForSection({
                  section,
                  bodyLayout,
                  leftColumnSectionTypeSet,
                  rightColumnSectionTypeSet,
                }) === "left")
                .map(renderSection)}
            </div>

            <div
              className={cn(
                "min-h-0 overflow-hidden",
                templateConfig.spacingRules.sectionGapClassName,
                isSidebarHeaderLayout ? "flex h-full min-h-full flex-col bg-white px-3 py-3" : "",
              )}
            >
              {renderedSections
                .filter((section) => resolveBodyColumnForSection({
                  section,
                  bodyLayout,
                  leftColumnSectionTypeSet,
                  rightColumnSectionTypeSet,
                }) === "right")
                .map(renderSection)}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              shouldRenderTopHeader ? headerSectionGapClassName : "",
              "min-h-0 flex-1 overflow-hidden",
              templateConfig.spacingRules.sectionGapClassName,
            )}
          >
            {renderedSections.map(renderSection)}
          </div>
        )}
      </div>
    </CVPaper>
  );

  if (isThumbnailMode) {
    return (
      <div
        ref={previewThemeScopeRef}
        className={cn("relative h-full w-full overflow-hidden @container-[size]", previewThemeScopeClassName, className)}
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-280.5 w-198.5 origin-top-left transform-gpu",
            THUMBNAIL_SCALE_CLASS_NAME,
          )}
        >
          {pageContent}
        </div>
      </div>
    );
  }

  return (
    <div ref={previewThemeScopeRef} className={cn("h-full w-full", previewThemeScopeClassName, className)}>
      {pageContent}
    </div>
  );
});
