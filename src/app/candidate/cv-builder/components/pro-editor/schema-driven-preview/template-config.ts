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

const PROFESSIONAL_GREEN_RENDER_CONFIG: CVTemplateConfig = {
  id: "professional-green",
  name: "Xanh chuyên nghiệp",
  description: "Mẫu CV sáng, chỉn chu, phù hợp môi trường doanh nghiệp và hệ thống ATS.",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "bg-[#eef6f3]",
    paperFrameClassName: "border border-slate-300 bg-[#fbfdfb] shadow-[0_30px_70px_-44px_rgba(15,23,42,0.34)] rounded-none",
    paperPaddingClassName: "px-8 py-7",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_36%)]",
  },
  typographySettings: {
    headingFontClassName: "font-semibold tracking-tight",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[14px] leading-7",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-100",
    hiddenSectionBorderClassName: "border-slate-300",
  },
  spacingRules: {
    sectionGapClassName: "space-y-3",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-emerald-700",
    accentBackgroundClassName: "bg-emerald-50",
    accentBorderClassName: "border-emerald-200",
    dividerClassName: "bg-emerald-200",
    iconBackgroundClassName: "bg-emerald-700",
    iconBorderClassName: "border-emerald-800/70",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: "bg-slate-700",
    customIconBorderClassName: "border-slate-800",
    iconShape: "square",
  }),
  headerLayout: {
    variant: "reference-split",
    showAvatar: true,
    avatarSizeClassName: "h-26 w-26",
    infoColumns: 2,
    decorativeDots: true,
    nameTextClassName: "text-emerald-800",
    roleTextClassName: "text-slate-600",
    infoLabelTextClassName: "text-slate-900",
    infoValueTextClassName: "text-slate-800",
  },
  sectionOrder: SECTION_TYPES,
};

const MINIMAL_GRAY_RENDER_CONFIG: CVTemplateConfig = {
  id: "minimal-gray",
  name: "Xám tối giản",
  description: "Mẫu tối giản, nhẹ mắt, tập trung tối đa vào khả năng đọc nội dung.",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "bg-[#f1f5f9]",
    paperFrameClassName: "border border-slate-300 bg-white shadow-[0_30px_70px_-44px_rgba(15,23,42,0.32)] rounded-sm",
    paperPaddingClassName: "px-8 py-7",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,1))]",
  },
  typographySettings: {
    headingFontClassName: "font-semibold tracking-tight",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[14px] leading-7",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-50",
    hiddenSectionBorderClassName: "border-slate-300",
  },
  spacingRules: {
    sectionGapClassName: "space-y-4",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-slate-700",
    accentBackgroundClassName: "bg-slate-100",
    accentBorderClassName: "border-slate-300",
    dividerClassName: "bg-slate-300",
    iconBackgroundClassName: "bg-slate-600",
    iconBorderClassName: "border-slate-700",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-800",
    customIconBackgroundClassName: "bg-slate-600",
    customIconBorderClassName: "border-slate-700",
    iconShape: "circle",
    titleVariantOverrides: {
      summary: "plain",
      education: "underline",
      skills: "plain",
      languages: "plain",
      projects: "underline",
      certificates: "underline",
      awards: "plain",
      activities: "plain",
    },
  }),
  headerLayout: {
    variant: "compact",
    showAvatar: true,
    avatarSizeClassName: "h-24 w-24",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: "text-slate-900",
    roleTextClassName: "text-slate-600",
    infoLabelTextClassName: "text-slate-900",
    infoValueTextClassName: "text-slate-800",
  },
  sectionOrder: SECTION_TYPES,
};

