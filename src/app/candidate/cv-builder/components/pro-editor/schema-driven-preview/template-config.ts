import type {
  CVPreviewSectionType,
  CVSectionIconShape,
  CVSectionTitleVariant,
  CVTemplateConfig,
  CVTemplateIconToken,
  CVTemplateRegistryItem,
  CVTemplateSectionStyleRule,
} from "./types";

const SECTION_TYPES: CVPreviewSectionType[] = [
  "summary",
  "career_objective",
  "experience",
  "education",
  "skills",
  "languages",
  "projects",
  "certificates",
  "awards",
  "activities",
  "custom",
];

const TEAL_TWO_COLUMN_LEFT_SECTION_TYPES: CVPreviewSectionType[] = [
  "skills",
  "languages",
  "awards",
  "certificates",
  "activities",
  "career_objective",
];

const TEAL_TWO_COLUMN_RIGHT_SECTION_TYPES: CVPreviewSectionType[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "custom",
];

const SIDEBAR_REFERENCE_LEFT_SECTION_TYPES: CVPreviewSectionType[] = [
  "summary",
  "career_objective",
  "skills",
  "languages",
  "custom",
];

const SIDEBAR_REFERENCE_RIGHT_SECTION_TYPES: CVPreviewSectionType[] = [
  "experience",
  "education",
  "awards",
  "certificates",
  "activities",
  "projects",
];

const MODERN_PROFESSIONAL_LEFT_SECTION_TYPES: CVPreviewSectionType[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "custom",
];

const MODERN_PROFESSIONAL_RIGHT_SECTION_TYPES: CVPreviewSectionType[] = [
  "career_objective",
  "skills",
  "languages",
  "certificates",
  "awards",
  "activities",
];

const CREATIVE_SIDEBAR_LEFT_SECTION_TYPES: CVPreviewSectionType[] = [
  "summary",
  "career_objective",
  "skills",
  "languages",
  "activities",
  "custom",
];

const CREATIVE_SIDEBAR_RIGHT_SECTION_TYPES: CVPreviewSectionType[] = [
  "experience",
  "projects",
  "education",
  "awards",
  "certificates",
];

const TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-rgb,15_118_110))]";
const TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-muted-rgb,13_148_136))]";
const TEAL_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250))]";
const TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))]";
const TEAL_DYNAMIC_DIVIDER_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-border-rgb,167_243_208))]";
const TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-rgb,15_118_110))]";
const TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-rgb,15_118_110))]";
const TEAL_DYNAMIC_ICON_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-contrast-rgb,255_255_255))]";
const TEAL_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.56)]";
const TEAL_DYNAMIC_HIDDEN_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))]";

const SIDEBAR_DYNAMIC_PRIMARY_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]";
const SIDEBAR_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-muted-rgb,58_112_80))]";
const SIDEBAR_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.08)]";
const SIDEBAR_DYNAMIC_PRIMARY_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.28)]";
const SIDEBAR_DYNAMIC_PRIMARY_DIVIDER_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.26)]";
const SIDEBAR_DYNAMIC_PRIMARY_ICON_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-rgb,31_90_59))]";
const SIDEBAR_DYNAMIC_PRIMARY_ICON_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-rgb,31_90_59))]";
const SIDEBAR_DYNAMIC_PRIMARY_ICON_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-primary-contrast-rgb,255_255_255))]";
const SIDEBAR_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.08)]";
const SIDEBAR_DYNAMIC_HIDDEN_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.26)]";
const SIDEBAR_DYNAMIC_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]";
const SIDEBAR_DYNAMIC_MUTED_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]";
const SIDEBAR_DYNAMIC_DIVIDER_CLASS_NAME = "bg-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177))]";
const SIDEBAR_DYNAMIC_ICON_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-sidebar-icon-rgb,255_255_255))]";
const SIDEBAR_DYNAMIC_ICON_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-sidebar-icon-rgb,255_255_255))]";
const SIDEBAR_DYNAMIC_ICON_TEXT_CLASS_NAME = "text-[rgb(var(--cv-template-sidebar-background-rgb,31_90_59))]";
const SIDEBAR_DYNAMIC_ITEM_BACKGROUND_CLASS_NAME = "bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.22)]";
const SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME = "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.6)]";

