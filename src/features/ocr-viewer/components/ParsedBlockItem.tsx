"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { NormalizedOcrBlock } from "@/features/ocr-viewer/types";

interface ParsedBlockItemProps {
  block: NormalizedOcrBlock;
  active: boolean;
  hovered: boolean;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
}

function truncateText(text: string, maxLength = 220) {
  if (!text) return "Empty content";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function ParsedBlockItem({
  block,
  active,
  hovered,
  onHover,
  onClick,
}: ParsedBlockItemProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      data-block-list-id={block.id}
      className={cn(
        "w-full rounded-[22px] border px-4 py-4 text-left transition-all duration-200",
        "border-slate-200 bg-white hover:-translate-y-[1px] hover:border-cyan-300 hover:bg-cyan-50/50",
        hovered && "border-cyan-300 bg-cyan-50/80 shadow-[0_12px_28px_-24px_rgba(34,211,238,0.6)]",
        active && "border-sky-400 bg-sky-50 shadow-[0_16px_32px_-24px_rgba(56,189,248,0.6)]",
      )}
      onMouseEnter={() => onHover(block.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(block.id)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(block.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{block.type}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Page {block.pageIndex + 1}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
          {Math.round(block.bbox.xMax - block.bbox.xMin)} × {Math.round(block.bbox.yMax - block.bbox.yMin)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">{truncateText(block.text)}</p>
    </button>
  );
}