const MODERN_BLUE_RENDER_CONFIG: CVTemplateConfig = {
  id: "modern-blue",
  name: "Xanh dương hiện đại",
  description: "Mẫu hiện đại với điểm nhấn xanh dương cân bằng và nhịp thị giác rõ ràng.",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "bg-[#edf3fb]",
    paperFrameClassName: "border border-sky-200/80 bg-[#f9fcff] shadow-[0_30px_70px_-44px_rgba(15,23,42,0.35)] rounded-none",
    paperPaddingClassName: "px-8 py-7",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_35%)]",
  },
  typographySettings: {
    headingFontClassName: "font-semibold tracking-tight",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[14px] leading-7",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-sky-50",
    hiddenSectionBorderClassName: "border-sky-200",
  },
  spacingRules: {
    sectionGapClassName: "space-y-3.5",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-blue-700",
    accentBackgroundClassName: "bg-blue-50",
    accentBorderClassName: "border-blue-200",
    dividerClassName: "bg-blue-200",
    iconBackgroundClassName: "bg-blue-700",
    iconBorderClassName: "border-blue-800/70",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: "bg-slate-700",
    customIconBorderClassName: "border-slate-800",
    iconShape: "square",
    titleVariantOverrides: {
      career_objective: "ribbon",
      experience: "ribbon",
      summary: "underline",
    },
  }),
  headerLayout: {
    variant: "modern-band",
    showAvatar: true,
    avatarSizeClassName: "h-24 w-24",
    infoColumns: 2,
    decorativeDots: false,
    nameTextClassName: "text-blue-900",
    roleTextClassName: "text-blue-700",
    infoLabelTextClassName: "text-slate-900",
    infoValueTextClassName: "text-slate-800",
  },
  sectionOrder: SECTION_TYPES,
};

const ELEGANT_SIDEBAR_RENDER_CONFIG: CVTemplateConfig = {
  id: "elegant-sidebar",
  name: "Elegant Sidebar",
  description: "Mẫu CV cao cấp với dải sidebar nhẹ, phù hợp hồ sơ quản lý và chuyên gia.",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "bg-[#eef2f7]",
    paperFrameClassName: "border border-slate-300 bg-white shadow-[0_34px_72px_-46px_rgba(15,23,42,0.4)] rounded-none",
    paperPaddingClassName: "px-8 py-7",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "bg-[linear-gradient(90deg,rgba(15,23,42,0.07)_0px,rgba(15,23,42,0.07)_118px,rgba(255,255,255,0)_118px)]",
  },
  typographySettings: {
    headingFontClassName: "font-semibold tracking-tight",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[14px] leading-7",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-100",
    hiddenSectionBorderClassName: "border-slate-300",
  },
  spacingRules: {
    sectionGapClassName: "space-y-4",
  },
  sectionStyleRules: createSectionStyles({
    accentTextClassName: "text-slate-800",
    accentBackgroundClassName: "bg-slate-100",
    accentBorderClassName: "border-slate-300",
    dividerClassName: "bg-slate-300",
    iconBackgroundClassName: "bg-slate-700",
    iconBorderClassName: "border-slate-800/80",
    baseBorderClassName: "border-slate-300",
    baseBackgroundClassName: "bg-white",
    customTitleTextClassName: "text-slate-900",
    customIconBackgroundClassName: "bg-slate-700",
    customIconBorderClassName: "border-slate-800",
    iconShape: "square",
    titleVariantOverrides: {
      summary: "underline",
      career_objective: "underline",
      projects: "underline",
      custom: "underline",
    },
  }),
  headerLayout: {
    variant: "compact",
    showAvatar: false,
    avatarSizeClassName: "h-24 w-24",
    infoColumns: 1,
    decorativeDots: false,
    nameTextClassName: "text-slate-900",
    roleTextClassName: "text-slate-700",
    infoLabelTextClassName: "text-slate-900",
    infoValueTextClassName: "text-slate-800",
  },
  sectionOrder: SECTION_TYPES,
};

