"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  FolderKanban,
  GraduationCap,
  Languages,
  Plus,
  Sparkles,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AddSectionButtons } from "@/app/candidate/cv-builder/components/pro-editor/AddSectionButtons";
import { cn } from "@/lib/utils";
import { EditableList, EditableText } from "./inline-editors";
import { buildProjectsSectionPayload, normalizeProjectsModel } from "./project-sections.model";
import { ProjectCollectionEditor } from "./project-sections.view";
import type {
  ActivitiesSectionData,
  AwardsSectionData,
  CertificatesSectionData,
  CVSectionComponentProps,
  EducationSectionData,
  CVTemplateIconToken,
  CustomSectionData,
  ExperienceSectionData,
  LanguagesSectionData,
  ProjectsSectionData,
  SkillsSectionData,
  SummarySectionData,
} from "./types";

const ICON_MAP: Record<CVTemplateIconToken, LucideIcon> = {
  summary: AlignLeft,
  target: Target,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  skills: Sparkles,
  languages: Languages,
  projects: FolderKanban,
  certificates: BadgeCheck,
  awards: Award,
  activities: CalendarDays,
  custom: FileText,
};

const ICON_PICKER_OPTIONS: CVTemplateIconToken[] = [
  "summary",
  "target",
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

interface TealOverviewItemData extends Record<string, unknown> {
  id: string;
  content: string;
}

interface TealWorkExperienceItemData extends Record<string, unknown> {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
  rightDescription: string;
  sourceShape?: Record<string, unknown>;
}

interface TealActivityItemData extends Record<string, unknown> {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
  rightDescription: string;
}

interface TealSkillItemData extends Record<string, unknown> {
  id: string;
  name: string;
  group: "main" | "other";
  level?: number;
}

interface TealEducationItemData extends Record<string, unknown> {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
}

interface TealCertificateItemData extends Record<string, unknown> {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

interface TealLanguageItemData extends Record<string, unknown> {
  id: string;
  name: string;
  level: string;
}

interface TealAwardItemData extends Record<string, unknown> {
  id: string;
  date: string;
  title: string;
  issuer: string;
  detail: string;
}

const OVERVIEW_EMPTY_ITEM_TEMPLATE: TealOverviewItemData = {
  id: "ov-1",
  content: "",
};

const AWARD_EMPTY_ITEM_TEMPLATE: TealAwardItemData = {
  id: "award-1",
  date: "",
  title: "",
  issuer: "",
  detail: "",
};

const ACTIVITY_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "act-1",
  startDate: "",
  endDate: "",
  name: "",
  role: "",
  description: "",
};

const SKILL_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "skill-main-1",
  name: "",
  group: "main",
  level: 0,
};

const EDUCATION_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "edu-1",
  institution: "",
  degree: "",
  startDate: "",
  endDate: "",
};

const CERTIFICATE_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "cert-1",
  name: "",
  issuer: "",
  date: "",
  url: "",
};

const LANGUAGE_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "lang-1",
  name: "",
  level: "",
};

const AWARD_RAW_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "award-1",
  date: "",
  title: "",
  issuer: "",
  description: "",
};

const WORK_EXPERIENCE_EMPTY_ITEM_TEMPLATE: Record<string, unknown> = {
  id: "we-1",
  type: "workItem",
  fields: {
    date: "",
    company: "",
    role: "",
    descriptions: [""],
  },
};

interface SectionHeaderProps {
  title: string;
  icon: CVTemplateIconToken;
  isSectionActive: boolean;
  onChangeTitle: (nextTitle: string) => void;
  onChangeIcon?: (nextIcon: CVTemplateIconToken) => void;
  titleTextClassName?: string;
  dividerClassName?: string;
  iconBackgroundClassName?: string;
  iconBorderClassName?: string;
  iconColorClassName?: string;
}

function toSafeText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneNodeShapeWithEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    return [cloneNodeShapeWithEmptyValues(value[0])];
  }

  if (isObjectRecord(value)) {
    const nextRecord: Record<string, unknown> = {};

    Object.entries(value).forEach(([key, entry]) => {
      if (key === "id") {
        nextRecord[key] = "";
        return;
      }

      nextRecord[key] = cloneNodeShapeWithEmptyValues(entry);
    });

    return nextRecord;
  }

  if (typeof value === "number") {
    return 0;
  }

  if (typeof value === "boolean") {
    return false;
  }

  return "";
}

interface CreateEmptyNodeFromSchemaOptions<TNode extends Record<string, unknown>> {
  sourceNode?: TNode | null;
  fallbackNode: TNode;
  idPrefix: string;
  indexHint?: number;
}

interface AppendTealTimelineItemOptions<TNode extends Record<string, unknown>> {
  sourceNode?: TNode | null;
  fallbackNode: TNode;
  idPrefix: string;
  insertAt?: number;
  preserveMetadataKeys?: string[];
}

export function createEmptyNodeFromSchema<TNode extends Record<string, unknown>>({
  sourceNode,
  fallbackNode,
  idPrefix,
  indexHint = 0,
}: CreateEmptyNodeFromSchemaOptions<TNode>): TNode {
  const templateNode = isObjectRecord(sourceNode) ? sourceNode : fallbackNode;
  const emptyNode = cloneNodeShapeWithEmptyValues(templateNode);
  const normalizedNode = isObjectRecord(emptyNode) ? emptyNode : {};

  return {
    ...normalizedNode,
    id: `${idPrefix}-${indexHint + 1}-${Date.now()}`,
  } as unknown as TNode;
}

export function appendTealTimelineItem<TNode extends Record<string, unknown>>(
  items: unknown[],
  {
    sourceNode,
    fallbackNode,
    idPrefix,
    insertAt,
    preserveMetadataKeys = ["type", "nodeType", "sectionType", "kind"],
  }: AppendTealTimelineItemOptions<TNode>,
): TNode[] {
  const existingItems = Array.isArray(items) ? [...items] : [];
  let resolvedSourceNode: TNode | undefined;

  if (isObjectRecord(sourceNode)) {
    resolvedSourceNode = sourceNode;
  } else {
    for (let index = existingItems.length - 1; index >= 0; index -= 1) {
      const candidate = existingItems[index];
      if (isObjectRecord(candidate)) {
        resolvedSourceNode = candidate as TNode;
        break;
      }
    }
  }
  const nextItem = createEmptyNodeFromSchema<TNode>({
    sourceNode: resolvedSourceNode,
    fallbackNode,
    idPrefix,
    indexHint: existingItems.length,
  });

  if (resolvedSourceNode) {
    preserveMetadataKeys.forEach((metadataKey) => {
      const metadataValue = resolvedSourceNode[metadataKey];
      if (metadataValue !== undefined) {
        nextItem[metadataKey as keyof TNode] = metadataValue as TNode[keyof TNode];
      }
    });
  }

  const safeInsertAt = Number.isInteger(insertAt)
    ? Math.min(Math.max(insertAt ?? existingItems.length, 0), existingItems.length)
    : existingItems.length;

  return [
    ...(existingItems.slice(0, safeInsertAt) as TNode[]),
    nextItem,
    ...(existingItems.slice(safeInsertAt) as TNode[]),
  ];
}

interface RepeatableSplitState {
  sourceItemsFromSplit: unknown[] | null;
  fullRawItems: unknown[];
  chunkStartIndex: number;
  chunkItemCount: number;
  totalItemCount: number;
  isSplitContinuation: boolean;
  showSectionChrome: boolean;
  isLastChunk: boolean;
}

interface RepeatableAddTarget<TNode extends Record<string, unknown>> {
  insertAt: number;
  sourceNode?: TNode;
  selectedIndexWithinChunk: number;
}

function resolveRepeatableSplitState(data: unknown, rawItems: unknown[]): RepeatableSplitState {
  const splitContext = isObjectRecord(data) && isObjectRecord((data as Record<string, unknown>).__splitContext)
    ? ((data as Record<string, unknown>).__splitContext as Record<string, unknown>)
    : null;

  const sourceItemsFromSplit = splitContext && Array.isArray(splitContext.sourceItems)
    ? splitContext.sourceItems
    : null;
  const fullRawItems = sourceItemsFromSplit ?? rawItems;
  const chunkStartIndex = splitContext && Number.isFinite(Number(splitContext.startIndex))
    ? Math.max(0, Math.floor(Number(splitContext.startIndex)))
    : 0;
  const chunkItemCount = splitContext && Number.isFinite(Number(splitContext.itemCount))
    ? Math.max(0, Math.floor(Number(splitContext.itemCount)))
    : rawItems.length;
  const totalItemCount = splitContext && Number.isFinite(Number(splitContext.totalCount))
    ? Math.max(0, Math.floor(Number(splitContext.totalCount)))
    : fullRawItems.length;
  const isSplitContinuation = splitContext?.isContinuation === true && chunkStartIndex > 0;

  return {
    sourceItemsFromSplit,
    fullRawItems,
    chunkStartIndex,
    chunkItemCount,
    totalItemCount,
    isSplitContinuation,
    showSectionChrome: !isSplitContinuation,
    isLastChunk: !splitContext || chunkStartIndex + chunkItemCount >= totalItemCount,
  };
}

export function resolveTealSectionFrameClassName(input: {
  showSectionChrome: boolean;
  isActive: boolean;
  borderClassName?: string;
  backgroundClassName?: string;
}) {
  const activeBorderClassName = input.borderClassName ?? "border-teal-200";
  const activeBackgroundClassName = input.backgroundClassName ?? "bg-white";

  if (input.showSectionChrome) {
    return input.isActive
      ? `${activeBorderClassName} ${activeBackgroundClassName}`
      : "border-transparent bg-transparent";
  }

  return input.isActive
    ? `${activeBorderClassName} ${activeBackgroundClassName} pt-0`
    : "border-transparent bg-transparent pt-0";
}