const SECTION_TITLES: Record<CVPreviewSectionType, string> = {
  summary: "Tổng quan",
  career_objective: "Mục tiêu nghề nghiệp",
  experience: "Kinh nghiệm làm việc",
  education: "Học vấn",
  skills: "Kỹ năng",
  languages: "Ngôn ngữ",
  projects: "Dự án",
  certificates: "Chứng chỉ",
  awards: "Giải thưởng",
  activities: "Hoạt động",
  custom: "Mục tùy chỉnh",
};

const SECTION_ICONS: Record<CVPreviewSectionType, CVTemplateIconToken> = {
  summary: "summary",
  career_objective: "target",
  experience: "experience",
  education: "education",
  skills: "skills",
  languages: "languages",
  projects: "projects",
  certificates: "certificates",
  awards: "awards",
  activities: "activities",
  custom: "custom",
};

const DEFAULT_SECTION_VARIANTS: Record<CVPreviewSectionType, CVSectionTitleVariant> = {
  summary: "ribbon",
  career_objective: "underline",
  experience: "underline",
  education: "ribbon",
  skills: "ribbon",
  languages: "ribbon",
  projects: "ribbon",
  certificates: "ribbon",
  awards: "ribbon",
  activities: "ribbon",
  custom: "plain",
};

type SectionStyleFactoryOptions = {
  accentTextClassName: string;
  accentBackgroundClassName: string;
  accentBorderClassName: string;
  dividerClassName: string;
  iconBackgroundClassName: string;
  iconBorderClassName: string;
  baseBorderClassName: string;
  baseBackgroundClassName: string;
  iconColorClassName?: string;
  contentTextClassName?: string;
  itemBorderClassName?: string;
  itemBackgroundClassName?: string;
  customTitleTextClassName?: string;
  customIconBackgroundClassName?: string;
  customIconBorderClassName?: string;
  layoutVariant?: CVTemplateSectionStyleRule["layoutVariant"];
  iconShape?: CVSectionIconShape;
  titleVariantOverrides?: Partial<Record<CVPreviewSectionType, CVSectionTitleVariant>>;
};

function createSectionStyles(options: SectionStyleFactoryOptions): Record<CVPreviewSectionType, CVTemplateSectionStyleRule> {
  const styles = {} as Record<CVPreviewSectionType, CVTemplateSectionStyleRule>;

  for (const sectionType of SECTION_TYPES) {
    const titleVariant = options.titleVariantOverrides?.[sectionType] ?? DEFAULT_SECTION_VARIANTS[sectionType];
    const isCustomSection = sectionType === "custom";

    styles[sectionType] = {
      title: SECTION_TITLES[sectionType],
      icon: SECTION_ICONS[sectionType],
      titleVariant,
      iconShape: options.iconShape ?? "square",
      layoutVariant: options.layoutVariant ?? "default",
      titleUppercase: false,
      borderClassName: options.baseBorderClassName,
      backgroundClassName: options.baseBackgroundClassName,
      titleTextClassName: isCustomSection ? options.customTitleTextClassName ?? "text-slate-900" : options.accentTextClassName,
      titleBackgroundClassName: titleVariant === "ribbon" ? options.accentBackgroundClassName : "bg-transparent",
      titleBorderClassName: isCustomSection ? options.baseBorderClassName : options.accentBorderClassName,
      dividerClassName: isCustomSection ? options.baseBorderClassName : options.dividerClassName,
      iconColorClassName: options.iconColorClassName ?? "text-white",
      iconBackgroundClassName: isCustomSection
        ? options.customIconBackgroundClassName ?? "bg-slate-700"
        : options.iconBackgroundClassName,
      iconBorderClassName: isCustomSection
        ? options.customIconBorderClassName ?? "border-slate-800"
        : options.iconBorderClassName,
      contentTextClassName: options.contentTextClassName ?? "text-slate-800",
      itemBorderClassName: options.itemBorderClassName ?? options.baseBorderClassName,
      itemBackgroundClassName: options.itemBackgroundClassName ?? options.baseBackgroundClassName,
    };
  }

  return styles;
}

