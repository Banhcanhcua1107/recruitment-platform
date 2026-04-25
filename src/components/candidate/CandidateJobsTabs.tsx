import Link from "next/link";

const TAB_ITEMS = [
  {
    id: "applied",
    label: "Việc đã ứng tuyển",
    href: "/candidate/jobs/applied",
  },
  {
    id: "saved",
    label: "Việc đã lưu",
    href: "/candidate/jobs/saved",
  },
  {
    id: "recommended",
    label: "Việc phù hợp",
    href: "/candidate/jobs/recommended",
  },
] as const;

export default function CandidateJobsTabs({
  activeTab,
}: {
  activeTab: (typeof TAB_ITEMS)[number]["id"];
}) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] p-2.5 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap gap-2">
        {TAB_ITEMS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-[0_14px_30px_-22px_rgba(37,99,235,0.58)]"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