const TEAL_TIMELINE_RENDER_CONFIG: CVTemplateConfig = {
  id: "teal-timeline",
  name: "Teal Timeline",
  description: "Mẫu CV trang 1 gọn gàng, thẳng hàng và ưu tiên đọc nhanh với tông teal nhẹ.",
  pageSettings: {
    pageSize: "A4",
    outerFrameClassName: "",
    paperFrameClassName: "border-0 bg-white rounded-none shadow-none",
    paperPaddingClassName: "px-3 py-2 sm:px-4 sm:py-3",
    paperMinHeightClassName: "min-h-[1160px]",
    paperPatternClassName: "",
  },
  typographySettings: {
    headingFontClassName: "font-semibold",
    bodyFontClassName: "font-sans",
    bodyTextClassName: "text-[12px] leading-[1.45]",
  },
  colorPalette: {
    pageTextClassName: "text-slate-900",
    mutedTextClassName: "text-slate-500",
    hiddenSectionBackgroundClassName: "bg-slate-100",
    hiddenSectionBorderClassName: "border-slate-300",
  },
  spacingRules: {
    sectionGapClassName: "space-y-0.5",
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
  sectionOrder: ["summary", "activities", "experience"],
};

export const DEFAULT_CV_TEMPLATE_ID = "professional-green";

export const CV_TEMPLATE_REGISTRY: CVTemplateRegistryItem[] = [
  {
    id: "teal-timeline",
    metadata: {
      displayName: "Teal Timeline",
      shortDescription: "Trang 1 tối giản với Overview + Hoạt động + Work experience, nhịp đọc rõ ràng và gọn.",
      category: "Chuyên nghiệp",
      tags: ["Teal", "Timeline", "Trang 1"],
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
    id: "professional-green",
    metadata: {
      displayName: "Professional Green",
      shortDescription: "Mẫu chuyên nghiệp sáng sủa, tối ưu cho ATS và dễ đọc trên mọi màn hình.",
      category: "Chuyên nghiệp",
      tags: ["Chuyên nghiệp", "ATS", "Cân bằng"],
      themePreset: {
        colors: {
          primary: "#0f766e",
          secondary: "#14b8a6",
          text: "#0f172a",
          background: "#ffffff",
        },
        fonts: {
          heading: "'Manrope', sans-serif",
          body: "'Manrope', sans-serif",
        },
        spacing: 4,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-ats-clean.svg",
      images: ["/images/templates/template-ats-clean.svg"],
    },
    renderConfig: PROFESSIONAL_GREEN_RENDER_CONFIG,
  },
  {
    id: "minimal-gray",
    metadata: {
      displayName: "Minimal Gray",
      shortDescription: "Mẫu tối giản cao cấp, giảm nhiễu thị giác và làm nổi bật nội dung chính.",
      category: "Tối giản",
      tags: ["Tối giản", "Dễ đọc", "Trung tính"],
      themePreset: {
        colors: {
          primary: "#334155",
          secondary: "#64748b",
          text: "#0f172a",
          background: "#ffffff",
        },
        fonts: {
          heading: "'IBM Plex Sans', sans-serif",
          body: "'IBM Plex Sans', sans-serif",
        },
        spacing: 5,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-minimal-grid.svg",
      images: ["/images/templates/template-minimal-grid.svg"],
    },
    renderConfig: MINIMAL_GRAY_RENDER_CONFIG,
  },
  {
    id: "modern-blue",
    metadata: {
      displayName: "Modern Blue",
      shortDescription: "Mẫu hiện đại với điểm nhấn xanh dương, hợp CV công nghệ và sản phẩm.",
      category: "Hiện đại",
      tags: ["Hiện đại", "Sản phẩm", "Công nghệ"],
      themePreset: {
        colors: {
          primary: "#2563eb",
          secondary: "#0ea5e9",
          text: "#0f172a",
          background: "#ffffff",
        },
        fonts: {
          heading: "'Plus Jakarta Sans', sans-serif",
          body: "'Plus Jakarta Sans', sans-serif",
        },
        spacing: 4,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-modern-focus.svg",
      images: ["/images/templates/template-modern-focus.svg"],
    },
    renderConfig: MODERN_BLUE_RENDER_CONFIG,
  },
  {
    id: "elegant-sidebar",
    metadata: {
      displayName: "Elegant Sidebar",
      shortDescription: "Mẫu thanh lịch với nhịp bố cục sidebar, phù hợp hồ sơ quản lý và chuyên gia.",
      category: "Sáng tạo",
      tags: ["Sáng tạo", "Thanh lịch", "Cao cấp"],
      themePreset: {
        colors: {
          primary: "#1e293b",
          secondary: "#64748b",
          text: "#0f172a",
          background: "#ffffff",
        },
        fonts: {
          heading: "'Lora', serif",
          body: "'Source Sans 3', sans-serif",
        },
        spacing: 5,
      },
    },
    preview: {
      thumbnail: "/images/templates/template-professional-exec.svg",
      images: [
        "/images/templates/template-professional-exec.svg",
        "/images/templates/template-creative-spark.svg",
      ],
    },
    renderConfig: ELEGANT_SIDEBAR_RENDER_CONFIG,
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
