"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoomControlsProps {
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({
  zoomPercent,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: ZoomControlsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)]">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition",
          "hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Thu nho"
        title="Thu nho"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-12 text-center text-xs font-semibold text-slate-700">{zoomPercent}%</span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition",
          "hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Phong to"
        title="Phong to"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
