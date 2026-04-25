import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string | null;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] px-6 py-6 shadow-[var(--app-shadow-soft)] backdrop-blur-sm sm:px-7",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.4rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
