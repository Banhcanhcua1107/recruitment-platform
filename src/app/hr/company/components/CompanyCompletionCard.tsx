"use client";

import {
  getCompanySectionMeta,
  isCompanySectionEmpty,
} from "@/types/company-profile";
import { useCompanyProfileSections } from "../stores/companyProfileBuilderStore";

export default function CompanyCompletionCard() {
  const sections = useCompanyProfileSections();

  if (sections.length === 0) {
    return null;
  }

  const completedSections = sections.filter((section) => !isCompanySectionEmpty(section));
  const percentage = Math.round((completedSections.length / sections.length) * 100);
  const nextSection = sections.find((section) => isCompanySectionEmpty(section));
  const nextMeta = nextSection ? getCompanySectionMeta(nextSection.type) : null;

  const tone =
    percentage >= 85
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : percentage >= 55
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-rose-700 bg-rose-50 border-rose-200";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Muc do hoan thien
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{percentage}%</h3>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${tone}`}>
          {completedSections.length}/{sections.length} muc
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#0ea5e9_100%)] transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          Goi y tiep theo
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          {nextMeta
            ? `Bo sung "${nextMeta.name}" de ho so cong ty day du hon khi preview va gan voi job post.`
            : "Ho so cong ty da co day du cac khoi thong tin cot loi cho tuyen dung."}
        </p>
      </div>
    </section>
  );
}
