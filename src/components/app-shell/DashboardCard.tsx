import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  toneClassName?: string;
  className?: string;
}

export function DashboardCard({
  label,
  value,
  icon,
  hint,
  toneClassName,
  className,
}: DashboardCardProps) {
  return (
    <article
      className={cn(
        "rounded-[24px] border border-[var(--app-border)] bg-white/96 p-5 shadow-[var(--app-shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-sky-50 text-primary shadow-[0_12px_30px_-24px_rgba(37,99,235,0.55)]",
            toneClassName,
          )}
        >
          {icon}
        </div>
      </div>
      {hint ? (
        <p className="mt-4 text-sm font-medium leading-6 text-slate-500">{hint}</p>
      ) : null}
    </article>
  );
}