const TEAL_TIMELINE_RENDER_CONFIG: CVTemplateConfig = {
  id: "teal-timeline",
  name: "Teal Timeline",
  description: "Mẫu CV Teal Timeline chuẩn F8, cấu trúc rõ ràng và tối ưu khả năng đọc.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-slate-300 bg-[#f7f8f7] shadow-[0_22px_45px_-30px_rgba(15,23,42,0.42)]",
    paperPaddingClassName: "px-5 py-4 sm:px-6 sm:py-5",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-dots",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.52]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    hiddenSectionBackgroundClassName: TEAL_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME,
    hiddenSectionBorderClassName: TEAL_DYNAMIC_HIDDEN_BORDER_CLASS_NAME,
  },
  spacingRules: {
    sectionGapClassName: "space-y-1",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    accentBackgroundClassName: TEAL_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME,
    accentBorderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
    dividerClassName: TEAL_DYNAMIC_DIVIDER_CLASS_NAME,
    iconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    iconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconColorClassName: TEAL_DYNAMIC_ICON_TEXT_CLASS_NAME,
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    contentTextClassName: "text-slate-800",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    customIconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconShape: "square",
    titleVariantOverrides: {
      summary: "ribbon",
      experience: "ribbon",
      activities: "ribbon",
    },
  }),
  headerLayout: {
    variant: "reference-split",
    showAvatar: true,
    avatarSizeClassName: "h-26 w-26",
    infoColumns: 2,
    decorativeDots: true,
    nameTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    roleTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoLabelTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoValueTextClassName: "text-slate-800",
  },
  bodyLayout: {
    mode: "single-column",
  },
  sectionOrder: [
    "summary",
    "activities",
    "experience",
    "skills",
    "awards",
    "projects",
    "education",
    "languages",
    "certificates",
    "career_objective",
    "custom",
  ],
};

const TEAL_PRO_TWO_COLUMN_SECTION_STYLES: Record<CVPreviewSectionType, CVTemplateSectionStyleRule> = (() => {
  const styles = createSectionStyles({
    accentTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    accentBackgroundClassName: TEAL_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME,
    accentBorderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
    dividerClassName: TEAL_DYNAMIC_DIVIDER_CLASS_NAME,
    iconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    iconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconColorClassName: TEAL_DYNAMIC_ICON_TEXT_CLASS_NAME,
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    customIconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconShape: "square",
    titleVariantOverrides: {
      summary: "ribbon",
      experience: "ribbon",
      projects: "ribbon",
      activities: "ribbon",
    },
  });

  for (const sectionType of TEAL_TWO_COLUMN_LEFT_SECTION_TYPES) {
    styles[sectionType] = {
      ...styles[sectionType],
      borderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
      backgroundClassName: "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.5)]",
      itemBorderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
      itemBackgroundClassName: "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.72)]",
    };
  }

  return styles;
})();

const TEAL_PRO_TWO_COLUMN_RENDER_CONFIG: CVTemplateConfig = {
  id: "teal-pro-two-column",
  name: "Teal Professional 2 cột",
  description: "Mẫu Teal 2 cột đồng bộ cùng phong cách Teal Timeline, tối ưu CV nhiều nội dung.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))] bg-[#f7fbfa] shadow-[0_22px_45px_-30px_rgba(15,23,42,0.4)]",
    paperPaddingClassName: "px-5 py-4 sm:px-6 sm:py-5",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-dots",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.52]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    hiddenSectionBackgroundClassName: TEAL_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME,
    hiddenSectionBorderClassName: TEAL_DYNAMIC_HIDDEN_BORDER_CLASS_NAME,
  },
  spacingRules: {
    sectionGapClassName: "space-y-2",
  },
  sectionStyleRules: TEAL_PRO_TWO_COLUMN_SECTION_STYLES,
  headerLayout: {
    variant: "reference-split",
    showAvatar: true,
    avatarSizeClassName: "h-26 w-26",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    roleTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoLabelTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoValueTextClassName: "text-slate-800",
  },
  bodyLayout: {
    mode: "two-column",
    columnRatio: "left-narrow",
    leftColumnSectionTypes: TEAL_TWO_COLUMN_LEFT_SECTION_TYPES,
    rightColumnSectionTypes: TEAL_TWO_COLUMN_RIGHT_SECTION_TYPES,
    columnGapClassName: "gap-4",
  },
  sectionOrder: [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "languages",
    "awards",
    "certificates",
    "activities",
    "career_objective",
    "custom",
  ],
};

