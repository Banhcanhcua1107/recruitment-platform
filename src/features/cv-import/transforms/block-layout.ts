import type {
  BoundingBox,
  CVOCRBlockRecord,
  EditableCVLockState,
  SyncStrategy,
} from "@/types/cv-import";

export type BlockColumn = "left" | "right" | "full_width";

export interface LayoutMeta {
  level: number;
  parent_id: string | null;
  region_id: string | null;
  reading_order: number;
  version: number;
  lock_state: EditableCVLockState;
  column: BlockColumn;
  source_line_ids: string[];
  source_block_ids: string[];
  section_hint: string | null;
}

export interface LegacyRawBlockMeta {
  level: number;
  parent_id: string | null;
  region_id: string | null;
  reading_order: number;
  version: number;
  lock_state: EditableCVLockState;
}

export interface GroupableLayoutBlock {
  id: string;
  page: number;
  text: string;
  confidence: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  type?: string | null;
  sequence: number;
  suggested_json_path?: string | null;
  suggested_mapping_role?: string | null;
  suggested_compose_strategy?: SyncStrategy | null;
  suggested_parse_strategy?: SyncStrategy | null;
  mapping_confidence?: number | null;
}

export interface GroupedLayoutBlock {
  id: string;
  page: number;
  text: string;
  confidence: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  type: string;
  sequence: number;
  meta: LayoutMeta;
  sourceBlocks: GroupableLayoutBlock[];
}

export interface LegacyCompatibleLayoutBlock {
  id: string;
  text: string;
  page: number;
  confidence: number;
  column: BlockColumn;
  rect: BoundingBox;
  meta: LegacyRawBlockMeta;
}

const STYLE_META_KEY = "__overlay_meta";
const MIN_NORMALIZED_GAP = 0.0025;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toSafeNumber(value: unknown, fallback = 0) {
  return isFiniteNumber(value) ? value : fallback;
}

function roundBox(box: BoundingBox): BoundingBox {
  return {
    x: Number(box.x.toFixed(4)),
    y: Number(box.y.toFixed(4)),
    width: Number(box.width.toFixed(4)),
    height: Number(box.height.toFixed(4)),
  };
}

function bboxBottom(box: BoundingBox) {
  return box.y + box.height;
}

function bboxRight(box: BoundingBox) {
  return box.x + box.width;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function horizontalOverlapRatio(left: BoundingBox, right: BoundingBox) {
  const overlap = overlapLength(left.x, bboxRight(left), right.x, bboxRight(right));
  const base = Math.min(left.width, right.width);
  return base > 0 ? overlap / base : 0;
}

function unionBoxes(boxes: BoundingBox[]): BoundingBox {
  const x1 = Math.min(...boxes.map((box) => box.x));
  const y1 = Math.min(...boxes.map((box) => box.y));
  const x2 = Math.max(...boxes.map((box) => bboxRight(box)));
  const y2 = Math.max(...boxes.map((box) => bboxBottom(box)));
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}

function normalizeBox(box: BoundingBox): BoundingBox {
  return {
    x: Math.max(0, Math.min(1, box.x)),
    y: Math.max(0, Math.min(1, box.y)),
    width: Math.max(0.001, Math.min(1 - Math.max(0, box.x), box.width)),
    height: Math.max(0.001, Math.min(1 - Math.max(0, box.y), box.height)),
  };
}

function inferColumn(box: BoundingBox): BlockColumn {
  const centerX = box.x + box.width / 2;
  if (box.width >= 0.7 || (box.x <= 0.12 && bboxRight(box) >= 0.88)) {
    return "full_width";
  }
  if (centerX <= 0.47) {
    return "left";
  }
  if (centerX >= 0.53) {
    return "right";
  }
  return "full_width";
}

function sectionHint(text: string): string | null {
  const normalized = text.trim().toUpperCase();
  if (!normalized) return null;
  if (/(SUMMARY|OBJECTIVE|PROFILE|GIOI THIEU|MUC TIEU)/i.test(normalized)) return "summary";
  if (/(SKILL|KY NANG|TECH)/i.test(normalized)) return "skills";
  if (/(EXPERIENCE|KINH NGHIEM|WORK)/i.test(normalized)) return "experience";
  if (/(EDUCATION|HOC VAN)/i.test(normalized)) return "education";
  if (/(PROJECT|DU AN)/i.test(normalized)) return "projects";
  if (/(CERTIF|CHUNG CHI)/i.test(normalized)) return "certifications";
  if (/(CONTACT|LIEN HE|THONG TIN)/i.test(normalized)) return "contacts";
  return null;
}

function looksLikeHeading(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 72) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 8) return false;
  if (/[.!?]/.test(trimmed)) return false;
  if (sectionHint(trimmed)) return true;
  const letters = trimmed.match(/[A-Za-zÀ-ỹ]/g) ?? [];
  const uppercase = trimmed.match(/[A-ZÀ-Ỹ]/g) ?? [];
  return letters.length > 0 && uppercase.length / letters.length >= 0.6;
}

