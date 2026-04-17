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

const TEAL_TWO_COLUMN_SIDEBAR_SECTION_TYPES: CVPreviewSectionType[] = [
  "skills",
  "languages",
  "awards",
  "certificates",
  "activities",
  "career_objective",
  "custom",
];

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
  customTitleTextClassName?: string;
  customIconBackgroundClassName?: string;
  customIconBorderClassName?: string;
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
      titleUppercase: false,
      borderClassName: options.baseBorderClassName,
      backgroundClassName: options.baseBackgroundClassName,
      titleTextClassName: isCustomSection ? options.customTitleTextClassName ?? "text-slate-900" : options.accentTextClassName,
      titleBackgroundClassName: titleVariant === "ribbon" ? options.accentBackgroundClassName : "bg-transparent",
      titleBorderClassName: isCustomSection ? options.baseBorderClassName : options.accentBorderClassName,
      dividerClassName: isCustomSection ? options.baseBorderClassName : options.dividerClassName,
      iconColorClassName: "text-white",
      iconBackgroundClassName: isCustomSection
        ? options.customIconBackgroundClassName ?? "bg-slate-700"
        : options.iconBackgroundClassName,
      iconBorderClassName: isCustomSection
        ? options.customIconBorderClassName ?? "border-slate-800"
        : options.iconBorderClassName,
      contentTextClassName: "text-slate-800",
      itemBorderClassName: options.baseBorderClassName,
      itemBackgroundClassName: options.baseBackgroundClassName,
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
    paperPatternClassName: "cv-f8-page-pattern",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.52]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-100",
    hiddenSectionBorderClassName: "border-slate-300",
  },
  spacingRules: {
    sectionGapClassName: "space-y-1",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-teal-700",
    accentBackgroundClassName: "bg-teal-50",
    accentBorderClassName: "border-teal-200",
    dividerClassName: "bg-slate-300",
    iconBackgroundClassName: "bg-teal-500",
    iconBorderClassName: "border-teal-600",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: "bg-slate-700",
    customIconBorderClassName: "border-slate-800",
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
    nameTextClassName: "text-teal-700",
    roleTextClassName: "text-slate-700",
    infoLabelTextClassName: "text-slate-900",
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

const TEAL_PRO_TWO_COLUMN_RENDER_CONFIG: CVTemplateConfig = {
  id: "teal-pro-two-column",
  name: "Teal Professional 2 cột",
  description: "Mẫu Teal 2 cột đồng bộ cùng phong cách Teal Timeline, tối ưu CV nhiều nội dung.",
  visualFamily: "teal",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "rounded-none border border-teal-200/90 bg-[#f7fbfa] shadow-[0_22px_45px_-30px_rgba(15,23,42,0.4)]",
    paperPaddingClassName: "px-5 py-4 sm:px-6 sm:py-5",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "cv-f8-page-pattern",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12.5px] leading-[1.52]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-teal-50",
    hiddenSectionBorderClassName: "border-teal-200",
  },
  spacingRules: {
    sectionGapClassName: "space-y-2",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-teal-700",
    accentBackgroundClassName: "bg-teal-50",
    accentBorderClassName: "border-teal-200",
    dividerClassName: "bg-slate-300",
    iconBackgroundClassName: "bg-teal-500",
    iconBorderClassName: "border-teal-600",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: "bg-slate-700",
    customIconBorderClassName: "border-slate-800",
    iconShape: "square",
    titleVariantOverrides: {
      summary: "ribbon",
      experience: "ribbon",
      projects: "ribbon",
      activities: "ribbon",
    },
  }),
  headerLayout: {
    variant: "reference-split",
    showAvatar: true,
    avatarSizeClassName: "h-26 w-26",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: "text-teal-700",
    roleTextClassName: "text-slate-700",
    infoLabelTextClassName: "text-slate-900",
    infoValueTextClassName: "text-slate-800",
  },
  bodyLayout: {
    mode: "two-column",
    columnRatio: "left-narrow",
    leftColumnSectionTypes: TEAL_TWO_COLUMN_SIDEBAR_SECTION_TYPES,
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

export const DEFAULT_CV_TEMPLATE_ID = "teal-timeline";

export const TEAL_TEMPLATE_IDS = new Set<string>(["teal-timeline", "teal-pro-two-column"]);

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
      displayName: "Teal Timeline",
      shortDescription: "Mẫu chuẩn Teal Timeline với bố cục 1 cột hiện đại, rõ ràng và nhất quán.",
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
      displayName: "Teal Professional 2 cột",
      shortDescription: "Mẫu Teal 2 cột, đồng bộ component và nhịp trình bày với Teal Timeline.",
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
