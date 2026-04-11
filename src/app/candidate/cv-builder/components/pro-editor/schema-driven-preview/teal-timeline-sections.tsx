"use client";

import { useState } from "react";
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
import { EditableText } from "./inline-editors";
import { buildProjectsSectionPayload, normalizeProjectsModel } from "./project-sections.model";
import { ProjectCollectionEditor } from "./project-sections.view";
import type {
  ActivitiesSectionData,
  AwardsSectionData,
  CertificatesSectionData,
  CVSectionComponentProps,
  EducationSectionData,
  CVTemplateIconToken,
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

interface TealOverviewItemData {
  id: string;
  content: string;
}

interface TealWorkExperienceItemData {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
  rightDescription: string;
  sourceShape?: Record<string, unknown>;
}

interface TealActivityItemData {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
}

interface TealSkillItemData {
  id: string;
  name: string;
  group: "main" | "other";
  level?: number;
}

interface TealEducationItemData {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
}

interface TealCertificateItemData {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

interface TealLanguageItemData {
  id: string;
  name: string;
  level: string;
}

interface TealAwardItemData {
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
  } as TNode;
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

export function appendWorkExperienceItem(items: unknown[]) {
  const existingItems = Array.isArray(items) ? [...items] : [];
  const firstItemShape = existingItems.find((item) => isObjectRecord(item));

  const nextItem = createEmptyNodeFromSchema<Record<string, unknown>>({
    sourceNode: isObjectRecord(firstItemShape) ? firstItemShape : undefined,
    fallbackNode: WORK_EXPERIENCE_EMPTY_ITEM_TEMPLATE,
    idPrefix: "we",
    indexHint: existingItems.length,
  });

  if (isObjectRecord(firstItemShape)) {
    ["type", "nodeType", "sectionType", "kind"].forEach((metadataKey) => {
      const metadataValue = firstItemShape[metadataKey];
      if (typeof metadataValue === "string" && metadataValue.trim().length > 0) {
        nextItem[metadataKey] = metadataValue;
      }
    });
  }

  return [...existingItems, nextItem];
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
    const record = isObjectRecord(item) ? item : {};
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

function normalizeActivityItems(data: ActivitiesSectionData): TealActivityItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "act-1",
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;
    const startDate = toSafeText(record.startDate);
    const endDate = toSafeText(record.endDate);
    return {
      id: toSafeText(record.id) || `act-${index + 1}`,
      leftDate: toSafeText(record.leftDate) || buildDateRangeLabel(startDate, endDate),
      rightTitle: toSafeText(record.rightTitle) || toSafeText(record.name),
      rightSubtitle: toSafeText(record.rightSubtitle) || toSafeText(record.role),
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

function buildActivitiesPayload(title: string, items: TealActivityItemData[]) {
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
        description: item.rightSubtitle,
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

function normalizeLanguageItems(data: LanguagesSectionData): TealLanguageItemData[] {
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

function buildLanguagesPayload(title: string, items: TealLanguageItemData[]) {
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

export function SectionHeader({ title, icon, isSectionActive, onChangeTitle }: SectionHeaderProps) {
  const Icon = ICON_MAP[icon] ?? FileText;

  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center border border-teal-500 bg-teal-500 text-white">
          <Icon size={11} />
        </span>
        <div className="min-w-0 flex-1">
          <EditableText
            value={title}
            placeholder="Section title"
            isSectionActive={isSectionActive}
            onCommit={onChangeTitle}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[16px] font-semibold leading-6 text-teal-700"
            editClassName="rounded-none border border-slate-300 bg-white px-1 py-0.5 shadow-none"
          />
        </div>
      </div>
      <span className="mt-1 block h-px w-full bg-slate-300" />
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

interface OverviewItemProps {
  item: TealOverviewItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, nextContent: string) => void;
  onRemove: (index: number) => void;
}

export function OverviewItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: OverviewItemProps) {
  return (
    <div
      className={cn(
        "group/overview relative border px-1 py-0.5 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <EditableText
        value={item.content}
        placeholder="Nội dung overview"
        isSectionActive={isSectionActive && isSelected}
        onCommit={(nextValue) => onChange(index, nextValue)}
        multiline
        minRows={1}
        showToolbar
        preserveDashBullets
        readClassName="px-0 py-0 text-[14px] leading-6 text-slate-800"
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
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < overviewItems.length
      ? selectedIndex
      : null;

  const updateOverviewItems = (nextItems: TealOverviewItemData[]) => {
    onEdit(buildOverviewPayload(sectionTitle, nextItems));
  };

  const addOverviewItem = () => {
    const nextItem = createEmptyNodeFromSchema<TealOverviewItemData>({
      sourceNode: overviewItems[overviewItems.length - 1],
      fallbackNode: OVERVIEW_EMPTY_ITEM_TEMPLATE,
      idPrefix: "ov",
      indexHint: overviewItems.length,
    });

    updateOverviewItems([
      ...overviewItems,
      nextItem,
    ]);
    setSelectedIndex(overviewItems.length);
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildOverviewPayload(nextTitle, overviewItems))}
        />

        <div className="space-y-0.5" data-cv-section-content>
          {overviewItems.map((item, index) => (
            <OverviewItem
              key={item.id || `overview-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
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
                const nextItems = overviewItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateOverviewItems(nextItems.length > 0 ? nextItems : [{ ...OVERVIEW_EMPTY_ITEM_TEMPLATE }]);
                setSelectedIndex((previousIndex) => {
                  if (nextItems.length === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextItems.length) {
                    return nextItems.length - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {isActive ? (
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
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealWorkExperienceItemData>) => void;
  onRemove: (index: number) => void;
}

export function WorkExperienceItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: WorkExperienceItemProps) {
  return (
    <div
      className={cn(
        "group/work relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <div className="grid grid-cols-[3fr_7fr] gap-x-2">
        <div>
          <EditableText
            value={item.leftDate}
            placeholder="01/2018 – Present"
            isSectionActive={isSectionActive && isSelected}
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
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightSubtitle}
            placeholder="Vị trí hoặc mô tả ngắn"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] italic leading-6 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightDescription}
            placeholder="- Mô tả công việc\n- Thành tích chính"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightDescription: nextValue })}
            multiline
            minRows={1}
            showToolbar
            readClassName="px-0 py-0 text-[13px] leading-5 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      </div>

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
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < workItems.length ? selectedIndex : null;

  const updateWorkItems = (nextItems: TealWorkExperienceItemData[]) => {
    onEdit(buildWorkExperiencePayload(sectionTitle, nextItems));
  };

  const addWorkExperienceItem = () => {
    const nextRawItems = appendWorkExperienceItem(rawWorkItems);
    onEdit({
      title: sectionTitle,
      items: nextRawItems as ExperienceSectionData["items"],
    });
    setSelectedIndex(nextRawItems.length - 1);
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildWorkExperiencePayload(nextTitle, workItems))}
        />

        <div className="divide-y divide-slate-300/70" data-cv-section-content>
          {workItems.map((item, index) => (
            <WorkExperienceItem
              key={item.id || `work-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
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
                const nextRawItems = rawWorkItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                onEdit({
                  title: sectionTitle,
                  items: (nextRawItems.length > 0
                    ? nextRawItems
                    : appendWorkExperienceItem([])) as ExperienceSectionData["items"],
                });
                setSelectedIndex((previousIndex) => {
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

        {isActive ? (
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
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealActivityItemData>) => void;
  onRemove: (index: number) => void;
}

export function ActivityItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "group/activity relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <div className="grid grid-cols-[3fr_7fr] gap-x-2">
        <EditableText
          value={item.leftDate}
          placeholder="06/2016"
          isSectionActive={isSectionActive && isSelected}
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
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightSubtitle}
            placeholder="Vai trò"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] leading-6 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      </div>

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
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const safeSelectedIndex =
    isActive && selectedIndex !== null && selectedIndex < activityItems.length
      ? selectedIndex
      : null;

  const updateActivityItems = (nextItems: TealActivityItemData[]) => {
    onEdit(buildActivitiesPayload(sectionTitle, nextItems));
  };

  const addActivityItem = () => {
    updateActivityItems([
      ...activityItems,
      {
        id: `act-${activityItems.length + 1}-${Date.now()}`,
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
      },
    ]);
    setSelectedIndex(activityItems.length);
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildActivitiesPayload(nextTitle, activityItems))}
        />

        <div className="divide-y divide-slate-300/70" data-cv-section-content>
          {activityItems.map((item, index) => (
            <ActivityItem
              key={item.id || `activity-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={safeSelectedIndex === index}
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
                const nextItems = activityItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateActivityItems(
                  nextItems.length > 0
                    ? nextItems
                    : [
                        {
                          id: "act-1",
                          leftDate: "",
                          rightTitle: "",
                          rightSubtitle: "",
                        },
                      ],
                );
                setSelectedIndex((previousIndex) => {
                  if (nextItems.length === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextItems.length) {
                    return nextItems.length - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {isActive ? (
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
  onChangeName: (id: string, nextName: string) => void;
  onRemove: (id: string) => void;
}

function SkillGroupList({
  label,
  items,
  isSectionActive,
  onChangeName,
  onRemove,
}: SkillGroupListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-4 text-[13px]">
      <span className="pt-0.5 font-bold text-slate-800">{label}</span>

      <ul className="ml-4 list-disc space-y-0.5">
        {items.map((item) => (
          <li key={item.id} className="group/skill-item relative pl-0.5 pr-6">
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
  const skillItems = normalizeSkillItems(data);
  const sectionTitle = styleConfig.title;

  const updateSkillItems = (nextItems: TealSkillItemData[]) => {
    onEdit(buildSkillsPayload(sectionTitle, nextItems));
  };

  const mainItems = skillItems.filter((item) => item.group === "main");
  const otherItems = skillItems.filter((item) => item.group === "other");

  const addSkillItem = (group: "main" | "other") => {
    updateSkillItems([
      ...skillItems,
      {
        id: `skill-${group}-${Date.now()}`,
        name: "",
        group,
      },
    ]);
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
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildSkillsPayload(nextTitle, skillItems))}
        />

        <div className="space-y-2.5 pl-1" data-cv-section-content>
          <SkillGroupList
            label="Kỹ năng chính"
            items={mainItems}
            isSectionActive={isActive}
            onChangeName={updateSkillName}
            onRemove={removeSkillItem}
          />
          <SkillGroupList
            label="Kỹ năng khác"
            items={otherItems}
            isSectionActive={isActive}
            onChangeName={updateSkillName}
            onRemove={removeSkillItem}
          />
        </div>

        {isActive ? (
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
  onChange: (index: number, updates: Partial<TealAwardItemData>) => void;
  onRemove: (index: number) => void;
}

function TealAwardLine({ item, index, isSectionActive, onChange, onRemove }: TealAwardLineProps) {
  const hasDate = item.date.trim().length > 0;

  if (!hasDate) {
    return (
      <div className="group/award-item relative pl-0.5">
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
    <div className="group/award-item relative grid grid-cols-[5.25rem_1fr] gap-x-4">
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
  const sectionTitle = styleConfig.title;

  const updateAwardItems = (nextItems: TealAwardItemData[]) => {
    onEdit(buildAwardsPayload(sectionTitle, nextItems));
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildAwardsPayload(nextTitle, awardItems))}
        />

        <div className="space-y-2 pl-1" data-cv-section-content>
          {awardItems.map((item, index) => (
            <TealAwardLine
              key={item.id || `award-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
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
                const nextItems = awardItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateAwardItems(
                  nextItems.length > 0
                    ? nextItems
                    : [{ ...AWARD_EMPTY_ITEM_TEMPLATE }],
                );
              }}
            />
          ))}
        </div>

        {isActive ? (
          <div className="mt-2 flex justify-end">
            <AddItemButton
              label="Thêm giải thưởng"
              onClick={() => {
                const nextItem = createEmptyNodeFromSchema<TealAwardItemData>({
                  sourceNode: awardItems[awardItems.length - 1],
                  fallbackNode: AWARD_EMPTY_ITEM_TEMPLATE,
                  idPrefix: "award",
                  indexHint: awardItems.length,
                });

                updateAwardItems([
                  ...awardItems,
                  nextItem,
                ]);
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
  const projectItems = normalizeProjectsModel(data);
  const sectionTitle = styleConfig.title;

  const updateProjectItems = (nextItems: typeof projectItems) => {
    onEdit(buildProjectsSectionPayload(sectionTitle, nextItems));
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildProjectsSectionPayload(nextTitle, projectItems))}
        />

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
  const sectionTitle = styleConfig.title;

  const updateEducationItems = (nextItems: TealEducationItemData[]) => {
    onEdit(buildEducationPayload(sectionTitle, nextItems));
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildEducationPayload(nextTitle, educationItems))}
        />

        <div className="space-y-2" data-cv-section-content>
          {educationItems.map((item, index) => (
            <div key={item.id || `education-item-${index}`} className="group/edu-item relative grid grid-cols-[7.5rem_1fr] gap-x-3 border-b border-slate-200/75 px-0.5 py-1.5 last:border-b-0">
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

              {isActive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const nextItems = educationItems.filter((_, currentIndex) => currentIndex !== index);
                    updateEducationItems(nextItems.length > 0 ? nextItems : normalizeEducationItems({ items: [] }));
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

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm học vấn"
              onClick={() => {
                updateEducationItems([
                  ...educationItems,
                  {
                    id: `edu-${educationItems.length + 1}-${Date.now()}`,
                    institution: "",
                    degree: "",
                    startDate: "",
                    endDate: "",
                  },
                ]);
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
  const sectionTitle = styleConfig.title;

  const updateCertificateItems = (nextItems: TealCertificateItemData[]) => {
    onEdit(buildCertificatesPayload(sectionTitle, nextItems));
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildCertificatesPayload(nextTitle, certificateItems))}
        />

        <div className="space-y-2" data-cv-section-content>
          {certificateItems.map((item, index) => (
            <div key={item.id || `certificate-item-${index}`} className="group/cert-item relative rounded-md border border-slate-300 bg-white px-2 py-2">
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
                    const nextItems = certificateItems.filter((_, currentIndex) => currentIndex !== index);
                    updateCertificateItems(nextItems.length > 0 ? nextItems : normalizeCertificateItems({ items: [] }));
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

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm chứng chỉ"
              onClick={() => {
                updateCertificateItems([
                  ...certificateItems,
                  {
                    id: `cert-${certificateItems.length + 1}-${Date.now()}`,
                    name: "",
                    issuer: "",
                    date: "",
                    url: "",
                  },
                ]);
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
  const sectionTitle = styleConfig.title;

  const updateLanguageItems = (nextItems: TealLanguageItemData[]) => {
    onEdit(buildLanguagesPayload(sectionTitle, nextItems));
  };

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
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildLanguagesPayload(nextTitle, languageItems))}
        />

        <ul className="list-disc space-y-1 pl-5" data-cv-section-content>
          {languageItems.map((item, index) => (
            <li key={item.id || `language-item-${index}`} className="group/lang-item relative pr-6">
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
                  readClassName="inline px-0 py-0 text-[13px] leading-6 text-slate-800"
                  editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />
                <span className="text-[13px] text-slate-500">-</span>
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
                  readClassName="inline px-0 py-0 text-[13px] leading-6 text-slate-700"
                  editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                />
              </div>

              {isActive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const nextItems = languageItems.filter((_, currentIndex) => currentIndex !== index);
                    updateLanguageItems(nextItems.length > 0 ? nextItems : normalizeLanguageItems({ items: [] }));
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

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton
              label="Thêm ngôn ngữ"
              onClick={() => {
                updateLanguageItems([
                  ...languageItems,
                  {
                    id: `lang-${languageItems.length + 1}-${Date.now()}`,
                    name: "",
                    level: "",
                  },
                ]);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
