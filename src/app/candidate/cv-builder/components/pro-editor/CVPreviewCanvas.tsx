"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { CVSection, CVSelectedSectionItem } from "../../types";
import { CVHeader } from "./CVHeader";
import { CVPaper } from "./CVPaper";
import { CVSectionRenderer } from "./CVSectionRenderer";
import { mapBuilderSectionsToPreviewData, orderPreviewSections } from "./schema-driven-preview/adapters";
import { resolveSectionStyleConfig } from "./schema-driven-preview/section-renderers";
import {
  buildTemplatePaletteTokens,
  resolveSidebarPatternClassName,
  resolveTemplatePatternClassName,
} from "./schema-driven-preview/theme-tokens";
import type { SectionRenderMode } from "./schema-driven-preview/SectionRenderer";
import type {
  CVHeaderSummaryContentData,
  CVPreviewSection,
  CVTemplateBodyLayout,
} from "./schema-driven-preview/types";
import { getTemplateConfig } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/template-config";
import { useCVStore } from "../../store";

const A4_HEIGHT_PX = 1122;
const PAGE_FOOTER_RESERVE_PX = 44;
const SIDEBAR_PAGE_FOOTER_RESERVE_PX = 28;
const HEADER_SECTION_GAP_PX = 20;
const SINGLE_PAGE_ZOOM_DEFAULT_CLASS = "[zoom:1]";
const MIN_READABLE_SINGLE_PAGE_ZOOM = 0.96;

function resolveSinglePageZoomClass(zoomValue: number) {
  if (zoomValue >= 0.985) {
    return "[zoom:1]";
  }

  if (zoomValue >= 0.96) {
    return "[zoom:0.96]";
  }

  if (zoomValue >= 0.94) {
    return "[zoom:0.94]";
  }

  if (zoomValue >= 0.92) {
    return "[zoom:0.92]";
  }

  return "[zoom:0.9]";
}

function resolvePreviewFontFamilyClass(fontName: string) {
  const normalized = fontName.trim().toLowerCase();

  if (normalized.includes("times")) {
    return "cv-preview-font-times";
  }

  if (normalized.includes("courier")) {
    return "cv-preview-font-courier";
  }

  if (normalized.includes("amiri")) {
    return "cv-preview-font-amiri";
  }

  if (normalized.includes("cairo")) {
    return "cv-preview-font-cairo";
  }

  if (normalized.includes("ubuntu")) {
    return "cv-preview-font-ubuntu";
  }

  if (normalized.includes("roboto")) {
    return "cv-preview-font-roboto";
  }

  if (normalized.includes("inter")) {
    return "cv-preview-font-inter";
  }

  if (normalized.includes("manrope")) {
    return "cv-preview-font-manrope";
  }

  if (normalized.includes("ibm plex")) {
    return "cv-preview-font-ibm-plex-sans";
  }

  if (normalized.includes("jakarta")) {
    return "cv-preview-font-plus-jakarta-sans";
  }

  if (normalized.includes("source sans")) {
    return "cv-preview-font-source-sans-3";
  }

  if (normalized.includes("lora")) {
    return "cv-preview-font-lora";
  }

  return "cv-preview-font-arial";
}

function resolvePreviewTextSizeClass(spacingValue: number) {
  if (!Number.isFinite(spacingValue)) {
    return "cv-preview-text-medium";
  }

  if (spacingValue <= 3.85) {
    return "cv-preview-text-small";
  }

  if (spacingValue >= 4.2) {
    return "cv-preview-text-large";
  }

  return "cv-preview-text-medium";
}

type BodyColumn = "left" | "right";

function normalizeSummaryLine(line: string) {
  return line.replace(/^[-*\u2022]+\s*/, "").trim();
}

function splitSummaryTextToLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map(normalizeSummaryLine)
    .filter(Boolean);
}

function extractSummaryForHeader(input: {
  section: CVPreviewSection;
  layout: {
    summaryTitle?: string;
    summaryMaxBullets?: number;
  };
}): CVHeaderSummaryContentData | null {
  const { section, layout } = input;
  const summaryData = section.data as {
    text?: unknown;
    title?: unknown;
    items?: unknown;
  };

  const linesFromText = typeof summaryData.text === "string"
    ? splitSummaryTextToLines(summaryData.text)
    : [];

  const linesFromItems = Array.isArray(summaryData.items)
    ? summaryData.items
      .map((item) => normalizeSummaryLine(String((item as { content?: unknown }).content ?? "")))
      .filter(Boolean)
    : [];

  const mergedLines: string[] = [];
  const seen = new Set<string>();
  [...linesFromText, ...linesFromItems].forEach((line) => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    mergedLines.push(line);
  });

  if (mergedLines.length === 0) {
    return null;
  }

  const maxBullets = Number.isFinite(layout.summaryMaxBullets)
    ? Math.max(1, Math.floor(layout.summaryMaxBullets ?? 4))
    : 4;
  const intro = mergedLines[0] || "";
  const bullets = mergedLines.slice(1, 1 + maxBullets);

  return {
    title: String(summaryData.title || "").trim() || layout.summaryTitle || "Tổng quan",
    intro,
    bullets,
  };
}

function resolveTwoColumnGridClass(layout: CVTemplateBodyLayout | undefined) {
  if (!layout || layout.mode !== "two-column") {
    return "grid-cols-1";
  }

  if (layout.columnRatio === "left-narrow") {
    return "grid-cols-[0.78fr_1.22fr]";
  }

  if (layout.columnRatio === "left-wide") {
    return "grid-cols-[1.2fr_0.8fr]";
  }

  return "grid-cols-2";
}

interface RenderSectionBlock {
  id: string;
  section: CVPreviewSection;
  height: number;
  splitMeta?: {
    sectionBaseHeight: number;
    itemGap: number;
    itemHeights: number[];
    itemStartIndex: number;
    totalItemsCount: number;
    sourceItems: unknown[];
  };
}

interface SectionSplitContext {
  startIndex: number;
  itemCount: number;
  totalCount: number;
  isContinuation: boolean;
  sourceItems: unknown[];
}

export function mergeSplitChunkItems(input: {
  sourceItems: unknown[];
  splitContext: {
    startIndex: number;
    itemCount: number;
  };
  chunkItems: unknown[];
}) {
  const { sourceItems, splitContext, chunkItems } = input;
  const safeStartIndex = Math.min(Math.max(splitContext.startIndex, 0), sourceItems.length);
  const tailStartIndex = Math.min(safeStartIndex + Math.max(splitContext.itemCount, 0), sourceItems.length);

  return [
    ...sourceItems.slice(0, safeStartIndex),
    ...chunkItems,
    ...sourceItems.slice(tailStartIndex),
  ];
}

interface PreviewPage {
  includeHeader: boolean;
  blocks: RenderSectionBlock[];
}

