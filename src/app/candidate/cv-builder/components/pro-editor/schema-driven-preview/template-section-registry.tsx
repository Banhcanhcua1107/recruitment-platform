"use client";

import type { ComponentType } from "react";
import {
  OverviewSection,
  TealActivitiesSection,
  TealAwardsSection,
  TealCertificatesSection,
  TealCustomSection,
  TealEducationSection,
  TealLanguagesSection,
  TealProjectsSection,
  TealSkillsSection,
  WorkExperienceSection,
} from "./teal-timeline-sections";
import type {
  CVPreviewSectionDataMap,
  CVPreviewSectionType,
  CVResolvedSectionStyleConfig,
  CVSectionComponentProps,
} from "./types";

export type TemplateSectionMode = "edit" | "preview" | "export";

export interface SharedTemplateSectionComponentProps<TData> {
  data: TData;
  mode: TemplateSectionMode;
  onChange?: (updates: Partial<TData>) => void;
  styleConfig: CVResolvedSectionStyleConfig;
  isActive: boolean;
  onAddAbove?: () => void;
  onAddBelow?: () => void;
}

type SharedTemplateSectionComponentMap = Partial<{
  [K in CVPreviewSectionType]: ComponentType<SharedTemplateSectionComponentProps<CVPreviewSectionDataMap[K]>>;
}>;

const NOOP = () => undefined;

function adaptLegacyTemplateSection<TData>(
  Component: ComponentType<CVSectionComponentProps<TData>>,
): ComponentType<SharedTemplateSectionComponentProps<TData>> {
  return function LegacyTemplateSectionAdapter({
    data,
    mode,
    onChange,
    styleConfig,
    isActive,
    onAddAbove,
    onAddBelow,
  }) {
    const canEdit = mode === "edit" && isActive;

    return (
      <Component
        data={data}
        styleConfig={styleConfig}
        isActive={canEdit}
        onEdit={(updates) => {
          onChange?.(updates);
        }}
        onAddAbove={canEdit ? (onAddAbove ?? NOOP) : NOOP}
        onAddBelow={canEdit ? (onAddBelow ?? NOOP) : NOOP}
      />
    );
  };
}

export const TEMPLATE_SECTION_COMPONENTS = {
  summary: adaptLegacyTemplateSection(OverviewSection),
  experience: adaptLegacyTemplateSection(WorkExperienceSection),
  education: adaptLegacyTemplateSection(TealEducationSection),
  activities: adaptLegacyTemplateSection(TealActivitiesSection),
  skills: adaptLegacyTemplateSection(TealSkillsSection),
  languages: adaptLegacyTemplateSection(TealLanguagesSection),
  certificates: adaptLegacyTemplateSection(TealCertificatesSection),
  awards: adaptLegacyTemplateSection(TealAwardsSection),
  projects: adaptLegacyTemplateSection(TealProjectsSection),
  custom: adaptLegacyTemplateSection(TealCustomSection),
} satisfies SharedTemplateSectionComponentMap;

export function getTemplateSectionComponent<TType extends CVPreviewSectionType>(
  sectionType: TType,
): ComponentType<SharedTemplateSectionComponentProps<CVPreviewSectionDataMap[TType]>> | null {
  const component = sectionType in TEMPLATE_SECTION_COMPONENTS
    ? TEMPLATE_SECTION_COMPONENTS[sectionType as keyof typeof TEMPLATE_SECTION_COMPONENTS]
    : null;

  return component as ComponentType<SharedTemplateSectionComponentProps<CVPreviewSectionDataMap[TType]>> | null;
}