const SIDEBAR_REFERENCE_SECTION_STYLES: Record<CVPreviewSectionType, CVTemplateSectionStyleRule> = (() => {
  const styles = createSectionStyles({
    accentTextClassName: SIDEBAR_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    accentBackgroundClassName: SIDEBAR_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME,
    accentBorderClassName: SIDEBAR_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
    dividerClassName: SIDEBAR_DYNAMIC_PRIMARY_DIVIDER_CLASS_NAME,
    iconBackgroundClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_BACKGROUND_CLASS_NAME,
    iconBorderClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_BORDER_CLASS_NAME,
    iconColorClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_TEXT_CLASS_NAME,
    baseBorderClassName: "border-slate-200",
    baseBackgroundClassName: "bg-white",
    contentTextClassName: "text-slate-800",
    customTitleTextClassName: SIDEBAR_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    customIconBackgroundClassName: SIDEBAR_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    customIconBorderClassName: SIDEBAR_DYNAMIC_ICON_BORDER_CLASS_NAME,
    layoutVariant: "sidebar-reference",
    iconShape: "circle",
    titleVariantOverrides: {
      summary: "underline",
      career_objective: "underline",
      skills: "underline",
      custom: "underline",
      experience: "underline",
      education: "underline",
      projects: "underline",
      activities: "underline",
      awards: "underline",
      certificates: "underline",
      languages: "underline",
    },
  });

  for (const sectionType of SIDEBAR_REFERENCE_LEFT_SECTION_TYPES) {
    styles[sectionType] = {
      ...styles[sectionType],
      borderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      backgroundClassName: "bg-transparent",
      titleTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
      titleBackgroundClassName: "bg-transparent",
      titleBorderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      dividerClassName: SIDEBAR_DYNAMIC_DIVIDER_CLASS_NAME,
      iconColorClassName: SIDEBAR_DYNAMIC_ICON_TEXT_CLASS_NAME,
      iconBackgroundClassName: SIDEBAR_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
      iconBorderClassName: SIDEBAR_DYNAMIC_ICON_BORDER_CLASS_NAME,
      contentTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
      itemBorderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      itemBackgroundClassName: SIDEBAR_DYNAMIC_ITEM_BACKGROUND_CLASS_NAME,
    };
  }

  return styles;
})();

const SIDEBAR_REFERENCE_RENDER_CONFIG: CVTemplateConfig = {
  id: "emerald-sidebar-reference",
  name: "Emerald Sidebar Reference",
  description: "Mẫu 2 cột với sidebar xanh đậm, avatar lớn và nhịp đọc rõ ràng cho CV chuyên nghiệp.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.36)] bg-[#f5f7f6] shadow-[0_24px_48px_-30px_rgba(15,23,42,0.42)]",
    paperPaddingClassName: "p-0",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-dots",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.55]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: SIDEBAR_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    hiddenSectionBackgroundClassName: SIDEBAR_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME,
    hiddenSectionBorderClassName: SIDEBAR_DYNAMIC_HIDDEN_BORDER_CLASS_NAME,
  },
  spacingRules: {
    sectionGapClassName: "space-y-2.5",
  },
  sectionStyleRules: SIDEBAR_REFERENCE_SECTION_STYLES,
  headerLayout: {
    variant: "sidebar-profile",
    showAvatar: true,
    avatarSizeClassName: "h-34 w-34",
    infoColumns: 1,
    decorativeDots: false,
    nameTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
    roleTextClassName: SIDEBAR_DYNAMIC_MUTED_TEXT_CLASS_NAME,
    infoLabelTextClassName: SIDEBAR_DYNAMIC_MUTED_TEXT_CLASS_NAME,
    infoValueTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
  },
  bodyLayout: {
    mode: "two-column",
    columnRatio: "left-narrow",
    leftColumnSectionTypes: SIDEBAR_REFERENCE_LEFT_SECTION_TYPES,
    rightColumnSectionTypes: SIDEBAR_REFERENCE_RIGHT_SECTION_TYPES,
    columnGapClassName: "gap-0",
  },
  sectionOrder: [
    "summary",
    "career_objective",
    "skills",
    "languages",
    "custom",
    "experience",
    "education",
    "awards",
    "certificates",
    "activities",
    "projects",
  ],
};