function resolveRepeatableAddTarget<TNode extends Record<string, unknown>>(input: {
  fullRawItems: unknown[];
  chunkStartIndex: number;
  chunkLength: number;
  sourceItemsFromSplit: unknown[] | null;
}): RepeatableAddTarget<TNode> {
  const { fullRawItems, chunkStartIndex, chunkLength, sourceItemsFromSplit } = input;
  const fullLength = fullRawItems.length;
  const desiredInsertAt = sourceItemsFromSplit ? chunkStartIndex + chunkLength : fullLength;
  const insertAt = Math.min(Math.max(desiredInsertAt, 0), fullLength);

  const sourceIndex = insertAt > 0 ? insertAt - 1 : fullLength - 1;
  const sourceCandidate = sourceIndex >= 0 ? fullRawItems[sourceIndex] : undefined;
  const sourceNode = isObjectRecord(sourceCandidate)
    ? (sourceCandidate as TNode)
    : undefined;

  return {
    insertAt,
    sourceNode,
    selectedIndexWithinChunk: insertAt - chunkStartIndex,
  };
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toDescriptionText(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((line) => toSafeText(line))
    .join("\n")
    .trim();
}

function toDescriptionLines(value: string) {
  const rawLines = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  const nonEmptyLines = rawLines.filter((line) => line.trim().length > 0);

  return nonEmptyLines.length > 0 ? nonEmptyLines : [""];
}

function ensureWorkItemRecord(value: unknown): Record<string, unknown> {
  if (isObjectRecord(value)) {
    return cloneRecord(value);
  }

  return cloneRecord(WORK_EXPERIENCE_EMPTY_ITEM_TEMPLATE);
}

function buildWorkExperienceItemRecord(item: TealWorkExperienceItemData, index: number) {
  const dates = splitDateRange(item.leftDate || "");
  const descriptionLines = toDescriptionLines(item.rightDescription);
  const nextRecord = ensureWorkItemRecord(item.sourceShape);

  nextRecord.id = item.id || `we-${index + 1}`;

  const fieldsRecord = isObjectRecord(nextRecord.fields)
    ? { ...nextRecord.fields }
    : null;

  if (fieldsRecord) {
    const shouldPopulateFields =
      Object.keys(fieldsRecord).length === 0
      || ["date", "startDate", "endDate", "company", "role", "position", "description", "descriptions"]
        .some((key) => key in fieldsRecord);

    if (shouldPopulateFields) {
      if ("date" in fieldsRecord || (!('startDate' in fieldsRecord) && !('endDate' in fieldsRecord))) {
        fieldsRecord.date = item.leftDate;
      }
      if ("startDate" in fieldsRecord) {
        fieldsRecord.startDate = dates.startDate;
      }
      if ("endDate" in fieldsRecord) {
        fieldsRecord.endDate = dates.endDate;
      }
      if ("company" in fieldsRecord || !('organization' in fieldsRecord)) {
        fieldsRecord.company = item.rightTitle;
      }
      if ("role" in fieldsRecord || !('position' in fieldsRecord)) {
        fieldsRecord.role = item.rightSubtitle;
      }
      if ("position" in fieldsRecord) {
        fieldsRecord.position = item.rightSubtitle;
      }
      if ("description" in fieldsRecord || !('descriptions' in fieldsRecord)) {
        fieldsRecord.description = item.rightDescription;
      }
      if ("descriptions" in fieldsRecord || !('description' in fieldsRecord)) {
        fieldsRecord.descriptions = descriptionLines;
      }
    }

    nextRecord.fields = fieldsRecord;
  }

  const hasKnownTopLevelKeys = [
    "leftDate",
    "startDate",
    "endDate",
    "rightTitle",
    "company",
    "rightSubtitle",
    "position",
    "role",
    "rightDescription",
    "description",
    "descriptions",
  ].some((key) => key in nextRecord);

  if (hasKnownTopLevelKeys || !fieldsRecord) {
    if ("leftDate" in nextRecord || (!("startDate" in nextRecord) && !("endDate" in nextRecord))) {
      nextRecord.leftDate = item.leftDate;
    }
    if ("startDate" in nextRecord) {
      nextRecord.startDate = dates.startDate;
    }
    if ("endDate" in nextRecord) {
      nextRecord.endDate = dates.endDate;
    }
    if ("rightTitle" in nextRecord || !("company" in nextRecord)) {
      nextRecord.rightTitle = item.rightTitle;
    }
    if ("company" in nextRecord || !("rightTitle" in nextRecord)) {
      nextRecord.company = item.rightTitle;
    }
    if ("rightSubtitle" in nextRecord || (!("position" in nextRecord) && !("role" in nextRecord))) {
      nextRecord.rightSubtitle = item.rightSubtitle;
    }
    if ("position" in nextRecord) {
      nextRecord.position = item.rightSubtitle;
    }
    if ("role" in nextRecord) {
      nextRecord.role = item.rightSubtitle;
    }
    if ("rightDescription" in nextRecord || !("description" in nextRecord)) {
      nextRecord.rightDescription = item.rightDescription;
    }
    if ("description" in nextRecord || !("rightDescription" in nextRecord)) {
      nextRecord.description = item.rightDescription;
    }
    if ("descriptions" in nextRecord) {
      nextRecord.descriptions = descriptionLines;
    }
  }

  return nextRecord;
}

interface AppendWorkExperienceItemOptions {
  insertAt?: number;
  sourceNode?: Record<string, unknown> | null;
}

export function appendWorkExperienceItem(items: unknown[], options?: AppendWorkExperienceItemOptions) {
  const existingItems = Array.isArray(items) ? [...items] : [];
  const firstItemShape = existingItems.find((item) => isObjectRecord(item));
  const resolvedSourceNode = isObjectRecord(options?.sourceNode)
    ? options.sourceNode
    : (isObjectRecord(firstItemShape) ? firstItemShape : undefined);

  return appendTealTimelineItem<Record<string, unknown>>(existingItems, {
    sourceNode: resolvedSourceNode,
    fallbackNode: WORK_EXPERIENCE_EMPTY_ITEM_TEMPLATE,
    idPrefix: "we",
    insertAt: options?.insertAt,
  });
}

export function appendTealTimelineSkillItem(items: unknown[], group: "main" | "other") {
  const existingItems = Array.isArray(items) ? [...items] : [];
  let sourceNode: Record<string, unknown> | undefined;
  let lastGroupIndex = -1;
  let insertAt = existingItems.length;

  existingItems.forEach((item, index) => {
    if (!isObjectRecord(item)) {
      return;
    }

    const itemGroup = normalizeSkillGroup(item.group, toSafeText(item.name));
    if (itemGroup === group) {
      sourceNode = item;
      lastGroupIndex = index;
    }
  });

  if (lastGroupIndex >= 0) {
    insertAt = lastGroupIndex + 1;
  } else if (group === "main") {
    const firstOtherIndex = existingItems.findIndex((item) => {
      if (!isObjectRecord(item)) {
        return false;
      }

      return normalizeSkillGroup(item.group, toSafeText(item.name)) === "other";
    });

    if (firstOtherIndex >= 0) {
      insertAt = firstOtherIndex;
    }
  }

  const appendedItems = appendTealTimelineItem<Record<string, unknown>>(existingItems, {
    sourceNode,
    fallbackNode: {
      ...SKILL_EMPTY_ITEM_TEMPLATE,
      group,
    },
    idPrefix: `skill-${group}`,
    insertAt,
  });

  return appendedItems.map((item, index) =>
    index === insertAt
      ? {
          ...item,
          group,
        }
      : item,
  );
}

function isOverviewBulletLine(value: string) {
  const line = value.trim();

  if (!line) {
    return false;
  }

  return /^[-*\u2022\u2013\u2014]\s+/.test(line)
    || /^[-*\u2022\u2013\u2014]+\S/.test(line)
    || /^[-*\u2022\u2013\u2014]{2,}$/.test(line);
}

function getOverviewSourceLines(data: SummarySectionData) {
  return stripHtml(data.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeOverviewItems(data: SummarySectionData) {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length > 0) {
    return rawItems.map((item, index) => ({
      id: toSafeText(item.id) || `ov-${index + 1}`,
      content: toSafeText(item.content),
    }));
  }

  const sourceLines = getOverviewSourceLines(data);

  if (sourceLines.length > 0) {
    const introLines = sourceLines.slice(0, 4);
    const trailingLines = sourceLines.slice(4);

    if (trailingLines.length > 0 && trailingLines.every((line) => isOverviewBulletLine(line))) {
      return [...introLines, trailingLines.join("\n")].map((content, index) => ({
        id: `ov-text-${index + 1}`,
        content,
      }));
    }

    const groupedLines: string[] = [];
    let bulletBuffer: string[] = [];

    const flushBulletBuffer = () => {
      if (bulletBuffer.length === 0) {
        return;
      }

      groupedLines.push(bulletBuffer.join("\n"));
      bulletBuffer = [];
    };

    sourceLines.forEach((line, lineIndex) => {
      if (lineIndex >= 4 && isOverviewBulletLine(line)) {
        bulletBuffer.push(line);
        return;
      }

      flushBulletBuffer();
      groupedLines.push(line);
    });

    flushBulletBuffer();

    return groupedLines.map((content, index) => ({
      id: `ov-text-${index + 1}`,
      content,
    }));
  }

  return [{ ...OVERVIEW_EMPTY_ITEM_TEMPLATE }];
}

function splitDateRange(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s*[–-]\s*/);

  if (parts.length >= 2) {
    return {
      startDate: parts[0]?.trim() || "",
      endDate: parts.slice(1).join(" - ").trim() || "Present",
    };
  }

  return {
    startDate: normalized,
    endDate: "Present",
  };
}

function buildDateRangeLabel(startDate: string, endDate: string) {
  if (!startDate) {
    return "";
  }

  if (!endDate) {
    return startDate;
  }

  return `${startDate} – ${endDate}`;
}

export function normalizeWorkExperienceItems(data: ExperienceSectionData): TealWorkExperienceItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "we-1",
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
        rightDescription: "",
        sourceShape: cloneRecord(WORK_EXPERIENCE_EMPTY_ITEM_TEMPLATE),
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record: Record<string, unknown> = isObjectRecord(item) ? item : {};
    const fieldsRecord = isObjectRecord(record.fields) ? record.fields : null;
    const leftDateFromData = toSafeText(record.leftDate);
    const leftDateFromFields = toSafeText(fieldsRecord?.date);
    const startDate = toSafeText(record.startDate);
    const endDate = toSafeText(record.endDate);
    const isCurrent = record.isCurrent === true;
    const resolvedEndDate = endDate || (isCurrent ? "Present" : "");
    const computedDate = startDate
      ? `${startDate}${resolvedEndDate ? ` – ${resolvedEndDate}` : ""}`
      : "";
    const description =
      toSafeText(record.rightDescription)
      || stripHtml(toSafeText(record.description))
      || stripHtml(toSafeText(fieldsRecord?.description))
      || toDescriptionText(record.descriptions)
      || toDescriptionText(fieldsRecord?.descriptions);

    return {
      id: toSafeText(record.id) || `we-${index + 1}`,
      leftDate: leftDateFromData || leftDateFromFields || computedDate,
      rightTitle: toSafeText(record.rightTitle) || toSafeText(record.company) || toSafeText(fieldsRecord?.company),
      rightSubtitle:
        toSafeText(record.rightSubtitle)
        || toSafeText(record.position)
        || toSafeText(record.role)
        || toSafeText(fieldsRecord?.role)
        || toSafeText(fieldsRecord?.position),
      rightDescription: description,
      sourceShape: ensureWorkItemRecord(record),
    };
  });
}

