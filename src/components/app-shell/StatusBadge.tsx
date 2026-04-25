import { cn } from "@/lib/utils";

type StatusTone = "primary" | "success" | "warning" | "danger" | "neutral";

const TONE_CLASS_NAMES: Record<StatusTone, string> = {
  primary: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em]",
        TONE_CLASS_NAMES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
