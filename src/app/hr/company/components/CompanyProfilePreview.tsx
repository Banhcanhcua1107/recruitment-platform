import Link from "next/link";
import { companySlug } from "@/lib/company-slug";
import {
  buildLegacyCompanyProfilePatchFromDocument,
  getOrderedCompanyProfileSections,
} from "@/lib/company-profile-document";
import type { RecruitmentJobPortfolioSummary } from "@/types/recruitment";
import {
  isCompanySectionEmpty,
  type CompanyProfileDocument,
  type CompanySection,
  type CompanyInfoContent,
  type ContactsContent,
  type OperationsContent,
} from "@/types/company-profile";
import CompanySectionRenderer from "./CompanySectionRenderer";

interface CompanyProfilePreviewProps {
  document: CompanyProfileDocument;
  updatedAt?: string | null;
  portfolioSummary?: RecruitmentJobPortfolioSummary | null;
}

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function getSectionContent<T extends CompanySection["content"]>(
  document: CompanyProfileDocument,
  type: CompanySection["type"],
) {
  return document.sections.find((section) => section.type === type)?.content as T | undefined;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return "Chua cap nhat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CompanyProfilePreview({
  document,
  updatedAt = null,
  portfolioSummary = null,
}: CompanyProfilePreviewProps) {
  const patch = buildLegacyCompanyProfilePatchFromDocument(document);
  const companyInfo = getSectionContent<CompanyInfoContent>(document, "company_info");
  const contacts = getSectionContent<ContactsContent>(document, "contacts");
  const operations = getSectionContent<OperationsContent>(document, "operations");
  const sections = getOrderedCompanyProfileSections(document).filter(
    (section) => !section.isHidden && !isCompanySectionEmpty(section),
  );

  const companyName = patch.company_name || companyInfo?.companyName || "Ho so cong ty";
  const tagline = normalizeString(companyInfo?.tagline);
  const publicCompanyHref =
    portfolioSummary && portfolioSummary.totalJobs > 0 && patch.company_name
      ? `/companies/${companySlug(patch.company_name)}`
      : null;
  const contactItems = [
    ["Website", normalizeString(contacts?.website)],
    ["Email", normalizeString(contacts?.email) || normalizeString(patch.email)],
    ["Dien thoai", normalizeString(contacts?.phone)],
    ["Dia chi", normalizeString(contacts?.address) || normalizeString(patch.location)],
  ].filter((item) => item[1]);

  const highlightItems = [
    {
      label: "Job dang mo",
      value: String(portfolioSummary?.openJobs ?? 0),
    },
    {
      label: "Tong job",
      value: String(portfolioSummary?.totalJobs ?? 0),
    },
    {
      label: "Ung vien",
      value: String(portfolioSummary?.totalApplicants ?? 0),
    },
    {
      label: "Cap nhat",
      value: formatUpdatedAt(updatedAt),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-330 space-y-6 pb-10">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
        <div className="relative h-44 bg-[linear-gradient(120deg,#0f172a_0%,#2563eb_45%,#0ea5e9_100%)] sm:h-56">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.5)_100%)]" />
        </div>

        <div className="px-6 pb-6 pt-5 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Company profile preview
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {companyName}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                {tagline || "Ho so cong ty nay duoc dung de review no luc employer branding va noi dung ho tro tuyen dung."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/hr/company"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Chinh sua
              </Link>
              {publicCompanyHref ? (
                <Link
                  href={publicCompanyHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Xem trang cong khai
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {patch.industry.map((item) => (
              <span
                key={item}
                className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
              >
                {item}
              </span>
            ))}
            {normalizeString(operations?.companySize || patch.company_size) ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {operations?.companySize || patch.company_size}
              </span>
            ) : null}
            {normalizeString(contacts?.address || operations?.headquarters || patch.location) ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                {contacts?.address || operations?.headquarters || patch.location}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {highlightItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-black tracking-tight text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Lien he
            </p>
            <div className="mt-4 space-y-3">
              {contactItems.length > 0 ? (
                contactItems.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium leading-6 text-slate-500">
                  Chua co thong tin lien he cong khai cho company profile nay.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Tinh trang preview
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Day la bo cuc preview noi bo danh cho HR. Noi dung se duoc luu vao company profile document va
              dong bo cac field summary ve employer branding hien co.
            </p>
          </section>
        </aside>

        <main className="space-y-6">
          {sections.length > 0 ? (
            sections.map((section) => (
              <CompanySectionRenderer key={section.id} section={section} readOnly />
            ))
          ) : (
            <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <p className="text-lg font-black text-slate-900">Chua co du lieu de preview.</p>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                Quay lai trang chinh sua de bo sung thong tin cong ty va noi dung tuyen dung.
              </p>
              <Link
                href="/hr/company"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Ve trang chinh sua
              </Link>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