export function isPreviewBlockActive(
  selectedSectionId: string | null,
  blockSection: Pick<CVPreviewSection, "sourceSectionId">,
) {
  return selectedSectionId === blockSection.sourceSectionId;
}

function serializePageBlockSection(block: RenderSectionBlock) {
  const section = block.section;

  try {
    return JSON.stringify({
      sourceSectionId: section.sourceSectionId,
      type: section.type,
      title: section.title,
      visible: section.visible,
      order: section.order,
      data: section.data,
    });
  } catch {
    return "";
  }
}

export function shouldReusePaginatedPages(left: PreviewPage[], right: PreviewPage[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i].includeHeader !== right[i].includeHeader) {
      return false;
    }

    if (left[i].blocks.length !== right[i].blocks.length) {
      return false;
    }

    for (let j = 0; j < left[i].blocks.length; j += 1) {
      const leftBlock = left[i].blocks[j];
      const rightBlock = right[i].blocks[j];

      if (leftBlock.id !== rightBlock.id) {
        return false;
      }

      if (serializePageBlockSection(leftBlock) !== serializePageBlockSection(rightBlock)) {
        return false;
      }
    }
  }

  return true;
}

function getSectionItems(section: CVPreviewSection): unknown[] | null {
  const maybeItems = (section.data as { items?: unknown }).items;
  return Array.isArray(maybeItems) ? maybeItems : null;
}

function resolveSourceItemIdByIndex(section: CVSection | undefined, itemIndex: number) {
  if (!section) {
    return null;
  }

  const sectionData = section.data as Record<string, unknown>;
  const rawItems = Array.isArray(sectionData.items) ? sectionData.items : null;
  if (!rawItems) {
    return null;
  }

  const rawItem = rawItems[itemIndex];
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const rawId = (rawItem as Record<string, unknown>).id;
  return typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : null;
}

function resolveItemSelectionFromTarget(input: {
  target: EventTarget | null;
  sectionContainer: HTMLElement;
  blockSection: CVPreviewSection;
  sourceSection: CVSection | undefined;
}): CVSelectedSectionItem | null {
  const { target, sectionContainer, blockSection, sourceSection } = input;

  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const itemElement = target.closest<HTMLElement>("[data-cv-split-item='true']");
  if (!itemElement || !sectionContainer.contains(itemElement)) {
    return null;
  }

  const localIndexFromDataset = Number(itemElement.dataset.cvItemIndex);
  const localIndex = Number.isFinite(localIndexFromDataset)
    ? Math.floor(localIndexFromDataset)
    : Array.from(sectionContainer.querySelectorAll<HTMLElement>("[data-cv-split-item='true']")).indexOf(itemElement);

  if (localIndex < 0) {
    return null;
  }

  const splitContext = getSectionSplitContext(blockSection);
  const itemIndex = (splitContext?.startIndex ?? 0) + localIndex;
  const sectionData = sourceSection?.data as Record<string, unknown> | undefined;
  const hasItemsArray = Array.isArray(sectionData?.items);
  const elementItemId = itemElement.dataset.cvItemId?.trim() || null;

  return {
    sectionId: blockSection.sourceSectionId,
    itemIndex,
    itemId: elementItemId ?? resolveSourceItemIdByIndex(sourceSection, itemIndex),
    itemPath: hasItemsArray ? `data.items[${itemIndex}]` : "data.text",
  };
}

function toSelectionKey(selection: CVSelectedSectionItem | null) {
  if (!selection) {
    return "null";
  }

  return [
    selection.sectionId,
    String(selection.itemIndex),
    selection.itemId || "",
    selection.itemPath,
  ].join("|");
}

function getSectionSplitContext(section: CVPreviewSection): SectionSplitContext | null {
  const sectionData = section.data as unknown as {
    __splitContext?: {
      startIndex?: unknown;
      itemCount?: unknown;
      totalCount?: unknown;
      isContinuation?: unknown;
      sourceItems?: unknown;
    };
  };

  const context = sectionData.__splitContext;
  if (!context) {
    return null;
  }

  const startIndex = Number(context.startIndex);
  const itemCount = Number(context.itemCount);
  const totalCount = Number(context.totalCount);
  const sourceItems = Array.isArray(context.sourceItems) ? context.sourceItems : null;

  if (!Number.isFinite(startIndex) || !Number.isFinite(itemCount) || !Number.isFinite(totalCount) || !sourceItems) {
    return null;
  }

  return {
    startIndex: Math.max(0, Math.floor(startIndex)),
    itemCount: Math.max(0, Math.floor(itemCount)),
    totalCount: Math.max(0, Math.floor(totalCount)),
    isContinuation: context.isContinuation === true,
    sourceItems,
  };
}

function cloneSectionWithItems(
  section: CVPreviewSection,
  items: unknown[],
  chunkIndex: number,
  customId?: string,
  splitContext?: SectionSplitContext,
): CVPreviewSection {
  const sectionData = section.data as unknown as Record<string, unknown>;
  const nextData: Record<string, unknown> = {
    ...sectionData,
    items,
  };

  if (splitContext) {
    nextData.__splitContext = splitContext;
  } else if ("__splitContext" in nextData) {
    delete nextData.__splitContext;
  }

  return {
    ...section,
    id: customId ?? `${section.id}__chunk_${chunkIndex + 1}`,
    data: nextData as unknown as CVPreviewSection["data"],
  };
}

function findListRootForItems(contentElement: HTMLElement, expectedItemCount: number) {
  const queue: HTMLElement[] = [contentElement];
  const visited = new Set<HTMLElement>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const children = Array.from(current.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );

    if (children.length === expectedItemCount) {
      return current;
    }

    children.forEach((child) => {
      if (child.children.length > 0) {
        queue.push(child);
      }
    });
  }

  return null;
}

function calculateChunkHeight(itemHeights: number[], sectionBaseHeight: number, itemGap: number) {
  const itemsHeight = itemHeights.reduce((total, height) => total + height, 0);
  const gapsHeight = itemHeights.length > 1 ? itemGap * (itemHeights.length - 1) : 0;

  return sectionBaseHeight + itemsHeight + gapsHeight;
}

function createItemChunkBlock(input: {
  sourceSection: CVPreviewSection;
  items: unknown[];
  itemHeights: number[];
  sectionBaseHeight: number;
  itemGap: number;
  blockId: string;
  itemStartIndex: number;
  totalItemsCount: number;
  sourceItems: unknown[];
}): RenderSectionBlock {
  const {
    sourceSection,
    items,
    itemHeights,
    sectionBaseHeight,
    itemGap,
    blockId,
    itemStartIndex,
    totalItemsCount,
    sourceItems,
  } = input;

  const splitContext: SectionSplitContext = {
    startIndex: itemStartIndex,
    itemCount: items.length,
    totalCount: totalItemsCount,
    isContinuation: itemStartIndex > 0,
    sourceItems,
  };

  return {
    id: blockId,
    section: cloneSectionWithItems(sourceSection, items, 0, blockId, splitContext),
    height: calculateChunkHeight(itemHeights, sectionBaseHeight, itemGap),
    splitMeta: {
      sectionBaseHeight,
      itemGap,
      itemHeights: [...itemHeights],
      itemStartIndex,
      totalItemsCount,
      sourceItems,
    },
  };
}

