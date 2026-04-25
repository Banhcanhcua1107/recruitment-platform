import type {
  BoundingBox,
  EditableCVBlockView,
  EditableDocumentRegion,
  EditableDocumentRegionChild,
  EditableDocumentRegionType,
} from "@/types/cv-import";
import {
  groupBlocksToParagraphs,
  mergeBlocksToLines,
  type GroupableLayoutBlock,
  type LayoutMeta,
} from "@/features/cv-import/transforms/block-layout";

const REGION_CHILDREN_KEY = "__region_children";
const IMAGE_TYPE_PATTERN = /(avatar|image|figure|photo|picture|graphic|logo|illustration|signature)/i;

export interface LayoutImageCandidate {
  id: string;
  page: number;
  type?: string | null;
  confidence?: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
}

export interface EditableRegionDraft {
  id: string;
  page: number;
  type: EditableDocumentRegionType;
  block_type: string;
  text: string | null;
  confidence: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  block_ids: string[];
  children: EditableDocumentRegionChild[];
  meta: LayoutMeta;
}

function bboxBottom(box: BoundingBox) {
  return box.y + box.height;
}

function bboxRight(box: BoundingBox) {
  return box.x + box.width;
}

function normalizeBox(box: BoundingBox): BoundingBox {
  const x = Math.max(0, Math.min(1, Number.isFinite(box.x) ? box.x : 0));
  const y = Math.max(0, Math.min(1, Number.isFinite(box.y) ? box.y : 0));
  const width = Math.max(0.001, Math.min(1 - x, Number.isFinite(box.width) ? box.width : 0.001));
  const height = Math.max(0.001, Math.min(1 - y, Number.isFinite(box.height) ? box.height : 0.001));
  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
    width: Number(width.toFixed(4)),
    height: Number(height.toFixed(4)),
  };
}

function resolveColumn(box: BoundingBox): LayoutMeta["column"] {
  const centerX = box.x + box.width / 2;
  if (box.width >= 0.7 || (box.x <= 0.12 && bboxRight(box) >= 0.88)) {
    return "full_width";
  }
  if (centerX <= 0.47) return "left";
  if (centerX >= 0.53) return "right";
  return "full_width";
}

function geometryRank(box: BoundingBox) {
  const column = resolveColumn(box);
  if (column === "full_width" && box.y <= 0.2) return 0;
  return column === "left" ? 1 : column === "right" ? 2 : 3;
}

function sortByGeometry<T extends { page: number; bbox_normalized: BoundingBox }>(items: T[]) {
  return [...items].sort((left, right) => {
    const pageDiff = left.page - right.page;
    if (pageDiff !== 0) return pageDiff;
    const rankDiff = geometryRank(left.bbox_normalized) - geometryRank(right.bbox_normalized);
    if (rankDiff !== 0) return rankDiff;
    const topDiff = left.bbox_normalized.y - right.bbox_normalized.y;
    if (Math.abs(topDiff) > 0.001) return topDiff;
    return left.bbox_normalized.x - right.bbox_normalized.x;
  });
}

function isImageLikeBlockType(type: string | null | undefined) {
  return IMAGE_TYPE_PATTERN.test(type ?? "");
}

function isNoiseTextBlock(block: GroupableLayoutBlock) {
  const trimmed = block.text.trim();
  if (!trimmed) return true;
  const isTiny = block.bbox_normalized.width <= 0.01 || block.bbox_normalized.height <= 0.008;
  const isLowSignal = trimmed.length <= 1 || /^[^\p{L}\p{N}]+$/u.test(trimmed);
  return isTiny && isLowSignal;
}

