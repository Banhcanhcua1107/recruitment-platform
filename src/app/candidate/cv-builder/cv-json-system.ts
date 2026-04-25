import { v4 as uuidv4 } from "uuid";
import type { AnySectionData, CVContent, CVSection, SectionType } from "./types";
import { normalizeSectionDataIds } from "./section-normalization";
import { validateListSectionItem, validateSectionDataShape, validateSectionPayload } from "./cv-json-validation";

interface CVRootSectionSchemaDefinition {
  type: SectionType;
  defaultTitle: string;
  defaultSectionData: AnySectionData;
  defaultItemJson?: Record<string, unknown>;
  createRuntimeItem?: () => Record<string, unknown>;
}

export interface CVRootJsonTreeNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  children: CVRootJsonTreeNode[];
}

export interface CVRootJsonSectionNode extends CVRootJsonTreeNode {
  type: SectionType;
  title?: string;
  visible: boolean;
}

export interface CVRootJsonDocument {
  meta: CVContent["meta"];
  theme: CVContent["theme"];
  layout: CVContent["layout"];
  sections: CVRootJsonSectionNode[];
}

const ROOT_SECTION_SCHEMAS: Record<SectionType, CVRootSectionSchemaDefinition> = {
  header: {
    type: "header",
    defaultTitle: "",
    defaultSectionData: {
      fullName: "",
      title: "",
      avatarUrl: "",
    },
  },
  personal_info: {
    type: "personal_info",
    defaultTitle: "",
    defaultSectionData: {
      email: "",
      phone: "",
      address: "",
      dob: "",
      socials: [],
    },
  },
  summary: {
    type: "summary",
    defaultTitle: "Tổng quan",
    defaultSectionData: {
      text: "",
    },
  },
  rich_outline: {
    type: "rich_outline",
    defaultTitle: "Structured Outline",
    defaultSectionData: {
      nodes: [],
    },
  },
  experience_list: {
    type: "experience_list",
    defaultTitle: "Kinh nghiệm làm việc",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      company: "",
      position: "",
      duration: {
        from: "",
        to: "",
      },
      descriptions: [""],
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
    }),
  },
  education_list: {
    type: "education_list",
    defaultTitle: "Học vấn",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      institution: "",
      degree: "",
      duration: {
        from: "",
        to: "",
      },
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      institution: "",
      degree: "",
      startDate: "",
      endDate: "",
    }),
  },
  skill_list: {
    type: "skill_list",
    defaultTitle: "Kỹ năng",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      name: "",
      level: 50,
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      name: "",
      level: 50,
    }),
  },
  project_list: {
    type: "project_list",
    defaultTitle: "Dự án",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      projectName: "",
      role: "",
      duration: {
        from: "",
        to: "",
      },
      descriptions: [""],
      technologies: [""],
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      name: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "",
      technologies: "",
      customer: "",
      teamSize: 1,
    }),
  },
  award_list: {
    type: "award_list",
    defaultTitle: "Giải thưởng",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      title: "",
      issuer: "",
      date: "",
      description: "",
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      title: "",
      date: "",
      issuer: "",
      description: "",
    }),
  },
  certificate_list: {
    type: "certificate_list",
    defaultTitle: "Chứng chỉ",
    defaultSectionData: {
      items: [],
    },
    defaultItemJson: {
      name: "",
      issuer: "",
      date: "",
      url: "",
    },
    createRuntimeItem: () => ({
      id: uuidv4(),
      name: "",
      issuer: "",
      date: "",
      url: "",
    }),
  },
  custom_text: {
    type: "custom_text",
    defaultTitle: "Mục tùy chỉnh",
    defaultSectionData: {
      text: "",
    },
  },
  custom_image: {
    type: "custom_image",
    defaultTitle: "Ảnh tùy chỉnh",
    defaultSectionData: {
      url: "",
      caption: "",
    },
  },
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildTreeNodeFromValue(value: unknown, type: string, fallbackId: string): CVRootJsonTreeNode | null {
  if (Array.isArray(value)) {
    return {
      id: fallbackId,
      type,
      data: {
        count: value.length,
      },
      children: value
        .map((item, index) => buildTreeNodeFromValue(item, `${type}.item`, `${fallbackId}-${index + 1}`))
        .filter((node): node is CVRootJsonTreeNode => Boolean(node)),
    };
  }

  if (!isObjectRecord(value)) {
    return null;
  }

  const data: Record<string, unknown> = {};
  const children: CVRootJsonTreeNode[] = [];

  Object.entries(value).forEach(([key, entry]) => {
    if (key === "id") {
      return;
    }

    if (Array.isArray(entry) || isObjectRecord(entry)) {
      const childNode = buildTreeNodeFromValue(entry, key, `${fallbackId}-${key}`);
      if (childNode) {
        children.push(childNode);
      }
      return;
    }

    data[key] = entry;
  });

  return {
    id: typeof value.id === "string" ? value.id : fallbackId,
    type,
    data,
    children,
  };
}

