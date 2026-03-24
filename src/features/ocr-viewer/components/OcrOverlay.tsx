"use client";

import { cn } from "@/lib/utils";
import type { NormalizedOcrBlock } from "@/features/ocr-viewer/types";
import { getScaledBbox } from "@/features/ocr-viewer/utils/ocrNormalize";

interface OcrOverlayProps {
  blocks: NormalizedOcrBlock[];
  originalWidth: number;
  originalHeight: number;
  displayedWidth: number;
  displayedHeight: number;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onBoxHover: (blockId: string | null) => void;
  onBoxClick: (blockId: string) => void;
  registerBoxRef?: (blockId: string, element: HTMLButtonElement | null) => void;
}

export function OcrOverlay({
  blocks,
  originalWidth,
  originalHeight,
  displayedWidth,
  displayedHeight,
  activeBlockId,
  hoveredBlockId,
  onBoxHover,
  onBoxClick,
  registerBoxRef,
}: OcrOverlayProps) {
  if (displayedWidth <= 0 || displayedHeight <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {blocks.map((block) => {
        const scaled = getScaledBbox(
          block.bbox,
          originalWidth,
          originalHeight,
          displayedWidth,
          displayedHeight,
        );
        const isActive = activeBlockId === block.id;
        const isHovered = hoveredBlockId === block.id;

        return (
          <button
            key={block.id}
            ref={(element) => registerBoxRef?.(block.id, element)}
            type="button"
            data-block-id={block.id}
            className={cn(
              "pointer-events-auto absolute rounded-md border transition-all duration-200 ease-out",
              "border-cyan-400/80 bg-cyan-300/10 hover:bg-cyan-300/18",
              isHovered && "border-cyan-300 bg-cyan-300/20 shadow-[0_0_0_2px_rgba(34,211,238,0.16)]",
              isActive && "border-sky-400 bg-sky-300/18 shadow-[0_0_0_3px_rgba(56,189,248,0.22)]",
            )}
            style={{
              left: scaled.left,
              top: scaled.top,
              width: scaled.width,
              height: scaled.height,
            }}
            onMouseEnter={() => onBoxHover(block.id)}
            onMouseLeave={() => onBoxHover(null)}
            onFocus={() => onBoxHover(block.id)}
            onBlur={() => onBoxHover(null)}
            onClick={() => onBoxClick(block.id)}
          >
            {(isHovered || isActive) && scaled.width > 36 ? (
              <span className="pointer-events-none absolute left-0 top-0 -translate-y-[calc(100%+6px)] rounded-md bg-slate-950/92 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
                {block.type} • p{block.pageIndex + 1} • {Math.round(block.bbox.xMax - block.bbox.xMin)}x
                {Math.round(block.bbox.yMax - block.bbox.yMin)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
