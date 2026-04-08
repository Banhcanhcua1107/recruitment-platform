import type {
  CVSection,
  HeaderData,
  PersonalInfoData,
  RichOutlineSectionData,
  SectionType,
} from "../../../types";
import type {
  ActivitiesSectionData,
  CVPreviewDocumentData,
  CVPreviewSection,
  CVPreviewSectionType,
  CustomSectionData,
  LanguagesSectionData,
} from "./types";

function toSafeText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return "";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function textToLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);
}

function hasMeaningfulString(value: unknown) {
  return stripHtml(toSafeText(value)).length > 0;
}

function hasNonEmptyCustomItem(items: unknown[]) {
  return items.some((item) => {
    if (typeof item === "string") {
      return hasMeaningfulString(item);
    }

    if (!item || typeof item !== "object") {
      return false;
    }

    const record = item as Record<string, unknown>;
    return Object.entries(record).some(([key, value]) => {
      if (key === "id") {
        return false;
      }

      return typeof value === "string" && hasMeaningfulString(value);
    });
  });
}

function shouldHideEmptyCustomSection(section: CVSection) {
  if (section.type !== "custom_text") {
    return false;
  }

  if (inferCustomSectionType(section.title) !== "custom") {
    return false;
  }

  const customData = section.data as {
    text?: unknown;
    items?: unknown;
  };

  if (hasMeaningfulString(customData.text)) {
    return false;
  }

  if (!Array.isArray(customData.items)) {
    return true;
  }

  return !hasNonEmptyCustomItem(customData.items);
}

function inferCustomSectionType(title?: string): CVPreviewSectionType {
  const normalized = (title || "").trim().toLowerCase();

  if (normalized.includes("muc tieu") || normalized.includes("mục tiêu") || normalized.includes("objective")) {
    return "career_objective";
  }

  if (normalized.includes("ngon ngu") || normalized.includes("ngôn ngữ") || normalized.includes("language")) {
    return "languages";
  }

  if (normalized.includes("hoat dong") || normalized.includes("hoạt động") || normalized.includes("activity")) {
    return "activities";
  }

  return "custom";
}

function parseLanguageLine(line: string, index: number) {
  const [rawName, ...rest] = line.split(/[-:]/);
  const name = rawName.trim();
  const level = rest.join("-").trim() || "";

  return {
    id: `lang-${index + 1}`,
    name: name || line,
    level,
  };
}

function customTextToLanguages(rawText: string): LanguagesSectionData {
  const lines = textToLines(rawText);
  return {
    items: lines.map((line, index) => parseLanguageLine(line, index)),
  };
}

function customTextToActivities(rawText: string): ActivitiesSectionData {
  const lines = textToLines(rawText);
  return {
    items: lines.map((line, index) => ({
      id: `activity-${index + 1}`,
      name: line,
    })),
  };
}

function customItemsToActivities(items: unknown[]): ActivitiesSectionData {
  return {
    items: items.map((item, index) => {
      const activity = item as Record<string, unknown>;
      return {
        id: toSafeText(activity.id) || `activity-${index + 1}`,
        name: toSafeText(activity.name),
        role: toSafeText(activity.role),
        startDate: toSafeText(activity.startDate),
        endDate: toSafeText(activity.endDate),
        description: toSafeText(activity.description),
      };
    }),
  };
}

function richOutlineToCustomText(data: RichOutlineSectionData): string {
  const lines: string[] = [];
  const stack = [...data.nodes];

  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) {
      continue;
    }

    if (node.text?.trim()) {
      lines.push(node.text.trim());
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      stack.unshift(...node.children);
    }
  }

  return lines.join("\n");
}

function defaultTitleForType(type: CVPreviewSectionType, title?: string) {
  if (title?.trim()) {
    return title;
  }

  switch (type) {
    case "summary":
      return "Tổng quan";
    case "career_objective":
      return "Mục tiêu nghề nghiệp";
    case "experience":
      return "Kinh nghiệm làm việc";
    case "education":
      return "Học vấn";
    case "skills":
      return "Kỹ năng";
    case "languages":
      return "Ngôn ngữ";
    case "projects":
      return "Dự án";
    case "certificates":
      return "Chứng chỉ";
    case "awards":
      return "Giải thưởng";
    case "activities":
      return "Hoạt động";
    default:
      return "Mục tùy chỉnh";
  }
}