function shouldBreakParagraph(
  current: GroupableLayoutBlock[],
  candidate: GroupableLayoutBlock,
  column: BlockColumn
) {
  const previous = current[current.length - 1];
  if (!previous) return false;

  if (looksLikeHeading(previous.text) || looksLikeHeading(candidate.text)) {
    return true;
  }

  const prevBottom = bboxBottom(previous.bbox_normalized);
  const verticalGap = candidate.bbox_normalized.y - prevBottom;
  const horizontalShift = Math.abs(candidate.bbox_normalized.x - previous.bbox_normalized.x);
  const currentWidth = unionBoxes(current.map((item) => item.bbox_normalized)).width;
  const allowedGap =
    column === "full_width"
      ? Math.max(previous.bbox_normalized.height * 1.2, 0.02)
      : Math.max(previous.bbox_normalized.height * 1.5, 0.028);

  if (verticalGap > allowedGap) return true;
  if (horizontalShift > Math.max(0.08, currentWidth * 0.2)) return true;
  return false;
}

function sortBlocksForGrouping(blocks: GroupableLayoutBlock[]) {
  return [...blocks].sort((left, right) => {
    const pageDiff = left.page - right.page;
    if (pageDiff !== 0) return pageDiff;
    const leftColumn = inferColumn(left.bbox_normalized);
    const rightColumn = inferColumn(right.bbox_normalized);
    const columnRank = (column: BlockColumn, y: number) => {
      if (column === "full_width") {
        return y <= 0.2 ? 0 : 3;
      }
      return column === "left" ? 1 : 2;
    };
    const rankDiff =
      columnRank(leftColumn, left.bbox_normalized.y) -
      columnRank(rightColumn, right.bbox_normalized.y);
    if (rankDiff !== 0) return rankDiff;
    const topDiff = left.bbox_normalized.y - right.bbox_normalized.y;
    if (Math.abs(topDiff) > 0.001) return topDiff;
    return left.bbox_normalized.x - right.bbox_normalized.x;
  });
}

function normalizeGroupBBoxes(blocks: GroupedLayoutBlock[]) {
  const sorted = [...blocks].sort((left, right) => left.meta.reading_order - right.meta.reading_order);
  const lastByRegion = new Map<string, GroupedLayoutBlock>();

  for (const block of sorted) {
    const regionId = block.meta.region_id ?? `${block.page}:${block.meta.column}`;
    const previous = lastByRegion.get(regionId);
    if (!previous) {
      lastByRegion.set(regionId, block);
      continue;
    }

    const overlap = bboxBottom(previous.bbox_normalized) - block.bbox_normalized.y;
    const horizontalOverlap = horizontalOverlapRatio(previous.bbox_normalized, block.bbox_normalized);

    if (overlap > 0 && horizontalOverlap >= 0.25) {
      const shift = overlap + MIN_NORMALIZED_GAP;
      const maxShift = Math.max(0, 1 - bboxBottom(block.bbox_normalized));
      const appliedShift = Math.min(shift, maxShift);
      if (appliedShift > 0) {
        const pageHeightPx =
          block.bbox_normalized.height > 0
            ? block.bbox_px.height / block.bbox_normalized.height
            : 0;
        block.bbox_normalized = normalizeBox({
          ...block.bbox_normalized,
          y: block.bbox_normalized.y + appliedShift,
        });
        block.bbox_px = {
          ...block.bbox_px,
          y: Math.max(0, block.bbox_px.y + appliedShift * pageHeightPx),
        };
      }
    }

    lastByRegion.set(regionId, block);
  }

  return sorted;
}

