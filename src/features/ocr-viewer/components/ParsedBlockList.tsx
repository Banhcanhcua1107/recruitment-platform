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

export function ParsedBlockList({
  pages,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
}: ParsedBlockListProps) {
  const blocks = useMemo(() => sortBlocks(flattenBlocks(pages)), [pages]);

  if (!blocks.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-300 bg-white/90 px-6 text-center text-sm text-slate-500">
        Parsed blocks will appear here after OCR completes.
      </div>
    );
  }

  let lastPageIndex = -1;

  return (
    <div className="space-y-3">
      {blocks.map((block) => {
        const showPageHeading = block.pageIndex !== lastPageIndex;
        lastPageIndex = block.pageIndex;

        return (
          <div key={block.id} className="space-y-3">
            {showPageHeading ? (
              <div className="sticky top-0 z-10 rounded-full border border-slate-200 bg-slate-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
                Page {block.pageIndex + 1}
              </div>
            ) : null}
            <ParsedBlockItem
              block={block}
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
