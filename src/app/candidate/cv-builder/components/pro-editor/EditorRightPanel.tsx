"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, CircleOff, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { optimizeCVContent, type OptimizeDebugInfo } from "@/app/actions/ai-actions";
import type { CVSection, CVSelectedSectionItem } from "../../types";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";
import { OutlinePanel } from "./OutlinePanel";
import { SectionFormRenderer } from "./SectionFormRenderer";
import { getSectionSchema } from "./template-schema";

export interface EditorRightPanelProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  selectedSectionItem: CVSelectedSectionItem | null;
  onSelectSection: (id: string | null) => void;
  onToggleVisibility: (sectionId: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onAddListItem: (sectionId: string) => void;
  onRemoveListItem: (sectionId: string, itemRef: number | string) => void;
  onOpenAddSection: () => void;
}

interface FlattenedContentLine {
  path: string;
  value: string;
}

interface SectionReviewCard {
  id: "do" | "dont" | "should";
  title: string;
  description: string;
  toneClassName: string;
}

interface SectionMetrics {
  textCount: number;
  quantifiedCount: number;
  listItemCount: number;
}

interface SectionAnalysis {
  guidanceHeading: string;
  guidanceDescription: string;
  guidanceTips: string[];
  aiSuggestionDraft: string;
  reviewCards: SectionReviewCard[];
}

interface AISuggestionRequestPayload {
  sectionType: string;
  fieldName: string;
  currentContent: string;
  context?: string;
}

interface AISuggestionResolution {
  payload: AISuggestionRequestPayload | null;
  unavailableReason: string | null;
}

type AISuggestionStatus = "idle" | "loading" | "ready" | "error" | "unavailable";

interface AISuggestionState {
  sourceKey: string;
  status: AISuggestionStatus;
  value: string;
  provider: string | null;
  error: string | null;
  debug?: OptimizeDebugInfo;
}

const SECTION_TYPES_REQUIRING_METRICS = new Set<CVSection["type"]>([
  "summary",
  "custom_text",
  "experience_list",
  "project_list",
  "award_list",
  "certificate_list",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function dedupeStringList(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  items.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizeComparableText(trimmed);
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(trimmed);
  });

  return result;
}

function getSectionDataRecord(section: CVSection | null) {
  if (!section) {
    return {};
  }

  if (isRecord(section.data)) {
    return section.data;
  }

  return {};
}

interface SectionFocusPayload {
  lines: FlattenedContentLine[];
  analysisData: Record<string, unknown>;
  focusedItemLabel: string | null;
  missingItemSelection: boolean;
}

interface SelectedListItem {
  item: unknown;
  index: number;
  itemId: string | null;
}

function toPlainText(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function splitCleanLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function collectTextValues(value: unknown, bucket: string[]) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      bucket.push(trimmed);
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    bucket.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, bucket));
    return;
  }

  if (isRecord(value)) {
    Object.values(value).forEach((entry) => collectTextValues(entry, bucket));
  }
}

function readFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toPlainText(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function readDateLabel(record: Record<string, unknown>) {
  const direct = readFirstText(record, ["leftDate", "date", "duration"]);
  if (direct) {
    return direct;
  }

  const start = readFirstText(record, ["startDate", "from"]);
  const end = readFirstText(record, ["endDate", "to"]);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end;
}

function resolveSelectedListItem(rawItems: unknown[], selection: CVSelectedSectionItem | null, sectionId: string) {
  if (rawItems.length === 0) {
    return null;
  }

  if (selection && selection.sectionId === sectionId) {
    if (selection.itemId) {
      const matchById = rawItems.findIndex((rawItem) => {
        if (!isRecord(rawItem)) {
          return false;
        }

        return toPlainText(rawItem.id) === selection.itemId;
      });

      if (matchById >= 0) {
        return {
          item: rawItems[matchById],
          index: matchById,
          itemId: selection.itemId,
        } satisfies SelectedListItem;
      }
    }

    if (Number.isInteger(selection.itemIndex) && selection.itemIndex >= 0 && selection.itemIndex < rawItems.length) {
      const rawItem = rawItems[selection.itemIndex];
      const recordId = isRecord(rawItem) ? toPlainText(rawItem.id) : "";

      return {
        item: rawItem,
        index: selection.itemIndex,
        itemId: recordId || null,
      } satisfies SelectedListItem;
    }
  }

  if (rawItems.length === 1) {
    const firstItem = rawItems[0];
    const firstItemId = isRecord(firstItem) ? toPlainText(firstItem.id) : "";

    return {
      item: firstItem,
      index: 0,
      itemId: firstItemId || null,
    } satisfies SelectedListItem;
  }

  return null;
}

function toLineRecords(lines: string[]) {
  const deduped = dedupeStringList(lines);
  return deduped.map((line, index) => ({
    path: `block-${index + 1}`,
    value: line,
  }));
}

function toBlockValue(lines: string[]) {
  return dedupeStringList(lines).join("\n").trim();
}

function pushBlock(blocks: string[], lines: string[]) {
  const nextValue = toBlockValue(lines);
  if (!nextValue) {
    return;
  }

  blocks.push(nextValue);
}

function resolveItemContentLines(sectionType: CVSection["type"], item: unknown) {
  if (typeof item === "string") {
    return [item].filter(Boolean);
  }

  if (!isRecord(item)) {
    return [] as string[];
  }

  const blocks: string[] = [];
  const itemRecord = item;
  const fieldsRecord = isRecord(itemRecord.fields) ? itemRecord.fields : null;

  const recordProxy = fieldsRecord
    ? {
        ...itemRecord,
        ...fieldsRecord,
      }
    : itemRecord;

  switch (sectionType) {
    case "experience_list": {
      const date = readDateLabel(recordProxy);
      const company = readFirstText(recordProxy, ["rightTitle", "company", "organization"]);
      const role = readFirstText(recordProxy, ["rightSubtitle", "position", "role", "title"]);
      const descriptionText = readFirstText(recordProxy, ["rightDescription", "description"]);
      const descriptionLinesFromArray = Array.isArray(recordProxy.descriptions)
        ? recordProxy.descriptions.map((line) => toPlainText(line)).filter(Boolean)
        : [];

      pushBlock(blocks, [
        date ? `Thời gian: ${date}` : "",
        company ? `Công ty: ${company}` : "",
        role ? `Vị trí: ${role}` : "",
      ]);

      pushBlock(blocks, [
        ...splitCleanLines(descriptionText),
        ...descriptionLinesFromArray,
      ]);
      break;
    }
    case "education_list": {
      const institution = readFirstText(recordProxy, ["institution", "school", "rightTitle"]);
      const degree = readFirstText(recordProxy, ["degree", "major", "rightSubtitle"]);
      const date = readDateLabel(recordProxy);

      pushBlock(blocks, [
        institution ? `Trường: ${institution}` : "",
        degree ? `Ngành/Hệ: ${degree}` : "",
        date ? `Thời gian: ${date}` : "",
      ]);
      break;
    }
    case "skill_list": {
      const name = readFirstText(recordProxy, ["name", "content", "label"]);
      const level = readFirstText(recordProxy, ["level"]);
      const group = readFirstText(recordProxy, ["group"]);

      pushBlock(blocks, [
        name,
        group ? `Nhóm: ${group}` : "",
        level ? `Mức độ: ${level}` : "",
      ]);
      break;
    }
    case "project_list": {
      const name = readFirstText(recordProxy, ["projectName", "name", "rightTitle"]);
      const role = readFirstText(recordProxy, ["role", "rightSubtitle", "position"]);
      const customer = readFirstText(recordProxy, ["customer", "client"]);
      const technologies = readFirstText(recordProxy, ["technologies", "stack", "techStack"]);
      const description = readFirstText(recordProxy, ["description", "rightDescription"]);
      const date = readDateLabel(recordProxy);

      pushBlock(blocks, [
        name ? `Dự án: ${name}` : "",
        role ? `Vai trò: ${role}` : "",
        customer ? `Khách hàng: ${customer}` : "",
        date ? `Thời gian: ${date}` : "",
      ]);

      const detailLines = [
        technologies ? `Công nghệ: ${technologies}` : "",
        ...splitCleanLines(description),
      ];

      if (Array.isArray(recordProxy.sections)) {
        const nestedText: string[] = [];
        collectTextValues(recordProxy.sections, nestedText);
        dedupeStringList(nestedText).slice(0, 6).forEach((line) => detailLines.push(line));
      }

      pushBlock(blocks, detailLines);
      break;
    }
    case "award_list": {
      const title = readFirstText(recordProxy, ["title", "name"]);
      const date = readDateLabel(recordProxy);
      const issuer = readFirstText(recordProxy, ["issuer", "organization"]);
      const detail = readFirstText(recordProxy, ["detail", "description"]);

      pushBlock(blocks, [
        date ? `Thời gian: ${date}` : "",
        title ? `Giải thưởng: ${title}` : "",
      ]);

      pushBlock(blocks, [
        ...splitCleanLines(detail),
        issuer ? `Đơn vị: ${issuer}` : "",
      ]);
      break;
    }
    case "certificate_list": {
      const name = readFirstText(recordProxy, ["name", "title"]);
      const issuer = readFirstText(recordProxy, ["issuer", "organization"]);
      const date = readDateLabel(recordProxy);
      const url = readFirstText(recordProxy, ["url", "link"]);

      pushBlock(blocks, [
        name ? `Chứng chỉ: ${name}` : "",
        date ? `Thời gian: ${date}` : "",
      ]);

      pushBlock(blocks, [
        issuer ? `Đơn vị cấp: ${issuer}` : "",
        url,
      ]);
      break;
    }
    case "summary": {
      const content = readFirstText(recordProxy, ["content", "text", "description"]);
      pushBlock(blocks, splitCleanLines(content));
      break;
    }
    default: {
      const maybeName = readFirstText(recordProxy, ["name"]);
      const maybeLevel = readFirstText(recordProxy, ["level"]);

      const leadLine = maybeName && maybeLevel ? `${maybeName} - ${maybeLevel}` : maybeName;

      const genericText: string[] = [];
      collectTextValues(recordProxy, genericText);
      pushBlock(blocks, [leadLine, ...dedupeStringList(genericText)]);
    }
  }

  return dedupeStringList(blocks);
}

function resolveSectionLevelContentLines(section: CVSection, sectionData: Record<string, unknown>) {
  const blocks: string[] = [];

  if (section.type === "summary" || section.type === "custom_text") {
    const sectionText = toPlainText(sectionData.text);
    if (sectionText) {
      pushBlock(blocks, splitCleanLines(sectionText));
    }
  }

  if (section.type === "skill_list") {
    const rawItems = Array.isArray(sectionData.items) ? sectionData.items : [];
    const groupedSkills = new Map<string, string[]>();

    rawItems.forEach((rawItem) => {
      if (!isRecord(rawItem)) {
        return;
      }

      const skillName = readFirstText(rawItem, ["name", "content", "label"]);
      if (!skillName) {
        return;
      }

      const rawGroup = readFirstText(rawItem, ["group"]).toLowerCase();
      const groupLabel =
        rawGroup === "main"
          ? "Kỹ năng chính"
          : rawGroup === "other"
            ? "Kỹ năng khác"
            : "Kỹ năng";

      const currentGroup = groupedSkills.get(groupLabel) ?? [];
      currentGroup.push(`- ${skillName}`);
      groupedSkills.set(groupLabel, currentGroup);
    });

    groupedSkills.forEach((skills, groupLabel) => {
      pushBlock(blocks, [groupLabel, ...skills]);
    });
  }

  if (blocks.length > 0) {
    return dedupeStringList(blocks);
  }

  const fallbackTextValues: string[] = [];
  collectTextValues(sectionData, fallbackTextValues);
  pushBlock(blocks, fallbackTextValues);
  return dedupeStringList(blocks);
}

function resolveSectionFocusPayload(section: CVSection | null, selectedSectionItem: CVSelectedSectionItem | null): SectionFocusPayload {
  if (!section) {
    return {
      lines: [],
      analysisData: {},
      focusedItemLabel: null,
      missingItemSelection: false,
    };
  }

  const sectionData = getSectionDataRecord(section);
  const rawItems = Array.isArray(sectionData.items) ? sectionData.items : null;

  if (rawItems && rawItems.length > 0) {
    const selectedItem = resolveSelectedListItem(rawItems, selectedSectionItem, section.id);
    if (selectedItem) {
      const contentLines = resolveItemContentLines(section.type, selectedItem.item);
      const schema = getSectionSchema(section.type);
      const listLabel = schema?.list?.itemLabel || "Mục";
      const focusLabel = selectedItem.itemId
        ? `${listLabel} ${selectedItem.index + 1} · ${selectedItem.itemId}`
        : `${listLabel} ${selectedItem.index + 1}`;

      return {
        lines: toLineRecords(contentLines.length > 0 ? contentLines : ["Mục này chưa có nội dung văn bản."]),
        analysisData: {
          ...sectionData,
          items: [selectedItem.item],
        },
        focusedItemLabel: focusLabel,
        missingItemSelection: false,
      };
    }

    return {
      lines: toLineRecords(["Chọn một item ở panel trái để xem đúng nội dung bạn đang thao tác." ]),
      analysisData: {
        ...sectionData,
      },
      focusedItemLabel: null,
      missingItemSelection: true,
    };
  }

  const sectionLines = resolveSectionLevelContentLines(section, sectionData);

  return {
    lines: toLineRecords(sectionLines.length > 0 ? sectionLines : ["Mục này chưa có nội dung văn bản."]),
    analysisData: sectionData,
    focusedItemLabel: null,
    missingItemSelection: false,
  };
}

function truncateForAI(value: string, maxLength = 1800) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}...`;
}

function normalizeSuggestionCompareText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\n\r]+/g, " ")
    .trim()
    .toLowerCase();
}

function calculateSuggestionSimilarity(original: string, suggestion: string) {
  const source = normalizeSuggestionCompareText(original);
  const target = normalizeSuggestionCompareText(suggestion);

  if (!source || !target) {
    return 0;
  }

  if (source === target) {
    return 1;
  }

  const bigrams = (input: string) => {
    const grams = new Set<string>();
    for (let index = 0; index < input.length - 1; index += 1) {
      grams.add(input.slice(index, index + 2));
    }
    return grams;
  };

  const sourceBigrams = bigrams(source);
  const targetBigrams = bigrams(target);
  let overlap = 0;

  sourceBigrams.forEach((gram) => {
    if (targetBigrams.has(gram)) {
      overlap += 1;
    }
  });

  return (2 * overlap) / (sourceBigrams.size + targetBigrams.size);
}

function isLikelyCopiedSuggestion(original: string, suggestion: string) {
  const similarity = calculateSuggestionSimilarity(original, suggestion);
  const normalizedOriginal = normalizeSuggestionCompareText(original);

  if (!normalizedOriginal) {
    return false;
  }

  if (normalizedOriginal.length < 80) {
    return similarity > 0.97;
  }

  return similarity > 0.9;
}

function isLikelyRecoverableAITransportError(message: string) {
  return /(timed out|timeout|fetch failed|network|econnrefused|enotfound|getaddrinfo|connection refused|upstream unavailable|temporarily unavailable)/i
    .test(message);
}

function toFriendlyAITransportErrorMessage(message: string) {
  if (/(timed out|timeout)/i.test(message)) {
    return "Ollama phản hồi quá chậm. Vui lòng thử lại.";
  }

  if (/(econnrefused|enotfound|getaddrinfo|connection refused|dns|invalid url|failed to parse url)/i.test(message)) {
    return "Không kết nối được tới Ollama. Kiểm tra cấu hình URL giữa local và Docker.";
  }

  if (/(fetch failed|network|socket hang up|connection reset|temporarily unavailable|upstream unavailable)/i.test(message)) {
    return "Kết nối tới Ollama bị gián đoạn. Vui lòng thử lại.";
  }

  return "Không thể tạo gợi ý AI lúc này. Vui lòng thử lại.";
}

function resolveAISuggestionRequestPayload(
  section: CVSection | null,
  selectedSectionItem: CVSelectedSectionItem | null,
): AISuggestionResolution {
  if (!section) {
    return {
      payload: null,
      unavailableReason: "Chọn section để tạo gợi ý AI.",
    };
  }

  const sectionData = getSectionDataRecord(section);

  if (section.type === "summary" || section.type === "custom_text") {
    const sectionText = toPlainText(sectionData.text);
    if (!sectionText) {
      return {
        payload: null,
        unavailableReason: "Mục này chưa có nội dung văn bản để AI tối ưu.",
      };
    }

    return {
      payload: {
        sectionType: section.type,
        fieldName: "text",
        currentContent: truncateForAI(sectionText),
        context: truncateForAI(`Section: ${resolveSectionLabel(section)}`),
      },
      unavailableReason: null,
    };
  }

  const rawItems = Array.isArray(sectionData.items) ? sectionData.items : [];
  if (rawItems.length === 0) {
    return {
      payload: null,
      unavailableReason: "Section này chưa có item để gọi AI.",
    };
  }

  const selectedItem = resolveSelectedListItem(rawItems, selectedSectionItem, section.id);
  if (!selectedItem) {
    return {
      payload: null,
      unavailableReason: "Chọn đúng item ở panel trái trước khi tạo gợi ý AI.",
    };
  }

  const itemRecord = isRecord(selectedItem.item) ? selectedItem.item : null;
  const fieldsRecord = itemRecord && isRecord(itemRecord.fields) ? itemRecord.fields : null;
  const recordProxy = itemRecord
    ? fieldsRecord
      ? {
          ...itemRecord,
          ...fieldsRecord,
        }
      : itemRecord
    : null;

  const contextBlocks: string[] = [
    `Section: ${resolveSectionLabel(section)}`,
    `Item index: ${selectedItem.index + 1}`,
  ];

  let fieldName = "content";
  let currentContent = "";

  switch (section.type) {
    case "experience_list": {
      fieldName = "description";
      if (recordProxy) {
        const date = readDateLabel(recordProxy);
        const company = readFirstText(recordProxy, ["rightTitle", "company", "organization"]);
        const role = readFirstText(recordProxy, ["rightSubtitle", "position", "role", "title"]);
        if (date) contextBlocks.push(`Thời gian: ${date}`);
        if (company) contextBlocks.push(`Công ty: ${company}`);
        if (role) contextBlocks.push(`Vị trí: ${role}`);

        const descriptionLines = dedupeStringList([
          ...toSuggestionLinesFromText(readFirstText(recordProxy, ["rightDescription", "description"])),
          ...toSuggestionLinesFromUnknownArray(recordProxy.descriptions),
        ]);
        currentContent = descriptionLines.join("\n").trim();
      }
      break;
    }
    case "project_list": {
      fieldName = "description";
      if (recordProxy) {
        const projectName = readFirstText(recordProxy, ["projectName", "name", "rightTitle"]);
        const role = readFirstText(recordProxy, ["role", "rightSubtitle", "position"]);
        const technologies = readFirstText(recordProxy, ["technologies", "stack", "techStack"]);
        const date = readDateLabel(recordProxy);
        if (projectName) contextBlocks.push(`Dự án: ${projectName}`);
        if (role) contextBlocks.push(`Vai trò: ${role}`);
        if (technologies) contextBlocks.push(`Công nghệ: ${technologies}`);
        if (date) contextBlocks.push(`Thời gian: ${date}`);

        const sourceLines = dedupeStringList([
          ...toSuggestionLinesFromText(readFirstText(recordProxy, ["description", "rightDescription"])),
          ...toSuggestionLinesFromUnknownArray(recordProxy.responsibilities),
          ...buildProjectSectionSuggestionLines(recordProxy.sections),
        ]);

        currentContent = sourceLines.join("\n").trim();
      }
      break;
    }
    case "award_list": {
      fieldName = "detail";
      if (recordProxy) {
        const title = readFirstText(recordProxy, ["title", "name"]);
        const date = readDateLabel(recordProxy);
        if (title) contextBlocks.push(`Giải thưởng: ${title}`);
        if (date) contextBlocks.push(`Thời gian: ${date}`);

        const detailLines = dedupeStringList(
          toSuggestionLinesFromText(readFirstText(recordProxy, ["detail", "description"])),
        );

        currentContent = detailLines.join("\n").trim();
      }
      break;
    }
    case "skill_list": {
      fieldName = "name";
      if (recordProxy) {
        const skillName = readFirstText(recordProxy, ["name", "content", "label"]);
        const level = readFirstText(recordProxy, ["level"]);
        const group = readFirstText(recordProxy, ["group"]);
        if (group) contextBlocks.push(`Nhóm kỹ năng: ${group}`);
        if (level) contextBlocks.push(`Mức độ: ${level}`);
        currentContent = [skillName, level ? `Mức độ ${level}` : ""].filter(Boolean).join(" - ").trim();
      }
      break;
    }
    case "education_list": {
      fieldName = "degree";
      if (recordProxy) {
        const school = readFirstText(recordProxy, ["institution", "school", "rightTitle"]);
        const degree = readFirstText(recordProxy, ["degree", "major", "rightSubtitle"]);
        const date = readDateLabel(recordProxy);
        if (school) contextBlocks.push(`Trường: ${school}`);
        if (date) contextBlocks.push(`Thời gian: ${date}`);
        currentContent = [degree, school].filter(Boolean).join(" - ").trim();
      }
      break;
    }
    case "certificate_list": {
      fieldName = "name";
      if (recordProxy) {
        const name = readFirstText(recordProxy, ["name", "title"]);
        const issuer = readFirstText(recordProxy, ["issuer", "organization"]);
        const date = readDateLabel(recordProxy);
        if (issuer) contextBlocks.push(`Đơn vị cấp: ${issuer}`);
        if (date) contextBlocks.push(`Thời gian: ${date}`);
        currentContent = [name, issuer].filter(Boolean).join(" - ").trim();
      }
      break;
    }
    default: {
      fieldName = "content";
      const contentLines = resolveItemContentLines(section.type, selectedItem.item)
        .flatMap((line) => splitCleanLines(line));
      currentContent = dedupeStringList(contentLines).join("\n").trim();
      break;
    }
  }

  if (!currentContent) {
    const fallbackLines = resolveItemContentLines(section.type, selectedItem.item)
      .flatMap((line) => splitCleanLines(line));
    currentContent = dedupeStringList(fallbackLines).join("\n").trim();
  }

  if (!currentContent) {
    return {
      payload: null,
      unavailableReason: "Item đang chọn chưa có nội dung văn bản để AI tối ưu.",
    };
  }

  return {
    payload: {
      sectionType: section.type,
      fieldName,
      currentContent: truncateForAI(currentContent),
      context: truncateForAI(dedupeStringList(contextBlocks).join("\n"), 1200),
    },
    unavailableReason: null,
  };
}

function containsQuantifiedSignal(value: string) {
  return /(\d|%|kpi|latency|ms|tỷ lệ|tiết kiệm|tăng|giảm|năm|tháng)/i.test(value);
}

export function resolveSelectedSection(sections: CVSection[], selectedSectionId: string | null) {
  if (!selectedSectionId) {
    return null;
  }

  return sections.find((section) => section.id === selectedSectionId) ?? null;
}

export function shouldJumpRightPanelToTop(previousSelectedSectionId: string | null, nextSelectedSectionId: string | null) {
  return previousSelectedSectionId !== nextSelectedSectionId;
}

function resolveSectionLabel(section: CVSection | null) {
  if (!section) {
    return "Chưa chọn mục";
  }

  const schema = getSectionSchema(section.type);
  const normalizedTitle = (section.title || "").trim();

  return normalizedTitle || schema?.label || section.type;
}

function extractCurrentContentLines(section: CVSection | null, selectedSectionItem: CVSelectedSectionItem | null) {
  return resolveSectionFocusPayload(section, selectedSectionItem);
}

function resolveListFieldIssues(section: CVSection, sectionData: Record<string, unknown>) {
  const schema = getSectionSchema(section.type);
  const listSchema = schema?.list;

  if (!listSchema) {
    return [] as string[];
  }

  const rawItems = Array.isArray(sectionData.items) ? sectionData.items : [];

  if (rawItems.length === 0) {
    return ["Danh sách đang trống, chưa có mục dữ liệu nào."];
  }

  const issues: string[] = [];

  rawItems.forEach((rawItem, itemIndex) => {
    if (!isRecord(rawItem)) {
      issues.push(`Dòng ${itemIndex + 1} có cấu trúc dữ liệu không hợp lệ.`);
      return;
    }

    listSchema.fields.forEach((field) => {
      const rawValue = rawItem[field.key];
      const hasValue =
        typeof rawValue === "string"
          ? rawValue.trim().length > 0
          : rawValue !== null && rawValue !== undefined;

      if (!hasValue) {
        issues.push(`Dòng ${itemIndex + 1} chưa có "${field.label}".`);
      }
    });
  });

  return issues;
}

function resolveTypeSpecificIssues(
  section: CVSection,
  sectionData: Record<string, unknown>,
  textValues: string[],
  quantifiedCount: number,
) {
  const issues: string[] = [];

  if (textValues.length === 0) {
    issues.push("Mục này chưa có nội dung văn bản nào.");
    return issues;
  }

  if (section.type === "summary" || section.type === "custom_text") {
    const totalLength = textValues.join(" ").trim().length;
    const hasBullets = textValues.some((value) =>
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .some((line) => line.startsWith("-")),
    );

    if (totalLength < 120) {
      issues.push("Nội dung còn ngắn, nên mở rộng thành 3-5 câu nêu năng lực và kết quả.");
    }

    if (section.type === "summary" && !hasBullets && totalLength > 0) {
      issues.push("Tổng quan chưa có cấu trúc rõ ràng; có thể tách thành các ý ngắn theo gạch đầu dòng.");
    }
  }

  if (section.type === "skill_list") {
    const skillNames = Array.isArray(sectionData.items)
      ? sectionData.items
          .map((item) => {
            if (!isRecord(item)) {
              return "";
            }

            const name = item.name;
            return typeof name === "string" ? name.trim() : "";
          })
          .filter((name) => name.length > 0)
      : [];

    const dedupeTracker = new Set<string>();
    const duplicates: string[] = [];

    skillNames.forEach((name) => {
      const normalized = normalizeComparableText(name);
      if (dedupeTracker.has(normalized)) {
        duplicates.push(name);
        return;
      }

      dedupeTracker.add(normalized);
    });

    if (duplicates.length > 0) {
      issues.push(`Danh sách kỹ năng đang bị trùng: ${duplicates.slice(0, 3).join(", ")}.`);
    }

    if (skillNames.length > 0 && skillNames.length < 4) {
      issues.push("Danh sách kỹ năng còn mỏng; nên bổ sung thêm nhóm kỹ năng chính/phụ.");
    }
  }

  if (section.type === "education_list") {
    const hasDateSignal = textValues.some((value) => /\d{4}|\d{2}\/\d{4}/.test(value));
    if (!hasDateSignal) {
      issues.push("Phần học vấn chưa thể hiện mốc thời gian rõ ràng.");
    }
  }

  if (SECTION_TYPES_REQUIRING_METRICS.has(section.type) && quantifiedCount === 0) {
    issues.push("Nội dung chưa có số liệu định lượng để chứng minh tác động.");
  }

  return issues;
}

function resolveWritingPatternBySectionType(section: CVSection) {
  switch (section.type) {
    case "summary":
      return "Viết theo mẫu: vai trò hiện tại -> năng lực cốt lõi -> kết quả định lượng nổi bật.";
    case "experience_list":
      return "Mỗi dòng kinh nghiệm nên theo mẫu: bối cảnh công việc -> hành động chính -> kết quả đo lường.";
    case "project_list":
      return "Mỗi dự án nên nêu rõ vai trò cá nhân, stack công nghệ và kết quả đã tạo ra.";
    case "education_list":
      return "Nêu học vấn theo mốc thời gian mới nhất, ưu tiên thông tin liên quan trực tiếp JD.";
    case "skill_list":
      return "Nhóm kỹ năng theo cụm chính/phụ và đưa keyword bám JD lên trước.";
    case "award_list":
      return "Giải thưởng nên ghi rõ bối cảnh, tiêu chí và giá trị tác động thực tế.";
    case "certificate_list":
      return "Chứng chỉ nên có đơn vị cấp, thời gian và liên kết xác minh nếu có.";
    default:
      return "Giữ cấu trúc ngắn gọn, có bằng chứng và bám đúng mục tiêu ứng tuyển.";
  }
}

function buildGuidanceTips(section: CVSection, issues: string[]) {
  const schema = getSectionSchema(section.type);
  const tips = [...(schema?.guideLines ?? [])];

  if (issues.length > 0) {
    tips.unshift(`Ưu tiên xử lý ngay: ${issues[0]}`);
  }

  tips.push(resolveWritingPatternBySectionType(section));

  return dedupeStringList(tips).slice(0, 4);
}

function stripLeadingBullet(value: string) {
  return value.replace(/^[-*\u2022\u2013\u2014]\s*/, "").trim();
}

function stripDisplayLabelPrefix(value: string) {
  return value
    .replace(
      /^(Thời gian|Công ty|Vị trí|Dự án|Vai trò|Khách hàng|Công nghệ|Trường|Ngành\/Hệ|Giải thưởng|Chứng chỉ|Đơn vị cấp|Đơn vị|Nhóm|Mức độ)\s*:\s*/i,
      "",
    )
    .trim();
}

function toSuggestionLinesFromText(value: string) {
  return splitCleanLines(value)
    .map((line) => stripLeadingBullet(stripDisplayLabelPrefix(line)))
    .filter((line) => line.length > 0);
}

function toSuggestionLinesFromUnknownArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => stripLeadingBullet(stripDisplayLabelPrefix(toPlainText(entry))))
    .filter((line) => line.length > 0);
}

function toPlainSuggestionLines(value: string) {
  return dedupeStringList(
    splitCleanLines(value)
      .map((line) => stripLeadingBullet(stripDisplayLabelPrefix(line)))
      .filter((line) => line.length > 0),
  );
}

function toBulletSuggestionText(lines: string[]) {
  const normalized = dedupeStringList(
    lines
      .map((line) => stripLeadingBullet(stripDisplayLabelPrefix(line)))
      .filter((line) => line.length > 0),
  );

  return normalized.map((line) => `- ${line}`).join("\n");
}

function buildProjectSectionSuggestionLines(sections: unknown) {
  if (!Array.isArray(sections)) {
    return [] as string[];
  }

  const lines: string[] = [];
  collectTextValues(sections, lines);

  return lines.flatMap((line) => toSuggestionLinesFromText(line));
}

function buildItemAISuggestionDraft(sectionType: CVSection["type"], item: unknown) {
  if (typeof item === "string") {
    return item.trim();
  }

  if (!isRecord(item)) {
    return "";
  }

  const fieldsRecord = isRecord(item.fields) ? item.fields : null;
  const recordProxy = fieldsRecord
    ? {
        ...item,
        ...fieldsRecord,
      }
    : item;

  switch (sectionType) {
    case "experience_list": {
      const sourceLines = [
        ...toSuggestionLinesFromText(readFirstText(recordProxy, ["rightDescription", "description"])),
        ...toSuggestionLinesFromUnknownArray(recordProxy.descriptions),
      ];

      if (sourceLines.length > 0) {
        return toBulletSuggestionText(sourceLines);
      }
      break;
    }
    case "project_list": {
      const sourceLines = [
        ...toSuggestionLinesFromText(readFirstText(recordProxy, ["description", "rightDescription"])),
        ...toSuggestionLinesFromUnknownArray(recordProxy.responsibilities),
        ...buildProjectSectionSuggestionLines(recordProxy.sections),
      ];

      if (sourceLines.length > 0) {
        return toBulletSuggestionText(sourceLines);
      }
      break;
    }
    case "award_list": {
      const sourceLines = toSuggestionLinesFromText(readFirstText(recordProxy, ["detail", "description"]));
      if (sourceLines.length > 0) {
        return toBulletSuggestionText(sourceLines);
      }
      break;
    }
    case "skill_list": {
      const skillName = readFirstText(recordProxy, ["name", "content", "label"]);
      const group = readFirstText(recordProxy, ["group"]);
      const level = readFirstText(recordProxy, ["level"]);
      const line = [skillName, group ? `Nhóm: ${group}` : "", level ? `Mức độ: ${level}` : ""]
        .filter(Boolean)
        .join(" | ");
      return line;
    }
    case "education_list": {
      const lines = [
        readFirstText(recordProxy, ["institution", "school", "rightTitle"]),
        readFirstText(recordProxy, ["degree", "major", "rightSubtitle"]),
        readDateLabel(recordProxy),
      ].filter(Boolean);
      return dedupeStringList(lines).join("\n");
    }
    case "certificate_list": {
      const lines = [
        readFirstText(recordProxy, ["name", "title"]),
        readFirstText(recordProxy, ["issuer", "organization"]),
        readDateLabel(recordProxy),
        readFirstText(recordProxy, ["url", "link"]),
      ].filter(Boolean);
      return dedupeStringList(lines).join("\n");
    }
    default:
      break;
  }

  const fallbackLines = resolveItemContentLines(sectionType, item).flatMap((block) => toSuggestionLinesFromText(block));
  return dedupeStringList(fallbackLines).join("\n");
}

function buildSectionAISuggestionDraft(section: CVSection, sectionFocus: SectionFocusPayload, guidanceTips: string[]) {
  if (sectionFocus.missingItemSelection) {
    return "Chọn đúng item ở panel trái để tạo nội dung gợi ý chính xác cho mục này.";
  }

  const focusData = sectionFocus.analysisData;
  const focusItems = Array.isArray(focusData.items) ? focusData.items : null;

  if (focusItems && focusItems.length === 1) {
    const itemDraft = buildItemAISuggestionDraft(section.type, focusItems[0]);
    if (itemDraft.trim()) {
      return itemDraft.trim();
    }
  }

  if (section.type === "summary" || section.type === "custom_text") {
    const sectionText = toPlainText(focusData.text);
    const sectionLines = toSuggestionLinesFromText(sectionText);
    if (sectionLines.length > 0) {
      return toBulletSuggestionText(sectionLines);
    }
  }

  const fallbackLines = sectionFocus.lines
    .map((line) => line.value)
    .filter((line) => !line.startsWith("Chọn một item ở panel trái") && !line.startsWith("Mục này chưa có nội dung"))
    .flatMap((line) => toSuggestionLinesFromText(line));

  if (fallbackLines.length > 0) {
    if (
      section.type === "summary"
      || section.type === "custom_text"
      || section.type === "experience_list"
      || section.type === "project_list"
      || section.type === "award_list"
    ) {
      return toBulletSuggestionText(fallbackLines);
    }

    return dedupeStringList(fallbackLines).join("\n");
  }

  if (guidanceTips.length > 0) {
    return guidanceTips.slice(0, 2).join("\n");
  }

  return "";
}

function assignValueByKnownKeys(
  record: Record<string, unknown>,
  keys: string[],
  value: unknown,
  fallbackKey: string,
) {
  const nextRecord = { ...record };
  let hasAssigned = false;

  keys.forEach((key) => {
    if (key in nextRecord) {
      nextRecord[key] = value;
      hasAssigned = true;
    }
  });

  if (!hasAssigned) {
    nextRecord[fallbackKey] = value;
  }

  return nextRecord;
}

function sectionLabelLooksLikeDescription(label: string) {
  const normalized = normalizeComparableText(label);
  return /(mo ta|description|tom tat|summary|trach nhiem|responsibilit|nhiem vu|ket qua|impact)/.test(normalized);
}

function applySuggestionToProjectSections(rawSections: unknown, suggestionText: string) {
  if (!Array.isArray(rawSections)) {
    return rawSections;
  }

  const plainLines = toPlainSuggestionLines(suggestionText);
  const plainText = plainLines.length > 0 ? plainLines.join("\n") : suggestionText.trim();
  const listItems = plainLines.length > 0 ? plainLines : [plainText];
  let didApply = false;

  const applyToNode = (entry: unknown): unknown => {
    if (!isRecord(entry)) {
      return entry;
    }

    const nodeType = toPlainText(entry.type).toLowerCase();
    const nodeLabel = toPlainText(entry.label);

    if (nodeType === "group" && Array.isArray(entry.sections)) {
      return {
        ...entry,
        sections: entry.sections.map((child) => applyToNode(child)),
      };
    }

    if (!sectionLabelLooksLikeDescription(nodeLabel)) {
      return entry;
    }

    if (nodeType === "info") {
      didApply = true;
      return {
        ...entry,
        value: plainText,
      };
    }

    if (nodeType === "list") {
      didApply = true;
      return {
        ...entry,
        items: listItems,
      };
    }

    return entry;
  };

  const nextSections = rawSections.map((entry) => applyToNode(entry));

  if (didApply || nextSections.length === 0) {
    return nextSections;
  }

  const firstSection = nextSections[0];
  if (!isRecord(firstSection)) {
    return nextSections;
  }

  const firstSectionType = toPlainText(firstSection.type).toLowerCase();

  if (firstSectionType === "info") {
    const fallbackSections = [...nextSections];
    fallbackSections[0] = {
      ...firstSection,
      value: plainText,
    };
    return fallbackSections;
  }

  if (firstSectionType === "list") {
    const fallbackSections = [...nextSections];
    fallbackSections[0] = {
      ...firstSection,
      items: listItems,
    };
    return fallbackSections;
  }

  if (firstSectionType === "group" && Array.isArray(firstSection.sections) && firstSection.sections.length > 0) {
    const firstSubSection = firstSection.sections[0];

    if (isRecord(firstSubSection)) {
      const firstSubType = toPlainText(firstSubSection.type).toLowerCase();
      const fallbackSections = [...nextSections];

      if (firstSubType === "info") {
        fallbackSections[0] = {
          ...firstSection,
          sections: [
            {
              ...firstSubSection,
              value: plainText,
            },
            ...firstSection.sections.slice(1),
          ],
        };
        return fallbackSections;
      }

      if (firstSubType === "list") {
        fallbackSections[0] = {
          ...firstSection,
          sections: [
            {
              ...firstSubSection,
              items: listItems,
            },
            ...firstSection.sections.slice(1),
          ],
        };
        return fallbackSections;
      }
    }
  }

  return nextSections;
}

function applySuggestionToItem(sectionType: CVSection["type"], rawItem: unknown, draftText: string) {
  if (typeof rawItem === "string") {
    return draftText;
  }

  if (!isRecord(rawItem)) {
    return rawItem;
  }

  const plainLines = toPlainSuggestionLines(draftText);
  const plainText = plainLines.length > 0 ? plainLines.join("\n") : draftText.trim();
  const bulletText = plainLines.length > 0 ? plainLines.map((line) => `- ${line}`).join("\n") : draftText.trim();

  let nextItem = { ...rawItem };
  const nextFields = isRecord(nextItem.fields) ? { ...nextItem.fields } : null;

  switch (sectionType) {
    case "experience_list": {
      nextItem = assignValueByKnownKeys(nextItem, ["description", "rightDescription"], bulletText, "description");

      if ("descriptions" in nextItem || !("description" in nextItem)) {
        nextItem.descriptions = plainLines;
      }

      if (nextFields) {
        let updatedFields = assignValueByKnownKeys(nextFields, ["description"], bulletText, "description");
        if ("descriptions" in updatedFields || !("description" in updatedFields)) {
          updatedFields = {
            ...updatedFields,
            descriptions: plainLines,
          };
        }
        nextItem.fields = updatedFields;
      }

      return nextItem;
    }
    case "project_list": {
      nextItem = assignValueByKnownKeys(nextItem, ["description", "rightDescription"], plainText, "description");

      if ("descriptions" in nextItem) {
        nextItem.descriptions = plainLines;
      }

      if (Array.isArray(nextItem.sections)) {
        nextItem.sections = applySuggestionToProjectSections(nextItem.sections, draftText);
      }

      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["description"], plainText, "description");
      }

      return nextItem;
    }
    case "award_list": {
      nextItem = assignValueByKnownKeys(nextItem, ["detail", "description"], plainText, "detail");
      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["detail", "description"], plainText, "detail");
      }
      return nextItem;
    }
    case "skill_list": {
      const oneLine = plainLines[0] || plainText;
      nextItem = assignValueByKnownKeys(nextItem, ["name", "content", "label"], oneLine, "name");
      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["name", "content", "label"], oneLine, "name");
      }
      return nextItem;
    }
    case "education_list": {
      const oneLine = plainLines[0] || plainText;
      nextItem = assignValueByKnownKeys(nextItem, ["degree", "major", "rightSubtitle"], oneLine, "degree");
      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["degree", "major", "rightSubtitle"], oneLine, "degree");
      }
      return nextItem;
    }
    case "certificate_list": {
      const oneLine = plainLines[0] || plainText;
      nextItem = assignValueByKnownKeys(nextItem, ["name", "title"], oneLine, "name");
      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["name", "title"], oneLine, "name");
      }
      return nextItem;
    }
    default: {
      const oneLine = plainLines[0] || plainText;
      nextItem = assignValueByKnownKeys(nextItem, ["description", "content", "text", "name"], plainText, "content");
      if ("name" in nextItem && !("description" in nextItem) && !("content" in nextItem) && !("text" in nextItem)) {
        nextItem.name = oneLine;
      }
      if (nextFields) {
        nextItem.fields = assignValueByKnownKeys(nextFields, ["description", "content", "text", "name"], plainText, "content");
      }
      return nextItem;
    }
  }
}

function buildApplySuggestionUpdates(
  section: CVSection,
  selectedSectionItem: CVSelectedSectionItem | null,
  suggestionDraft: string,
) {
  const trimmedDraft = suggestionDraft.trim();
  if (!trimmedDraft) {
    return null;
  }

  if (section.type === "summary" || section.type === "custom_text") {
    return {
      text: trimmedDraft,
    } satisfies Record<string, unknown>;
  }

  const sectionData = getSectionDataRecord(section);
  const rawItems = Array.isArray(sectionData.items) ? sectionData.items : null;

  if (!rawItems || rawItems.length === 0) {
    if ("text" in sectionData) {
      return {
        text: trimmedDraft,
      } satisfies Record<string, unknown>;
    }

    return null;
  }

  const selectedItem = resolveSelectedListItem(rawItems, selectedSectionItem, section.id);
  if (!selectedItem) {
    return null;
  }

  const nextItems = [...rawItems];
  nextItems[selectedItem.index] = applySuggestionToItem(section.type, selectedItem.item, trimmedDraft);

  return {
    items: nextItems,
  } satisfies Record<string, unknown>;
}

function buildReviewCards(section: CVSection, metrics: SectionMetrics, issues: string[]) {
  const summaryBase =
    metrics.textCount === 0
      ? "Điền dữ liệu bắt buộc trước, sau đó tinh chỉnh cách diễn đạt để tăng sức thuyết phục."
      : `Nội dung hiện có ${metrics.textCount} trường văn bản và ${metrics.quantifiedCount} trường có số liệu.`;

  const listSummary =
    metrics.listItemCount > 0 ? ` Tổng số dòng dữ liệu: ${metrics.listItemCount}.` : "";

  const doDescription = `${summaryBase}${listSummary}`;
  const dontDescription =
    issues[0] ||
    "Tránh viết chung chung, thiếu bằng chứng hoặc không nêu rõ vai trò cá nhân trong từng mục.";
  const shouldDescription = resolveWritingPatternBySectionType(section);

  return [
    {
      id: "do" as const,
      title: "ĐÚNG",
      description: doDescription,
      toneClassName: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    },
    {
      id: "dont" as const,
      title: "SAI",
      description: dontDescription,
      toneClassName: "border-rose-200 bg-rose-50/70 text-rose-800",
    },
    {
      id: "should" as const,
      title: "NÊN VIẾT",
      description: shouldDescription,
      toneClassName: "border-sky-200 bg-sky-50/70 text-sky-800",
    },
  ];
}

function buildSectionAnalysis(section: CVSection | null, sectionFocus: SectionFocusPayload): SectionAnalysis {
  if (!section) {
    return {
      guidanceHeading: "Hướng dẫn cách viết",
      guidanceDescription: "Chọn một section ở bản xem trước để xem hướng dẫn bám sát dữ liệu thực tế.",
      guidanceTips: ["Nội dung gợi ý sẽ thay đổi theo đúng section bạn đang chọn."],
      aiSuggestionDraft: "",
      reviewCards: [],
    };
  }

  const sectionData = sectionFocus.analysisData;
  const textValues = sectionFocus.lines.map((line) => line.value).filter((line) => !line.startsWith("Chọn một item ở panel trái"));

  const quantifiedCount = textValues.filter((value) => containsQuantifiedSignal(value)).length;
  const listItemCount = Array.isArray(sectionData.items) ? sectionData.items.length : 0;

  const issues = dedupeStringList([
    ...(sectionFocus.missingItemSelection ? ["Bạn chưa chọn item cụ thể trong mục này."] : []),
    ...resolveListFieldIssues(section, sectionData),
    ...resolveTypeSpecificIssues(section, sectionData, textValues, quantifiedCount),
  ]).slice(0, 5);

  const metrics: SectionMetrics = {
    textCount: textValues.length,
    quantifiedCount,
    listItemCount,
  };

  const schema = getSectionSchema(section.type);
  const guidanceTips = buildGuidanceTips(section, issues);
  const aiSuggestionDraft = buildSectionAISuggestionDraft(section, sectionFocus, guidanceTips);

  return {
    guidanceHeading: `Hướng dẫn viết ${resolveSectionLabel(section).toLowerCase()}`,
    guidanceDescription: schema?.description
      ? sectionFocus.focusedItemLabel
        ? `${schema.description} Phần này đang bám theo ${sectionFocus.focusedItemLabel} bạn vừa chọn ở panel trái.`
        : `${schema.description} Phần này đang bám theo nội dung section bạn đang chọn ở panel trái.`
      : sectionFocus.focusedItemLabel
        ? `Phần hướng dẫn đang bám theo ${sectionFocus.focusedItemLabel} bạn vừa chọn ở panel trái.`
        : "Phần hướng dẫn đang bám theo nội dung section bạn đang chọn ở panel trái.",
    guidanceTips,
    aiSuggestionDraft,
    reviewCards: buildReviewCards(section, metrics, issues),
  };
}

function scoreSectionCompletion(section: CVSection) {
  const schema = getSectionSchema(section.type);
  if (!schema) {
    return 100;
  }

  if (schema.fields?.length) {
    const data = section.data as Record<string, unknown>;
    const filled = schema.fields.filter((field) => String(data[field.key] ?? "").trim().length > 0).length;
    return Math.round((filled / schema.fields.length) * 100);
  }

  if (schema.list) {
    const data = section.data as Record<string, unknown>;
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) {
      return 0;
    }

    const expected = items.length * schema.list.fields.length;
    const filled = items.reduce((count, item) => {
      if (!item || typeof item !== "object") {
        return count;
      }

      return (
        count +
        schema.list!.fields.filter((field) => String((item as Record<string, unknown>)[field.key] ?? "").trim().length > 0)
          .length
      );
    }, 0);

    return Math.round((filled / expected) * 100);
  }

  return 100;
}

export function EditorRightPanel({
  sections,
  selectedSectionId,
  selectedSectionItem,
  onSelectSection,
  onToggleVisibility,
  onUpdateSectionData,
  onAddListItem,
  onRemoveListItem,
  onOpenAddSection,
}: EditorRightPanelProps) {
  const selectedSection = resolveSelectedSection(sections, selectedSectionId);
  const panelScrollRef = useRef<HTMLDivElement | null>(null);
  const panelFocusAnchorRef = useRef<HTMLElement | null>(null);
  const previousSelectedSectionIdRef = useRef<string | null>(selectedSectionId);
  const suggestionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [suggestionDraftState, setSuggestionDraftState] = useState<{
    sourceKey: string;
    value: string;
  }>({
    sourceKey: "",
    value: "",
  });
  const [aiSuggestionState, setAiSuggestionState] = useState<AISuggestionState>({
    sourceKey: "",
    status: "idle",
    value: "",
    provider: null,
    error: null,
  });
  const [aiRetryNonce, setAiRetryNonce] = useState(0);

  useEffect(() => {
    const previousSelectedSectionId = previousSelectedSectionIdRef.current;

    if (!shouldJumpRightPanelToTop(previousSelectedSectionId, selectedSectionId)) {
      return;
    }

    panelScrollRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
    panelFocusAnchorRef.current?.focus({ preventScroll: true });

    previousSelectedSectionIdRef.current = selectedSectionId;
  }, [selectedSectionId]);

  const completionStats = useMemo(() => {
    const scores = sections.map((section) => scoreSectionCompletion(section));
    const total = scores.length ? Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length) : 0;
    return {
      total,
      done: scores.filter((score) => score >= 80).length,
      all: scores.length,
    };
  }, [sections]);

  const sectionLabel = useMemo(() => resolveSectionLabel(selectedSection), [selectedSection]);
  const sectionFocusPayload = useMemo(
    () => extractCurrentContentLines(selectedSection, selectedSectionItem),
    [selectedSection, selectedSectionItem],
  );
  const sectionContentLines = sectionFocusPayload.lines;
  const aiSuggestionResolution = useMemo(
    () => resolveAISuggestionRequestPayload(selectedSection, selectedSectionItem),
    [selectedSection, selectedSectionItem],
  );
  const aiRequestPayload = aiSuggestionResolution.payload;
  const aiUnavailableReason = aiSuggestionResolution.unavailableReason;
  const sectionAnalysis = useMemo(
    () => buildSectionAnalysis(selectedSection, sectionFocusPayload),
    [selectedSection, sectionFocusPayload],
  );

  const selectedItemKey =
    selectedSectionItem && selectedSectionItem.sectionId === selectedSection?.id
      ? [
          selectedSectionItem.sectionId,
          String(selectedSectionItem.itemIndex),
          selectedSectionItem.itemId || "",
          selectedSectionItem.itemPath,
        ].join("|")
      : "none";

  const suggestionSourceKey = [selectedSection?.id || "none", selectedItemKey].join("|");
  const aiRequestFingerprint = useMemo(() => {
    if (!aiRequestPayload) {
      return "none";
    }

    return [
      aiRequestPayload.sectionType,
      aiRequestPayload.fieldName,
      aiRequestPayload.currentContent,
      aiRequestPayload.context || "",
    ].join("||");
  }, [aiRequestPayload]);

  const activeAISuggestionState =
    aiSuggestionState.sourceKey === suggestionSourceKey
      ? aiSuggestionState
      : null;
  const aiStatus = activeAISuggestionState?.status || "idle";
  const aiSuggestionValue = activeAISuggestionState?.value || "";
  const isAISuggestionReady = aiStatus === "ready" && aiSuggestionValue.trim().length > 0;
  const suggestionInputDisabled = !isAISuggestionReady;
  const canRetryAISuggestion =
    Boolean(aiRequestPayload)
    && !sectionFocusPayload.missingItemSelection
    && aiStatus !== "loading";
  const shouldShowAIDebug = process.env.NODE_ENV !== "production" && Boolean(activeAISuggestionState?.debug);

  const suggestionPlaceholder =
    aiStatus === "loading"
      ? "Đang gọi Ollama để tạo gợi ý..."
      : aiStatus === "error" || aiStatus === "unavailable"
        ? "AI suggestion không khả dụng. Hãy bấm \"Tạo lại gợi ý AI\" để thử lại."
        : "AI sẽ gợi ý nội dung theo section/item đang chọn.";

  const editSuggestionDraft =
    suggestionDraftState.sourceKey === suggestionSourceKey
      ? suggestionDraftState.value
      : aiSuggestionValue;

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      if (!selectedSectionId) {
        if (disposed) {
          return;
        }

        setAiSuggestionState({
          sourceKey: suggestionSourceKey,
          status: "idle",
          value: "",
          provider: null,
          error: null,
        });
        return;
      }

      if (!aiRequestPayload) {
        if (disposed) {
          return;
        }

        setAiSuggestionState({
          sourceKey: suggestionSourceKey,
          status: "unavailable",
          value: "",
          provider: null,
          error: aiUnavailableReason || "AI suggestion không khả dụng cho mục này.",
        });
        setSuggestionDraftState((current) =>
          current.sourceKey === suggestionSourceKey
            ? {
                sourceKey: suggestionSourceKey,
                value: "",
              }
            : current,
        );
        return;
      }

      if (disposed) {
        return;
      }

      setAiSuggestionState({
        sourceKey: suggestionSourceKey,
        status: "loading",
        value: "",
        provider: null,
        error: null,
      });

      try {
        const result = await optimizeCVContent(
          aiRequestPayload.sectionType,
          aiRequestPayload.fieldName,
          aiRequestPayload.currentContent,
          aiRequestPayload.context,
        );

        if (disposed) {
          return;
        }

        const provider = result.provider || null;
        const suggestionValue = (result.suggestion || "").trim();
        const similarityScore = suggestionValue
          ? calculateSuggestionSimilarity(aiRequestPayload.currentContent, suggestionValue)
          : 0;

        if (result.success && suggestionValue) {
          if (isLikelyCopiedSuggestion(aiRequestPayload.currentContent, suggestionValue)) {
            const similarityText = similarityScore.toFixed(3);
            const message = `AI suggestion không khả dụng: nội dung trả về quá giống bản gốc (similarity=${similarityText}).`;

            setAiSuggestionState({
              sourceKey: suggestionSourceKey,
              status: "error",
              value: "",
              provider,
              error: message,
              debug: result.debug,
            });
            setSuggestionDraftState((current) =>
              current.sourceKey === suggestionSourceKey
                ? {
                    sourceKey: suggestionSourceKey,
                    value: "",
                  }
                : current,
            );

            if (process.env.NODE_ENV !== "production") {
              console.warn("[EditorRightPanel][AI] Suggestion rejected due to similarity", {
                sourceKey: suggestionSourceKey,
                similarityScore,
                payload: aiRequestPayload,
                debug: result.debug,
              });
            }
            return;
          }

          setAiSuggestionState({
            sourceKey: suggestionSourceKey,
            status: "ready",
            value: suggestionValue,
            provider,
            error: null,
            debug: result.debug,
          });
          setSuggestionDraftState({
            sourceKey: suggestionSourceKey,
            value: suggestionValue,
          });

          if (process.env.NODE_ENV !== "production") {
            console.info("[EditorRightPanel][AI] Received Ollama suggestion", {
              sourceKey: suggestionSourceKey,
              similarityScore,
              payload: aiRequestPayload,
              provider,
              debug: result.debug,
            });
          }
          return;
        }

        const message = result.error || "AI suggestion không khả dụng.";
        setAiSuggestionState({
          sourceKey: suggestionSourceKey,
          status: "error",
          value: "",
          provider,
          error: message,
          debug: result.debug,
        });
        setSuggestionDraftState((current) =>
          current.sourceKey === suggestionSourceKey
            ? {
                sourceKey: suggestionSourceKey,
                value: "",
              }
            : current,
        );

        if (process.env.NODE_ENV !== "production") {
          console.warn("[EditorRightPanel][AI] Optimize unavailable", {
            sourceKey: suggestionSourceKey,
            error: message,
            provider,
            debug: result.debug
              ? {
                  traceId: result.debug.traceId,
                  failureReason: result.debug.failureReason,
                  ollamaErrorType: result.debug.ollamaErrorType,
                  ollamaAttempts: result.debug.ollamaAttempts,
                  ollamaEndpoint: result.debug.ollamaEndpoint,
                }
              : undefined,
          });
        }
      } catch (error) {
        if (disposed) {
          return;
        }

        const technicalMessage = error instanceof Error ? error.message : String(error);
        const message = toFriendlyAITransportErrorMessage(technicalMessage);
        setAiSuggestionState({
          sourceKey: suggestionSourceKey,
          status: "error",
          value: "",
          provider: null,
          error: message,
        });
        setSuggestionDraftState((current) =>
          current.sourceKey === suggestionSourceKey
            ? {
                sourceKey: suggestionSourceKey,
                value: "",
              }
            : current,
        );

        if (process.env.NODE_ENV !== "production") {
          const payload = {
            sourceKey: suggestionSourceKey,
            payload: aiRequestPayload,
            error: technicalMessage,
          };

          if (isLikelyRecoverableAITransportError(technicalMessage)) {
            console.warn("[EditorRightPanel][AI] Recoverable optimize transport error", payload);
          } else {
            console.error("[EditorRightPanel][AI] Unexpected optimize error", payload);
          }
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [
    selectedSectionId,
    suggestionSourceKey,
    aiRequestFingerprint,
    aiRequestPayload,
    aiUnavailableReason,
    aiRetryNonce,
  ]);

  const handleSuggestionDraftChange = (nextValue: string) => {
    setSuggestionDraftState({
      sourceKey: suggestionSourceKey,
      value: nextValue,
    });
  };

  const handleRetryAISuggestion = () => {
    if (!aiRequestPayload || aiStatus === "loading") {
      return;
    }

    setSuggestionDraftState({
      sourceKey: suggestionSourceKey,
      value: "",
    });
    setAiRetryNonce((current) => current + 1);
  };

  useEffect(() => {
    const textareaElement = suggestionTextareaRef.current;
    if (!textareaElement) {
      return;
    }

    textareaElement.style.height = "0px";
    textareaElement.style.height = `${Math.max(textareaElement.scrollHeight, 220)}px`;
  }, [editSuggestionDraft, selectedSection?.id, selectedItemKey]);

  const canApplySuggestion =
    Boolean(selectedSection)
    && isAISuggestionReady
    && editSuggestionDraft.trim().length > 0
    && !sectionFocusPayload.missingItemSelection;

  const handleApplySuggestion = () => {
    if (!selectedSection) {
      return;
    }

    const updates = buildApplySuggestionUpdates(selectedSection, selectedSectionItem, editSuggestionDraft);
    if (!updates) {
      return;
    }

    onUpdateSectionData(selectedSection.id, updates);
  };

  return (
    <aside
      data-editor-pane="right"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-(--app-border) bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-(--app-shadow-soft)"
    >
      <div className="border-b border-slate-100 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {EDITOR_UI_TEXTS.rightPanel.guideTitle}
        </p>
        <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {EDITOR_UI_TEXTS.rightPanel.qualityTitle}
            </p>
            <p className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              {completionStats.total}%
            </p>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            {completionStats.done}/{completionStats.all} mục đạt mức hoàn thiện tốt.
          </p>
        </div>
      </div>

      <div
        ref={panelScrollRef}
        data-editor-right-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
      >
        <section ref={panelFocusAnchorRef} tabIndex={-1} className="space-y-4">
          {!selectedSection ? (
            <article className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-4 text-[13px] leading-6 text-slate-600">
              {EDITOR_UI_TEXTS.rightPanel.selectHint}
            </article>
          ) : (
            <>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.25)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Thành phần đang chọn</p>
                <h3 className="mt-2 text-[17px] font-bold leading-6 text-slate-900">{sectionLabel}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-slate-400">Loại section: {selectedSection.type}</p>
                {sectionFocusPayload.focusedItemLabel ? (
                  <p className="mt-1 text-[12px] font-medium text-slate-600">Đang chọn: {sectionFocusPayload.focusedItemLabel}</p>
                ) : sectionFocusPayload.missingItemSelection ? (
                  <p className="mt-1 text-[12px] font-medium text-amber-700">Chưa chọn item cụ thể trong section này.</p>
                ) : null}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.25)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nội dung hiện tại</p>
                <div className="mt-2 space-y-2">
                  {sectionContentLines.map((line, index) => (
                    <div
                      key={`${selectedSection.id}-content-${line.path}-${index + 1}`}
                      className={cn(
                        "rounded-xl border px-3 py-2",
                        sectionFocusPayload.missingItemSelection
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-slate-200 bg-slate-50/75",
                      )}
                    >
                      <p className="whitespace-pre-wrap wrap-break-word text-[12px] leading-5 text-slate-700">{line.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.25)]">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                    <Bot size={14} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hướng dẫn cách viết</p>
                    <h4 className="mt-1 text-[15px] font-semibold leading-6 text-slate-900">
                      {sectionAnalysis.guidanceHeading}
                    </h4>
                  </div>
                </div>
                <p className="mt-2 text-[12.5px] leading-6 text-slate-600">{sectionAnalysis.guidanceDescription}</p>
                <div className="mt-3 space-y-2">
                  {sectionAnalysis.guidanceTips.map((tip, index) => (
                    <p
                      key={`${selectedSection.id}-guidance-${index + 1}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] leading-5 text-slate-700"
                    >
                      {tip}
                    </p>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-emerald-200 bg-emerald-50/55 px-4 py-4 shadow-[0_18px_30px_-26px_rgba(16,185,129,0.28)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  <Sparkles size={14} />
                  Chỉnh sửa nội dung
                </div>
                <p className="mt-2 text-[12px] leading-5 text-emerald-900/90">
                  Nội dung gợi ý bên dưới được lấy trực tiếp từ Ollama theo section/item đang chọn.
                </p>
                <div className="mt-3 rounded-xl border border-emerald-200 bg-white/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-800">Nội dung gợi ý</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeAISuggestionState?.provider ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          {activeAISuggestionState.provider}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleRetryAISuggestion}
                        disabled={!canRetryAISuggestion}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:text-emerald-300"
                      >
                        <RotateCcw size={12} />
                        Tạo lại gợi ý AI
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-5 text-emerald-800">
                    {aiStatus === "loading" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Đang gọi Ollama để tạo gợi ý thực tế...
                      </span>
                    ) : aiStatus === "ready" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles size={12} />
                        Đã nhận gợi ý từ AI. Bạn có thể chỉnh sửa trước khi áp dụng.
                      </span>
                    ) : aiStatus === "error" || aiStatus === "unavailable" ? (
                      <span className="inline-flex items-start gap-1.5 text-amber-800">
                        <AlertTriangle size={12} className="mt-0.5" />
                        {activeAISuggestionState?.error || "AI suggestion không khả dụng."}
                      </span>
                    ) : (
                      "Chọn section/item để bắt đầu tạo gợi ý AI."
                    )}
                  </div>

                  <textarea
                    ref={suggestionTextareaRef}
                    value={editSuggestionDraft}
                    onChange={(event) => handleSuggestionDraftChange(event.target.value)}
                    onInput={(event) => {
                      const target = event.currentTarget;
                      target.style.height = "0px";
                      target.style.height = `${Math.max(target.scrollHeight, 220)}px`;
                    }}
                    placeholder={suggestionPlaceholder}
                    disabled={suggestionInputDisabled}
                    className={cn(
                      "mt-2 w-full resize-none overflow-hidden rounded-xl border px-3 py-2 text-[13px] leading-6 outline-none",
                      suggestionInputDisabled
                        ? "cursor-not-allowed border-emerald-100 bg-emerald-50/40 text-emerald-500"
                        : "border-emerald-200 bg-white text-emerald-950 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100",
                    )}
                  />

                  {shouldShowAIDebug && activeAISuggestionState?.debug ? (
                    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Dev debug
                      </summary>
                      <div className="mt-2 space-y-2 text-[11px] leading-5 text-slate-700">
                        <p>Trace ID: {activeAISuggestionState.debug.traceId}</p>
                        <p>Model: {activeAISuggestionState.debug.model}</p>
                        {activeAISuggestionState.debug.ollamaErrorType ? (
                          <p>Error type: {activeAISuggestionState.debug.ollamaErrorType}</p>
                        ) : null}
                        {activeAISuggestionState.debug.ollamaAttempts ? (
                          <p>Ollama attempts: {activeAISuggestionState.debug.ollamaAttempts}</p>
                        ) : null}
                        {activeAISuggestionState.debug.ollamaEndpoint ? (
                          <p>Ollama endpoint: {activeAISuggestionState.debug.ollamaEndpoint}</p>
                        ) : null}
                        <p>Similarity: {activeAISuggestionState.debug.similarityScore.toFixed(3)}</p>
                        <p>Retried: {activeAISuggestionState.debug.retriedBecauseSimilar ? "yes" : "no"}</p>
                        <p>Used retry result: {activeAISuggestionState.debug.usedRetryResult ? "yes" : "no"}</p>
                        {activeAISuggestionState.debug.failureReason ? (
                          <p>Failure reason: {activeAISuggestionState.debug.failureReason}</p>
                        ) : null}
                        <div>
                          <p className="font-semibold text-slate-600">System prompt preview</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-[10px] leading-4 text-slate-600">
                            {activeAISuggestionState.debug.systemPromptPreview}
                          </pre>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600">User prompt preview</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-[10px] leading-4 text-slate-600">
                            {activeAISuggestionState.debug.userPromptPreview}
                          </pre>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600">Final raw output preview</p>
                          <pre className="mt-1 whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-[10px] leading-4 text-slate-600">
                            {activeAISuggestionState.debug.finalAttemptRawPreview || "(empty)"}
                          </pre>
                        </div>
                      </div>
                    </details>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplySuggestion}
                      disabled={!canApplySuggestion}
                      className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-300"
                    >
                      Áp dụng nội dung này vào bài
                    </button>
                    {sectionFocusPayload.missingItemSelection ? (
                      <p className="text-[11px] leading-5 text-amber-700">
                        Chọn đúng item ở panel trái trước khi áp dụng.
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.25)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Đúng / Sai / Nên viết thế nào</p>
                <div className="mt-3 grid gap-2.5">
                  {sectionAnalysis.reviewCards.map((card) => (
                    <div key={`${selectedSection.id}-${card.id}`} className={cn("rounded-xl border px-3 py-3", card.toneClassName)}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
                        {card.id === "do" ? <CheckCircle2 size={13} /> : null}
                        {card.id === "dont" ? <CircleOff size={13} /> : null}
                        {card.id === "should" ? <Sparkles size={13} /> : null}
                        {card.title}
                      </div>
                      <p className="mt-1.5 text-[12px] leading-5">{card.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}
        </section>

        {selectedSection ? (
          <section className="mt-8">
            <SectionFormRenderer
              selectedSection={selectedSection}
              onUpdateSectionData={onUpdateSectionData}
              onAddListItem={onAddListItem}
              onRemoveListItem={onRemoveListItem}
              className="mt-0"
              autoFocusFirstField
              title="Biểu mẫu dữ liệu chi tiết"
            />
          </section>
        ) : null}

        <section className="mt-8">
          <OutlinePanel
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            onToggleVisibility={onToggleVisibility}
            onOpenAddSection={onOpenAddSection}
          />
        </section>
      </div>
    </aside>
  );
}
