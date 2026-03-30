import Link from "next/link";
import { companySlug } from "@/lib/companies";
import { updateCompanyProfileAction } from "@/app/hr/actions";
import { CompanyProfileForm } from "@/components/recruitment/CompanyProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { getCompanyProfile, getJobPortfolioSummary } from "@/lib/recruitment";

export default async function HRCompanyPage() {
  const [companyProfile, portfolioSummary] = await Promise.all([
    getCompanyProfile(),
    getJobPortfolioSummary(),
  ]);

  const publicPreviewHref =
    portfolioSummary.totalJobs > 0 && companyProfile.companyName
      ? `/companies/${companySlug(companyProfile.companyName)}`
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Employer branding
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Hồ sơ công ty cho trải nghiệm tuyển dụng công khai
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Đây là nơi recruiter quản lý logo, mô tả, thông tin liên hệ và câu chuyện tuyển
              dụng của doanh nghiệp để tái sử dụng cho job post và trang công ty public.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {publicPreviewHref ? (
              <Link className={buttonVariants("outline", "lg")} href={publicPreviewHref}>
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Xem trang công khai
              </Link>
            ) : null}
            <Link className={buttonVariants("default", "lg")} href="/hr/jobs">
              <span className="material-symbols-outlined text-[18px]">work</span>
              Quản lý tin tuyển dụng
            </Link>
          </div>
        </div>
      </section>

      <CompanyProfileForm
        action={updateCompanyProfileAction}
        initialValues={companyProfile}
        publicPreviewHref={publicPreviewHref}
      />
    </div>
  );
}
