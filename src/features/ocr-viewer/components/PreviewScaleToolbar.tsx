"use client";

import { type ReactNode } from "react";
import { Eye, EyeOff, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewScaleMode } from "@/features/ocr-viewer/types";

interface PreviewScaleToolbarProps {
  pageCount: number;
  blockCount?: number;
  overlayVisible: boolean;
  scaleMode: PreviewScaleMode;
  zoom: number;
  onToggleOverlay: () => void;
  onSetScaleMode: (mode: PreviewScaleMode) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
}

function ScaleModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-[12px] px-2.5 text-[11px] font-medium transition-colors",
        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}

export function PreviewScaleToolbar({
  pageCount,
  blockCount,
  overlayVisible,
  scaleMode,
  zoom,
  onToggleOverlay,
  onSetScaleMode,
  onZoomOut,
  onZoomIn,
}: PreviewScaleToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
        {pageCount} page(s)
      </span>

      {typeof blockCount === "number" && blockCount > 0 ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
          {blockCount} block
        </span>
      ) : null}

      <div className="inline-flex items-center rounded-[16px] border border-slate-200 bg-slate-50 p-1">
        <ScaleModeButton active={scaleMode === "fitPage"} onClick={() => onSetScaleMode("fitPage")}>
          Fit trang
        </ScaleModeButton>
        <ScaleModeButton active={scaleMode === "fitWidth"} onClick={() => onSetScaleMode("fitWidth")}>
          Fit ngang
        </ScaleModeButton>
      </div>

      <button
        type="button"
        onClick={onToggleOverlay}
        className="inline-flex h-8 items-center gap-1.5 rounded-[16px] border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {overlayVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        {overlayVisible ? "Ẩn overlay" : "Hiện overlay"}
      </button>

      <div className="inline-flex items-center rounded-[16px] border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={onZoomOut}
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
          aria-label="Zoom out"
        >
          <Minus size={13} />
        </button>
        <span className="min-w-12 text-center text-[11px] font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={onZoomIn}
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
          aria-label="Zoom in"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
