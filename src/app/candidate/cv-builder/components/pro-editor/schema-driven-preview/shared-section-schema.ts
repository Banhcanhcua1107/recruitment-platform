import { buildProjectsSectionPayload, normalizeProjectsModel, type ProjectSection as ProjectModelSection } from "./project-sections.model";
import type { CVPreviewSection, CVPreviewSectionType } from "./types";

export type SharedSectionNodeType = "info" | "list" | "group";

interface SharedSectionNodeBase {
  id: string;
  sectionType: SharedSectionNodeType;
  label: string;
  key?: string;
}

export interface SharedInfoSectionNode extends SharedSectionNodeBase {
  sectionType: "info";
  value: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface SharedListSectionNode extends SharedSectionNodeBase {
  sectionType: "list";
  items: string[];
  placeholder?: string;
}

export interface SharedGroupSectionNode extends SharedSectionNodeBase {
  sectionType: "group";
  sections: SharedSectionNode[];
  repeatable?: boolean;
}

export type SharedSectionNode =
  | SharedInfoSectionNode
  | SharedListSectionNode
  | SharedGroupSectionNode;

export interface SharedSectionPayload {
  sectionType: CVPreviewSectionType;
  sections: SharedSectionNode[];
}

interface SharedSchemaAdapter {
  toPayload: (section: CVPreviewSection) => SharedSectionPayload;
  fromPayload: (section: CVPreviewSection, payload: SharedSectionPayload) => Record<string, unknown>;
}

function toSafeText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeLine(value: string) {
  return value.trim().replace(/^[-*\u2022]\s*/, "").trim();
}

function textToLines(value: string) {
  const source = stripHtml(value);

  if (!source) {
    return [];
  }

  return source
    .split(/\r?\n/)
    .map((line) => sanitizeLine(line))
    .filter(Boolean);
}

function linesToDashText(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

function ensureNodeId(idSeed: string, index: number) {
  return `${idSeed}-${index + 1}`;
}

function ensureAtLeastOneRecord(items: Array<Record<string, unknown>>) {
  if (items.length > 0) {
    return items;
  }

  return [{}];
}

function readInfoValue(sections: SharedSectionNode[], key: string) {
  const match = sections.find(
    (section): section is SharedInfoSectionNode => section.sectionType === "info" && section.key === key,
  );

  return match?.value ?? "";
}

function readListValue(sections: SharedSectionNode[], key: string) {
  const match = sections.find(
    (section): section is SharedListSectionNode => section.sectionType === "list" && section.key === key,
  );

  if (!match) {
    return [];
  }

  return match.items.map((item) => item.trim()).filter(Boolean);
}

function readGroupValue(sections: SharedSectionNode[], key: string) {
  return sections.find(
    (section): section is SharedGroupSectionNode => section.sectionType === "group" && section.key === key,
  );
}

function readGroups(sections: SharedSectionNode[]) {
  return sections.filter((section): section is SharedGroupSectionNode => section.sectionType === "group");
}

function toProjectSharedNode(section: ProjectModelSection, idPrefix: string, index: number): SharedSectionNode {
  if (section.type === "info") {
    return {
      id: `${idPrefix}-info-${index + 1}`,
      sectionType: "info",
      label: section.label,
      key: section.id,
      value: section.value,
      multiline: true,
    };
  }

  if (section.type === "list") {
    return {
      id: `${idPrefix}-list-${index + 1}`,
      sectionType: "list",
      label: section.label,
      key: section.id,
      items: section.items,
    };
  }

  return {
    id: `${idPrefix}-group-${index + 1}`,
    sectionType: "group",
    label: section.label,
    key: section.id,
    sections: section.sections.map((subSection, subIndex) =>
      toProjectSharedNode(
        subSection as unknown as ProjectModelSection,
        `${idPrefix}-group-${index + 1}`,
        subIndex,
      )),
  };
}

function fromProjectSharedNode(node: SharedSectionNode): ProjectModelSection {
  if (node.sectionType === "info") {
    return {
      id: node.key || node.id,
      type: "info",
      label: node.label,
      value: node.value,
    };
  }

  if (node.sectionType === "list") {
    return {
      id: node.key || node.id,
      type: "list",
      label: node.label,
      items: node.items,
    };
  }

  return {
    id: node.key || node.id,
    type: "group",
    label: node.label,
    sections: node.sections.map((subSection) => fromProjectSharedNode(subSection) as never),
  };
}

function summaryAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        text?: unknown;
        items?: unknown;
      };