export function normalizeActivityItems(data: ActivitiesSectionData): TealActivityItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "act-1",
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
        rightDescription: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;
    const startDate = toSafeText(record.startDate);
    const endDate = toSafeText(record.endDate);
    const description = stripHtml(toSafeText(record.description) || toSafeText(record.rightDescription));
    return {
      id: toSafeText(record.id) || `act-${index + 1}`,
      leftDate: toSafeText(record.leftDate) || buildDateRangeLabel(startDate, endDate),
      rightTitle: toSafeText(record.rightTitle) || toSafeText(record.name),
      rightSubtitle: toSafeText(record.rightSubtitle) || toSafeText(record.role),
      rightDescription: description,
    };
  });
}

export function buildOverviewPayload(title: string, items: TealOverviewItemData[]) {
  const normalizedItems = items.map((item, index) => ({
    id: item.id || `ov-${index + 1}`,
    content: item.content,
  }));

  return {
    title,
    items: normalizedItems,
    text: normalizedItems.map((item) => item.content).join("\n"),
  };
}

export function buildWorkExperiencePayload(title: string, items: TealWorkExperienceItemData[]) {
  return {
    title,
    items: items.map((item, index) => buildWorkExperienceItemRecord(item, index)),
  };
}

export function buildActivitiesPayload(title: string, items: TealActivityItemData[]) {
  return {
    title,
    items: items.map((item, index) => {
      const hasRange = item.leftDate.includes("-") || item.leftDate.includes("–");
      const dates = splitDateRange(item.leftDate || "");
      return {
        id: item.id || `act-${index + 1}`,
        leftDate: item.leftDate,
        rightTitle: item.rightTitle,
        rightSubtitle: item.rightSubtitle,
        startDate: dates.startDate,
        endDate: hasRange ? dates.endDate : "",
        name: item.rightTitle,
        role: item.rightSubtitle,
        description: item.rightDescription || item.rightSubtitle,
      };
    }),
    text: items
      .map((item) => [item.leftDate, item.rightTitle, item.rightSubtitle].filter(Boolean).join(" | "))
      .join("\n"),
  };
}

function stripSkillPrefix(value: string) {
  return value.replace(/^(main|other|chinh|khac)\s*[:\-–]\s*/i, "").trim();
}

function normalizeSkillGroup(rawValue: unknown, fallbackName: string): "main" | "other" {
  const explicitGroup = toSafeText(rawValue).trim().toLowerCase();

  if (explicitGroup === "other") {
    return "other";
  }

  if (explicitGroup === "main") {
    return "main";
  }

  if (/^(other|khac)\s*[:\-–]/i.test(fallbackName.trim())) {
    return "other";
  }

  return "main";
}

function normalizeSkillItems(data: SkillsSectionData): TealSkillItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "skill-main-1",
        name: "",
        group: "main",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;
    const rawName = toSafeText(record.name);
    const normalizedGroup = normalizeSkillGroup(record.group, rawName);

    return {
      id: toSafeText(record.id) || `skill-${index + 1}`,
      name: stripSkillPrefix(rawName),
      group: normalizedGroup,
      level: typeof record.level === "number" ? record.level : undefined,
    };
  });
}

function isSidebarReferenceLayoutVariant(layoutVariant?: string) {
  return layoutVariant === "sidebar-reference";
}

function shouldUseSidebarContrastPalette(styleConfig: {
  titleTextClassName?: string;
  contentTextClassName?: string;
}) {
  return `${styleConfig.titleTextClassName || ""} ${styleConfig.contentTextClassName || ""}`
    .includes("--cv-template-sidebar-");
}

function normalizeSkillLevel(level: number | undefined): number | null {
  if (!Number.isFinite(level)) {
    return null;
  }

  const resolved = Math.max(0, Math.min(100, Math.round(level ?? 0)));
  return resolved > 0 ? resolved : null;
}

function resolveSkillLevelWidthClass(level: number) {
  if (level >= 95) return "w-full";
  if (level >= 90) return "w-11/12";
  if (level >= 80) return "w-5/6";
  if (level >= 70) return "w-3/4";
  if (level >= 60) return "w-2/3";
  if (level >= 50) return "w-1/2";
  if (level >= 40) return "w-2/5";
  if (level >= 30) return "w-1/3";
  if (level >= 20) return "w-1/4";
  if (level >= 10) return "w-1/6";
  return "w-1/12";
}

function buildSkillsPayload(title: string, items: TealSkillItemData[]) {
  return {
    title,
    items: items.map((item, index) => ({
      id: item.id || `skill-${index + 1}`,
      name: item.name,
      level: item.level,
      group: item.group,
    })),
  };
}

function normalizeEducationItems(data: EducationSectionData): TealEducationItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "edu-1",
        institution: "",
        degree: "",
        startDate: "",
        endDate: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;

    return {
      id: toSafeText(record.id) || `edu-${index + 1}`,
      institution: toSafeText(record.institution),
      degree: toSafeText(record.degree),
      startDate: toSafeText(record.startDate),
      endDate: toSafeText(record.endDate),
    };
  });
}

function buildEducationPayload(title: string, items: TealEducationItemData[]) {
  return {
    title,
    items: items.map((item, index) => ({
      id: item.id || `edu-${index + 1}`,
      institution: item.institution,
      degree: item.degree,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
  };
}

function normalizeCertificateItems(data: CertificatesSectionData): TealCertificateItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "cert-1",
        name: "",
        issuer: "",
        date: "",
        url: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;

    return {
      id: toSafeText(record.id) || `cert-${index + 1}`,
      name: toSafeText(record.name),
      issuer: toSafeText(record.issuer),
      date: toSafeText(record.date),
      url: toSafeText(record.url),
    };
  });
}

function buildCertificatesPayload(title: string, items: TealCertificateItemData[]) {
  return {
    title,
    items: items.map((item, index) => ({
      id: item.id || `cert-${index + 1}`,
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      url: item.url,
    })),
  };
}

export function normalizeLanguageItems(data: LanguagesSectionData): TealLanguageItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "lang-1",
        name: "",
        level: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;

    return {
      id: toSafeText(record.id) || `lang-${index + 1}`,
      name: toSafeText(record.name),
      level: toSafeText(record.level),
    };
  });
}

export function buildLanguagesPayload(title: string, items: TealLanguageItemData[]) {
  const normalizedItems = items.map((item, index) => ({
    id: item.id || `lang-${index + 1}`,
    name: item.name,
    level: item.level,
  }));

  return {
    title,
    items: normalizedItems,
    text: normalizedItems
      .map((item) => {
        const name = item.name.trim();
        const level = item.level.trim();

        if (!name && !level) {
          return "";
        }

        if (!level) {
          return name;
        }

        return `${name} - ${level}`;
      })
      .filter(Boolean)
      .join("\n"),
  };
}

export function normalizeAwardItems(data: AwardsSectionData): TealAwardItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [{ ...AWARD_EMPTY_ITEM_TEMPLATE }];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;

    return {
      id: toSafeText(record.id) || `award-${index + 1}`,
      date: toSafeText(record.date),
      title: toSafeText(record.title),
      issuer: toSafeText(record.issuer),
      detail: stripHtml(toSafeText(record.description) || toSafeText(record.detail)),
    };
  });
}

export function buildAwardsPayload(title: string, items: TealAwardItemData[]) {
  return {
    title,
    items: items.map((item, index) => ({
      id: item.id || `award-${index + 1}`,
      date: item.date,
      title: item.title,
      issuer: item.issuer,
      description: item.detail,
    })),
  };
}

