"use client";

import type { ReactNode } from "react";
import {
  getCompanySectionMeta,
  isCompanySectionEmpty,
  type CompanySection,
} from "@/types/company-profile";
import { useCompanyProfileBuilder } from "../stores/companyProfileBuilderStore";

interface CompanySectionCardProps {
  section: CompanySection;
  children: ReactNode;
  readOnly?: boolean;
}

export default function CompanySectionCard({
  section,
  children,
  readOnly = false,
}: CompanySectionCardProps) {
  const { editingSectionId, setEditingSection } = useCompanyProfileBuilder();
  const meta = getCompanySectionMeta(section.type);
  const isEditing = editingSectionId === section.id;
  const isEmpty = isCompanySectionEmpty(section);

  if (readOnly) {
    return (
      <section
        id={`section-${section.id}`}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]"
      >
        <header className="border-b border-slate-200 px-6 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <span className="material-symbols-outlined text-[22px]">{meta?.icon || "article"}</span>
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Company section
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {meta?.name || section.type}
              </h2>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 sm:px-7">{children}</div>
      </section>
    );
  }

  return (
    <section
      id={`section-${section.id}`}
      className={`overflow-hidden rounded-[28px] border bg-white transition-all duration-300 ${
        isEditing
          ? "border-primary/45 ring-2 ring-primary/20 shadow-[0_24px_52px_rgba(37,99,235,0.18)]"
          : "border-slate-200 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.22)]"
      }`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <span className="material-symbols-outlined text-[22px]">{meta?.icon || "article"}</span>
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Company section
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
              {meta?.name || section.type}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEmpty ? "Can bo sung noi dung" : meta?.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditingSection(isEditing ? null : section.id)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition-colors ${
            isEditing
              ? "border-slate-200 bg-slate-100 text-slate-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isEditing ? "close" : "edit"}
          </span>
          {isEditing ? "Dong" : "Chinh sua"}
        </button>
      </header>

      <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.7),rgba(255,255,255,0))] px-6 py-6 sm:px-7">
        {children}
      </div>
    </section>
  );
}
