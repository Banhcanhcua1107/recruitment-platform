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

function truncateText(text: string, maxLength = 420) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function getBlockLabel(type: string) {
  const normalized = type.toLowerCase();
  if (["title", "heading", "header", "section"].includes(normalized)) return "Tiêu đề";
  if (normalized === "table") return "Bảng";
  if (normalized === "list") return "Danh sách";
  return null;
}

function isProminentType(type: string) {
  return ["title", "heading", "header", "section"].includes(type.toLowerCase());
}

export function ParsedBlockItem({
  block,
  active,
  hovered,
  onHover,
  onClick,
}: ParsedBlockItemProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const label = getBlockLabel(block.type);
  const prominent = isProminentType(block.type);

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
        "w-full rounded-[14px] border px-3 py-2.5 text-left transition-all duration-200",
        "border-slate-200/80 bg-white hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50",
        hovered && "border-cyan-200 bg-cyan-50/75 ring-1 ring-cyan-100",
        active && "border-sky-300 bg-sky-50 ring-1 ring-sky-200",
      )}
      onMouseEnter={() => onHover(block.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(block.id)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(block.id)}
    >
      {label ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {label}
        </p>
      ) : null}
      <p
        className={cn(
          "text-[13px] leading-5 text-slate-700",
          prominent && "text-[14px] font-semibold leading-6 text-slate-900",
        )}
      >
        {truncateText(block.text)}
      </p>
    </button>
  );
}
