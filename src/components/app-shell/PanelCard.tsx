import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelCardProps {
  eyebrow?: string;
  title?: string;
  description?: string | null;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PanelCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PanelCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--app-border)] bg-white/96 shadow-[var(--app-shadow-soft)] backdrop-blur-sm",
        className,
      )}
    >
      {eyebrow || title || description || actions ? (
        <div className="flex flex-col gap-4 border-b border-slate-100/90 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-slate-950">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>
      ) : null}

      <div className={cn("px-6 py-6", contentClassName)}>{children}</div>
    </section>
  );
}