const MODERN_PROFESSIONAL_SECTION_STYLES: Record<CVPreviewSectionType, CVTemplateSectionStyleRule> = (() => {
  const styles = createSectionStyles({
    accentTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    accentBackgroundClassName: "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.9)]",
    accentBorderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
    dividerClassName: TEAL_DYNAMIC_DIVIDER_CLASS_NAME,
    iconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    iconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconColorClassName: TEAL_DYNAMIC_ICON_TEXT_CLASS_NAME,
    baseBorderClassName: "border-slate-200",
    baseBackgroundClassName: "bg-white",
    contentTextClassName: "text-slate-800",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: TEAL_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    customIconBorderClassName: TEAL_DYNAMIC_ICON_BORDER_CLASS_NAME,
    iconShape: "square",
    titleVariantOverrides: {
      summary: "underline",
      experience: "ribbon",
      projects: "ribbon",
      education: "underline",
      custom: "underline",
    },
  });

  for (const sectionType of MODERN_PROFESSIONAL_RIGHT_SECTION_TYPES) {
    styles[sectionType] = {
      ...styles[sectionType],
      borderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
      backgroundClassName: "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.56)]",
      itemBorderClassName: TEAL_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
      itemBackgroundClassName: "bg-[rgb(var(--cv-template-primary-soft-rgb,236_253_250)/0.78)]",
    };
  }

  return styles;
})();

const MODERN_PROFESSIONAL_RENDER_CONFIG: CVTemplateConfig = {
  id: "modern-professional",
  name: "Modern Professional",
  description: "Mẫu chuyên nghiệp hiện đại với bố cục hai cột cân bằng và nhấn mạnh phần kinh nghiệm.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))] bg-[#f8fbfd] shadow-[0_22px_45px_-30px_rgba(15,23,42,0.38)]",
    paperPaddingClassName: "px-5 py-4 sm:px-6 sm:py-5",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-diagonal",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.52]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    hiddenSectionBackgroundClassName: TEAL_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME,
    hiddenSectionBorderClassName: TEAL_DYNAMIC_HIDDEN_BORDER_CLASS_NAME,
  },
  spacingRules: {
    sectionGapClassName: "space-y-2",
  },
  sectionStyleRules: MODERN_PROFESSIONAL_SECTION_STYLES,
  headerLayout: {
    variant: "reference-split",
    showAvatar: true,
    avatarSizeClassName: "h-24 w-24",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: TEAL_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    roleTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoLabelTextClassName: TEAL_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    infoValueTextClassName: "text-slate-800",
    summaryInHeader: true,
    summaryTitle: "Tổng quan chuyên môn",
    summaryMaxBullets: 3,
  },
  bodyLayout: {
    mode: "two-column",
    columnRatio: "left-wide",
    leftColumnSectionTypes: MODERN_PROFESSIONAL_LEFT_SECTION_TYPES,
    rightColumnSectionTypes: MODERN_PROFESSIONAL_RIGHT_SECTION_TYPES,
    columnGapClassName: "gap-4",
  },
  sectionOrder: [
    "summary",
    "experience",
    "projects",
    "education",
    "career_objective",
    "skills",
    "languages",
    "certificates",
    "awards",
    "activities",
    "custom",
  ],
};