function createItemChunkBlocks(input: {
  sourceSection: CVPreviewSection;
  items: unknown[];
  itemHeights: number[];
  sectionBaseHeight: number;
  itemGap: number;
  maxChunkHeight: number;
  idPrefix: string;
  startIndex?: number;
  fullSourceItems?: unknown[];
}): RenderSectionBlock[] {
  const {
    sourceSection,
    items,
    itemHeights,
    sectionBaseHeight,
    itemGap,
    maxChunkHeight,
    idPrefix,
    startIndex = 0,
    fullSourceItems,
  } = input;

  const blocks: RenderSectionBlock[] = [];
  const sourceItems = fullSourceItems ?? items;
  const totalItemsCount = sourceItems.length;
  let currentChunkStartIndex = startIndex;
  let currentItems: unknown[] = [];
  let currentItemHeights: number[] = [];

  const pushChunk = () => {
    if (currentItems.length === 0) {
      return;
    }

    blocks.push(
      createItemChunkBlock({
        sourceSection,
        items: currentItems,
        itemHeights: currentItemHeights,
        sectionBaseHeight,
        itemGap,
        blockId: `${idPrefix}__chunk_${blocks.length + 1}`,
        itemStartIndex: currentChunkStartIndex,
        totalItemsCount,
        sourceItems,
      }),
    );

    currentChunkStartIndex += currentItems.length;

    currentItems = [];
    currentItemHeights = [];
  };

  items.forEach((item, itemIndex) => {
    const nextItemHeight = itemHeights[itemIndex] ?? 1;
    const projectedItemHeights = [...currentItemHeights, nextItemHeight];
    const projectedHeight = calculateChunkHeight(projectedItemHeights, sectionBaseHeight, itemGap);

    if (currentItems.length > 0 && projectedHeight > maxChunkHeight) {
      pushChunk();
    }

    currentItems.push(item);
    currentItemHeights.push(nextItemHeight);
  });

  pushChunk();

  if (blocks.length > 0) {
    return blocks;
  }

  return [
    createItemChunkBlock({
      sourceSection,
      items,
      itemHeights,
      sectionBaseHeight,
      itemGap,
      blockId: `${idPrefix}__chunk_1`,
      itemStartIndex: startIndex,
      totalItemsCount,
      sourceItems,
    }),
  ];
}

function splitBlockToFitRemaining(input: {
  block: RenderSectionBlock;
  availableHeight: number;
  maxPageContentHeight: number;
}): { headBlock: RenderSectionBlock; tailBlocks: RenderSectionBlock[] } | null {
  const { block, availableHeight, maxPageContentHeight } = input;

  if (!block.splitMeta || availableHeight <= 0) {
    return null;
  }

  const blockItems = getSectionItems(block.section);
  if (!blockItems || blockItems.length <= 1) {
    return null;
  }

  const {
    itemHeights,
    itemGap,
    sectionBaseHeight,
    itemStartIndex,
    sourceItems,
    totalItemsCount,
  } = block.splitMeta;
  let fittingCount = 0;

  for (let index = 0; index < blockItems.length - 1; index += 1) {
    const projectedHeights = itemHeights.slice(0, index + 1);
    const projectedHeight = calculateChunkHeight(projectedHeights, sectionBaseHeight, itemGap);

    if (projectedHeight <= availableHeight) {
      fittingCount = index + 1;
      continue;
    }

    break;
  }

  if (fittingCount === 0) {
    return null;
  }

  const headItems = blockItems.slice(0, fittingCount);
  const headHeights = itemHeights.slice(0, fittingCount);
  const tailItems = blockItems.slice(fittingCount);
  const tailHeights = itemHeights.slice(fittingCount);

  if (tailItems.length === 0) {
    return null;
  }

  const headBlock = createItemChunkBlock({
    sourceSection: block.section,
    items: headItems,
    itemHeights: headHeights,
    sectionBaseHeight,
    itemGap,
    blockId: `${block.id}__split_head`,
    itemStartIndex,
    totalItemsCount,
    sourceItems,
  });

  const tailBlocks = createItemChunkBlocks({
    sourceSection: block.section,
    items: tailItems,
    itemHeights: tailHeights,
    sectionBaseHeight,
    itemGap,
    maxChunkHeight: maxPageContentHeight,
    idPrefix: `${block.id}__split_tail`,
    startIndex: itemStartIndex + fittingCount,
    fullSourceItems: sourceItems,
  });

  return {
    headBlock,
    tailBlocks,
  };
}

function paginateColumnBlocks(input: {
  blocks: RenderSectionBlock[];
  firstPageAvailableHeight: number;
  fullPageAvailableHeight: number;
  sectionGap: number;
  maxPageContentHeight: number;
}): RenderSectionBlock[][] {
  const {
    blocks,
    firstPageAvailableHeight,
    fullPageAvailableHeight,
    sectionGap,
    maxPageContentHeight,
  } = input;
  const queue = [...blocks];
  const paginatedBlocks: RenderSectionBlock[][] = [];
  let pageIndex = 0;

  while (queue.length > 0) {
    const pageBlocks: RenderSectionBlock[] = [];
    let remainingHeight = Math.max(
      80,
      pageIndex === 0 ? firstPageAvailableHeight : fullPageAvailableHeight,
    );

    while (queue.length > 0) {
      const currentBlock = queue[0];
      if (!currentBlock) {
        break;
      }

      const sectionGapBeforeBlock = pageBlocks.length > 0 ? sectionGap : 0;
      const requiredHeight = currentBlock.height + sectionGapBeforeBlock;

      if (requiredHeight <= remainingHeight) {
        pageBlocks.push(currentBlock);
        queue.shift();
        remainingHeight -= requiredHeight;
        continue;
      }

      const splitResult = splitBlockToFitRemaining({
        block: currentBlock,
        availableHeight: Math.max(0, remainingHeight - sectionGapBeforeBlock),
        maxPageContentHeight,
      });

      if (splitResult) {
        pageBlocks.push(splitResult.headBlock);
        queue.shift();
        queue.unshift(...splitResult.tailBlocks);
      } else if (pageBlocks.length === 0) {
        // Keep progress moving when a non-splittable block is taller than the remaining column space.
        pageBlocks.push(currentBlock);
        queue.shift();
      }

      break;
    }

    paginatedBlocks.push(pageBlocks);
    pageIndex += 1;
  }

  return paginatedBlocks.length > 0 ? paginatedBlocks : [[]];
}

