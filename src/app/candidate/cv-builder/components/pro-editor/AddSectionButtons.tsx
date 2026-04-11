"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSectionButtonsProps {
  isActive: boolean;
  borderClassName: string;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export function AddSectionButtons({
  isActive,
  borderClassName,
  onAddAbove,
  onAddBelow,
}: AddSectionButtonsProps) {
  const visibilityClassName = isActive
    ? "translate-x-0 opacity-100"
    : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddAbove();
        }}
        className={cn(
          "absolute -left-3 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 text-slate-500 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.48)] transition-all duration-200 hover:border-emerald-300/70 hover:text-emerald-700",
          borderClassName,
          visibilityClassName,
        )}
        title="Thêm mục ở trên"
      >
        <Plus size={13} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddBelow();
        }}
        className={cn(
          "absolute -left-3 bottom-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 text-slate-500 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.48)] transition-all duration-200 hover:border-emerald-300/70 hover:text-emerald-700",
          borderClassName,
          visibilityClassName,
        )}
        title="Thêm mục ở dưới"
      >
        <Plus size={13} />
      </button>
    </>
  );
}
