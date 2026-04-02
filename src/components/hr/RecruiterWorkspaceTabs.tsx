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
    <div className="rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] p-2.5 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap gap-2">
        {items.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
              activeId === tab.id
                ? "bg-primary text-white shadow-[0_14px_30px_-22px_rgba(37,99,235,0.58)]"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
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