export function extractLayoutMeta(styleJson: Record<string, unknown> | null | undefined): LayoutMeta {
  const root = styleJson && typeof styleJson === "object" ? styleJson : {};
  const meta = root[STYLE_META_KEY];
  const source = meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
  const sourceLineIds = Array.isArray(source.source_line_ids)
    ? source.source_line_ids.filter((item): item is string => typeof item === "string")
    : [];
  const sourceBlockIds = Array.isArray(source.source_block_ids)
    ? source.source_block_ids.filter((item): item is string => typeof item === "string")
    : [];

  return {
    level: Math.max(1, Math.round(toSafeNumber(source.level, 3))),
    parent_id: typeof source.parent_id === "string" ? source.parent_id : null,
    region_id: typeof source.region_id === "string" ? source.region_id : null,
    reading_order: Math.max(0, Math.round(toSafeNumber(source.reading_order, 0))),
    version: Math.max(1, Math.round(toSafeNumber(source.version, 1))),
    lock_state:
      source.lock_state === "user_locked" || source.lock_state === "system_locked"
        ? source.lock_state
        : "unlocked",
    column:
      source.column === "left" || source.column === "right" || source.column === "full_width"
        ? source.column
        : "full_width",
    source_line_ids: sourceLineIds,
    source_block_ids: sourceBlockIds,
    section_hint: typeof source.section_hint === "string" ? source.section_hint : null,
  };
}

export function withLayoutMeta(
  styleJson: Record<string, unknown> | null | undefined,
  meta: Partial<LayoutMeta>
): Record<string, unknown> {
  const nextStyle = styleJson && typeof styleJson === "object" ? { ...styleJson } : {};
  const currentMeta = extractLayoutMeta(styleJson);
  nextStyle[STYLE_META_KEY] = {
    ...currentMeta,
    ...meta,
  };
  return nextStyle;
}

export function groupBlocksToParagraphs(sourceBlocks: GroupableLayoutBlock[]): GroupedLayoutBlock[] {
  const groupedByPage = new Map<number, GroupableLayoutBlock[]>();

  for (const block of sortBlocksForGrouping(sourceBlocks)) {
    const items = groupedByPage.get(block.page) ?? [];
    items.push(block);
    groupedByPage.set(block.page, items);
  }

  const groupedBlocks: GroupedLayoutBlock[] = [];

  for (const [pageNumber, pageBlocks] of groupedByPage.entries()) {
    const byColumn = new Map<BlockColumn, GroupableLayoutBlock[]>();
    for (const block of pageBlocks) {
      const column = inferColumn(block.bbox_normalized);
      const items = byColumn.get(column) ?? [];
      items.push(block);
      byColumn.set(column, items);
    }

    const groupedForPage: Array<{
      block: GroupedLayoutBlock;
      sortRank: number;
      y: number;
      x: number;
    }> = [];

    for (const column of ["full_width", "left", "right"] as const) {
      const columnBlocks = (byColumn.get(column) ?? []).sort((left, right) => {
        const topDiff = left.bbox_normalized.y - right.bbox_normalized.y;
        if (Math.abs(topDiff) > 0.001) return topDiff;
        return left.bbox_normalized.x - right.bbox_normalized.x;
      });
      if (columnBlocks.length === 0) continue;

      let current: GroupableLayoutBlock[] = [];
      for (const block of columnBlocks) {
        if (current.length === 0) {
          current = [block];
          continue;
        }

        if (shouldBreakParagraph(current, block, column)) {
          groupedForPage.push({
            block: createGroupedBlock(current, pageNumber, column),
            sortRank: column === "full_width" && current[0].bbox_normalized.y <= 0.2 ? 0 : column === "left" ? 1 : column === "right" ? 2 : 3,
            y: current[0].bbox_normalized.y,
            x: current[0].bbox_normalized.x,
          });
          current = [block];
          continue;
        }

        current.push(block);
      }

      if (current.length > 0) {
        groupedForPage.push({
          block: createGroupedBlock(current, pageNumber, column),
          sortRank: column === "full_width" && current[0].bbox_normalized.y <= 0.2 ? 0 : column === "left" ? 1 : column === "right" ? 2 : 3,
          y: current[0].bbox_normalized.y,
          x: current[0].bbox_normalized.x,
        });
      }
    }

    const ordered = groupedForPage
      .sort((left, right) => left.sortRank - right.sortRank || left.y - right.y || left.x - right.x)
      .map((entry) => entry.block);

    const lastSectionByRegion = new Map<string, string>();
    ordered.forEach((block, index) => {
      const regionId = `region:${pageNumber}:${block.meta.column}`;
      const isHeading = looksLikeHeading(block.text);
      block.meta = {
        ...block.meta,
        region_id: regionId,
        reading_order: index,
        level: isHeading ? 2 : 3,
        parent_id: isHeading ? regionId : lastSectionByRegion.get(regionId) ?? regionId,
        section_hint: sectionHint(block.text),
      };
      if (isHeading) {
        lastSectionByRegion.set(regionId, block.id);
      }
    });

    groupedBlocks.push(...normalizeGroupBBoxes(ordered));
  }

  return groupedBlocks.sort(
    (left, right) => left.page - right.page || left.meta.reading_order - right.meta.reading_order
  );
}