      const infoNode: SharedInfoSectionNode = {
        id: `${section.id}-summary-text`,
        sectionType: "info",
        key: "text",
        label: "Nội dung",
        value: toSafeText(data.text),
        multiline: true,
        placeholder: "Tóm tắt giá trị nổi bật của bạn",
      };

      const sections: SharedSectionNode[] = [infoNode];

      if (Array.isArray(data.items) && data.items.length > 0) {
        sections.push({
          id: `${section.id}-summary-items`,
          sectionType: "list",
          key: "items",
          label: "Highlights",
          items: data.items
            .map((item) => toSafeText((item as { content?: unknown }).content))
            .map((line) => sanitizeLine(line))
            .filter(Boolean),
        });
      }

      return {
        sectionType: section.type,
        sections,
      };
    },
    fromPayload: (_section, payload) => {
      const text = readInfoValue(payload.sections, "text");
      const highlights = readListValue(payload.sections, "items");

      return {
        text,
        items: highlights.length > 0
          ? highlights.map((content, index) => ({
              id: `summary-item-${index + 1}`,
              content,
            }))
          : undefined,
      };
    },
  };
}

function careerObjectiveAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as { text?: unknown };

      return {
        sectionType: section.type,
        sections: [
          {
            id: `${section.id}-objective-text`,
            sectionType: "info",
            key: "text",
            label: "Nội dung",
            value: toSafeText(data.text),
            multiline: true,
            placeholder: "Mục tiêu nghề nghiệp",
          },
        ],
      };
    },
    fromPayload: (_section, payload) => ({
      text: readInfoValue(payload.sections, "text"),
    }),
  };
}

function experienceAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
      const normalizedItems = ensureAtLeastOneRecord(items);

      return {
        sectionType: section.type,
        sections: normalizedItems.map((item, index) => ({
          id: toSafeText(item.id) || ensureNodeId(`${section.id}-experience`, index),
          sectionType: "group",
          key: "experienceItem",
          repeatable: true,
          label: toSafeText(item.company) || `Kinh nghiệm ${index + 1}`,
          sections: [
            {
              id: ensureNodeId(`${section.id}-experience-${index + 1}-company`, 0),
              sectionType: "info",
              key: "company",
              label: "Công ty",
              value: toSafeText(item.company),
              multiline: false,
            },
            {
              id: ensureNodeId(`${section.id}-experience-${index + 1}-position`, 0),
              sectionType: "info",
              key: "position",
              label: "Vị trí",
              value: toSafeText(item.position),
              multiline: false,
            },
            {
              id: ensureNodeId(`${section.id}-experience-${index + 1}-start`, 0),
              sectionType: "info",
              key: "startDate",
              label: "Bắt đầu",
              value: toSafeText(item.startDate),
              multiline: false,
            },
            {
              id: ensureNodeId(`${section.id}-experience-${index + 1}-end`, 0),
              sectionType: "info",
              key: "endDate",
              label: "Kết thúc",
              value: toSafeText(item.endDate),
              multiline: false,
            },
            {
              id: ensureNodeId(`${section.id}-experience-${index + 1}-description`, 0),
              sectionType: "list",
              key: "description",
              label: "Mô tả",
              items: textToLines(toSafeText(item.description)),
              placeholder: "Thành tích",
            },
          ],
        })),
      };
    },
    fromPayload: (section, payload) => {
      const previous = section.data as { items?: unknown };
      const previousItems = Array.isArray(previous.items) ? previous.items as Array<Record<string, unknown>> : [];
      const groups = readGroups(payload.sections);

      return {
        items: groups.map((group, index) => {
          const previousItem = previousItems[index] ?? {};
          const company = readInfoValue(group.sections, "company");

          return {
            id: group.id || toSafeText(previousItem.id) || ensureNodeId(`${section.id}-experience-item`, index),
            company,
            position: readInfoValue(group.sections, "position"),
            startDate: readInfoValue(group.sections, "startDate"),
            endDate: readInfoValue(group.sections, "endDate"),
            description: linesToDashText(readListValue(group.sections, "description")),
          };
        }),
      };
    },
  };
}

function educationAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
      const normalizedItems = ensureAtLeastOneRecord(items);

      return {
        sectionType: section.type,
        sections: normalizedItems.map((item, index) => ({
          id: toSafeText(item.id) || ensureNodeId(`${section.id}-education`, index),
          sectionType: "group",
          key: "educationItem",
          repeatable: true,
          label: toSafeText(item.institution) || `Học vấn ${index + 1}`,
          sections: [
            {
              id: ensureNodeId(`${section.id}-education-${index + 1}-institution`, 0),
              sectionType: "info",
              key: "institution",
              label: "Trường",
              value: toSafeText(item.institution),
            },
            {
              id: ensureNodeId(`${section.id}-education-${index + 1}-degree`, 0),
              sectionType: "info",
              key: "degree",
              label: "Chuyên ngành",
              value: toSafeText(item.degree),
            },
            {
              id: ensureNodeId(`${section.id}-education-${index + 1}-start`, 0),
              sectionType: "info",
              key: "startDate",
              label: "Bắt đầu",
              value: toSafeText(item.startDate),
            },
            {
              id: ensureNodeId(`${section.id}-education-${index + 1}-end`, 0),
              sectionType: "info",
              key: "endDate",
              label: "Kết thúc",
              value: toSafeText(item.endDate),
            },
          ],
        })),
      };
    },
    fromPayload: (section, payload) => {
      const previous = section.data as { items?: unknown };
      const previousItems = Array.isArray(previous.items) ? previous.items as Array<Record<string, unknown>> : [];

      return {
        items: readGroups(payload.sections).map((group, index) => {
          const previousItem = previousItems[index] ?? {};

          return {
            id: group.id || toSafeText(previousItem.id) || ensureNodeId(`${section.id}-education-item`, index),
            institution: readInfoValue(group.sections, "institution"),
            degree: readInfoValue(group.sections, "degree"),
            startDate: readInfoValue(group.sections, "startDate"),
            endDate: readInfoValue(group.sections, "endDate"),
          };
        }),
      };
    },
  };
}

function skillsAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];

      return {
        sectionType: section.type,
        sections: [
          {
            id: `${section.id}-skills-items`,
            sectionType: "list",
            key: "items",
            label: "Kỹ năng",
            items: items.map((item) => toSafeText(item.name)).filter(Boolean),
            placeholder: "Tên kỹ năng",
          },
        ],
      };
    },
    fromPayload: (section, payload) => {
      const previous = section.data as { items?: unknown };
      const previousItems = Array.isArray(previous.items) ? previous.items as Array<Record<string, unknown>> : [];
      const items = readListValue(payload.sections, "items");

      return {
        items: items.map((name, index) => ({
          id: toSafeText(previousItems[index]?.id) || ensureNodeId(`${section.id}-skill`, index),
          name,
          level: typeof previousItems[index]?.level === "number" ? previousItems[index].level : undefined,
          group: toSafeText(previousItems[index]?.group) || undefined,
        })),
      };
    },
  };
}

function languagesAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];

      return {
        sectionType: section.type,
        sections: [
          {
            id: `${section.id}-languages-items`,
            sectionType: "list",
            key: "items",
            label: "Ngôn ngữ",
            items: items.map((item) => {
              const name = toSafeText(item.name);
              const level = toSafeText(item.level);
              return level ? `${name} - ${level}` : name;
            }).filter(Boolean),
            placeholder: "Tên ngôn ngữ - Trình độ",
          },
        ],
      };
    },
    fromPayload: (section, payload) => {
      const previous = section.data as { items?: unknown };
      const previousItems = Array.isArray(previous.items) ? previous.items as Array<Record<string, unknown>> : [];
      const lines = readListValue(payload.sections, "items");

      return {
        items: lines.map((line, index) => {
          const [rawName, ...rest] = line.split(/[-:]/);
          const name = rawName.trim();
          const level = rest.join("-").trim();

          return {
            id: toSafeText(previousItems[index]?.id) || ensureNodeId(`${section.id}-language`, index),
            name,
            level,
          };
        }),
      };
    },
  };
}

function projectsAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const projects = normalizeProjectsModel(section.data as never);

      return {
        sectionType: section.type,
        sections: projects.map((project, index) => ({
          id: project.id || ensureNodeId(`${section.id}-project`, index),
          sectionType: "group",
          key: "projectItem",
          repeatable: true,
          label: project.projectName || `Project ${index + 1}`,
          sections: [
            {
              id: `${project.id || ensureNodeId(`${section.id}-project`, index)}-name`,
              sectionType: "info",
              key: "projectName",
              label: "Project Name",
              value: project.projectName,
              multiline: false,
              placeholder: "Tên dự án",
            },
            {
              id: `${project.id || ensureNodeId(`${section.id}-project`, index)}-duration`,
              sectionType: "group",
              key: "duration",
              label: "Duration",
              sections: [
                {
                  id: `${project.id || ensureNodeId(`${section.id}-project`, index)}-duration-from`,
                  sectionType: "info",
                  key: "from",
                  label: "From",
                  value: project.duration.from,
                  multiline: false,
                },
                {
                  id: `${project.id || ensureNodeId(`${section.id}-project`, index)}-duration-to`,
                  sectionType: "info",
                  key: "to",
                  label: "To",
                  value: project.duration.to,
                  multiline: false,
                },
              ],
            },
            ...project.sections.map((projectSection, projectSectionIndex) =>
              toProjectSharedNode(
                projectSection as unknown as ProjectModelSection,
                `${project.id || ensureNodeId(`${section.id}-project`, index)}-section`,
                projectSectionIndex,
              )),
          ],
        })),
      };
    },
    fromPayload: (section, payload) => {
      const projectGroups = readGroups(payload.sections).filter((group) => group.key === "projectItem");

      const normalizedProjects = projectGroups.map((group, index) => {
        const durationGroup = readGroupValue(group.sections, "duration");

        return {
          id: group.id || ensureNodeId(`${section.id}-project`, index),
          projectName: readInfoValue(group.sections, "projectName") || group.label,
          duration: {
            from: durationGroup ? readInfoValue(durationGroup.sections, "from") : "",
            to: durationGroup ? readInfoValue(durationGroup.sections, "to") : "",
          },
          layoutVariant: "table" as const,
          sections: group.sections
            .filter((child) => child.key !== "projectName" && child.key !== "duration")
            .map((child) => fromProjectSharedNode(child)),
        };
      });

      return buildProjectsSectionPayload(section.title || "", normalizedProjects);
    },
  };
}

function certificatesAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
      const normalizedItems = ensureAtLeastOneRecord(items);

      return {
        sectionType: section.type,
        sections: normalizedItems.map((item, index) => ({
          id: toSafeText(item.id) || ensureNodeId(`${section.id}-certificate`, index),
          sectionType: "group",
          key: "certificateItem",
          repeatable: true,
          label: toSafeText(item.name) || `Chứng chỉ ${index + 1}`,
          sections: [
            {
              id: ensureNodeId(`${section.id}-certificate-${index + 1}-name`, 0),
              sectionType: "info",
              key: "name",
              label: "Tên chứng chỉ",
              value: toSafeText(item.name),
            },
            {
              id: ensureNodeId(`${section.id}-certificate-${index + 1}-issuer`, 0),
              sectionType: "info",
              key: "issuer",
              label: "Đơn vị cấp",
              value: toSafeText(item.issuer),
            },
            {
              id: ensureNodeId(`${section.id}-certificate-${index + 1}-date`, 0),
              sectionType: "info",
              key: "date",
              label: "Ngày cấp",
              value: toSafeText(item.date),
            },
            {
              id: ensureNodeId(`${section.id}-certificate-${index + 1}-url`, 0),
              sectionType: "info",
              key: "url",
              label: "Liên kết",
              value: toSafeText(item.url),
            },
          ],
        })),
      };
    },
    fromPayload: (section, payload) => ({
      items: readGroups(payload.sections).map((group, index) => ({
        id: group.id || ensureNodeId(`${section.id}-certificate-item`, index),
        name: readInfoValue(group.sections, "name"),
        issuer: readInfoValue(group.sections, "issuer"),
        date: readInfoValue(group.sections, "date"),
        url: readInfoValue(group.sections, "url"),
      })),
    }),
  };
}

function awardsAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
      const normalizedItems = ensureAtLeastOneRecord(items);

      return {
        sectionType: section.type,
        sections: normalizedItems.map((item, index) => ({
          id: toSafeText(item.id) || ensureNodeId(`${section.id}-award`, index),
          sectionType: "group",
          key: "awardItem",
          repeatable: true,
          label: toSafeText(item.title) || `Giải thưởng ${index + 1}`,
          sections: [
            {
              id: ensureNodeId(`${section.id}-award-${index + 1}-title`, 0),
              sectionType: "info",
              key: "title",
              label: "Tên giải thưởng",
              value: toSafeText(item.title),
            },
            {
              id: ensureNodeId(`${section.id}-award-${index + 1}-issuer`, 0),
              sectionType: "info",
              key: "issuer",
              label: "Đơn vị trao",
              value: toSafeText(item.issuer),
            },
            {
              id: ensureNodeId(`${section.id}-award-${index + 1}-date`, 0),
              sectionType: "info",
              key: "date",
              label: "Thời gian",
              value: toSafeText(item.date),
            },
            {
              id: ensureNodeId(`${section.id}-award-${index + 1}-description`, 0),
              sectionType: "list",
              key: "description",
              label: "Mô tả",
              items: textToLines(toSafeText(item.description)),
            },
          ],
        })),
      };
    },
    fromPayload: (section, payload) => ({
      items: readGroups(payload.sections).map((group, index) => ({
        id: group.id || ensureNodeId(`${section.id}-award-item`, index),
        title: readInfoValue(group.sections, "title"),
        issuer: readInfoValue(group.sections, "issuer"),
        date: readInfoValue(group.sections, "date"),
        description: linesToDashText(readListValue(group.sections, "description")),
      })),
    }),
  };
}

function activitiesAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        items?: unknown;
      };
      const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
      const normalizedItems = ensureAtLeastOneRecord(items);

      return {
        sectionType: section.type,
        sections: normalizedItems.map((item, index) => ({
          id: toSafeText(item.id) || ensureNodeId(`${section.id}-activity`, index),
          sectionType: "group",
          key: "activityItem",
          repeatable: true,
          label: toSafeText(item.name) || `Hoạt động ${index + 1}`,
          sections: [
            {
              id: ensureNodeId(`${section.id}-activity-${index + 1}-name`, 0),
              sectionType: "info",
              key: "name",
              label: "Tên hoạt động",
              value: toSafeText(item.name),
            },
            {
              id: ensureNodeId(`${section.id}-activity-${index + 1}-role`, 0),
              sectionType: "info",
              key: "role",
              label: "Vai trò",
              value: toSafeText(item.role),
            },
            {
              id: ensureNodeId(`${section.id}-activity-${index + 1}-start`, 0),
              sectionType: "info",
              key: "startDate",
              label: "Bắt đầu",
              value: toSafeText(item.startDate),
            },
            {
              id: ensureNodeId(`${section.id}-activity-${index + 1}-end`, 0),
              sectionType: "info",
              key: "endDate",
              label: "Kết thúc",
              value: toSafeText(item.endDate),
            },
            {
              id: ensureNodeId(`${section.id}-activity-${index + 1}-description`, 0),
              sectionType: "list",
              key: "description",
              label: "Mô tả",
              items: textToLines(toSafeText(item.description)),
            },
          ],
        })),
      };
    },
    fromPayload: (section, payload) => ({
      items: readGroups(payload.sections).map((group, index) => ({
        id: group.id || ensureNodeId(`${section.id}-activity-item`, index),
        name: readInfoValue(group.sections, "name"),
        role: readInfoValue(group.sections, "role"),
        startDate: readInfoValue(group.sections, "startDate"),
        endDate: readInfoValue(group.sections, "endDate"),
        description: linesToDashText(readListValue(group.sections, "description")),
      })),
    }),
  };
}

