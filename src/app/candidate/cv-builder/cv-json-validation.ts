import type { CVSection, SectionType } from "./types";

const LIST_SECTION_TYPES: SectionType[] = [
  "experience_list",
  "education_list",
  "skill_list",
  "project_list",
  "award_list",
  "certificate_list",
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isListSectionType(type: SectionType): boolean {
  return LIST_SECTION_TYPES.includes(type);
}

export function validateSectionDataShape(sectionType: SectionType, data: unknown): boolean {
  if (!isObjectRecord(data)) {
    return false;
  }

  if (!isListSectionType(sectionType)) {
    return true;
  }

  if (!Array.isArray(data.items)) {
    return false;
  }

  return data.items.every((item) => validateListSectionItem(sectionType, item));
}

function hasStringField(item: Record<string, unknown>, key: string): boolean {
  const value = item[key];
  return typeof value === "string";
}

export function validateListSectionItem(sectionType: SectionType, item: unknown): boolean {
  if (!isListSectionType(sectionType)) {
    return true;
  }

  if (!isObjectRecord(item)) {
    return false;
  }

  if (!hasStringField(item, "id")) {
    return false;
  }

  if (sectionType === "experience_list") {
    return hasStringField(item, "company") && hasStringField(item, "position");
  }

  if (sectionType === "education_list") {
    return hasStringField(item, "institution") && hasStringField(item, "degree");
  }

  if (sectionType === "skill_list") {
    return hasStringField(item, "name");
  }

  if (sectionType === "project_list") {
    return hasStringField(item, "name") && hasStringField(item, "role");
  }

  if (sectionType === "award_list") {
    return hasStringField(item, "title") && hasStringField(item, "issuer");
  }

  if (sectionType === "certificate_list") {
    return hasStringField(item, "name") && hasStringField(item, "issuer");
  }

  return true;
}

export function validateSectionPayload(section: CVSection): boolean {
  if (!section || typeof section !== "object") {
    return false;
  }

  if (typeof section.id !== "string" || section.id.trim().length === 0) {
    return false;
  }

  if (typeof section.type !== "string" || typeof section.containerId !== "string") {
    return false;
  }

  if (!validateSectionDataShape(section.type, section.data)) {
    return false;
  }

  if (!isListSectionType(section.type)) {
    return true;
  }

  const data = section.data as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.every((item) => validateListSectionItem(section.type, item));
}
