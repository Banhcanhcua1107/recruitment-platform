import type { ComponentType } from "react";
import type {
  AwardItem,
  CertificateItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SkillItem,
} from "../../../types";

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
  variant: "reference-split" | "compact" | "modern-band";
  showAvatar: boolean;
  avatarSizeClassName: string;
  infoColumns: 1 | 2;
  decorativeDots: boolean;
  nameTextClassName: string;
  roleTextClassName: string;
  infoLabelTextClassName: string;
  infoValueTextClassName: string;
}

export interface CVTemplateConfig {
  id: string;
  name: string;
  description: string;
  pageSettings: CVTemplatePageSettings;
  typographySettings: CVTemplateTypographySettings;
  colorPalette: CVTemplateColorPalette;
  spacingRules: CVTemplateSpacingRules;
  sectionStyleRules: Record<CVPreviewSectionType, CVTemplateSectionStyleRule>;
  headerLayout: CVTemplateHeaderLayout;
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

export interface SummarySectionData {
  text: string;
}

export interface CareerObjectiveSectionData {
  text: string;
}

export interface ExperienceSectionData {
  items: ExperienceItem[];
}

export interface EducationSectionData {
  items: EducationItem[];
}

export interface SkillsSectionData {
  items: SkillItem[];
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface LanguagesSectionData {
  items: LanguageItem[];
}

export interface ProjectsSectionData {
  items: ProjectItem[];
}

export interface CertificatesSectionData {
  items: CertificateItem[];
}

export interface AwardsSectionData {
  items: AwardItem[];
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
  items: ActivityItem[];
}

export interface CustomSectionData {
  title?: string;
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
