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
    <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.18)]">
      <div className="flex flex-wrap gap-2">
        {TAB_ITEMS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