const CREATIVE_SIDEBAR_SECTION_STYLES: Record<CVPreviewSectionType, CVTemplateSectionStyleRule> = (() => {
  const styles = createSectionStyles({
    accentTextClassName: SIDEBAR_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    accentBackgroundClassName: SIDEBAR_DYNAMIC_PRIMARY_SOFT_BACKGROUND_CLASS_NAME,
    accentBorderClassName: SIDEBAR_DYNAMIC_PRIMARY_BORDER_CLASS_NAME,
    dividerClassName: SIDEBAR_DYNAMIC_PRIMARY_DIVIDER_CLASS_NAME,
    iconBackgroundClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_BACKGROUND_CLASS_NAME,
    iconBorderClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_BORDER_CLASS_NAME,
    iconColorClassName: SIDEBAR_DYNAMIC_PRIMARY_ICON_TEXT_CLASS_NAME,
    baseBorderClassName: "border-slate-200",
    baseBackgroundClassName: "bg-white",
    contentTextClassName: "text-slate-800",
    customTitleTextClassName: SIDEBAR_DYNAMIC_PRIMARY_TEXT_CLASS_NAME,
    customIconBackgroundClassName: SIDEBAR_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
    customIconBorderClassName: SIDEBAR_DYNAMIC_ICON_BORDER_CLASS_NAME,
    layoutVariant: "sidebar-reference",
    iconShape: "circle",
    titleVariantOverrides: {
      summary: "underline",
      career_objective: "underline",
      skills: "underline",
      languages: "underline",
      activities: "underline",
      custom: "underline",
      experience: "underline",
      projects: "underline",
      education: "underline",
      awards: "underline",
      certificates: "underline",
    },
  });

  for (const sectionType of CREATIVE_SIDEBAR_LEFT_SECTION_TYPES) {
    styles[sectionType] = {
      ...styles[sectionType],
      borderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      backgroundClassName: "bg-transparent",
      titleTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
      titleBackgroundClassName: "bg-transparent",
      titleBorderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      dividerClassName: SIDEBAR_DYNAMIC_DIVIDER_CLASS_NAME,
      iconColorClassName: SIDEBAR_DYNAMIC_ICON_TEXT_CLASS_NAME,
      iconBackgroundClassName: SIDEBAR_DYNAMIC_ICON_BACKGROUND_CLASS_NAME,
      iconBorderClassName: SIDEBAR_DYNAMIC_ICON_BORDER_CLASS_NAME,
      contentTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
      itemBorderClassName: SIDEBAR_DYNAMIC_ITEM_BORDER_CLASS_NAME,
      itemBackgroundClassName: SIDEBAR_DYNAMIC_ITEM_BACKGROUND_CLASS_NAME,
    };
  }

  return styles;
})();

const CREATIVE_SIDEBAR_RENDER_CONFIG: CVTemplateConfig = {
  id: "creative-sidebar",
  name: "Creative Sidebar",
  description: "Mẫu sidebar sáng tạo, nhấn mạnh kỹ năng và điểm nổi bật nhưng vẫn giữ độ dễ đọc.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.38)] bg-[#f8f7f4] shadow-[0_24px_48px_-30px_rgba(15,23,42,0.42)]",
    paperPaddingClassName: "p-0",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-waves",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.55]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: SIDEBAR_DYNAMIC_PRIMARY_MUTED_TEXT_CLASS_NAME,
    hiddenSectionBackgroundClassName: SIDEBAR_DYNAMIC_HIDDEN_BACKGROUND_CLASS_NAME,
    hiddenSectionBorderClassName: SIDEBAR_DYNAMIC_HIDDEN_BORDER_CLASS_NAME,
  },
  spacingRules: {
    sectionGapClassName: "space-y-2.5",
  },
  sectionStyleRules: CREATIVE_SIDEBAR_SECTION_STYLES,
  headerLayout: {
    variant: "sidebar-profile",
    showAvatar: true,
    avatarSizeClassName: "h-32 w-32",
    infoColumns: 1,
    decorativeDots: false,
    nameTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
    roleTextClassName: SIDEBAR_DYNAMIC_MUTED_TEXT_CLASS_NAME,
    infoLabelTextClassName: SIDEBAR_DYNAMIC_MUTED_TEXT_CLASS_NAME,
    infoValueTextClassName: SIDEBAR_DYNAMIC_TEXT_CLASS_NAME,
  },
  bodyLayout: {
    mode: "two-column",
    columnRatio: "left-narrow",
    leftColumnSectionTypes: CREATIVE_SIDEBAR_LEFT_SECTION_TYPES,
    rightColumnSectionTypes: CREATIVE_SIDEBAR_RIGHT_SECTION_TYPES,
    columnGapClassName: "gap-0",
  },
  sectionOrder: [
    "summary",
    "career_objective",
    "skills",
    "languages",
    "activities",
    "custom",
    "experience",
    "projects",
    "education",
    "awards",
    "certificates",
  ],
};

