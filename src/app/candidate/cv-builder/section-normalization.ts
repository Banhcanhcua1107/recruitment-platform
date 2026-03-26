import { v4 as uuidv4 } from "uuid";
import type {
  AnySectionData,
  CVSection,
  RichOutlineNode,
  SectionType,
} from "./types";

const LIST_SECTION_ID_PREFIX: Partial<Record<SectionType, string>> = {
  experience_list: "experience",
  education_list: "education",
  skill_list: "skill",
  project_list: "project",
  award_list: "award",
  certificate_list: "certificate",
};

function asNonEmptyId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildUniqueId(
  candidate: unknown,
  seen: Set<string>,
  prefix: string,
) {
  const normalized = asNonEmptyId(candidate);
  if (normalized && !seen.has(normalized)) {
    seen.add(normalized);
    return normalized;
  }

  let generated = `${prefix}-${uuidv4()}`;
  while (seen.has(generated)) {
    generated = `${prefix}-${uuidv4()}`;
  }
  seen.add(generated);
  return generated;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRichOutlineNodes(
  nodes: unknown,
  seen: Set<string> = new Set<string>(),
): RichOutlineNode[] {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((node): node is Record<string, unknown> => isRecord(node))
    .map((node) => ({
      ...node,
      id: buildUniqueId(node.id, seen, "outline-node"),
      kind:
        node.kind === "heading" ||
        node.kind === "bullet" ||
        node.kind === "paragraph" ||
        node.kind === "meta"
          ? node.kind
          : "paragraph",
      text: typeof node.text === "string" ? node.text : "",
      children: normalizeRichOutlineNodes(node.children, seen),
    }));
}

export function normalizeSectionDataIds<T extends AnySectionData>(
  type: SectionType,
  data: T,
): T {
  if (type === "rich_outline" && isRecord(data)) {
    return {
      ...data,
      nodes: normalizeRichOutlineNodes(data.nodes),
    } as T;
  }

  const itemPrefix = LIST_SECTION_ID_PREFIX[type];
  if (!itemPrefix || !isRecord(data) || !Array.isArray(data.items)) {
    return data;
  }

  const seenIds = new Set<string>();
  return {
    ...data,
    items: data.items.map((item) => {
      if (!isRecord(item)) {
        return { id: buildUniqueId(null, seenIds, itemPrefix) };
      }
      return {
        ...item,
        id: buildUniqueId(item.id, seenIds, itemPrefix),
      };
    }),
  } as T;
}

export function normalizeCvSections(sections: CVSection[]): CVSection[] {
  const seenSectionIds = new Set<string>();

  return sections.map((section) => ({
    ...section,
    id: buildUniqueId(section.id, seenSectionIds, "section"),
    data: normalizeSectionDataIds(section.type, section.data),
  }));
}
