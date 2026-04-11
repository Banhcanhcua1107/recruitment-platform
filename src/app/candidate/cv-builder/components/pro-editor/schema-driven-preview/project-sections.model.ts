import type { ProjectsSectionData } from "./types";

export type ProjectSectionType = "info" | "list" | "group";
export type ProjectLayoutVariant = "table" | "stacked";

export interface ProjectDuration {
  from: string;
  to: string;
}

export interface ProjectInfoSection {
  id: string;
  type: "info";
  label: string;
  value: string;
}

export interface ProjectListSection {
  id: string;
  type: "list";
  label: string;
  items: string[];
}

export type ProjectSubSection = ProjectInfoSection | ProjectListSection;

export interface ProjectGroupSection {
  id: string;
  type: "group";
  label: string;
  sections: ProjectSubSection[];
}

export type ProjectSection = ProjectInfoSection | ProjectListSection | ProjectGroupSection;

export interface ProjectModel {
  id: string;
  projectName: string;
  duration: ProjectDuration;
  sections: ProjectSection[];
  layoutVariant: ProjectLayoutVariant;
}

const DEFAULT_MEMBER_COUNT = "1";

function toSafeText(value: unknown) {
  if (typeof value === "string") {
    return value;
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

function normalizeLabelKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function toListItems(value: string) {
  const source = stripHtml(value);

  if (!source) {
    return [];
  }

  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines;
  }

  if (source.includes(",")) {
    return source
      .split(",")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [source.replace(/^[-*\u2022]\s*/, "").trim()].filter(Boolean);
}

function withDashPrefix(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function createSectionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000).toString(36)}`;
}

export function createDefaultProjectSubSection(type: "info" | "list"): ProjectSubSection {
  if (type === "list") {
    return {
      id: createSectionId("proj-sub-list"),
      type: "list",
      label: "New list",
      items: [""],
    };
  }

  return {
    id: createSectionId("proj-sub-info"),
    type: "info",
    label: "New field",
    value: "",
  };
}

export function createDefaultProjectSection(type: ProjectSectionType): ProjectSection {
  if (type === "list") {
    return {
      id: createSectionId("proj-list"),
      type: "list",
      label: "New list",
      items: [""],
    };
  }

  if (type === "group") {
    return {
      id: createSectionId("proj-group"),
      type: "group",
      label: "New group",
      sections: [createDefaultProjectSubSection("info")],
    };
  }

  return {
    id: createSectionId("proj-info"),
    type: "info",
    label: "New field",
    value: "",
  };
}

function buildStandardProjectSections(values: {
  client: string;
  description: string;
  memberCount: string;
  position: string;
  responsibilities: string[];
  technologies: string[];
}) {
  return [
    {
      id: createSectionId("proj-client"),
      type: "info",
      label: "Client",
      value: values.client,
    },
    {
      id: createSectionId("proj-description"),
      type: "info",
      label: "Descriptions",
      value: values.description,
    },
    {
      id: createSectionId("proj-members"),
      type: "info",
      label: "Number of members",
      value: values.memberCount || DEFAULT_MEMBER_COUNT,
    },
    {
      id: createSectionId("proj-position"),
      type: "info",
      label: "Position",
      value: values.position,
    },
    {
      id: createSectionId("proj-resp"),
      type: "list",
      label: "Responsibilities",
      items: values.responsibilities.length > 0 ? values.responsibilities : [""],
    },
    {
      id: createSectionId("proj-tech"),
      type: "list",
      label: "Technology in use",
      items: values.technologies.length > 0 ? values.technologies : [""],
    },
  ] as ProjectSection[];
}

function normalizeProjectSubSections(input: unknown): ProjectSubSection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const type = toSafeText(record.type).toLowerCase();
      const label = toSafeText(record.label) || (type === "list" ? "New list" : "New field");

      if (type === "list") {
        const items = Array.isArray(record.items)
          ? record.items.map((item) => toSafeText(item)).filter((item) => item.trim().length > 0)
          : toListItems(toSafeText(record.value));

        return {
          id: toSafeText(record.id) || createSectionId(`proj-sub-list-${index + 1}`),
          type: "list" as const,
          label,
          items: items.length > 0 ? items : [""],
        };
      }

      if (type === "info") {
        return {
          id: toSafeText(record.id) || createSectionId(`proj-sub-info-${index + 1}`),
          type: "info" as const,
          label,
          value: stripHtml(toSafeText(record.value)),
        };
      }

      return null;
    })
    .filter((entry): entry is ProjectSubSection => Boolean(entry));
}

function normalizeProjectSections(input: unknown): ProjectSection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const type = toSafeText(record.type).toLowerCase();
      const label = toSafeText(record.label) || "New field";

      if (type === "info") {
        return {
          id: toSafeText(record.id) || createSectionId(`proj-info-${index + 1}`),
          type: "info" as const,
          label,
          value: stripHtml(toSafeText(record.value)),
        };
      }

      if (type === "list") {
        const items = Array.isArray(record.items)
          ? record.items.map((item) => toSafeText(item)).filter((item) => item.trim().length > 0)
          : toListItems(toSafeText(record.value));

        return {
          id: toSafeText(record.id) || createSectionId(`proj-list-${index + 1}`),
          type: "list" as const,
          label,
          items: items.length > 0 ? items : [""],
        };
      }

      if (type === "group") {
        const groupSections = normalizeProjectSubSections(record.sections);
        return {
          id: toSafeText(record.id) || createSectionId(`proj-group-${index + 1}`),
          type: "group" as const,
          label: label || "Group",
          sections: groupSections.length > 0 ? groupSections : [createDefaultProjectSubSection("info")],
        };
      }

      return null;
    })
    .filter((entry): entry is ProjectSection => Boolean(entry));
}

export function createDefaultProjectModel(index = 1): ProjectModel {
  return {
    id: `project-${index}-${Date.now()}`,
    projectName: "",
    duration: {
      from: "",
      to: "",
    },
    layoutVariant: "table",
    sections: buildStandardProjectSections({
      client: "",
      description: "",
      memberCount: DEFAULT_MEMBER_COUNT,
      position: "",
      responsibilities: [""],
      technologies: [""],
    }),
  };
}

function normalizeProjectModel(input: unknown, index: number): ProjectModel {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const durationRecord =
    record.duration && typeof record.duration === "object"
      ? (record.duration as Record<string, unknown>)
      : undefined;

  const projectName = toSafeText(record.projectName) || toSafeText(record.name);
  const from = toSafeText(durationRecord?.from) || toSafeText(record.startDate);
  const to = toSafeText(durationRecord?.to) || toSafeText(record.endDate);
  const dynamicSections = normalizeProjectSections(record.sections);

  const fallbackDescription = stripHtml(toSafeText(record.description));
  const fallbackResponsibilities = toListItems(toSafeText(record.responsibilities) || fallbackDescription);
  const fallbackTechnologies = toListItems(toSafeText(record.technologies));

  const legacySections = buildStandardProjectSections({
    client: toSafeText(record.customer) || toSafeText(record.client),
    description: fallbackDescription,
    memberCount:
      toSafeText(record.memberCount)
      || (typeof record.teamSize === "number" ? String(record.teamSize) : DEFAULT_MEMBER_COUNT),
    position: toSafeText(record.role) || toSafeText(record.position),
    responsibilities: fallbackResponsibilities,
    technologies: fallbackTechnologies,
  });

  const layoutRaw = toSafeText(record.layoutVariant);
  const layoutVariant: ProjectLayoutVariant = layoutRaw === "stacked" ? "stacked" : "table";

  return {
    id: toSafeText(record.id) || `project-${index + 1}`,
    projectName,
    duration: {
      from,
      to,
    },
    sections: dynamicSections.length > 0 ? dynamicSections : legacySections,
    layoutVariant,
  };
}

export function normalizeProjectsModel(data: ProjectsSectionData): ProjectModel[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [createDefaultProjectModel()];
  }

  return rawItems.map((item, index) => normalizeProjectModel(item, index));
}

function flattenSectionData(sections: ProjectSection[]) {
  const infoEntries: Array<{ label: string; value: string }> = [];
  const listEntries: Array<{ label: string; items: string[] }> = [];

  sections.forEach((section) => {
    if (section.type === "info") {
      infoEntries.push({ label: section.label, value: section.value });
      return;
    }

    if (section.type === "list") {
      listEntries.push({ label: section.label, items: section.items });
      return;
    }

    section.sections.forEach((subSection) => {
      if (subSection.type === "info") {
        infoEntries.push({ label: subSection.label, value: subSection.value });
        return;
      }

      listEntries.push({ label: subSection.label, items: subSection.items });
    });
  });

  return {
    infoEntries,
    listEntries,
  };
}

function findInfoByLabel(infoEntries: Array<{ label: string; value: string }>, labelKeys: string[]) {
  const normalizedKeys = new Set(labelKeys.map((label) => normalizeLabelKey(label)));

  const match = infoEntries.find((entry) => normalizedKeys.has(normalizeLabelKey(entry.label)));

  return match?.value?.trim() || "";
}

function findListByLabel(listEntries: Array<{ label: string; items: string[] }>, labelKeys: string[]) {
  const normalizedKeys = new Set(labelKeys.map((label) => normalizeLabelKey(label)));

  const match = listEntries.find((entry) => normalizedKeys.has(normalizeLabelKey(entry.label)));

  if (!match) {
    return [];
  }

  return match.items.map((item) => item.trim()).filter(Boolean);
}

function serializeProjectSections(sections: ProjectSection[]) {
  return sections.map((section) => {
    if (section.type === "group") {
      return {
        id: section.id,
        type: section.type,
        label: section.label,
        sections: section.sections.map((subSection) =>
          subSection.type === "info"
            ? {
                id: subSection.id,
                type: subSection.type,
                label: subSection.label,
                value: subSection.value,
              }
            : {
                id: subSection.id,
                type: subSection.type,
                label: subSection.label,
                items: subSection.items,
              },
        ),
      };
    }

    if (section.type === "list") {
      return {
        id: section.id,
        type: section.type,
        label: section.label,
        items: section.items,
      };
    }

    return {
      id: section.id,
      type: section.type,
      label: section.label,
      value: section.value,
    };
  });
}

export function buildProjectsSectionPayload(title: string, projects: ProjectModel[]): ProjectsSectionData {
  const serializedItems = projects.map((project, index) => {
    const { infoEntries, listEntries } = flattenSectionData(project.sections);

    const client = findInfoByLabel(infoEntries, ["client"]);
    const description = findInfoByLabel(infoEntries, ["descriptions", "description", "mo ta"]);
    const memberCount = findInfoByLabel(infoEntries, ["number of members", "team size", "so luong thanh vien"])
      || DEFAULT_MEMBER_COUNT;
    const position = findInfoByLabel(infoEntries, ["position", "role", "vai tro"]);

    const responsibilitiesItems = findListByLabel(listEntries, ["responsibilities", "nhiem vu", "trach nhiem"]);
    const technologiesItems = findListByLabel(listEntries, ["technology in use", "technologies", "tech stack"]);

    const parsedMemberCount = Number.parseInt(memberCount, 10);

    return {
      id: project.id || `project-${index + 1}`,
      projectName: project.projectName,
      duration: {
        from: project.duration.from,
        to: project.duration.to,
      },
      sections: serializeProjectSections(project.sections),
      layoutVariant: project.layoutVariant,

      // Legacy-compatible keys for current templates.
      name: project.projectName,
      role: position,
      position,
      startDate: project.duration.from,
      endDate: project.duration.to,
      customer: client,
      client,
      memberCount,
      teamSize: Number.isFinite(parsedMemberCount) ? parsedMemberCount : 1,
      description,
      responsibilities: withDashPrefix(responsibilitiesItems),
      technologies: withDashPrefix(technologiesItems),
    };
  }) as unknown as ProjectsSectionData["items"];

  return {
    title,
    items: serializedItems,
  };
}