function customAdapter(): SharedSchemaAdapter {
  return {
    toPayload: (section) => {
      const data = section.data as {
        text?: unknown;
        items?: unknown;
      };
      const sections: SharedSectionNode[] = [
        {
          id: `${section.id}-custom-text`,
          sectionType: "info",
          key: "text",
          label: "Nội dung",
          value: toSafeText(data.text),
          multiline: true,
        },
      ];

      if (Array.isArray(data.items)) {
        sections.push({
          id: `${section.id}-custom-items`,
          sectionType: "list",
          key: "items",
          label: "Danh sách",
          items: data.items.map((item) => toSafeText(item)).filter(Boolean),
        });
      }

      return {
        sectionType: section.type,
        sections,
      };
    },
    fromPayload: (_section, payload) => {
      const text = readInfoValue(payload.sections, "text");
      const items = readListValue(payload.sections, "items");

      return {
        text,
        items: items.length > 0 ? items : undefined,
      };
    },
  };
}

const SHARED_SCHEMA_ADAPTERS: Record<CVPreviewSectionType, SharedSchemaAdapter> = {
  summary: summaryAdapter(),
  career_objective: careerObjectiveAdapter(),
  experience: experienceAdapter(),
  education: educationAdapter(),
  skills: skillsAdapter(),
  languages: languagesAdapter(),
  projects: projectsAdapter(),
  certificates: certificatesAdapter(),
  awards: awardsAdapter(),
  activities: activitiesAdapter(),
  custom: customAdapter(),
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function validateNode(node: unknown): node is SharedSectionNode {
  if (!isObjectRecord(node)) {
    return false;
  }

  if (typeof node.id !== "string" || typeof node.label !== "string") {
    return false;
  }

  if (node.sectionType === "info") {
    return typeof node.value === "string";
  }

  if (node.sectionType === "list") {
    return Array.isArray(node.items) && node.items.every((item) => typeof item === "string");
  }

  if (node.sectionType === "group") {
    return Array.isArray(node.sections) && node.sections.every((child) => validateNode(child));
  }

  return false;
}

export function validateSharedSectionPayload(payload: unknown): payload is SharedSectionPayload {
  if (!isObjectRecord(payload)) {
    return false;
  }

  if (typeof payload.sectionType !== "string" || !Array.isArray(payload.sections)) {
    return false;
  }

  return payload.sections.every((section) => validateNode(section));
}

export function toSharedSectionPayload(section: CVPreviewSection): SharedSectionPayload {
  const adapter = SHARED_SCHEMA_ADAPTERS[section.type] ?? customAdapter();
  const payload = adapter.toPayload(section);

  if (validateSharedSectionPayload(payload)) {
    return payload;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[CVBuilder:shared-section-schema] Invalid payload generated, falling back to empty payload", {
      sectionId: section.id,
      sectionType: section.type,
      payload,
    });
  }

  return {
    sectionType: section.type,
    sections: [],
  };
}

export function fromSharedSectionPayload(
  section: CVPreviewSection,
  payload: SharedSectionPayload,
): Record<string, unknown> {
  const adapter = SHARED_SCHEMA_ADAPTERS[section.type] ?? customAdapter();

  if (!validateSharedSectionPayload(payload)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CVBuilder:shared-section-schema] Invalid payload on commit, skipping update", {
        sectionId: section.id,
        sectionType: section.type,
        payload,
      });
    }
    return {};
  }

  return adapter.fromPayload(section, payload);
}

export function createEmptySharedNode(type: SharedSectionNodeType, idSeed: string): SharedSectionNode {
  if (type === "group") {
    return {
      id: `${idSeed}-group-${Date.now()}`,
      sectionType: "group",
      label: "Group",
      key: "group",
      sections: [],
      repeatable: true,
    };
  }

  if (type === "list") {
    return {
      id: `${idSeed}-list-${Date.now()}`,
      sectionType: "list",
      label: "List",
      key: "list",
      items: [""],
      placeholder: "Mục danh sách",
    };
  }

  return {
    id: `${idSeed}-info-${Date.now()}`,
    sectionType: "info",
    label: "Field",
    key: "info",
    value: "",
    multiline: true,
    placeholder: "Nội dung",
  };
}
