"use client";

import { cn } from "@/lib/utils";
import type { CVDocumentStatus, EditableCVStatus } from "@/types/cv-import";

type StatusValue = CVDocumentStatus | EditableCVStatus;

const STATUS_LABELS: Record<StatusValue, string> = {
  uploaded: "Đã tải lên",
  queued: "Đang chờ",
  normalizing: "Chuẩn bị file",
  rendering_preview: "Dựng preview",
  ocr_running: "Đang OCR",
  layout_running: "Đang phân tích bố cục",
  vl_running: "Đang phân tích thị giác",
  parsing_structured: "Đang dựng JSON",
  persisting: "Đang lưu kết quả",
  ready: "Sẵn sàng",
  partial_ready: "Sẵn sàng một phần",
  failed: "Thất bại",
  retrying: "Đang thử lại",
  draft: "Bản nháp",
  saving: "Đang lưu",
};

const STATUS_STYLES: Record<StatusValue, string> = {
  uploaded: "border-slate-200 bg-slate-50 text-slate-700",
  queued: "border-cyan-200 bg-cyan-50 text-cyan-700",
  normalizing: "border-blue-200 bg-blue-50 text-blue-700",
  rendering_preview: "border-blue-200 bg-blue-50 text-blue-700",
  ocr_running: "border-amber-200 bg-amber-50 text-amber-700",
  layout_running: "border-amber-200 bg-amber-50 text-amber-700",
  vl_running: "border-violet-200 bg-violet-50 text-violet-700",
  parsing_structured: "border-indigo-200 bg-indigo-50 text-indigo-700",
  persisting: "border-slate-200 bg-slate-50 text-slate-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial_ready: "border-orange-200 bg-orange-50 text-orange-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  retrying: "border-cyan-200 bg-cyan-50 text-cyan-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  saving: "border-blue-200 bg-blue-50 text-blue-700",
};

interface ImportStatusBadgeProps {
  status: StatusValue;
  className?: string;
}

export function ImportStatusBadge({ status, className }: ImportStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
