import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecruitmentPipelineStatus, JobStatus } from "@/types/recruitment";

type SupportedStatus = RecruitmentPipelineStatus | JobStatus;

const styles: Record<
  SupportedStatus,
  { label: string; className: string; dot: string }
> = {
  open: {
    label: "Đang mở",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Đã đóng",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  draft: {
    label: "Bản nháp",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  applied: {
    label: "Đã nộp",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  new: {
    label: "Mới",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  reviewing: {
    label: "Đang xem xét",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  interview: {
    label: "Phỏng vấn",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  offer: {
    label: "Đề nghị",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  hired: {
    label: "Đã tuyển",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Từ chối",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

export function StatusBadge({ status }: { status: SupportedStatus }) {
  const config = styles[status];

  return (
    <Badge className={cn("gap-2 px-3 py-1", config.className)}>
      <span className={cn("size-2 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}