export function getRootSectionSchema(type: SectionType) {
  return ROOT_SECTION_SCHEMAS[type];
}

export function createDefaultSectionData(type: SectionType): AnySectionData {
  const schema = ROOT_SECTION_SCHEMAS[type];
  if (!schema) {
    return {};
  }

  const sectionData = cloneValue(schema.defaultSectionData) as Record<string, unknown>;

  if (schema.createRuntimeItem && Array.isArray(sectionData.items) && sectionData.items.length === 0) {
    sectionData.items = [schema.createRuntimeItem()];
  }

  return normalizeSectionDataIds(type, sectionData as AnySectionData);
}

export function createSectionFromSchema(type: SectionType): CVSection {
  const schema = ROOT_SECTION_SCHEMAS[type];

  const section: CVSection = {
    id: uuidv4(),
    type,
    title: schema?.defaultTitle || "",
    isVisible: true,
    containerId: "main-column",
    data: createDefaultSectionData(type),
  };

  if (!validateSectionPayload(section) && process.env.NODE_ENV !== "production") {
    console.warn("[CVBuilder:createSectionFromSchema] Section payload does not match expected schema", {
      sectionType: type,
      section,
    });
  }

  return section;
}

export function createDefaultListItem(type: SectionType): Record<string, unknown> | null {
  const schema = ROOT_SECTION_SCHEMAS[type];
  if (!schema?.createRuntimeItem) {
    return null;
  }

  return schema.createRuntimeItem();
}

export function appendDefaultItemToSection(section: CVSection): CVSection | null {
  const nextItem = createDefaultListItem(section.type);
  if (!nextItem) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CVBuilder:appendDefaultItemToSection] Section does not support list items", {
        sectionId: section.id,
        sectionType: section.type,
      });
    }
    return null;
  }

  if (!validateListSectionItem(section.type, nextItem) && process.env.NODE_ENV !== "production") {
    console.warn("[CVBuilder:appendDefaultItemToSection] Default item does not match schema", {
      sectionId: section.id,
      sectionType: section.type,
      nextItem,
    });
  }

  const sectionData = section.data as Record<string, unknown>;
  const existingItems = Array.isArray(sectionData.items) ? sectionData.items : [];

  if (!Array.isArray(sectionData.items) && process.env.NODE_ENV !== "production") {
    console.warn("[CVBuilder:appendDefaultItemToSection] Missing items[] in section data, auto-initializing", {
      sectionId: section.id,
      sectionType: section.type,
    });
  }

  const updatedSection: CVSection = {
    ...section,
    data: normalizeSectionDataIds(section.type, {
      ...sectionData,
      items: [...existingItems, nextItem],
    } as AnySectionData),
  };

  if (!validateSectionDataShape(updatedSection.type, updatedSection.data) && process.env.NODE_ENV !== "production") {
    console.warn("[CVBuilder:appendDefaultItemToSection] Updated section data does not match schema", {
      sectionId: section.id,
      sectionType: section.type,
      data: updatedSection.data,
    });
  }

  return updatedSection;
}

export function exportCVRootJson(cv: CVContent): CVRootJsonDocument {
  const sections: CVRootJsonSectionNode[] = cv.sections.map((section, sectionIndex) => {
    const sectionData = isObjectRecord(section.data) ? section.data : {};
    const rootData: Record<string, unknown> = {};
    const children: CVRootJsonTreeNode[] = [];

    Object.entries(sectionData).forEach(([key, value]) => {
      if (Array.isArray(value) || isObjectRecord(value)) {
        const childNode = buildTreeNodeFromValue(value, key, `${section.id}-${key}`);
        if (childNode) {
          children.push(childNode);
        }
        return;
      }

      rootData[key] = value;
    });

    return {
      id: section.id || `section-${sectionIndex + 1}`,
      type: section.type,
      title: section.title,
      visible: section.isVisible,
      data: rootData,
      children,
    };
  });

  return {
    meta: cv.meta,
    theme: cv.theme,
    layout: cv.layout,
    sections,
  };
}
