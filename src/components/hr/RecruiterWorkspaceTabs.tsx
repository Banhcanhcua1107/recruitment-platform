import Link from "next/link";

export interface RecruiterWorkspaceTabItem {
  id: string;
  label: string;
  href: string;
  count?: number | null;
}

export function RecruiterWorkspaceTabs({
  items,
  activeId,
}: {
  items: RecruiterWorkspaceTabItem[];
  activeId: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.18)]">
      <div className="flex flex-wrap gap-2">
        {items.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
              activeId === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary"
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeId === tab.id
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