const MINIMAL_ELEGANT_SECTION_STYLES: Record<CVPreviewSectionType, CVTemplateSectionStyleRule> = createSectionStyles({
  accentTextClassName: "text-slate-800",
  accentBackgroundClassName: "bg-transparent",
  accentBorderClassName: "border-slate-300",
  dividerClassName: "bg-slate-200",
  iconBackgroundClassName: "bg-slate-700",
  iconBorderClassName: "border-slate-700",
  iconColorClassName: "text-white",
  baseBorderClassName: "border-slate-200",
  baseBackgroundClassName: "bg-transparent",
  contentTextClassName: "text-slate-700",
  customTitleTextClassName: "text-slate-800",
  customIconBackgroundClassName: "bg-slate-700",
  customIconBorderClassName: "border-slate-700",
  iconShape: "square",
  titleVariantOverrides: {
    summary: "plain",
    experience: "underline",
    education: "underline",
    projects: "underline",
    skills: "plain",
    languages: "plain",
    certificates: "plain",
    awards: "plain",
    activities: "plain",
    career_objective: "underline",
    custom: "plain",
  },
});

const MINIMAL_ELEGANT_RENDER_CONFIG: CVTemplateConfig = {
  id: "minimal-elegant",
  name: "Minimal Elegant",
  description: "Mẫu tối giản thanh lịch, nhấn mạnh nội dung và độ thoáng để đọc CV nhanh.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-slate-200 bg-white shadow-[0_20px_42px_-32px_rgba(15,23,42,0.35)]",
    paperPaddingClassName: "px-5 py-4 sm:px-6 sm:py-5",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern-grid",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.56]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-50",
    hiddenSectionBorderClassName: "border-slate-200",
  },
  spacingRules: {
    sectionGapClassName: "space-y-2",
  },
  sectionStyleRules: MINIMAL_ELEGANT_SECTION_STYLES,
  headerLayout: {
    variant: "reference-split",
    showAvatar: false,
    avatarSizeClassName: "h-0 w-0",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: "text-slate-900",
    roleTextClassName: "text-slate-600",
    infoLabelTextClassName: "text-slate-500",
    infoValueTextClassName: "text-slate-800",
  },
  bodyLayout: {
    mode: "single-column",
  },
  sectionOrder: [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "languages",
    "certificates",
    "awards",
    "activities",
    "career_objective",
    "custom",
  ],
};

export const DEFAULT_CV_TEMPLATE_ID = "teal-timeline";

export const TEAL_TEMPLATE_IDS = new Set<string>([
  "teal-timeline",
  "teal-pro-two-column",
  "emerald-sidebar-reference",
  "modern-professional",
  "creative-sidebar",
  "minimal-elegant",
]);

export function isTealTemplateId(templateId?: string) {
  if (!templateId) {
    return false;
  }

  return TEAL_TEMPLATE_IDS.has(templateId);
}