function createGroupedBlock(
  blocks: GroupableLayoutBlock[],
  pageNumber: number,
  column: BlockColumn
): GroupedLayoutBlock {
  const ordered = [...blocks].sort((left, right) => left.sequence - right.sequence);
  const text = ordered.map((block) => block.text.trim()).filter(Boolean).join("\n");
  const bboxPx = roundBox(unionBoxes(ordered.map((block) => block.bbox_px)));
  const bboxNormalized = normalizeBox(roundBox(unionBoxes(ordered.map((block) => block.bbox_normalized))));
  const confidences = ordered
    .map((block) => block.confidence)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const confidence =
    confidences.length > 0
      ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(4))
      : null;

  return {
    id: `grp-${ordered[0]?.id ?? pageNumber}-${ordered[0]?.sequence ?? 0}`,
    page: pageNumber,
    text,
    confidence,
    bbox_px: bboxPx,
    bbox_normalized: bboxNormalized,
    type: looksLikeHeading(text) ? "title" : ordered[0]?.type || "text",
    sequence: ordered[0]?.sequence ?? 0,
    sourceBlocks: ordered,
    meta: {
      level: 3,
      parent_id: null,
      region_id: null,
      reading_order: 0,
      version: 1,
      lock_state: "unlocked",
      column,
      source_line_ids: ordered.map((block) => block.id),
      source_block_ids: ordered.map((block) => block.id),
      section_hint: sectionHint(text),
    },
  };
}

export function toLegacyCompatibleBlocks(sourceBlocks: GroupableLayoutBlock[]): LegacyCompatibleLayoutBlock[] {
  return groupBlocksToParagraphs(sourceBlocks).map((block) => ({
    id: block.id,
    text: block.text,
    page: block.page,
    confidence: block.confidence ?? 0,
    column: block.meta.column,
    rect: {
      x: Number((block.bbox_normalized.x * 100).toFixed(4)),
      y: Number((block.bbox_normalized.y * 100).toFixed(4)),
      width: Number((block.bbox_normalized.width * 100).toFixed(4)),
      height: Number((block.bbox_normalized.height * 100).toFixed(4)),
    },
    meta: {
      level: block.meta.level,
      parent_id: block.meta.parent_id,
      region_id: block.meta.region_id,
      reading_order: block.meta.reading_order,
      version: block.meta.version,
      lock_state: block.meta.lock_state,
    },
  }));
}

export function toGroupableLayoutBlockFromRecord(record: CVOCRBlockRecord, pageNumber: number): GroupableLayoutBlock {
  return {
    id: record.id,
    page: pageNumber,
    text: record.text,
    confidence: record.confidence,
    bbox_px: record.bbox_px,
    bbox_normalized: record.bbox_normalized,
    type: record.type,
    sequence: record.sequence,
    suggested_json_path: record.suggested_json_path,
    suggested_mapping_role: record.suggested_mapping_role,
    suggested_compose_strategy: record.suggested_compose_strategy,
    suggested_parse_strategy: record.suggested_parse_strategy,
    mapping_confidence: record.mapping_confidence,
  };
}
