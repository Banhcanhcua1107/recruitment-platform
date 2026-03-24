"use client";

import { useMemo } from "react";
import { ParsedBlockItem } from "@/features/ocr-viewer/components/ParsedBlockItem";
import type { NormalizedOcrBlock, NormalizedOcrPage } from "@/features/ocr-viewer/types";

interface ParsedBlockListProps {
  pages: NormalizedOcrPage[];
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
}

const NOISE_TYPES = new Set([
  "figure",
  "image",
  "icon",
  "formula",
  "watermark",
  "stamp",
  "seal",
  "page_number",
  "footer",
]);

function normalizeReviewText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function flattenBlocks(pages: NormalizedOcrPage[]) {
  return pages.flatMap((page) => page.blocks);
}

function sortBlocks(blocks: NormalizedOcrBlock[]) {
  return [...blocks].sort((left, right) => {
    const pageDiff = left.pageIndex - right.pageIndex;
    if (pageDiff !== 0) return pageDiff;

    const topDiff = left.bbox.yMin - right.bbox.yMin;
    if (Math.abs(topDiff) > 1) return topDiff;

    return left.bbox.xMin - right.bbox.xMin;
  });
}

export function isReviewableBlock(block: NormalizedOcrBlock) {
  const text = normalizeReviewText(block.text);
  const area = Math.max(0, (block.bbox.xMax - block.bbox.xMin) * (block.bbox.yMax - block.bbox.yMin));
  const normalizedType = block.type.toLowerCase();

  if (!text) return false;
  if (NOISE_TYPES.has(normalizedType)) return false;
  if (!/[\p{L}\p{N}]/u.test(text)) return false;
  if (/^(page|trang)\s*\d+$/iu.test(text)) return false;
  if (/^\d+\s*(?:x|×)\s*\d+$/iu.test(text)) return false;
  if (text.length <= 1) return false;
  if (area < 320 && text.length < 6) return false;

  return true;
}

export function getReviewableBlocks(pages: NormalizedOcrPage[]) {
  return sortBlocks(flattenBlocks(pages)).filter(isReviewableBlock);
}

export function ParsedBlockList({
  pages,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
}: ParsedBlockListProps) {
  const blocks = useMemo(() => getReviewableBlocks(pages), [pages]);

  if (!blocks.length) return null;

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-2.5">
      {blocks.map((block, index) => {
        const previousBlock = index > 0 ? blocks[index - 1] : null;
        const showPageHeading = previousBlock?.pageIndex !== block.pageIndex;

        return (
          <div key={block.id} className="space-y-2.5">
            {showPageHeading ? (
              <p className="sticky top-0 z-10 rounded-full bg-slate-50/96 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
                Trang {block.pageIndex + 1}
              </p>
            ) : null}

            <ParsedBlockItem
              block={{ ...block, text: normalizeReviewText(block.text) }}
              active={activeBlockId === block.id}
              hovered={hoveredBlockId === block.id}
              onHover={onHover}
              onClick={onClick}
            />
          </div>
        );
      })}
    </div>
  );
}