function mapRegularSection(
  section: CVSection,
  order: number,
): CVPreviewSection {
  const base = {
    id: section.id,
    sourceSectionId: section.id,
    visible: section.isVisible,
    order,
  };

  switch (section.type) {
    case "summary": {
      const summaryData = section.data as {
        text?: unknown;
        title?: unknown;
        icon?: unknown;
        items?: unknown;
      };

      return {
        ...base,
        type: "summary",
        title: defaultTitleForType("summary", section.title),
        data: {
          text: toSafeText(summaryData.text),
          title: toSafeText(summaryData.title),
          icon: toSafeText(summaryData.icon),
          items: Array.isArray(summaryData.items)
            ? summaryData.items.map((item, index) => ({
                id: toSafeText((item as { id?: unknown }).id) || `ov-${index + 1}`,
                content: toSafeText((item as { content?: unknown }).content),
              }))
            : undefined,
        },
      };
    }

    case "experience_list": {
      const experienceData = section.data as {
        title?: unknown;
        icon?: unknown;
        items?: unknown;
      };

      return {
        ...base,
        type: "experience",
        title: defaultTitleForType("experience", section.title),
        data: {
          title: toSafeText(experienceData.title),
          icon: toSafeText(experienceData.icon),
          items: Array.isArray(experienceData.items)
            ? (experienceData.items as CVPreviewSection<"experience">["data"]["items"])
            : [],
        },
      };
    }

    case "education_list": {
      return {
        ...base,
        type: "education",
        title: defaultTitleForType("education", section.title),
        data: {
          items: Array.isArray((section.data as { items?: unknown }).items)
            ? ((section.data as { items: unknown[] }).items as CVPreviewSection<"education">["data"]["items"])
            : [],
        },
      };
    }

    case "skill_list": {
      return {
        ...base,
        type: "skills",
        title: defaultTitleForType("skills", section.title),
        data: {
          items: Array.isArray((section.data as { items?: unknown }).items)
            ? ((section.data as { items: unknown[] }).items as CVPreviewSection<"skills">["data"]["items"])
            : [],
        },
      };
    }

    case "project_list": {
      return {
        ...base,
        type: "projects",
        title: defaultTitleForType("projects", section.title),
        data: {
          items: Array.isArray((section.data as { items?: unknown }).items)
            ? ((section.data as { items: unknown[] }).items as CVPreviewSection<"projects">["data"]["items"])
            : [],
        },
      };
    }

    case "certificate_list": {
      return {
        ...base,
        type: "certificates",
        title: defaultTitleForType("certificates", section.title),
        data: {
          items: Array.isArray((section.data as { items?: unknown }).items)
            ? ((section.data as { items: unknown[] }).items as CVPreviewSection<"certificates">["data"]["items"])
            : [],
        },
      };
    }

    case "award_list": {
      return {
        ...base,
        type: "awards",
        title: defaultTitleForType("awards", section.title),
        data: {
          items: Array.isArray((section.data as { items?: unknown }).items)
            ? ((section.data as { items: unknown[] }).items as CVPreviewSection<"awards">["data"]["items"])
            : [],
        },
      };
    }

    case "custom_text": {
      const customData = section.data as {
        text?: unknown;
        items?: unknown;
      };
      const rawText = toSafeText(customData.text);
      const inferredType = inferCustomSectionType(section.title);

      if (inferredType === "career_objective") {
        return {
          ...base,
          type: "career_objective",
          title: defaultTitleForType("career_objective", section.title),
          data: {
            text: rawText,
          },
        };
      }

      if (inferredType === "languages") {
        return {
          ...base,
          type: "languages",
          title: defaultTitleForType("languages", section.title),
          data: customTextToLanguages(rawText),
        };
      }

      if (inferredType === "activities") {
        return {
          ...base,
          type: "activities",
          title: defaultTitleForType("activities", section.title),
          data: Array.isArray(customData.items)
            ? customItemsToActivities(customData.items)
            : customTextToActivities(rawText),
        };
      }

      return {
        ...base,
        type: "custom",
        title: defaultTitleForType("custom", section.title),
        data: {
          title: section.title,
          text: rawText,
        } as CustomSectionData,
      };
    }

    case "rich_outline": {
      const outlineText = richOutlineToCustomText(section.data as RichOutlineSectionData);
      return {
        ...base,
        type: "custom",
        title: defaultTitleForType("custom", section.title),
        data: {
          title: section.title,
          text: outlineText,
        } as CustomSectionData,
      };
    }

    default: {
      return {
        ...base,
        type: "custom",
        title: defaultTitleForType("custom", section.title),
        data: {
          title: section.title,
          text: stripHtml(JSON.stringify(section.data)),
        } as CustomSectionData,
      };
    }
  }
}

