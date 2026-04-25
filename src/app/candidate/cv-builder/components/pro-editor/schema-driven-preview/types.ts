import type { ComponentType } from "react";

export type CVPreviewSectionType =
  | "summary"
  | "career_objective"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "certificates"
  | "awards"
  | "activities"
  | "custom";

export type CVSectionTitleVariant = "ribbon" | "underline" | "plain";
export type CVSectionIconShape = "square" | "circle";
export type CVTemplateCategory =
  | "Chuyên nghiệp"
  | "Tối giản"
  | "Hiện đại"
  | "ATS"
  | "Sáng tạo";

export type CVTemplateIconToken =
  | "summary"
  | "target"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "certificates"
  | "awards"
  | "activities"
  | "custom";

export interface CVTemplatePageSettings {
  pageSize: "A4" | "Letter";
  outerFrameClassName: string;
  paperFrameClassName: string;
  paperPaddingClassName: string;
  paperMinHeightClassName: string;
  paperPatternClassName?: string;
}

export interface CVTemplateTypographySettings {
  headingFontClassName: string;
  bodyFontClassName: string;
  bodyTextClassName: string;
}

export interface CVTemplateColorPalette {
  pageTextClassName: string;
  mutedTextClassName: string;
  hiddenSectionBackgroundClassName: string;
  hiddenSectionBorderClassName: string;
}

export interface CVTemplateSpacingRules {
  sectionGapClassName: string;
}

export interface CVTemplateSectionStyleRule {
  title: string;
  icon: CVTemplateIconToken;
  titleVariant: CVSectionTitleVariant;
  iconShape: CVSectionIconShape;
  layoutVariant?: "default" | "sidebar-reference";
  titleUppercase: boolean;
  borderClassName: string;
  backgroundClassName: string;
  titleTextClassName: string;
  titleBackgroundClassName: string;
  titleBorderClassName: string;
  dividerClassName: string;
  iconColorClassName: string;
  iconBackgroundClassName: string;
  iconBorderClassName: string;
  contentTextClassName: string;
  itemBorderClassName: string;
  itemBackgroundClassName: string;
}

export interface CVTemplateHeaderLayout {
  variant: "reference-split" | "sidebar-profile";
  showAvatar: boolean;
  avatarSizeClassName: string;
  infoColumns: 1 | 2;
  decorativeDots: boolean;
  nameTextClassName: string;
  roleTextClassName: string;
  infoLabelTextClassName: string;
  infoValueTextClassName: string;
  summaryInHeader?: boolean;
  summaryTitle?: string;
  summaryMaxBullets?: number;
}

export interface CVTemplateBodyLayout {
  mode: "single-column" | "two-column";
  columnRatio?: "equal" | "left-narrow" | "left-wide";
  leftColumnSectionTypes?: CVPreviewSectionType[];
  rightColumnSectionTypes?: CVPreviewSectionType[];
  columnGapClassName?: string;
}

export interface CVTemplateConfig {
  id: string;
  name: string;
  description: string;
  visualFamily?: "teal";
  pageSettings: CVTemplatePageSettings;
  typographySettings: CVTemplateTypographySettings;
  colorPalette: CVTemplateColorPalette;
  spacingRules: CVTemplateSpacingRules;
  sectionStyleRules: Record<CVPreviewSectionType, CVTemplateSectionStyleRule>;
  headerLayout: CVTemplateHeaderLayout;
  bodyLayout?: CVTemplateBodyLayout;
  sectionOrder: CVPreviewSectionType[];
}

export interface CVTemplateThemePreset {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: number;
}

export interface CVTemplateMetadata {
  displayName: string;
  shortDescription: string;
  category: CVTemplateCategory;
  tags: string[];
  themePreset: CVTemplateThemePreset;
}

export interface CVTemplatePreviewAssets {
  thumbnail: string;
  images: string[];
}

export interface CVTemplateRegistryItem {
  id: string;
  metadata: CVTemplateMetadata;
  preview: CVTemplatePreviewAssets;
  renderConfig: CVTemplateConfig;
}

export interface CVHeaderContentData {
  fullName: string;
  headline: string;
  avatarUrl?: string;
}

export interface CVContactContentData {
  phone: string;
  email: string;
  address: string;
  dob?: string;
  website?: string;
}

export interface CVHeaderSummaryContentData {
  title?: string;
  intro?: string;
  bullets: string[];
}

export interface SummarySectionData {
  text: string;
  title?: string;
  icon?: string;
  items?: Array<{
    id: string;
    content: string;
  }>;
}

export interface CareerObjectiveSectionData {
  text: string;
}

export interface ExperienceSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface EducationSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface SkillsSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface LanguagesSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface ProjectsSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface CertificatesSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface AwardsSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface ActivityItem {
  id: string;
  name: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ActivitiesSectionData {
  title?: string;
  icon?: string;
  items: Array<Record<string, unknown>>;
}

export interface CustomSectionData {
  title?: string;
  icon?: string;
  text: string;
  items?: string[];
}

export interface CVPreviewSectionDataMap {
  summary: SummarySectionData;
  career_objective: CareerObjectiveSectionData;
  experience: ExperienceSectionData;
  education: EducationSectionData;
  skills: SkillsSectionData;
  languages: LanguagesSectionData;
  projects: ProjectsSectionData;
  certificates: CertificatesSectionData;
  awards: AwardsSectionData;
  activities: ActivitiesSectionData;
  custom: CustomSectionData;
}

export interface CVPreviewSection<TType extends CVPreviewSectionType = CVPreviewSectionType> {
  id: string;
  sourceSectionId: string;
  type: TType;
  title?: string;
  visible: boolean;
  order: number;
  data: CVPreviewSectionDataMap[TType];
}

export interface CVPreviewDocumentData {
  header: CVHeaderContentData;
  contact: CVContactContentData;
  sections: CVPreviewSection[];
}

export interface CVResolvedSectionStyleConfig extends CVTemplateSectionStyleRule {
  title: string;
}

export interface CVSectionComponentProps<TData> {
  data: TData;
  styleConfig: CVResolvedSectionStyleConfig;
  isActive: boolean;
  onEdit: (updates: Partial<TData>) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export type CVSectionComponentMap = {
  [K in CVPreviewSectionType]: ComponentType<CVSectionComponentProps<CVPreviewSectionDataMap[K]>>;
};
