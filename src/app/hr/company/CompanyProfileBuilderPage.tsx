"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { companySlug } from "@/lib/company-slug";
import {
  buildLegacyCompanyProfilePatchFromDocument,
  getOrderedCompanyProfileSections,
} from "@/lib/company-profile-document";
import {
  getCompanySectionMeta,
  isCompanySectionEmpty,
  type CompanyProfileDocument,
  type CompanyInfoContent,
  type ContactsContent,
  type OperationsContent,
} from "@/types/company-profile";
import CompanyCompletionCard from "./components/CompanyCompletionCard";
import CompanyProfileHeader from "./components/CompanyProfileHeader";
import CompanySectionRenderer from "./components/CompanySectionRenderer";
import {
  useCompanyProfileBuilder,
  useCompanyProfileDocument,
  useCompanyProfileLoading,
} from "./stores/companyProfileBuilderStore";

function scrollToSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const element = document.getElementById(`section-${sectionId}`);
  if (!element) {
    return;
  }

  element.scrollIntoView({
    block: "start",
    behavior: "smooth",
  });
}

function getSectionContent<T>(document: CompanyProfileDocument, type: string) {
  return document.sections.find((section) => section.type === type)?.content as T | undefined;
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-330 space-y-6">
      <div className="h-28 animate-pulse rounded-[28px] bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="h-72 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-60 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="h-48 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function CompanyProfileBuilderPage() {
  const router = useRouter();
  const loadProfile = useCompanyProfileBuilder((state) => state.loadProfile);
  const saveProfile = useCompanyProfileBuilder((state) => state.saveProfile);
  const setEditingSection = useCompanyProfileBuilder((state) => state.setEditingSection);
  const document = useCompanyProfileDocument();
  const isLoading = useCompanyProfileLoading();
  const [isPreviewPending, setIsPreviewPending] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const orderedSections = useMemo(() => {
    if (!document) {
      return [];
    }

    return getOrderedCompanyProfileSections(document);
  }, [document]);

  const patch = useMemo(() => {
    if (!document) {
      return null;
    }

    return buildLegacyCompanyProfilePatchFromDocument(document);
  }, [document]);

  const companyInfo = useMemo(
    () => (document ? getSectionContent<CompanyInfoContent>(document, "company_info") : undefined),
    [document],
  );
  const contacts = useMemo(
    () => (document ? getSectionContent<ContactsContent>(document, "contacts") : undefined),
    [document],
  );
  const operations = useMemo(
    () => (document ? getSectionContent<OperationsContent>(document, "operations") : undefined),
    [document],
  );

  const sectionChecklist = useMemo(
    () =>
      orderedSections.map((section) => ({
        id: section.id,
        type: section.type,
        label: getCompanySectionMeta(section.type)?.name || section.type,
        isReady: !isCompanySectionEmpty(section),
      })),
    [orderedSections],
  );

  const completionPercentage =
    sectionChecklist.length === 0
      ? 0
      : Math.round((sectionChecklist.filter((item) => item.isReady).length / sectionChecklist.length) * 100);

  const companyName =
    companyInfo?.companyName || patch?.company_name || "Cong ty chua dat ten";
  const publicCompanyHref =
    patch?.company_name && companySlug(patch.company_name) ? `/companies/${companySlug(patch.company_name)}` : null;

  const handlePreview = async () => {
    setIsPreviewPending(true);
    try {
      const didSave = await saveProfile();
      if (!didSave) {
        return;
      }

      startTransition(() => {
        router.push("/hr/company/preview");
      });
    } finally {
      setIsPreviewPending(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-330 space-y-6 pb-8">
      <CompanyProfileHeader
        companyName={companyName}
        onPreview={handlePreview}
        isPreviewPending={isPreviewPending}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="order-2 space-y-6 xl:order-1">
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(37,99,235,0.08),rgba(14,165,233,0.04))] px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {companyInfo?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={companyInfo.logoUrl} alt={companyName} className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-3xl font-black text-primary">
                        {companyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Tong quan company profile
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {companyName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500 sm:text-base">
                      {companyInfo?.tagline ||
                        "Bo sung thong diep employer branding de company preview ro ban sac hon."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(patch?.industry || []).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
                        >
                          {item}
                        </span>
                      ))}
                      {operations?.companySize || patch?.company_size ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                          {operations?.companySize || patch?.company_size}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {publicCompanyHref ? (
                    <button
                      type="button"
                      onClick={() => router.push(publicCompanyHref)}
                      className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                    >
                      Xem trang cong khai
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                  >
                    Preview ho so cong ty
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: "Do hoan thien",
                    value: `${completionPercentage}%`,
                  },
                  {
                    label: "Lien he chinh",
                    value: contacts?.email || patch?.email || "Chua co",
                  },
                  {
                    label: "Khu vuc",
                    value: contacts?.address || operations?.headquarters || patch?.location || "Chua co",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 wrap-break-word text-base font-black tracking-tight text-slate-950 sm:text-lg">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {orderedSections.map((section) => (
            <CompanySectionRenderer key={section.id} section={section} />
          ))}
        </main>

        <aside className="order-1 space-y-6 xl:order-2">
          <div className="space-y-6 xl:sticky xl:top-27">
            <CompanyCompletionCard />

            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Dieu huong nhanh
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Cac muc trong ho so</h3>

              <div className="mt-4 space-y-2">
                {sectionChecklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditingSection(item.id);
                      setTimeout(() => scrollToSection(item.id), 0);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-slate-50"
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-2xl ${
                        item.isReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item.isReady ? "check" : "edit_note"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{item.label}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {item.isReady ? "Da co noi dung" : "Can bo sung"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