function shouldRenderMappedSection(section: CVPreviewSection) {
  if (section.type !== "custom") {
    return true;
  }

  const data = section.data as CustomSectionData;
  if (hasMeaningfulString(data.text)) {
    return true;
  }

  if (Array.isArray(data.items)) {
    return hasNonEmptyCustomItem(data.items);
  }

  return false;
}

export function mapBuilderSectionsToPreviewData(sections: CVSection[]): CVPreviewDocumentData {
  const headerSection = sections.find((section) => section.type === "header");
  const contactSection = sections.find((section) => section.type === "personal_info");

  const headerData = (headerSection?.data ?? {}) as HeaderData;
  const contactData = (contactSection?.data ?? {}) as PersonalInfoData;

  const documentData: CVPreviewDocumentData = {
    header: {
      fullName: toSafeText(headerData.fullName) || "Nguyen Huu Phuc",
      headline: toSafeText(headerData.title) || "Lập trình viên Fullstack",
      avatarUrl: toSafeText(headerData.avatarUrl),
    },
    contact: {
      phone: toSafeText(contactData.phone),
      email: toSafeText(contactData.email),
      address: toSafeText(contactData.address),
      dob: toSafeText(contactData.dob),
      website: Array.isArray(contactData.socials) && contactData.socials.length > 0
        ? toSafeText(contactData.socials[0]?.url)
        : "",
    },
    sections: [],
  };

  let sectionOrder = 0;
  sections.forEach((section) => {
    if (section.type === "header" || section.type === "personal_info") {
      return;
    }

    if (shouldHideEmptyCustomSection(section)) {
      return;
    }

    const mappedSection = mapRegularSection(section, sectionOrder);
    if (!shouldRenderMappedSection(mappedSection)) {
      return;
    }

    documentData.sections.push(mappedSection);
    sectionOrder += 1;
  });

  return documentData;
}

function toTemplateRankMap(order: CVPreviewSectionType[]) {
  const rankMap = new Map<CVPreviewSectionType, number>();
  order.forEach((sectionType, index) => {
    rankMap.set(sectionType, index);
  });
  return rankMap;
}

export function orderPreviewSections(
  sections: CVPreviewSection[],
  templateOrder: CVPreviewSectionType[],
) {
  const templateRank = toTemplateRankMap(templateOrder);

  return [...sections].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    const rankA = templateRank.get(a.type) ?? Number.MAX_SAFE_INTEGER;
    const rankB = templateRank.get(b.type) ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return a.id.localeCompare(b.id);
  });
}

export function mapPreviewTypeToBuilderSectionType(type: CVPreviewSectionType): SectionType {
  switch (type) {
    case "summary":
      return "summary";
    case "career_objective":
      return "custom_text";
    case "experience":
      return "experience_list";
    case "education":
      return "education_list";
    case "skills":
      return "skill_list";
    case "languages":
      return "custom_text";
    case "projects":
      return "project_list";
    case "certificates":
      return "certificate_list";
    case "awards":
      return "award_list";
    case "activities":
      return "custom_text";
    case "custom":
      return "custom_text";
    default:
      return "custom_text";
  }
}