function measureListItemLayout(sectionNode: HTMLDivElement | null, expectedItemCount: number) {
  if (!sectionNode || expectedItemCount <= 0) {
    return null;
  }

  const contentElement = sectionNode.querySelector<HTMLElement>("[data-cv-section-content]");
  if (!contentElement) {
    return null;
  }

  const markedItemElements = Array.from(
    contentElement.querySelectorAll<HTMLElement>("[data-cv-split-item='true']"),
  );

  if (markedItemElements.length === expectedItemCount) {
    const itemHeights = markedItemElements.map((element) => Math.max(1, element.offsetHeight));

    let totalGap = 0;
    for (let index = 0; index < markedItemElements.length - 1; index += 1) {
      const current = markedItemElements[index];
      const next = markedItemElements[index + 1];
      const gap = next.offsetTop - current.offsetTop - current.offsetHeight;
      totalGap += Math.max(0, gap);
    }

    return {
      itemHeights,
      totalGap,
    };
  }

  const listRoot = findListRootForItems(contentElement, expectedItemCount);
  if (!listRoot) {
    return null;
  }

  const itemElements = Array.from(listRoot.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  if (itemElements.length !== expectedItemCount) {
    return null;
  }

  const itemHeights = itemElements.map((element) => Math.max(1, element.offsetHeight));

  let totalGap = 0;
  for (let index = 0; index < itemElements.length - 1; index += 1) {
    const current = itemElements[index];
    const next = itemElements[index + 1];
    const gap = next.offsetTop - current.offsetTop - current.offsetHeight;
    totalGap += Math.max(0, gap);
  }

  return {
    itemHeights,
    totalGap,
  };
}

function measureSectionGap(container: HTMLDivElement | null) {
  if (!container) {
    return 0;
  }

  const sectionNodes = Array.from(container.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  if (sectionNodes.length < 2) {
    return 0;
  }

  const firstSection = sectionNodes[0];
  const secondSection = sectionNodes[1];
  const gap = secondSection.offsetTop - firstSection.offsetTop - firstSection.offsetHeight;

  return Math.max(0, gap);
}

function buildSectionBlocks(input: {
  section: CVPreviewSection;
  sectionHeight: number;
  sectionNode: HTMLDivElement | null;
  maxPageContentHeight: number;
}): RenderSectionBlock[] {
  const { section, sectionHeight, sectionNode, maxPageContentHeight } = input;
  const sectionItems = getSectionItems(section);

  if (!sectionItems || sectionItems.length <= 1 || !sectionNode) {
    return [
      {
        id: section.id,
        section,
        height: sectionHeight,
      },
    ];
  }

  const listLayout = measureListItemLayout(sectionNode, sectionItems.length);
  if (!listLayout) {
    return [
      {
        id: section.id,
        section,
        height: sectionHeight,
      },
    ];
  }

  const sumItemHeights = listLayout.itemHeights.reduce((total, height) => total + height, 0);
  const itemGap = sectionItems.length > 1 ? listLayout.totalGap / (sectionItems.length - 1) : 0;
  const sectionBaseHeight = Math.max(0, sectionHeight - sumItemHeights - listLayout.totalGap);

  return createItemChunkBlocks({
    sourceSection: section,
    items: sectionItems,
    itemHeights: listLayout.itemHeights,
    sectionBaseHeight,
    itemGap,
    maxChunkHeight: maxPageContentHeight,
    idPrefix: section.id,
    startIndex: 0,
    fullSourceItems: sectionItems,
  });
}

interface CVPreviewCanvasProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onSelectSectionItem?: (selection: CVSelectedSectionItem | null) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
  templateId?: string;
  mode?: SectionRenderMode;
}

export function CVPreviewCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  onSelectSectionItem,
  onUpdateSectionData,
  onRequestAddSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  templateId,
  mode = "edit",
}: CVPreviewCanvasProps) {
  const themeBodyFont = useCVStore((state) => state.cv.theme.fonts.body);
  const themePrimaryColor = useCVStore((state) => state.cv.theme.colors.primary);
  const themePatternColor = useCVStore((state) => state.cv.theme.colors.pattern);
  const themeAppearance = useCVStore((state) => state.cv.theme.appearance);
  const themeSpacing = useCVStore((state) => state.cv.theme.spacing);
  const template = useMemo(() => getTemplateConfig(templateId), [templateId]);
  const isTealFamily = template.visualFamily === "teal";
  const visibleContentSectionCount = useMemo(
    () => sections.filter((section) => section.isVisible && section.type !== "header" && section.type !== "personal_info").length,
    [sections],
  );
  const forceSinglePage = isTealFamily && visibleContentSectionCount <= 3;
  const headerSectionGapPx = isTealFamily ? 10 : HEADER_SECTION_GAP_PX;
  const headerSectionGapClassName = isTealFamily ? "mt-2.5" : "mt-5";
  const previewFontFamilyClassName = useMemo(
    () => resolvePreviewFontFamilyClass(String(themeBodyFont || "Arial")),
    [themeBodyFont],
  );
  const previewBodyTextClassName = useMemo(
    () => resolvePreviewTextSizeClass(Number(themeSpacing)),
    [themeSpacing],
  );
  const paletteTokens = useMemo(
    () => buildTemplatePaletteTokens({
      primaryColor: themePrimaryColor,
      patternColor: themePatternColor,
      syncPatternWithPrimary: themeAppearance?.syncPatternWithPrimary,
    }),
    [themeAppearance?.syncPatternWithPrimary, themePatternColor, themePrimaryColor],
  );
  const resolvedPaperPatternClassName = useMemo(
    () => resolveTemplatePatternClassName(themeAppearance?.patternId),
    [themeAppearance?.patternId],
  );
  const resolvedSidebarPatternClassName = useMemo(
    () => resolveSidebarPatternClassName(themeAppearance?.patternId),
    [themeAppearance?.patternId],
  );
  const previewData = useMemo(() => mapBuilderSectionsToPreviewData(sections), [sections]);
  const orderedSections = useMemo(
    () => orderPreviewSections(previewData.sections, template.sectionOrder),
    [previewData.sections, template.sectionOrder],
  );
  const bodyLayout = template.bodyLayout;
  const isTwoColumnBody = bodyLayout?.mode === "two-column";
  const isSidebarHeaderLayout = template.headerLayout.variant === "sidebar-profile";
  const shouldRenderTopHeader = !isSidebarHeaderLayout;
  const shouldRenderSidebarColumnHeader = isSidebarHeaderLayout && isTwoColumnBody;
  const bodyColumnGridClassName = useMemo(
    () => resolveTwoColumnGridClass(bodyLayout),
    [bodyLayout],
  );
  const bodyColumnGapClassName = bodyLayout?.columnGapClassName ?? "gap-4";

  const leftColumnSectionTypeSet = useMemo(
    () => new Set(bodyLayout?.leftColumnSectionTypes ?? []),
    [bodyLayout?.leftColumnSectionTypes],
  );
  const rightColumnSectionTypeSet = useMemo(
    () => new Set(bodyLayout?.rightColumnSectionTypes ?? []),
    [bodyLayout?.rightColumnSectionTypes],
  );

  const summaryInHeaderState = useMemo(() => {
    if (!template.headerLayout.summaryInHeader) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    const summarySection = orderedSections.find((section) => section.type === "summary" && section.visible);
    if (!summarySection) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    const summary = extractSummaryForHeader({
      section: summarySection,
      layout: {
        summaryTitle: template.headerLayout.summaryTitle,
        summaryMaxBullets: template.headerLayout.summaryMaxBullets,
      },
    });

    if (!summary) {
      return {
        summary: null as CVHeaderSummaryContentData | null,
        sourceSectionId: null as string | null,
      };
    }

    return {
      summary,
      sourceSectionId: summarySection.id,
    };
  }, [
    orderedSections,
    template.headerLayout.summaryInHeader,
    template.headerLayout.summaryMaxBullets,
    template.headerLayout.summaryTitle,
  ]);

  const renderedSections = useMemo(() => {
    if (!summaryInHeaderState.sourceSectionId) {
      return orderedSections;
    }

    return orderedSections.filter((section) => section.id !== summaryInHeaderState.sourceSectionId);
  }, [orderedSections, summaryInHeaderState.sourceSectionId]);

  const resolveBodyColumnForSection = useCallback((section: CVPreviewSection): BodyColumn => {
    if (!isTwoColumnBody) {
      return "left";
    }

    if (leftColumnSectionTypeSet.has(section.type)) {
      return "left";
    }

    if (rightColumnSectionTypeSet.has(section.type)) {
      return "right";
    }

    if (bodyLayout?.columnRatio === "left-wide" && rightColumnSectionTypeSet.size > 0) {
      return "left";
    }

    return "right";
  }, [bodyLayout?.columnRatio, isTwoColumnBody, leftColumnSectionTypeSet, rightColumnSectionTypeSet]);

  const sourceSectionById = useMemo(() => {
    const entries = sections.map((section) => [section.id, section] as const);
    return new Map<string, CVSection>(entries);
  }, [sections]);

  const previewThemeScopeRef = useRef<HTMLDivElement | null>(null);
  const measureThemeScopeRef = useRef<HTMLDivElement | null>(null);
  const measurePaperRef = useRef<HTMLDivElement | null>(null);
  const measureHeaderRef = useRef<HTMLDivElement | null>(null);
  const measureSidebarHeaderRef = useRef<HTMLDivElement | null>(null);
  const measureSectionsContainerRef = useRef<HTMLDivElement | null>(null);
  const measureLeftColumnRef = useRef<HTMLDivElement | null>(null);
  const measureRightColumnRef = useRef<HTMLDivElement | null>(null);
  const measureSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastItemSelectionKeyRef = useRef<string>("null");
  const [paginatedPages, setPaginatedPages] = useState<PreviewPage[]>([]);
  const [singlePageZoomClassName, setSinglePageZoomClassName] = useState(SINGLE_PAGE_ZOOM_DEFAULT_CLASS);
  const [tealPaginateForReadability, setTealPaginateForReadability] = useState(false);

  useLayoutEffect(() => {
    const themeScopes = [previewThemeScopeRef.current, measureThemeScopeRef.current].filter(
      (node): node is HTMLDivElement => node instanceof HTMLDivElement,
    );

    themeScopes.forEach((scopeElement) => {
      scopeElement.style.setProperty("--cv-template-accent-rgb", paletteTokens.primaryRgb);
      scopeElement.style.setProperty("--cv-template-primary-rgb", paletteTokens.primaryRgb);
      scopeElement.style.setProperty("--cv-template-primary-soft-rgb", paletteTokens.primarySoftRgb);
      scopeElement.style.setProperty("--cv-template-primary-muted-rgb", paletteTokens.primaryMutedRgb);
      scopeElement.style.setProperty("--cv-template-primary-border-rgb", paletteTokens.primaryBorderRgb);
      scopeElement.style.setProperty("--cv-template-primary-contrast-rgb", paletteTokens.primaryContrastRgb);
      scopeElement.style.setProperty("--cv-template-pattern-rgb", paletteTokens.patternRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-background-rgb", paletteTokens.sidebarBackgroundRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-text-rgb", paletteTokens.sidebarTextRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-muted-rgb", paletteTokens.sidebarMutedRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-icon-rgb", paletteTokens.sidebarIconRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-divider-rgb", paletteTokens.sidebarDividerRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-overlay-rgb", paletteTokens.sidebarOverlayRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-skill-track-rgb", paletteTokens.sidebarSkillTrackRgb);
      scopeElement.style.setProperty("--cv-template-sidebar-skill-fill-rgb", paletteTokens.sidebarSkillFillRgb);
    });
  }, [paletteTokens]);

  const emitItemSelection = (selection: CVSelectedSectionItem | null) => {
    if (!onSelectSectionItem) {
      return;
    }

    const nextKey = toSelectionKey(selection);
    if (lastItemSelectionKeyRef.current === nextKey) {
      return;
    }

    lastItemSelectionKeyRef.current = nextKey;
    onSelectSectionItem(selection);
  };

  const headerSection = sections.find((section) => section.type === "header");
  const personalInfoSection = sections.find((section) => section.type === "personal_info");
  const hasHeader = Boolean(headerSection || personalInfoSection);
  const hasTopHeader = hasHeader && shouldRenderTopHeader;
  const hasSidebarHeader = hasHeader && shouldRenderSidebarColumnHeader;
  const headerSelected = selectedSectionId === headerSection?.id || selectedSectionId === personalInfoSection?.id;

  const selectHeader = () => {
    if (headerSection) {
      emitItemSelection(null);
      onSelectSection(headerSection.id);
      return;
    }

    if (personalInfoSection) {
      emitItemSelection(null);
      onSelectSection(personalInfoSection.id);
    }
  };

  useLayoutEffect(() => {
    const recalculatePages = () => {
      const paperElement = measurePaperRef.current;

      const fallbackBlocks: RenderSectionBlock[] = renderedSections.map((section, index) => ({
        id: `${section.id}__fallback_${index + 1}`,
        section,
        height: 1,
      }));

      if (!paperElement) {
        const fallbackPages: PreviewPage[] = [
          {
            includeHeader: hasTopHeader,
            blocks: fallbackBlocks,
          },
        ];

        setPaginatedPages((previousPages) =>
          shouldReusePaginatedPages(previousPages, fallbackPages) ? previousPages : fallbackPages,
        );
        return;
      }

      const paperStyles = window.getComputedStyle(paperElement);
      const paddingTop = Number.parseFloat(paperStyles.paddingTop || "0") || 0;
      const paddingBottom = Number.parseFloat(paperStyles.paddingBottom || "0") || 0;
      const borderTop = Number.parseFloat(paperStyles.borderTopWidth || "0") || 0;
      const borderBottom = Number.parseFloat(paperStyles.borderBottomWidth || "0") || 0;

      const footerReservePx = isSidebarHeaderLayout
        ? SIDEBAR_PAGE_FOOTER_RESERVE_PX
        : (forceSinglePage ? 34 : PAGE_FOOTER_RESERVE_PX);
      const maxPageContentHeight = Math.max(
        280,
        A4_HEIGHT_PX - paddingTop - paddingBottom - borderTop - borderBottom - footerReservePx,
      );

      const headerHeight = hasTopHeader ? Math.max(1, measureHeaderRef.current?.offsetHeight ?? 0) : 0;
      const sidebarHeaderHeight = hasSidebarHeader
        ? Math.max(1, measureSidebarHeaderRef.current?.offsetHeight ?? 0)
        : 0;
      const sectionGap = isTwoColumnBody
        ? Math.max(
            measureSectionGap(measureLeftColumnRef.current),
            measureSectionGap(measureRightColumnRef.current),
            measureSectionGap(measureSectionsContainerRef.current),
          )
        : measureSectionGap(measureSectionsContainerRef.current);

      const blocks = renderedSections.flatMap((section) => {
        const sectionNode = measureSectionRefs.current[section.id];
        const sectionHeight = Math.max(1, sectionNode?.offsetHeight ?? 1);

        if (forceSinglePage) {
          return [
            {
              id: section.id,
              section,
              height: sectionHeight,
            },
          ];
        }

        return buildSectionBlocks({
          section,
          sectionHeight,
          sectionNode,
          maxPageContentHeight,
        });
      });

      if (forceSinglePage) {
        const totalBlocksHeight = blocks.reduce(
          (total, block, blockIndex) => total + block.height + (blockIndex > 0 ? sectionGap : 0),
          0,
        );
        const totalContentHeight = totalBlocksHeight + (hasTopHeader ? headerHeight + headerSectionGapPx : 0);

        const nextZoom = totalContentHeight > maxPageContentHeight
          ? Math.max(0.72, maxPageContentHeight / totalContentHeight)
          : 1;

        if (nextZoom >= MIN_READABLE_SINGLE_PAGE_ZOOM) {
          setTealPaginateForReadability(false);

          const nextZoomClassName = resolveSinglePageZoomClass(nextZoom);
          setSinglePageZoomClassName((previousClassName) =>
            previousClassName === nextZoomClassName ? previousClassName : nextZoomClassName,
          );

          const singlePage: PreviewPage[] = [
            {
              includeHeader: hasTopHeader,
              blocks,
            },
          ];

          setPaginatedPages((previousPages) =>
            shouldReusePaginatedPages(previousPages, singlePage) ? previousPages : singlePage,
          );
          return;
        }

        setTealPaginateForReadability(true);
        setSinglePageZoomClassName((previousClassName) =>
          previousClassName === SINGLE_PAGE_ZOOM_DEFAULT_CLASS
            ? previousClassName
            : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
        );
      }

      setSinglePageZoomClassName((previousClassName) =>
        previousClassName === SINGLE_PAGE_ZOOM_DEFAULT_CLASS
          ? previousClassName
          : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
      );

      if (isTwoColumnBody) {
        const firstPageAvailableHeight = Math.max(
          80,
          maxPageContentHeight - (hasTopHeader ? headerHeight + headerSectionGapPx : 0),
        );
        const leftColumnBlocks = blocks.filter((block) => resolveBodyColumnForSection(block.section) === "left");
        const rightColumnBlocks = blocks.filter((block) => resolveBodyColumnForSection(block.section) === "right");

        const leftColumnFirstPageAvailableHeight = Math.max(
          80,
          firstPageAvailableHeight
            - (hasSidebarHeader
              ? sidebarHeaderHeight + (leftColumnBlocks.length > 0 ? headerSectionGapPx : 0)
              : 0),
        );

        const leftColumnPages = paginateColumnBlocks({
          blocks: leftColumnBlocks,
          firstPageAvailableHeight: leftColumnFirstPageAvailableHeight,
          fullPageAvailableHeight: maxPageContentHeight,
          sectionGap,
          maxPageContentHeight,
        });
        const rightColumnPages = paginateColumnBlocks({
          blocks: rightColumnBlocks,
          firstPageAvailableHeight,
          fullPageAvailableHeight: maxPageContentHeight,
          sectionGap,
          maxPageContentHeight,
        });

        const totalPageCount = Math.max(leftColumnPages.length, rightColumnPages.length, 1);
        const computedPages: PreviewPage[] = Array.from({ length: totalPageCount }, (_, pageIndex) => ({
          includeHeader: hasTopHeader && pageIndex === 0,
          blocks: [
            ...(leftColumnPages[pageIndex] ?? []),
            ...(rightColumnPages[pageIndex] ?? []),
          ],
        }));

        setPaginatedPages((previousPages) =>
          shouldReusePaginatedPages(previousPages, computedPages) ? previousPages : computedPages,
        );
        return;
      }

      const computedPages: PreviewPage[] = [];
      let currentPage: PreviewPage = {
        includeHeader: hasTopHeader,
        blocks: [],
      };
      let remainingHeight =
        maxPageContentHeight - (hasTopHeader ? headerHeight + headerSectionGapPx : 0);
      remainingHeight = Math.max(80, remainingHeight);

      const blockQueue = [...blocks];

      while (blockQueue.length > 0) {
        const block = blockQueue.shift();
        if (!block) {
          continue;
        }

        const sectionGapBeforeBlock = currentPage.blocks.length > 0 ? sectionGap : 0;
        const requiredHeight = block.height + sectionGapBeforeBlock;

        if (currentPage.blocks.length > 0 && requiredHeight > remainingHeight) {
          const availableBlockHeight = Math.max(0, remainingHeight - sectionGapBeforeBlock);
          const splitResult = splitBlockToFitRemaining({
            block,
            availableHeight: availableBlockHeight,
            maxPageContentHeight,
          });

          if (splitResult) {
            currentPage.blocks.push(splitResult.headBlock);
            remainingHeight -= splitResult.headBlock.height + sectionGapBeforeBlock;

            computedPages.push(currentPage);
            currentPage = {
              includeHeader: false,
              blocks: [],
            };
            remainingHeight = maxPageContentHeight;

            blockQueue.unshift(...splitResult.tailBlocks);
            continue;
          }

          computedPages.push(currentPage);
          currentPage = {
            includeHeader: false,
            blocks: [],
          };
          remainingHeight = maxPageContentHeight;
        }

        const appliedGap = currentPage.blocks.length > 0 ? sectionGap : 0;
        currentPage.blocks.push(block);
        remainingHeight -= block.height + appliedGap;
      }

      if (currentPage.blocks.length > 0 || currentPage.includeHeader || computedPages.length === 0) {
        computedPages.push(currentPage);
      }

      setPaginatedPages((previousPages) =>
        shouldReusePaginatedPages(previousPages, computedPages) ? previousPages : computedPages,
      );
    };

    recalculatePages();

    window.addEventListener("resize", recalculatePages);
    return () => {
      window.removeEventListener("resize", recalculatePages);
    };
  }, [
    forceSinglePage,
    hasSidebarHeader,
    hasTopHeader,
    headerSectionGapPx,
    isTwoColumnBody,
    isSidebarHeaderLayout,
    previewBodyTextClassName,
    previewFontFamilyClassName,
    renderedSections,
    resolveBodyColumnForSection,
    sections,
    template,
  ]);

  const handleHeaderEdit = (field: "fullName" | "headline", value: string) => {
    if (!headerSection) {
      return;
    }

    if (field === "headline") {
      onUpdateSectionData(headerSection.id, { title: value });
      return;
    }

    onUpdateSectionData(headerSection.id, { fullName: value });
  };

  const handleContactEdit = (field: "phone" | "email" | "dob" | "address", value: string) => {
    if (!personalInfoSection) {
      return;
    }

    onUpdateSectionData(personalInfoSection.id, { [field]: value });
  };

  const handleAvatarEdit = (avatarUrl: string) => {
    if (!headerSection) {
      return;
    }

    onUpdateSectionData(headerSection.id, { avatarUrl });
  };

  const pages =
    paginatedPages.length > 0
      ? paginatedPages
      : [
          {
            includeHeader: hasTopHeader,
            blocks: renderedSections.map((section, index) => ({
              id: `${section.id}__initial_${index + 1}`,
              section,
              height: 1,
            })),
          },
        ];

  const shouldUseSinglePageMode = forceSinglePage && !tealPaginateForReadability;
  const totalPages = pages.length;
  const pageListClassName = shouldUseSinglePageMode ? "space-y-0" : "space-y-6";
  const measurePaperClassName = "mx-auto h-280.5 w-198.5 max-w-full overflow-hidden";

  const handleCanvasPointerDown = (event: MouseEvent<HTMLDivElement>) => {
    if (mode !== "edit") {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-cv-editor-selectable='true']")) {
      return;
    }

    emitItemSelection(null);
    onSelectSection(null);
  };

  const renderPreviewBlock = (block: RenderSectionBlock) => {
    const blockSection = block.section;
    const splitContext = getSectionSplitContext(blockSection);
    const isSplitContinuation = splitContext?.isContinuation === true;
    const isActive = isPreviewBlockActive(selectedSectionId, blockSection);
    const sourceSection = sourceSectionById.get(blockSection.sourceSectionId);
    const styleConfig = resolveSectionStyleConfig(
      template,
      blockSection.type,
      blockSection.title,
      (sourceSection?.data as { icon?: unknown } | undefined)?.icon,
    );

    return (
      <div
        key={block.id}
        className="break-inside-avoid-page print:break-inside-avoid-page"
        onMouseDownCapture={(event) => {
          if (mode !== "edit" || !onSelectSectionItem) {
            return;
          }

          const target = event.target as HTMLElement;
          if (target.closest("[data-cv-section-action='true']")) {
            return;
          }

          const selection = resolveItemSelectionFromTarget({
            target: event.target,
            sectionContainer: event.currentTarget,
            blockSection,
            sourceSection,
          });

          emitItemSelection(selection);
        }}
        onFocusCapture={(event) => {
          if (mode !== "edit" || !onSelectSectionItem) {
            return;
          }

          const selection = resolveItemSelectionFromTarget({
            target: event.target,
            sectionContainer: event.currentTarget,
            blockSection,
            sourceSection,
          });

          emitItemSelection(selection);
        }}
      >
        <CVSectionRenderer
          section={blockSection}
          styleConfig={styleConfig}
          template={template}
          mode={mode}
          isActive={isActive}
          onSelectSection={onSelectSection}
          onUpdateSectionData={(sectionId, updates) => {
            const updatedItems = (updates as { items?: unknown }).items;
            if (!splitContext || !Array.isArray(updatedItems) || updatedItems.length >= splitContext.totalCount) {
              onUpdateSectionData(sectionId, updates);
              return;
            }

            const sourceSectionEntry = sections.find((entry) => entry.id === sectionId);
            const sourceSectionItems = Array.isArray((sourceSectionEntry?.data as { items?: unknown }).items)
              ? ((sourceSectionEntry?.data as { items: unknown[] }).items)
              : splitContext.sourceItems;
            onUpdateSectionData(sectionId, {
              ...updates,
              items: mergeSplitChunkItems({
                sourceItems: sourceSectionItems,
                splitContext,
                chunkItems: updatedItems,
              }),
            });
          }}
          onRequestAddSection={isSplitContinuation ? undefined : onRequestAddSection}
          onRemoveSection={isSplitContinuation ? undefined : onRemoveSection}
          onMoveSectionUp={isSplitContinuation ? undefined : onMoveSectionUp}
          onMoveSectionDown={isSplitContinuation ? undefined : onMoveSectionDown}
        />
      </div>
    );
  };

  const renderMeasureSection = (section: CVPreviewSection) => {
    const sourceSection = sourceSectionById.get(section.sourceSectionId);
    const styleConfig = resolveSectionStyleConfig(
      template,
      section.type,
      section.title,
      (sourceSection?.data as { icon?: unknown } | undefined)?.icon,
    );

    return (
      <div
        key={`measure-${section.id}`}
        ref={(node) => {
          measureSectionRefs.current[section.id] = node;
        }}
      >
        <CVSectionRenderer
          section={section}
          styleConfig={styleConfig}
          template={template}
          mode="preview"
          isActive={false}
          onSelectSection={() => undefined}
          onUpdateSectionData={() => undefined}
          onRequestAddSection={undefined}
          onRemoveSection={undefined}
          onMoveSectionUp={undefined}
          onMoveSectionDown={undefined}
        />
      </div>
    );
  };

  return (
    <>
      <div
        ref={previewThemeScopeRef}
        data-cv-preview-canvas-root="true"
        className={pageListClassName}
        onMouseDown={handleCanvasPointerDown}
      >
        {pages.map((page, pageIndex) => (
          <div
            key={`cv-page-${pageIndex + 1}`}
            data-cv-preview-page="true"
            className="print:break-after-page last:print:break-after-auto"
          >
            <CVPaper
              template={template}
              fontFamilyClassName={previewFontFamilyClassName}
              bodyTextClassName={previewBodyTextClassName}
              paperPatternClassName={resolvedPaperPatternClassName}
            >
              <div className="relative flex h-full flex-col">
                <div
                  className={cn(
                    "flex min-h-0 flex-1 flex-col origin-top-left",
                    shouldUseSinglePageMode ? singlePageZoomClassName : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
                  )}
                >
                  {page.includeHeader ? (
                    <CVHeader
                      template={template}
                      header={previewData.header}
                      contact={previewData.contact}
                      summary={summaryInHeaderState.summary ?? undefined}
                      selected={headerSelected}
                      onSelect={selectHeader}
                      onEditHeader={handleHeaderEdit}
                      onEditContact={handleContactEdit}
                      onEditAvatar={mode === "edit" ? handleAvatarEdit : undefined}
                    />
                  ) : null}

                  {page.blocks.length > 0 || (hasSidebarHeader && pageIndex === 0) ? (
                    isTwoColumnBody ? (
                      <div
                        className={cn(
                          page.includeHeader ? headerSectionGapClassName : "",
                          "grid min-h-0",
                          isSidebarHeaderLayout ? "flex-1 items-stretch" : "items-start",
                          bodyColumnGridClassName,
                          bodyColumnGapClassName,
                        )}
                      >
                        <div
                          className={cn(
                            "min-h-0",
                            template.spacingRules.sectionGapClassName,
                            isSidebarHeaderLayout
                              ? "flex h-full min-h-full flex-col bg-[rgb(var(--cv-template-sidebar-background-rgb,31_90_59))] px-3 py-3 text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                              : "",
                            isSidebarHeaderLayout ? resolvedSidebarPatternClassName : "",
                          )}
                        >
                          {hasSidebarHeader && pageIndex === 0 ? (
                            <CVHeader
                              template={template}
                              header={previewData.header}
                              contact={previewData.contact}
                              summary={undefined}
                              selected={headerSelected}
                              onSelect={selectHeader}
                              onEditHeader={handleHeaderEdit}
                              onEditContact={handleContactEdit}
                              onEditAvatar={mode === "edit" ? handleAvatarEdit : undefined}
                            />
                          ) : null}

                          {page.blocks
                            .filter((block) => resolveBodyColumnForSection(block.section) === "left")
                            .map(renderPreviewBlock)}
                        </div>

                        <div
                          className={cn(
                            "min-h-0",
                            template.spacingRules.sectionGapClassName,
                            isSidebarHeaderLayout ? "flex h-full min-h-full flex-col bg-white px-3 py-3" : "",
                          )}
                        >
                          {page.blocks
                            .filter((block) => resolveBodyColumnForSection(block.section) === "right")
                            .map(renderPreviewBlock)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          page.includeHeader ? headerSectionGapClassName : "",
                          template.spacingRules.sectionGapClassName,
                        )}
                      >
                        {page.blocks.map(renderPreviewBlock)}
                      </div>
                    )
                  ) : null}
                </div>

                {isTealFamily ? (
                  <footer
                    className={cn(
                      "pointer-events-none absolute bottom-2 right-3 text-[11px] font-semibold",
                      template.colorPalette.mutedTextClassName,
                    )}
                  >
                    Trang {pageIndex + 1}/{totalPages}
                  </footer>
                ) : (
                  <footer
                    className={cn(
                      "pointer-events-none absolute bottom-2 right-3 text-[11px] font-semibold",
                      template.colorPalette.mutedTextClassName,
                    )}
                  >
                    Trang {pageIndex + 1} / {totalPages}
                  </footer>
                )}
              </div>
            </CVPaper>
          </div>
        ))}
      </div>

      <div
        aria-hidden
        ref={measureThemeScopeRef}
        className="pointer-events-none invisible absolute left-0 top-0 -z-10 opacity-0"
      >
        <div
          ref={measurePaperRef}
          className={cn(
            measurePaperClassName,
            template.pageSettings.paperFrameClassName,
            resolvedPaperPatternClassName,
            template.pageSettings.paperPaddingClassName,
            template.typographySettings.bodyFontClassName,
            template.typographySettings.bodyTextClassName,
            previewFontFamilyClassName,
            previewBodyTextClassName,
            template.colorPalette.pageTextClassName,
          )}
        >
          {hasTopHeader ? (
            <div ref={measureHeaderRef}>
              <CVHeader
                template={template}
                header={previewData.header}
                contact={previewData.contact}
                summary={summaryInHeaderState.summary ?? undefined}
                selected={false}
                onSelect={() => undefined}
                onEditHeader={() => undefined}
                onEditContact={() => undefined}
              />
            </div>
          ) : null}

          {isTwoColumnBody ? (
            <div
              ref={measureSectionsContainerRef}
              className={cn(
                hasTopHeader ? headerSectionGapClassName : "",
                "grid min-h-0",
                isSidebarHeaderLayout ? "items-stretch" : "items-start",
                bodyColumnGridClassName,
                bodyColumnGapClassName,
              )}
            >
              <div
                ref={measureLeftColumnRef}
                className={cn(
                  "min-h-0",
                  template.spacingRules.sectionGapClassName,
                  isSidebarHeaderLayout
                    ? "flex h-full min-h-full flex-col bg-[rgb(var(--cv-template-sidebar-background-rgb,31_90_59))] px-3 py-3 text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]"
                    : "",
                  isSidebarHeaderLayout ? resolvedSidebarPatternClassName : "",
                )}
              >
                {hasSidebarHeader ? (
                  <div ref={measureSidebarHeaderRef}>
                    <CVHeader
                      template={template}
                      header={previewData.header}
                      contact={previewData.contact}
                      summary={undefined}
                      selected={false}
                      onSelect={() => undefined}
                      onEditHeader={() => undefined}
                      onEditContact={() => undefined}
                    />
                  </div>
                ) : null}

                {renderedSections
                  .filter((section) => resolveBodyColumnForSection(section) === "left")
                  .map(renderMeasureSection)}
              </div>
              <div
                ref={measureRightColumnRef}
                className={cn(
                  "min-h-0",
                  template.spacingRules.sectionGapClassName,
                  isSidebarHeaderLayout ? "flex h-full min-h-full flex-col bg-white px-3 py-3" : "",
                )}
              >
                {renderedSections
                  .filter((section) => resolveBodyColumnForSection(section) === "right")
                  .map(renderMeasureSection)}
              </div>
            </div>
          ) : (
            <div
              ref={measureSectionsContainerRef}
              className={cn(hasTopHeader ? headerSectionGapClassName : "", template.spacingRules.sectionGapClassName)}
            >
              {renderedSections.map(renderMeasureSection)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
