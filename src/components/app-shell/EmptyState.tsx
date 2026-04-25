import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 px-6 py-12 text-center">
      {icon ? (
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.3)]">
          {icon}
        </div>
      ) : null}
      <h3 className="mt-5 font-headline text-2xl font-extrabold tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