export const CV_TEMPLATE_REGISTRY: CVTemplateRegistryItem[] = [
  {
    id: "teal-timeline",
    metadata: {
      displayName: "Mẫu 1",
      shortDescription: "Mẫu 1 với bố cục 1 cột hiện đại, rõ ràng và nhất quán.",
      category: "Chuyên nghiệp",
      tags: ["Teal", "Timeline", "1 cột"],
      themePreset: {
        colors: {
          primary: "#0f766e",
          secondary: "#14b8a6",
          text: "#0f172a",
          background: "#f8faf9",
        },
        fonts: {
          heading: "'Manrope', sans-serif",
          body: "'Manrope', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-professional-classic.svg",
      images: ["/images/templates/template-professional-classic.svg"],
    },
    renderConfig: TEAL_TIMELINE_RENDER_CONFIG,
  },
  {
    id: "teal-pro-two-column",
    metadata: {
      displayName: "Mẫu 2",
      shortDescription: "Mẫu 2 bố cục 2 cột, trình bày rõ ràng và cân bằng.",
      category: "Chuyên nghiệp",
      tags: ["Teal", "2 cột", "Professional"],
      themePreset: {
        colors: {
          primary: "#0f766e",
          secondary: "#14b8a6",
          text: "#0f172a",
          background: "#f8faf9",
        },
        fonts: {
          heading: "'Manrope', sans-serif",
          body: "'Manrope', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-ats-clean.svg",
      images: ["/images/templates/template-ats-clean.svg"],
    },
    renderConfig: TEAL_PRO_TWO_COLUMN_RENDER_CONFIG,
  },
  {
    id: "emerald-sidebar-reference",
    metadata: {
      displayName: "Mẫu 3",
      shortDescription: "Mẫu 3 với sidebar nổi bật, ưu tiên đọc nhanh nội dung quan trọng.",
      category: "Hiện đại",
      tags: ["Emerald", "Sidebar", "2 cột", "Modern"],
      themePreset: {
        colors: {
          primary: "#1f5a3b",
          secondary: "#2f855a",
          text: "#0f172a",
          background: "#f5f7f6",
        },
        fonts: {
          heading: "'Plus Jakarta Sans', sans-serif",
          body: "'Plus Jakarta Sans', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-emerald-sidebar.svg",
      images: ["/images/templates/template-emerald-sidebar.svg"],
    },
    renderConfig: SIDEBAR_REFERENCE_RENDER_CONFIG,
  },
  {
    id: "modern-professional",
    metadata: {
      displayName: "Mẫu 4",
      shortDescription: "Modern Professional: hai cột hiện đại, tập trung kinh nghiệm và dự án.",
      category: "Hiện đại",
      tags: ["Modern", "Professional", "2 cột"],
      themePreset: {
        colors: {
          primary: "#0f4c81",
          secondary: "#4f87b2",
          text: "#0f172a",
          background: "#f5f9ff",
        },
        fonts: {
          heading: "'IBM Plex Sans', sans-serif",
          body: "'IBM Plex Sans', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-modern-focus.svg",
      images: ["/images/templates/template-modern-focus.svg"],
    },
    renderConfig: MODERN_PROFESSIONAL_RENDER_CONFIG,
  },
  {
    id: "creative-sidebar",
    metadata: {
      displayName: "Mẫu 5",
      shortDescription: "Creative Sidebar: bố cục sidebar sáng tạo, nổi bật điểm mạnh cá nhân.",
      category: "Sáng tạo",
      tags: ["Creative", "Sidebar", "2 cột"],
      themePreset: {
        colors: {
          primary: "#b45309",
          secondary: "#d97706",
          text: "#0f172a",
          background: "#fffaf2",
        },
        fonts: {
          heading: "'Plus Jakarta Sans', sans-serif",
          body: "'Plus Jakarta Sans', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-creative-spark.svg",
      images: ["/images/templates/template-creative-spark.svg"],
    },
    renderConfig: CREATIVE_SIDEBAR_RENDER_CONFIG,
  },
  {
    id: "minimal-elegant",
    metadata: {
      displayName: "Mẫu 6",
      shortDescription: "Minimal Elegant: tối giản thanh lịch, nhịp đọc thoáng và rõ ràng.",
      category: "Tối giản",
      tags: ["Minimal", "Elegant", "1 cột"],
      themePreset: {
        colors: {
          primary: "#334155",
          secondary: "#94a3b8",
          text: "#0f172a",
          background: "#ffffff",
        },
        fonts: {
          heading: "'Lora', serif",
          body: "'Source Sans 3', sans-serif",
        },
        spacing: 3,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-minimal-grid.svg",
      images: ["/images/templates/template-minimal-grid.svg"],
    },
    renderConfig: MINIMAL_ELEGANT_RENDER_CONFIG,
  },
];

const TEMPLATE_BY_ID = new Map(CV_TEMPLATE_REGISTRY.map((item) => [item.id, item]));

export function getTemplateRegistryItem(templateId?: string): CVTemplateRegistryItem {
  if (!templateId) {
    return TEMPLATE_BY_ID.get(DEFAULT_CV_TEMPLATE_ID)!;
  }

  return TEMPLATE_BY_ID.get(templateId) ?? TEMPLATE_BY_ID.get(DEFAULT_CV_TEMPLATE_ID)!;
}

export function getTemplateConfig(templateId?: string): CVTemplateConfig {
  return getTemplateRegistryItem(templateId).renderConfig;
}

export function listTemplateRegistry(): CVTemplateRegistryItem[] {
  return CV_TEMPLATE_REGISTRY;
}