export function SectionHeader({
  title,
  icon,
  isSectionActive,
  onChangeTitle,
  onChangeIcon,
  titleTextClassName,
  dividerClassName,
  iconBackgroundClassName,
  iconBorderClassName,
  iconColorClassName,
}: SectionHeaderProps) {
  const Icon = ICON_MAP[icon] ?? FileText;
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const canEditIcon = isSectionActive && typeof onChangeIcon === "function";

  useEffect(() => {
    if (!showIconPicker) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current) {
        return;
      }

      const targetNode = event.target as Node | null;
      if (!targetNode || pickerRef.current.contains(targetNode)) {
        return;
      }

      setShowIconPicker(false);
    };

    window.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [showIconPicker]);

  useEffect(() => {
    if (canEditIcon) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIconPicker(false);
  }, [canEditIcon]);

  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-2">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();

              if (!canEditIcon) {
                return;
              }

              event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();

              if (!canEditIcon) {
                return;
              }

              setShowIconPicker((previousState) => !previousState);
            }}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center border transition",
              iconBorderClassName ?? "border-[rgb(var(--cv-template-accent-rgb,15_118_110))]",
              iconBackgroundClassName ?? "bg-[rgb(var(--cv-template-accent-rgb,15_118_110))]",
              iconColorClassName ?? "text-white",
              canEditIcon ? "hover:brightness-95" : "",
            )}
            title={canEditIcon ? "Chọn biểu tượng mục" : "Biểu tượng mục"}
          >
            <Icon size={11} />
          </button>

          {canEditIcon && showIconPicker ? (
            <div className="absolute left-0 top-6 z-40 grid min-w-35 grid-cols-4 gap-1 border border-slate-300 bg-white p-1.5 shadow-[0_16px_36px_-20px_rgba(15,23,42,0.55)]">
              {ICON_PICKER_OPTIONS.map((iconToken) => {
                const OptionIcon = ICON_MAP[iconToken] ?? FileText;
                const isSelected = iconToken === icon;

                return (
                  <button
                    key={iconToken}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChangeIcon?.(iconToken);
                      setShowIconPicker(false);
                    }}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center border text-slate-600 transition",
                      isSelected
                        ? "border-[rgb(var(--cv-template-accent-rgb,15_118_110))] bg-[rgb(var(--cv-template-accent-rgb,15_118_110)/0.12)] text-[rgb(var(--cv-template-accent-rgb,15_118_110))]"
                        : "border-slate-200 hover:border-[rgb(var(--cv-template-accent-rgb,15_118_110))] hover:text-[rgb(var(--cv-template-accent-rgb,15_118_110))]",
                    )}
                    title={iconToken}
                  >
                    <OptionIcon size={13} />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <EditableText
            value={title}
            placeholder="Section title"
            isSectionActive={isSectionActive}
            onCommit={onChangeTitle}
            multiline={false}
            showToolbar={false}
            readClassName={cn(
              "px-0 py-0 text-[16px] font-semibold leading-6",
              titleTextClassName ?? "text-[rgb(var(--cv-template-accent-rgb,15_118_110))]",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-1 py-0.5 shadow-none"
          />
        </div>
      </div>
      <span className={cn("mt-1 block h-px w-full", dividerClassName ?? "bg-slate-300")} />
    </div>
  );
}

interface AddItemButtonProps {
  label: string;
  onClick: () => void;
}

export function AddItemButton({ label, onClick }: AddItemButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        // Prevent focus transfer to the button for all pointer types so any
        // active inline editor does not emit a stale blur-commit payload.
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        // Keep current editor focus stable so blur-based commit handlers do not
        // race and overwrite item-list updates triggered by this add action.
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800"
    >
      <Plus size={12} />
      {label}
    </button>
  );
}

export function TealCustomSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<CustomSectionData>) {
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const sectionText = toSafeText(data.text);
  const listItems = Array.isArray(data.items) ? data.items.map((item) => toSafeText(item)) : [];
  const hasList = Array.isArray(data.items);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome: true,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
          onChangeTitle={(nextTitle) => onEdit({ ...data, title: nextTitle })}
          titleTextClassName={styleConfig.titleTextClassName}
          dividerClassName={styleConfig.dividerClassName}
          iconBackgroundClassName={styleConfig.iconBackgroundClassName}
          iconBorderClassName={styleConfig.iconBorderClassName}
          iconColorClassName={styleConfig.iconColorClassName}
        />

        <div className="space-y-2 pl-1" data-cv-section-content>
          <EditableText
            value={sectionText}
            placeholder="Nhập nội dung mục tùy chỉnh"
            isSectionActive={isActive}
            onCommit={(nextValue) =>
              onEdit({
                ...data,
                title: sectionTitle,
                text: nextValue,
                items: hasList ? listItems : undefined,
              })}
            multiline
            minRows={3}
            showToolbar
            readClassName={cn(
              "px-0 py-0 text-[13px] leading-[1.8]",
              useSidebarContrastPalette
                ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                : "text-slate-700",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          {hasList ? (
            <EditableList
              items={listItems}
              placeholder="Thêm nội dung"
              isSectionActive={isActive}
              onCommit={(nextItems) =>
                onEdit({
                  ...data,
                  title: sectionTitle,
                  text: sectionText,
                  items: nextItems.length > 0 ? nextItems : undefined,
                })}
              readClassName={cn(
                "px-0 py-0 text-[13px] leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                  : "text-slate-800",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface OverviewItemProps {
  item: TealOverviewItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  useSidebarContrastPalette?: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, nextContent: string) => void;
  onRemove: (index: number) => void;
}

export function OverviewItem({
  item,
  index,
  isSectionActive,
  isSelected,
  useSidebarContrastPalette = false,
  onSelect,
  onChange,
  onRemove,
}: OverviewItemProps) {
  return (
    <div
      className={cn(
        "group/overview relative border px-1 py-0.5 transition-colors",
        isSectionActive && isSelected
          ? useSidebarContrastPalette
            ? "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.82)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.28)]"
            : "border-slate-300 bg-white"
          : "border-transparent",
      )}
      data-cv-split-item="true"
      data-cv-item-id={item.id || ""}
      data-cv-item-index={index}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <EditableText
        value={item.content}
        placeholder="Nội dung overview"
        isSectionActive={isSectionActive}
        onCommit={(nextValue) => onChange(index, nextValue)}
        multiline
        minRows={1}
        showToolbar
        preserveDashBullets
        readClassName={cn(
          "px-0 py-0 text-[14px] leading-6",
          useSidebarContrastPalette
            ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
            : "text-slate-800",
        )}
        editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
      />

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa ô nội dung"
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </div>
  );
}

export function OverviewSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<SummarySectionData>) {
  const overviewItems = normalizeOverviewItems(data);
  const rawOverviewItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawOverviewItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawOverviewItems);
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < overviewItems.length
      ? selectedIndex
      : null;

  const updateOverviewItems = (nextItems: TealOverviewItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildOverviewPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = nextItems.map((item, index) => {
      const rawIndex = chunkStartIndex + index;
      const sourceItem = isObjectRecord(fullRawOverviewItems[rawIndex])
        ? (fullRawOverviewItems[rawIndex] as Record<string, unknown>)
        : null;

      return {
        ...(sourceItem ?? {}),
        id: item.id || toSafeText(sourceItem?.id) || `ov-${rawIndex + 1}`,
        content: item.content,
      };
    });

    const tailStartIndex = Math.min(chunkStartIndex + rawOverviewItems.length, fullRawOverviewItems.length);
    const mergedItems = [
      ...fullRawOverviewItems.slice(0, chunkStartIndex),
      ...nextChunkItems,
      ...fullRawOverviewItems.slice(tailStartIndex),
    ];

    onEdit({
      title: sectionTitle,
      items: mergedItems as SummarySectionData["items"],
      text: mergedItems
        .map((item) => toSafeText((item as Record<string, unknown>).content))
        .join("\n"),
    });
  };

  const addOverviewItem = () => {
    const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
      fullRawItems: fullRawOverviewItems,
      chunkStartIndex,
      chunkLength: rawOverviewItems.length,
      sourceItemsFromSplit,
    });

    const nextRawItems = appendTealTimelineItem<Record<string, unknown>>(fullRawOverviewItems, {
      sourceNode: addTarget.sourceNode,
      fallbackNode: OVERVIEW_EMPTY_ITEM_TEMPLATE,
      idPrefix: "ov",
      insertAt: addTarget.insertAt,
    });

    onEdit({
      title: sectionTitle,
      items: nextRawItems as SummarySectionData["items"],
      text: nextRawItems
        .map((item) => toSafeText((item as Record<string, unknown>).content))
        .join("\n"),
    });
    setSelectedIndex(addTarget.selectedIndexWithinChunk);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawOverviewItems as SummarySectionData["items"],
                  text: fullRawOverviewItems
                    .map((item) => toSafeText((item as Record<string, unknown>).content))
                    .join("\n"),
                });
                return;
              }

              onEdit(buildOverviewPayload(nextTitle, overviewItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-0.5" data-cv-section-content>
          {overviewItems.map((item, index) => (
            <OverviewItem
              key={item.id || `overview-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
              useSidebarContrastPalette={useSidebarContrastPalette}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, nextContent) => {
                const nextItems = overviewItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        content: nextContent,
                      }
                    : currentItem,
                );
                updateOverviewItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const targetRawIndex = sourceItemsFromSplit
                  ? chunkStartIndex + targetIndex
                  : targetIndex;
                const nextRawItems = fullRawOverviewItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                const nextOverviewRawItems = nextRawItems.length > 0
                  ? nextRawItems
                  : appendTealTimelineItem([], {
                      fallbackNode: OVERVIEW_EMPTY_ITEM_TEMPLATE,
                      idPrefix: "ov",
                    });

                onEdit({
                  title: sectionTitle,
                  items: nextOverviewRawItems as SummarySectionData["items"],
                  text: nextOverviewRawItems
                    .map((item) => toSafeText((item as Record<string, unknown>).content))
                    .join("\n"),
                });

                setSelectedIndex((previousIndex) => {
                  if (sourceItemsFromSplit) {
                    return null;
                  }

                  const nextLength = nextRawItems.length > 0 ? nextRawItems.length : 1;

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextLength) {
                    return nextLength - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm nội dung" onClick={addOverviewItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface WorkExperienceItemProps {
  item: TealWorkExperienceItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  isSidebarReferenceLayout?: boolean;
  useSidebarContrastPalette?: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealWorkExperienceItemData>) => void;
  onRemove: (index: number) => void;
}

export function WorkExperienceItem({
  item,
  index,
  isSectionActive,
  isSelected,
  isSidebarReferenceLayout = false,
  useSidebarContrastPalette = false,
  onSelect,
  onChange,
  onRemove,
}: WorkExperienceItemProps) {
  return (
    <div
      className={cn(
        "group/work relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected
          ? useSidebarContrastPalette
            ? "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.82)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.28)]"
            : "border-slate-300 bg-white"
          : "border-transparent",
      )}
      data-cv-split-item="true"
      data-cv-item-id={item.id || ""}
      data-cv-item-index={index}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      {isSidebarReferenceLayout ? (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <EditableText
                value={item.rightTitle}
                placeholder="Tên công ty"
                isSectionActive={isSectionActive}
                onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName={cn(
                  "px-0 py-0 text-[14px] font-bold leading-6",
                  useSidebarContrastPalette
                    ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                    : "text-slate-900",
                )}
                editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
              />

              <EditableText
                value={item.rightSubtitle}
                placeholder="Vị trí hoặc mô tả ngắn"
                isSectionActive={isSectionActive}
                onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName={cn(
                  "px-0 py-0 text-[14px] italic leading-6",
                  useSidebarContrastPalette
                    ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                    : "text-slate-700",
                )}
                editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
              />
            </div>

            <EditableText
              value={item.leftDate}
              placeholder="01/2018 – Present"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName={cn(
                "px-0 py-0 text-right text-[12px] font-semibold leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                  : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 text-right shadow-none"
            />
          </div>

          <EditableText
            value={item.rightDescription}
            placeholder="- Mô tả công việc\n- Thành tích chính"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { rightDescription: nextValue })}
            multiline
            minRows={1}
            showToolbar
            readClassName={cn(
              "px-0 py-0 text-[13px] leading-5",
              useSidebarContrastPalette
                ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                : "text-slate-700",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-[3fr_7fr] gap-x-2">
          <div>
            <EditableText
              value={item.leftDate}
              placeholder="01/2018 – Present"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[14px] font-semibold leading-6 text-slate-800"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          </div>

          <div className="space-y-0.5">
            <EditableText
              value={item.rightTitle}
              placeholder="Tên công ty"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.rightSubtitle}
              placeholder="Vị trí hoặc mô tả ngắn"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[14px] italic leading-6 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.rightDescription}
              placeholder="- Mô tả công việc\n- Thành tích chính"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightDescription: nextValue })}
              multiline
              minRows={1}
              showToolbar
              readClassName="px-0 py-0 text-[13px] leading-5 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          </div>
        </div>
      )}

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa kinh nghiệm"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function WorkExperienceSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ExperienceSectionData>) {
  const workItems = normalizeWorkExperienceItems(data);
  const rawWorkItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawWorkItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawWorkItems);
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const isSidebarReferenceLayout = isSidebarReferenceLayoutVariant(styleConfig.layoutVariant);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < workItems.length ? selectedIndex : null;

  const updateWorkItems = (nextItems: TealWorkExperienceItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildWorkExperiencePayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = nextItems.map((item, index) =>
      buildWorkExperienceItemRecord(item, chunkStartIndex + index),
    );
    const tailStartIndex = Math.min(chunkStartIndex + rawWorkItems.length, fullRawWorkItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawWorkItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawWorkItems.slice(tailStartIndex),
      ] as ExperienceSectionData["items"],
    });
  };

  const addWorkExperienceItem = () => {
    const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
      fullRawItems: fullRawWorkItems,
      chunkStartIndex,
      chunkLength: rawWorkItems.length,
      sourceItemsFromSplit,
    });

    const nextRawItems = appendWorkExperienceItem(fullRawWorkItems, {
      insertAt: addTarget.insertAt,
      sourceNode: addTarget.sourceNode,
    });

    onEdit({
      title: sectionTitle,
      items: nextRawItems as ExperienceSectionData["items"],
    });
    setSelectedIndex(addTarget.selectedIndexWithinChunk);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawWorkItems as ExperienceSectionData["items"],
                });
                return;
              }

              onEdit(buildWorkExperiencePayload(nextTitle, workItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div
          className={cn(
            "divide-y",
            useSidebarContrastPalette
              ? "divide-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.58)]"
              : "divide-slate-300/70",
          )}
          data-cv-section-content
        >
          {workItems.map((item, index) => (
            <WorkExperienceItem
              key={item.id || `work-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
              isSidebarReferenceLayout={isSidebarReferenceLayout}
              useSidebarContrastPalette={useSidebarContrastPalette}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, updates) => {
                const nextItems = workItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        ...updates,
                      }
                    : currentItem,
                );
                updateWorkItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const targetRawIndex = sourceItemsFromSplit
                  ? chunkStartIndex + targetIndex
                  : targetIndex;
                const nextRawItems = fullRawWorkItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                onEdit({
                  title: sectionTitle,
                  items: (nextRawItems.length > 0
                    ? nextRawItems
                    : appendWorkExperienceItem([])) as ExperienceSectionData["items"],
                });
                setSelectedIndex((previousIndex) => {
                  if (sourceItemsFromSplit) {
                    return null;
                  }

                  const nextLength = nextRawItems.length > 0 ? nextRawItems.length : 1;

                  if (nextLength === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextLength) {
                    return nextLength - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm kinh nghiệm" onClick={addWorkExperienceItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  item: TealActivityItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  isSidebarReferenceLayout?: boolean;
  useSidebarContrastPalette?: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealActivityItemData>) => void;
  onRemove: (index: number) => void;
}

export function ActivityItem({
  item,
  index,
  isSectionActive,
  isSelected,
  isSidebarReferenceLayout = false,
  useSidebarContrastPalette = false,
  onSelect,
  onChange,
  onRemove,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "group/activity relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected
          ? useSidebarContrastPalette
            ? "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.82)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.28)]"
            : "border-slate-300 bg-white"
          : "border-transparent",
      )}
      data-cv-split-item="true"
      data-cv-item-id={item.id || ""}
      data-cv-item-index={index}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      {isSidebarReferenceLayout ? (
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <EditableText
              value={item.rightTitle}
              placeholder="Tên hoạt động"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName={cn(
                "px-0 py-0 text-[14px] font-bold leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                  : "text-slate-900",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.leftDate}
              placeholder="06/2016"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName={cn(
                "px-0 py-0 text-right text-[12px] font-semibold leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                  : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 text-right shadow-none"
            />
          </div>

          <EditableText
            value={item.rightSubtitle}
            placeholder="Vai trò"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName={cn(
              "px-0 py-0 text-[14px] leading-6",
              useSidebarContrastPalette
                ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                : "text-slate-700",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-[3fr_7fr] gap-x-2">
          <EditableText
            value={item.leftDate}
            placeholder="06/2016"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-semibold leading-6 text-slate-800"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <div className="space-y-0.5">
            <EditableText
              value={item.rightTitle}
              placeholder="Tên hoạt động"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.rightSubtitle}
              placeholder="Vai trò"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[14px] leading-6 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          </div>
        </div>
      )}

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa hoạt động"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function TealActivitiesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ActivitiesSectionData>) {
  const activityItems = normalizeActivityItems(data);
  const rawActivityItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawActivityItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawActivityItems);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const isSidebarReferenceLayout = isSidebarReferenceLayoutVariant(styleConfig.layoutVariant);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < activityItems.length
      ? selectedIndex
      : null;

  const updateActivityItems = (nextItems: TealActivityItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildActivitiesPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildActivitiesPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawActivityItems.length, fullRawActivityItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawActivityItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawActivityItems.slice(tailStartIndex),
      ] as ActivitiesSectionData["items"],
    });
  };

  const addActivityItem = () => {
    const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
      fullRawItems: fullRawActivityItems,
      chunkStartIndex,
      chunkLength: rawActivityItems.length,
      sourceItemsFromSplit,
    });

    const nextRawItems = appendTealTimelineItem(fullRawActivityItems, {
      sourceNode: addTarget.sourceNode,
      fallbackNode: ACTIVITY_EMPTY_ITEM_TEMPLATE,
      idPrefix: "act",
      insertAt: addTarget.insertAt,
    });
    onEdit({
      title: sectionTitle,
      items: nextRawItems as ActivitiesSectionData["items"],
    });
    setSelectedIndex(addTarget.selectedIndexWithinChunk);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawActivityItems as ActivitiesSectionData["items"],
                });
                return;
              }

              onEdit(buildActivitiesPayload(nextTitle, activityItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div
          className={cn(
            "divide-y",
            useSidebarContrastPalette
              ? "divide-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.58)]"
              : "divide-slate-300/70",
          )}
          data-cv-section-content
        >
          {activityItems.map((item, index) => (
            <ActivityItem
              key={item.id || `activity-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
              isSidebarReferenceLayout={isSidebarReferenceLayout}
              useSidebarContrastPalette={useSidebarContrastPalette}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, updates) => {
                const nextItems = activityItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        ...updates,
                      }
                    : currentItem,
                );
                updateActivityItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const targetRawIndex = sourceItemsFromSplit
                  ? chunkStartIndex + targetIndex
                  : targetIndex;
                const nextRawItems = fullRawActivityItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                onEdit({
                  title: sectionTitle,
                  items: (nextRawItems.length > 0
                    ? nextRawItems
                    : appendTealTimelineItem([], {
                        fallbackNode: ACTIVITY_EMPTY_ITEM_TEMPLATE,
                        idPrefix: "act",
                      })) as ActivitiesSectionData["items"],
                });
                setSelectedIndex((previousIndex) => {
                  if (sourceItemsFromSplit) {
                    return null;
                  }

                  const nextLength = nextRawItems.length > 0 ? nextRawItems.length : 1;

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextLength) {
                    return nextLength - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm hoạt động" onClick={addActivityItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SkillGroupListProps {
  label: string;
  items: TealSkillItemData[];
  isSectionActive: boolean;
  isSidebarReferenceLayout?: boolean;
  useSidebarContrastPalette?: boolean;
  onChangeName: (id: string, nextName: string) => void;
  onRemove: (id: string) => void;
}

function SkillGroupList({
  label,
  items,
  isSectionActive,
  isSidebarReferenceLayout = false,
  useSidebarContrastPalette = false,
  onChangeName,
  onRemove,
}: SkillGroupListProps) {
  if (items.length === 0) {
    return null;
  }

  if (isSidebarReferenceLayout) {
    return (
      <div className="space-y-1.5 text-[13px]">
        <span
          className={cn(
            "inline-flex text-[12px] font-bold uppercase tracking-[0.12em]",
            useSidebarContrastPalette
              ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
              : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
          )}
        >
          {label}
        </span>

        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const level = normalizeSkillLevel(item.level);

            return (
              <li
                key={item.id}
                className="group/skill-item relative pr-6"
                data-cv-split-item="true"
                data-cv-item-id={item.id || ""}
                data-cv-item-index={index}
              >
                <div className="flex items-center justify-between gap-2">
                  <EditableText
                    value={item.name}
                    placeholder="Nội dung kỹ năng"
                    isSectionActive={isSectionActive}
                    onCommit={(nextValue) => onChangeName(item.id, nextValue)}
                    multiline={false}
                    showToolbar={false}
                    readClassName={cn(
                      "px-0 py-0 text-[13px] leading-6",
                      useSidebarContrastPalette
                        ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                        : "text-slate-800",
                    )}
                    editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                  />

                  {level ? (
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        useSidebarContrastPalette
                          ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                          : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
                      )}
                    >
                      {level}%
                    </span>
                  ) : null}
                </div>

                {level ? (
                  <div
                    className={cn(
                      "mt-1 h-1.5 w-full overflow-hidden rounded-full",
                      useSidebarContrastPalette
                        ? "bg-[rgb(var(--cv-template-sidebar-skill-track-rgb,120_177_168)/0.65)]"
                        : "bg-[rgb(var(--cv-template-primary-rgb,31_90_59)/0.2)]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        useSidebarContrastPalette
                          ? "bg-[rgb(var(--cv-template-sidebar-skill-fill-rgb,255_255_255))]"
                          : "bg-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
                        resolveSkillLevelWidthClass(level),
                      )}
                    />
                  </div>
                ) : null}

                {isSectionActive ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="absolute right-0 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-50 text-rose-500 opacity-0 transition group-hover/skill-item:opacity-100 hover:bg-rose-100"
                    title="Xóa kỹ năng"
                  >
                    <Trash2 size={9} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-4 text-[13px]">
      <span className="pt-0.5 font-bold text-slate-800">{label}</span>

      <ul className="ml-4 list-disc space-y-0.5">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="group/skill-item relative pl-0.5 pr-6"
            data-cv-split-item="true"
            data-cv-item-id={item.id || ""}
            data-cv-item-index={index}
          >
            <EditableText
              value={item.name}
              placeholder="Nội dung kỹ năng"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChangeName(item.id, nextValue)}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[13px] leading-6 text-slate-800"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            {isSectionActive ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(item.id);
                }}
                className="absolute right-0 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-50 text-rose-500 opacity-0 transition group-hover/skill-item:opacity-100 hover:bg-rose-100"
                title="Xóa kỹ năng"
              >
                <Trash2 size={9} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TealSkillsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<SkillsSectionData>) {
  const splitContext = (data as SkillsSectionData & {
    __splitContext?: {
      startIndex?: unknown;
      itemCount?: unknown;
      totalCount?: unknown;
      sourceItems?: unknown;
      isContinuation?: unknown;
    };
  }).__splitContext;
  const skillItems = normalizeSkillItems(data);
  const rawSkillItems = Array.isArray(data.items) ? data.items : [];
  const sourceItemsFromSplit = Array.isArray(splitContext?.sourceItems)
    ? splitContext.sourceItems
    : null;
  const fullRawSkillItems = sourceItemsFromSplit ?? rawSkillItems;
  const chunkStartIndex = Number.isFinite(Number(splitContext?.startIndex))
    ? Math.max(0, Math.floor(Number(splitContext?.startIndex)))
    : 0;
  const chunkItemCount = Number.isFinite(Number(splitContext?.itemCount))
    ? Math.max(0, Math.floor(Number(splitContext?.itemCount)))
    : rawSkillItems.length;
  const totalItemCount = Number.isFinite(Number(splitContext?.totalCount))
    ? Math.max(0, Math.floor(Number(splitContext?.totalCount)))
    : fullRawSkillItems.length;
  const isSplitContinuation = splitContext?.isContinuation === true && chunkStartIndex > 0;
  const showSectionChrome = !isSplitContinuation;
  const showSkillAddActions = isActive;
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const isSidebarReferenceLayout = isSidebarReferenceLayoutVariant(styleConfig.layoutVariant);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);

  const updateSkillItems = (nextItems: TealSkillItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildSkillsPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildSkillsPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawSkillItems.length, fullRawSkillItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawSkillItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawSkillItems.slice(tailStartIndex),
      ] as SkillsSectionData["items"],
    });
  };

  const mainItems = skillItems.filter((item) => item.group === "main");
  const otherItems = skillItems.filter((item) => item.group === "other");

  const addSkillItem = (group: "main" | "other") => {
    if (sourceItemsFromSplit) {
      const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
        fullRawItems: fullRawSkillItems,
        chunkStartIndex,
        chunkLength: chunkItemCount,
        sourceItemsFromSplit,
      });

      const nextRawItems = appendTealTimelineItem<Record<string, unknown>>(fullRawSkillItems, {
        sourceNode: addTarget.sourceNode,
        fallbackNode: {
          ...SKILL_EMPTY_ITEM_TEMPLATE,
          group,
        },
        idPrefix: `skill-${group}`,
        insertAt: addTarget.insertAt,
      }).map((item, index) =>
        index === addTarget.insertAt
          ? {
              ...item,
              group,
            }
          : item,
      );

      onEdit({
        title: sectionTitle,
        items: nextRawItems as SkillsSectionData["items"],
      });
      return;
    }

    const nextRawItems = appendTealTimelineSkillItem(fullRawSkillItems, group);
    onEdit({
      title: sectionTitle,
      items: nextRawItems as SkillsSectionData["items"],
    });
  };

  const updateSkillName = (skillId: string, nextName: string) => {
    updateSkillItems(
      skillItems.map((item) =>
        item.id === skillId
          ? {
              ...item,
              name: nextName,
            }
          : item,
      ),
    );
  };

  const removeSkillItem = (skillId: string) => {
    const nextItems = skillItems.filter((item) => item.id !== skillId);
    updateSkillItems(nextItems.length > 0 ? nextItems : [{ id: "skill-main-1", name: "", group: "main" }]);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawSkillItems as SkillsSectionData["items"],
                });
                return;
              }

              onEdit(buildSkillsPayload(nextTitle, skillItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-2.5 pl-1" data-cv-section-content>
          <SkillGroupList
            label="Kỹ năng chính"
            items={mainItems}
            isSectionActive={isActive}
            isSidebarReferenceLayout={isSidebarReferenceLayout}
            useSidebarContrastPalette={useSidebarContrastPalette}
            onChangeName={updateSkillName}
            onRemove={removeSkillItem}
          />
          <SkillGroupList
            label="Kỹ năng khác"
            items={otherItems}
            isSectionActive={isActive}
            isSidebarReferenceLayout={isSidebarReferenceLayout}
            useSidebarContrastPalette={useSidebarContrastPalette}
            onChangeName={updateSkillName}
            onRemove={removeSkillItem}
          />
        </div>

        {showSkillAddActions ? (
          <div className="mt-2 flex flex-wrap justify-end gap-1.5">
            <AddItemButton label="Thêm kỹ năng chính" onClick={() => addSkillItem("main")} />
            <AddItemButton label="Thêm kỹ năng khác" onClick={() => addSkillItem("other")} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TealAwardLineProps {
  item: TealAwardItemData;
  index: number;
  isSectionActive: boolean;
  isSidebarReferenceLayout?: boolean;
  useSidebarContrastPalette?: boolean;
  onChange: (index: number, updates: Partial<TealAwardItemData>) => void;
  onRemove: (index: number) => void;
}

export function shouldRenderExpandedAwardLine(item: TealAwardItemData, isSectionActive: boolean) {
  if (isSectionActive) {
    return true;
  }

  return [item.date, item.issuer, item.detail]
    .some((value) => value.trim().length > 0);
}

function TealAwardLine({
  item,
  index,
  isSectionActive,
  isSidebarReferenceLayout = false,
  useSidebarContrastPalette = false,
  onChange,
  onRemove,
}: TealAwardLineProps) {
  const shouldRenderExpandedLine = shouldRenderExpandedAwardLine(item, isSectionActive);

  if (!shouldRenderExpandedLine) {
    return (
      <div
        className="group/award-item relative pl-0.5"
        data-cv-split-item="true"
        data-cv-item-id={item.id || ""}
        data-cv-item-index={index}
      >
        <EditableText
          value={item.title}
          placeholder="Nội dung giải thưởng nổi bật"
          isSectionActive={isSectionActive}
          onCommit={(nextValue) => onChange(index, { title: nextValue })}
          multiline={false}
          showToolbar={false}
          readClassName="px-0 py-0 text-[13px] leading-6 text-slate-700"
          editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
        />

        {isSectionActive ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(index);
            }}
            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
            title="Xóa giải thưởng"
          >
            <Trash2 size={11} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/award-item relative",
        isSidebarReferenceLayout ? "space-y-0.5" : "grid grid-cols-[5.25rem_1fr] gap-x-4",
      )}
      data-cv-split-item="true"
      data-cv-item-id={item.id || ""}
      data-cv-item-index={index}
    >
      {isSidebarReferenceLayout ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <EditableText
              value={item.title}
              placeholder="Tên giải thưởng"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { title: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName={cn(
                "px-0 py-0 text-[13px] font-bold leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                  : "text-slate-900",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.date}
              placeholder="06/2016"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { date: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName={cn(
                "px-0 py-0 text-right text-[12px] font-semibold leading-6",
                useSidebarContrastPalette
                  ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                  : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
              )}
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 text-right shadow-none"
            />
          </div>

          <EditableText
            value={item.detail}
            placeholder="Mô tả ngắn hoặc liên kết chứng minh"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { detail: nextValue })}
            multiline
            minRows={1}
            showToolbar={false}
            readClassName={cn(
              "px-0 py-0 text-[12px] leading-5",
              useSidebarContrastPalette
                ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                : "text-slate-700",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.issuer}
            placeholder="Đơn vị tổ chức"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { issuer: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName={cn(
              "px-0 py-0 text-[11.5px] leading-5",
              useSidebarContrastPalette
                ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                : "text-slate-500",
            )}
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </>
      ) : (
        <>
          <EditableText
            value={item.date}
            placeholder="06/2016"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => onChange(index, { date: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[13px] font-bold leading-6 text-slate-900"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <div className="space-y-0.5">
            <EditableText
              value={item.title}
              placeholder="Tên giải thưởng"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { title: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[13px] font-bold leading-6 text-slate-900"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.detail}
              placeholder="Mô tả ngắn hoặc liên kết chứng minh"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { detail: nextValue })}
              multiline
              minRows={1}
              showToolbar={false}
              readClassName="px-0 py-0 text-[12px] leading-5 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />

            <EditableText
              value={item.issuer}
              placeholder="Đơn vị tổ chức"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => onChange(index, { issuer: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[11.5px] leading-5 text-slate-500"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          </div>
        </>
      )}

      {isSectionActive ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa giải thưởng"
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </div>
  );
}

export function TealAwardsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<AwardsSectionData>) {
  const awardItems = normalizeAwardItems(data);
  const rawAwardItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawAwardItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawAwardItems);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const isSidebarReferenceLayout = isSidebarReferenceLayoutVariant(styleConfig.layoutVariant);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;

  const updateAwardItems = (nextItems: TealAwardItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildAwardsPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildAwardsPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawAwardItems.length, fullRawAwardItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawAwardItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawAwardItems.slice(tailStartIndex),
      ] as AwardsSectionData["items"],
    });
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawAwardItems as AwardsSectionData["items"],
                });
                return;
              }

              onEdit(buildAwardsPayload(nextTitle, awardItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-2 pl-1" data-cv-section-content>
          {awardItems.map((item, index) => (
            <TealAwardLine
              key={item.id || `award-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSidebarReferenceLayout={isSidebarReferenceLayout}
              useSidebarContrastPalette={useSidebarContrastPalette}
              onChange={(targetIndex, updates) => {
                const nextItems = awardItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        ...updates,
                      }
                    : currentItem,
                );
                updateAwardItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const targetRawIndex = sourceItemsFromSplit
                  ? chunkStartIndex + targetIndex
                  : targetIndex;
                const nextRawItems = fullRawAwardItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                onEdit({
                  title: sectionTitle,
                  items: (nextRawItems.length > 0
                    ? nextRawItems
                    : appendTealTimelineItem([], {
                        fallbackNode: AWARD_RAW_EMPTY_ITEM_TEMPLATE,
                        idPrefix: "award",
                      })) as AwardsSectionData["items"],
                });
              }}
            />
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-2 flex justify-end">
            <AddItemButton
              label="Thêm giải thưởng"
              onClick={() => {
                const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
                  fullRawItems: fullRawAwardItems,
                  chunkStartIndex,
                  chunkLength: rawAwardItems.length,
                  sourceItemsFromSplit,
                });

                const nextRawItems = appendTealTimelineItem(fullRawAwardItems, {
                  sourceNode: addTarget.sourceNode,
                  fallbackNode: AWARD_RAW_EMPTY_ITEM_TEMPLATE,
                  idPrefix: "award",
                  insertAt: addTarget.insertAt,
                });
                onEdit({
                  title: sectionTitle,
                  items: nextRawItems as AwardsSectionData["items"],
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TealProjectsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ProjectsSectionData>) {
  const rawProjectItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawProjectItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawProjectItems);
  const projectItems = normalizeProjectsModel(data);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;

  const updateProjectItems = (nextItems: typeof projectItems) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildProjectsSectionPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildProjectsSectionPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawProjectItems.length, fullRawProjectItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawProjectItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawProjectItems.slice(tailStartIndex),
      ] as ProjectsSectionData["items"],
    });
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawProjectItems as ProjectsSectionData["items"],
                });
                return;
              }

              onEdit(buildProjectsSectionPayload(nextTitle, projectItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-3 pl-1" data-cv-section-content>
          <ProjectCollectionEditor projects={projectItems} isSectionActive={isActive} onChange={updateProjectItems} />
        </div>
      </div>
    </div>
  );
}

export function TealEducationSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<EducationSectionData>) {
  const educationItems = normalizeEducationItems(data);
  const rawEducationItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawEducationItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawEducationItems);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const isSidebarReferenceLayout = isSidebarReferenceLayoutVariant(styleConfig.layoutVariant);
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;

  const updateEducationItems = (nextItems: TealEducationItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildEducationPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildEducationPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawEducationItems.length, fullRawEducationItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawEducationItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawEducationItems.slice(tailStartIndex),
      ] as EducationSectionData["items"],
    });
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawEducationItems as EducationSectionData["items"],
                });
                return;
              }

              onEdit(buildEducationPayload(nextTitle, educationItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-2" data-cv-section-content>
          {educationItems.map((item, index) => (
            <div
              key={item.id || `education-item-${index}`}
              className={cn(
                "group/edu-item relative border-b px-0.5 py-1.5 last:border-b-0",
                useSidebarContrastPalette
                  ? "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.58)]"
                  : "border-slate-200/75",
                isSidebarReferenceLayout ? "space-y-0.5" : "grid grid-cols-[7.5rem_1fr] gap-x-3",
              )}
              data-cv-split-item="true"
              data-cv-item-id={item.id || ""}
              data-cv-item-index={index}
            >
              {isSidebarReferenceLayout ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <EditableText
                      value={item.institution}
                      placeholder="Nhập trường"
                      isSectionActive={isActive}
                      onCommit={(nextValue) => {
                        updateEducationItems(
                          educationItems.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  institution: nextValue,
                                }
                              : currentItem,
                          ),
                        );
                      }}
                      multiline={false}
                      showToolbar={false}
                      readClassName={cn(
                        "px-0 py-0 text-[13px] font-bold leading-6",
                        useSidebarContrastPalette
                          ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                          : "text-slate-900",
                      )}
                      editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                    />

                    <EditableText
                      value={`${item.startDate}${item.endDate ? ` - ${item.endDate}` : ""}`}
                      placeholder="2017-09 - 2021-06"
                      isSectionActive={isActive}
                      onCommit={(nextValue) => {
                        const [startDate, ...rest] = nextValue.split(/\s*[–-]\s*/);
                        const endDate = rest.join(" - ").trim();
                        updateEducationItems(
                          educationItems.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  startDate: startDate?.trim() || "",
                                  endDate,
                                }
                              : currentItem,
                          ),
                        );
                      }}
                      multiline={false}
                      showToolbar={false}
                      readClassName={cn(
                        "px-0 py-0 text-right text-[12px] font-semibold leading-6",
                        useSidebarContrastPalette
                          ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                          : "text-[rgb(var(--cv-template-primary-rgb,31_90_59))]",
                      )}
                      editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 text-right shadow-none"
                    />
                  </div>

                  <EditableText
                    value={item.degree}
                    placeholder="Nhập chuyên ngành"
                    isSectionActive={isActive}
                    onCommit={(nextValue) => {
                      updateEducationItems(
                        educationItems.map((currentItem, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentItem,
                                degree: nextValue,
                              }
                            : currentItem,
                        ),
                      );
                    }}
                    multiline={false}
                    showToolbar={false}
                    readClassName={cn(
                      "px-0 py-0 text-[12.5px] italic leading-6",
                      useSidebarContrastPalette
                        ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                        : "text-slate-600",
                    )}
                    editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                  />
                </>
              ) : (
                <>
                  <div>
                    <EditableText
                      value={`${item.startDate}${item.endDate ? ` - ${item.endDate}` : ""}`}
                      placeholder="2017-09 - 2021-06"
                      isSectionActive={isActive}
                      onCommit={(nextValue) => {
                        const [startDate, ...rest] = nextValue.split(/\s*[–-]\s*/);
                        const endDate = rest.join(" - ").trim();
                        updateEducationItems(
                          educationItems.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  startDate: startDate?.trim() || "",
                                  endDate,
                                }
                              : currentItem,
                          ),
                        );
                      }}
                      multiline={false}
                      showToolbar={false}
                      readClassName="px-0 py-0 text-[13px] font-bold leading-6 text-slate-700"
                      editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <EditableText
                      value={item.institution}
                      placeholder="Nhập trường"
                      isSectionActive={isActive}
                      onCommit={(nextValue) => {
                        updateEducationItems(
                          educationItems.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  institution: nextValue,
                                }
                              : currentItem,
                          ),
                        );
                      }}
                      multiline={false}
                      showToolbar={false}
                      readClassName="px-0 py-0 text-[13px] font-bold leading-6 text-slate-900"
                      editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                    />

                    <EditableText
                      value={item.degree}
                      placeholder="Nhập chuyên ngành"
                      isSectionActive={isActive}
                      onCommit={(nextValue) => {
                        updateEducationItems(
                          educationItems.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  degree: nextValue,
                                }
                              : currentItem,
                          ),
                        );
                      }}
                      multiline={false}
                      showToolbar={false}
                      readClassName="px-0 py-0 text-[12.5px] italic leading-6 text-slate-600"
                      editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                    />
                  </div>
                </>
              )}

              {isActive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const targetRawIndex = sourceItemsFromSplit
                      ? chunkStartIndex + index
                      : index;
                    const nextRawItems = fullRawEducationItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                    onEdit({
                      title: sectionTitle,
                      items: (nextRawItems.length > 0
                        ? nextRawItems
                        : appendTealTimelineItem([], {
                            fallbackNode: EDUCATION_EMPTY_ITEM_TEMPLATE,
                            idPrefix: "edu",
                          })) as EducationSectionData["items"],
                    });
                  }}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
                  title="Xóa học vấn"
                >
                  <Trash2 size={11} />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm học vấn"
              onClick={() => {
                const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
                  fullRawItems: fullRawEducationItems,
                  chunkStartIndex,
                  chunkLength: rawEducationItems.length,
                  sourceItemsFromSplit,
                });

                const nextRawItems = appendTealTimelineItem(fullRawEducationItems, {
                  sourceNode: addTarget.sourceNode,
                  fallbackNode: EDUCATION_EMPTY_ITEM_TEMPLATE,
                  idPrefix: "edu",
                  insertAt: addTarget.insertAt,
                });
                onEdit({
                  title: sectionTitle,
                  items: nextRawItems as EducationSectionData["items"],
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TealCertificatesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<CertificatesSectionData>) {
  const certificateItems = normalizeCertificateItems(data);
  const rawCertificateItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawCertificateItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawCertificateItems);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const showAddActions = isActive;

  const updateCertificateItems = (nextItems: TealCertificateItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildCertificatesPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildCertificatesPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawCertificateItems.length, fullRawCertificateItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawCertificateItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawCertificateItems.slice(tailStartIndex),
      ] as CertificatesSectionData["items"],
    });
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawCertificateItems as CertificatesSectionData["items"],
                });
                return;
              }

              onEdit(buildCertificatesPayload(nextTitle, certificateItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <div className="space-y-2" data-cv-section-content>
          {certificateItems.map((item, index) => (
            <div
              key={item.id || `certificate-item-${index}`}
              className="group/cert-item relative rounded-md border border-slate-300 bg-white px-2 py-2"
              data-cv-split-item="true"
              data-cv-item-id={item.id || ""}
              data-cv-item-index={index}
            >
              <EditableText
                value={item.name}
                placeholder="Nhập tên chứng chỉ"
                isSectionActive={isActive}
                onCommit={(nextValue) => {
                  updateCertificateItems(
                    certificateItems.map((currentItem, currentIndex) =>
                      currentIndex === index
                        ? {
                            ...currentItem,
                            name: nextValue,
                          }
                        : currentItem,
                    ),
                  );
                }}
                multiline={false}
                showToolbar={false}
                readClassName="px-0 py-0 text-[12.5px] font-semibold leading-6 text-slate-800"
                editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
              />

              <div className="mt-1 grid gap-1.5">
                <EditableText
                  value={item.issuer}
                  placeholder="Đơn vị cấp"
                  isSectionActive={isActive}
                  onCommit={(nextValue) => {
                    updateCertificateItems(
                      certificateItems.map((currentItem, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentItem,
                              issuer: nextValue,
                            }
                          : currentItem,
                      ),
                    );
                  }}
                  multiline={false}
                  showToolbar={false}
                  readClassName="px-0 py-0 text-[12px] leading-5 text-slate-700"
                  editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />

                <EditableText
                  value={item.date}
                  placeholder="Năm cấp"
                  isSectionActive={isActive}
                  onCommit={(nextValue) => {
                    updateCertificateItems(
                      certificateItems.map((currentItem, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentItem,
                              date: nextValue,
                            }
                          : currentItem,
                      ),
                    );
                  }}
                  multiline={false}
                  showToolbar={false}
                  readClassName="px-0 py-0 text-[12px] leading-5 text-slate-700"
                  editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />

                <EditableText
                  value={item.url}
                  placeholder="Nhập liên kết"
                  isSectionActive={isActive}
                  onCommit={(nextValue) => {
                    updateCertificateItems(
                      certificateItems.map((currentItem, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentItem,
                              url: nextValue,
                            }
                          : currentItem,
                      ),
                    );
                  }}
                  multiline={false}
                  showToolbar={false}
                  readClassName="px-0 py-0 text-[12px] italic leading-5 text-slate-500"
                  editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />
              </div>

              {isActive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const targetRawIndex = sourceItemsFromSplit
                      ? chunkStartIndex + index
                      : index;
                    const nextRawItems = fullRawCertificateItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                    onEdit({
                      title: sectionTitle,
                      items: (nextRawItems.length > 0
                        ? nextRawItems
                        : appendTealTimelineItem([], {
                            fallbackNode: CERTIFICATE_EMPTY_ITEM_TEMPLATE,
                            idPrefix: "cert",
                          })) as CertificatesSectionData["items"],
                    });
                  }}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
                  title="Xóa chứng chỉ"
                >
                  <Trash2 size={11} />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm chứng chỉ"
              onClick={() => {
                const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
                  fullRawItems: fullRawCertificateItems,
                  chunkStartIndex,
                  chunkLength: rawCertificateItems.length,
                  sourceItemsFromSplit,
                });

                const nextRawItems = appendTealTimelineItem(fullRawCertificateItems, {
                  sourceNode: addTarget.sourceNode,
                  fallbackNode: CERTIFICATE_EMPTY_ITEM_TEMPLATE,
                  idPrefix: "cert",
                  insertAt: addTarget.insertAt,
                });
                onEdit({
                  title: sectionTitle,
                  items: nextRawItems as CertificatesSectionData["items"],
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TealLanguagesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<LanguagesSectionData>) {
  const languageItems = normalizeLanguageItems(data);
  const rawLanguageItems = Array.isArray(data.items) ? data.items : [];
  const {
    sourceItemsFromSplit,
    fullRawItems: fullRawLanguageItems,
    chunkStartIndex,
    showSectionChrome,
  } = resolveRepeatableSplitState(data, rawLanguageItems);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const useSidebarContrastPalette = shouldUseSidebarContrastPalette(styleConfig);
  const showAddActions = isActive;

  const updateLanguageItems = (nextItems: TealLanguageItemData[]) => {
    if (!sourceItemsFromSplit) {
      onEdit(buildLanguagesPayload(sectionTitle, nextItems));
      return;
    }

    const nextChunkItems = buildLanguagesPayload(sectionTitle, nextItems).items;
    const tailStartIndex = Math.min(chunkStartIndex + rawLanguageItems.length, fullRawLanguageItems.length);

    onEdit({
      title: sectionTitle,
      items: [
        ...fullRawLanguageItems.slice(0, chunkStartIndex),
        ...nextChunkItems,
        ...fullRawLanguageItems.slice(tailStartIndex),
      ] as LanguagesSectionData["items"],
    });
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      {showSectionChrome ? (
        <AddSectionButtons
          isActive={isActive}
          borderClassName={styleConfig.itemBorderClassName}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      ) : null}

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          resolveTealSectionFrameClassName({
            showSectionChrome,
            isActive,
            borderClassName: styleConfig.borderClassName,
            backgroundClassName: styleConfig.backgroundClassName,
          }),
        )}
      >
        {showSectionChrome ? (
          <SectionHeader
            title={sectionTitle}
            icon={styleConfig.icon}
            isSectionActive={isActive}
            onChangeIcon={(nextIcon) => onEdit({ icon: nextIcon })}
            onChangeTitle={(nextTitle) => {
              if (sourceItemsFromSplit) {
                onEdit({
                  title: nextTitle,
                  items: fullRawLanguageItems as LanguagesSectionData["items"],
                });
                return;
              }

              onEdit(buildLanguagesPayload(nextTitle, languageItems));
            }}
            titleTextClassName={styleConfig.titleTextClassName}
            dividerClassName={styleConfig.dividerClassName}
            iconBackgroundClassName={styleConfig.iconBackgroundClassName}
            iconBorderClassName={styleConfig.iconBorderClassName}
            iconColorClassName={styleConfig.iconColorClassName}
          />
        ) : null}

        <ul
          className={cn(
            "list-disc space-y-1 pl-5",
            useSidebarContrastPalette ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]" : "",
          )}
          data-cv-section-content
        >
          {languageItems.map((item, index) => (
            <li
              key={item.id || `language-item-${index}`}
              className="group/lang-item relative pr-6"
              data-cv-split-item="true"
              data-cv-item-id={item.id || ""}
              data-cv-item-index={index}
            >
              <div className="flex flex-wrap items-center gap-1">
                <EditableText
                  value={item.name}
                  placeholder="Nhập ngôn ngữ"
                  isSectionActive={isActive}
                  onCommit={(nextValue) => {
                    updateLanguageItems(
                      languageItems.map((currentItem, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentItem,
                              name: nextValue,
                            }
                          : currentItem,
                      ),
                    );
                  }}
                  multiline={false}
                  showToolbar={false}
                  readClassName={cn(
                    "inline px-0 py-0 text-[13px] leading-6",
                    useSidebarContrastPalette
                      ? "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                      : "text-slate-800",
                  )}
                  editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />
                <span
                  className={cn(
                    "text-[13px]",
                    useSidebarContrastPalette
                      ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                      : "text-slate-500",
                  )}
                >
                  -
                </span>
                <EditableText
                  value={item.level}
                  placeholder="Mức độ"
                  isSectionActive={isActive}
                  onCommit={(nextValue) => {
                    updateLanguageItems(
                      languageItems.map((currentItem, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentItem,
                              level: nextValue,
                            }
                          : currentItem,
                      ),
                    );
                  }}
                  multiline={false}
                  showToolbar={false}
                  readClassName={cn(
                    "inline px-0 py-0 text-[13px] leading-6",
                    useSidebarContrastPalette
                      ? "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]"
                      : "text-slate-700",
                  )}
                  editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />
              </div>

              {isActive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const targetRawIndex = sourceItemsFromSplit
                      ? chunkStartIndex + index
                      : index;
                    const nextRawItems = fullRawLanguageItems.filter((_, currentIndex) => currentIndex !== targetRawIndex);
                    onEdit({
                      title: sectionTitle,
                      items: (nextRawItems.length > 0
                        ? nextRawItems
                        : appendTealTimelineItem([], {
                            fallbackNode: LANGUAGE_EMPTY_ITEM_TEMPLATE,
                            idPrefix: "lang",
                          })) as LanguagesSectionData["items"],
                    });
                  }}
                  className="absolute right-0 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-50 text-rose-500 opacity-0 transition group-hover/lang-item:opacity-100 hover:bg-rose-100"
                  title="Xóa ngôn ngữ"
                >
                  <Trash2 size={9} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {showAddActions ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm ngôn ngữ"
              onClick={() => {
                const addTarget = resolveRepeatableAddTarget<Record<string, unknown>>({
                  fullRawItems: fullRawLanguageItems,
                  chunkStartIndex,
                  chunkLength: rawLanguageItems.length,
                  sourceItemsFromSplit,
                });

                const nextRawItems = appendTealTimelineItem(fullRawLanguageItems, {
                  sourceNode: addTarget.sourceNode,
                  fallbackNode: LANGUAGE_EMPTY_ITEM_TEMPLATE,
                  idPrefix: "lang",
                  insertAt: addTarget.insertAt,
                });
                onEdit({
                  title: sectionTitle,
                  items: nextRawItems as LanguagesSectionData["items"],
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
