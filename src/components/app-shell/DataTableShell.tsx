import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  title: string;
  description?: string | null;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DataTableShell({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: DataTableShellProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-white/96 shadow-[var(--app-shadow-soft)]",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100/90 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div>{children}</div>

      {footer ? <div className="border-t border-slate-100/90 px-6 py-4">{footer}</div> : null}
    </section>
  );
}