function averageConfidence(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return null;
  return Number((filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(4));
}

function createLineChild(line: GroupableLayoutBlock): EditableDocumentRegionChild {
  return {
    id: line.id,
    level: "line",
    type: "text",
    bbox: normalizeBox(line.bbox_normalized),
    text: line.text.trim() || null,
    confidence: line.confidence ?? null,
    block_ids: [...new Set(line.source_block_ids ?? [line.id])],
  };
}

function assignReadingOrder(drafts: EditableRegionDraft[]) {
  const orderedByPage = new Map<number, EditableRegionDraft[]>();
  for (const draft of sortByGeometry(drafts)) {
    const items = orderedByPage.get(draft.page) ?? [];
    items.push(draft);
    orderedByPage.set(draft.page, items);
  }

  const orderedDrafts: EditableRegionDraft[] = [];
  for (const [pageNumber, pageDrafts] of orderedByPage.entries()) {
    pageDrafts.forEach((draft, index) => {
      draft.meta = {
        ...draft.meta,
        column: resolveColumn(draft.bbox_normalized),
        reading_order: index,
        region_id: draft.meta.region_id ?? `region:${pageNumber}:${resolveColumn(draft.bbox_normalized)}`,
        parent_id:
          draft.type === "text"
            ? draft.meta.parent_id ?? `region:${pageNumber}:${resolveColumn(draft.bbox_normalized)}`
            : null,
      };
    });
    orderedDrafts.push(...pageDrafts);
  }

  return orderedDrafts;
}

export function buildEditableRegionDraftsFromSource(
  sourceBlocks: GroupableLayoutBlock[],
  imageCandidates: LayoutImageCandidate[] = [],
): EditableRegionDraft[] {
  const textSourceBlocks = sourceBlocks.filter(
    (block) => !isImageLikeBlockType(block.type) && !isNoiseTextBlock(block),
  );
  const mergedLines = mergeBlocksToLines(textSourceBlocks);
  const lineById = new Map(mergedLines.map((line) => [line.id, line]));
  const paragraphBlocks = groupBlocksToParagraphs(mergedLines);

  const textDrafts: EditableRegionDraft[] = paragraphBlocks.map((block) => ({
    id: block.id,
    page: block.page,
    type: "text",
    block_type: block.type || "text",
    text: block.text.trim() || null,
    confidence: block.confidence ?? null,
    bbox_px: block.bbox_px,
    bbox_normalized: normalizeBox(block.bbox_normalized),
    block_ids: [...new Set(block.meta.source_block_ids)],
    children: (block.meta.source_line_ids ?? [])
      .map((lineId) => lineById.get(lineId))
      .filter(Boolean)
      .map((line) => createLineChild(line!)),
    meta: {
      ...block.meta,
      source_line_ids: [...new Set(block.meta.source_line_ids)],
      source_block_ids: [...new Set(block.meta.source_block_ids)],
    },
  }));

  const imageDrafts: EditableRegionDraft[] = imageCandidates.map((candidate) => ({
    id: `img-${candidate.page}-${candidate.id}`,
    page: candidate.page,
    type: "image",
    block_type: candidate.type || "image",
    text: null,
    confidence: candidate.confidence ?? null,
    bbox_px: candidate.bbox_px,
    bbox_normalized: normalizeBox(candidate.bbox_normalized),
    block_ids: [candidate.id],
    children: [],
    meta: {
      level: 3,
      parent_id: null,
      region_id: null,
      reading_order: 0,
      version: 1,
      lock_state: "unlocked",
      column: resolveColumn(candidate.bbox_normalized),
      source_line_ids: [],
      source_block_ids: [candidate.id],
      section_hint: null,
    },
  }));

  return assignReadingOrder([...textDrafts, ...imageDrafts]);
}

export function withEditableRegionChildren(
  styleJson: Record<string, unknown> | null | undefined,
  children: EditableDocumentRegionChild[],
): Record<string, unknown> {
  const nextStyle = styleJson && typeof styleJson === "object" ? { ...styleJson } : {};
  nextStyle[REGION_CHILDREN_KEY] = children.map((child) => ({
    id: child.id,
    level: child.level,
    type: child.type,
    bbox: normalizeBox(child.bbox),
    text: child.text ?? null,
    confidence: child.confidence ?? null,
    block_ids: [...(child.block_ids ?? [])],
  }));
  return nextStyle;
}

export function extractEditableRegionChildren(
  styleJson: Record<string, unknown> | null | undefined,
): EditableDocumentRegionChild[] {
  const root = styleJson && typeof styleJson === "object" ? styleJson : {};
  const raw = root[REGION_CHILDREN_KEY];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `line-${index + 1}`,
      level: item.level === "image" || item.level === "line" ? item.level : "block",
      type: item.type === "image" ? "image" : "text",
      bbox:
        item.bbox && typeof item.bbox === "object"
          ? normalizeBox(item.bbox as BoundingBox)
          : normalizeBox({ x: 0, y: 0, width: 1, height: 1 }),
      text: typeof item.text === "string" ? item.text : null,
      confidence: typeof item.confidence === "number" ? item.confidence : null,
      block_ids: Array.isArray(item.block_ids)
        ? item.block_ids.filter((value): value is string => typeof value === "string")
        : [],
    }));
}

export function buildEditableDocumentRegionsFromBlocks(
  blocks: EditableCVBlockView[],
): EditableDocumentRegion[] {
  const drafts: Array<EditableDocumentRegion & { sort_index: number }> = blocks.map((block) => {
    const type: EditableDocumentRegionType =
      isImageLikeBlockType(block.type) || Boolean(block.asset_artifact_id) ? "image" : "text";
    const children = extractEditableRegionChildren(block.style_json);
    return {
      id: `region-${block.id}`,
      level: type === "image" ? "image" : "block",
      type,
      bbox: normalizeBox(block.bbox_normalized),
      text: type === "text" ? (block.edited_text ?? block.original_text ?? "").trim() || null : null,
      confidence: averageConfidence([block.confidence]),
      block_ids: [block.id],
      primary_block_id: block.id,
      children,
      sort_index: block.reading_order ?? block.mappings[0]?.sequence ?? 0,
    };
  });

  return drafts
    .sort(
      (left, right) =>
        left.sort_index - right.sort_index || left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x,
    )
    .map((draft) => {
      const { sort_index, ...region } = draft;
      void sort_index;
      return region;
    });
}

export function filterLayoutImageCandidates(
  candidates: LayoutImageCandidate[],
  textBlocks: GroupableLayoutBlock[],
): LayoutImageCandidate[] {
  const textByPage = new Map<number, GroupableLayoutBlock[]>();
  for (const block of textBlocks) {
    const items = textByPage.get(block.page) ?? [];
    items.push(block);
    textByPage.set(block.page, items);
  }

  return candidates.filter((candidate) => {
    if (candidate.bbox_normalized.width < 0.04 || candidate.bbox_normalized.height < 0.03) {
      return false;
    }

    const textOnPage = textByPage.get(candidate.page) ?? [];
    const overlappingText = textOnPage.filter((block) => {
      const overlapX = Math.max(
        0,
        Math.min(bboxRight(candidate.bbox_normalized), bboxRight(block.bbox_normalized)) -
          Math.max(candidate.bbox_normalized.x, block.bbox_normalized.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(bboxBottom(candidate.bbox_normalized), bboxBottom(block.bbox_normalized)) -
          Math.max(candidate.bbox_normalized.y, block.bbox_normalized.y),
      );
      const overlapArea = overlapX * overlapY;
      const blockArea = block.bbox_normalized.width * block.bbox_normalized.height;
      return blockArea > 0 && overlapArea / blockArea >= 0.8;
    });

    return overlappingText.length <= 2;
  });
}
