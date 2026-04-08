import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Briefcase, BriefcaseBusiness, Clock3, MapPin, Tag, Users } from "lucide-react";
import {
  getCompanyBySlug,
  getJobsByCompanySlug,
} from "@/lib/companies";

export const revalidate = 300;
export const dynamicParams = true;

const OPTIMIZED_IMAGE_HOSTS = new Set([
  "careerviet.vn",
  "images.careerviet.vn",
  "placehold.co",
  "via.placeholder.com",
  "images.unsplash.com",
  "res.cloudinary.com",
]);

function canUseNextImage(src: string) {
  if (!src) {
    return false;
  }

  if (src.startsWith("/")) {
    return true;
  }

  try {
    return OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

// ── Static params for SSG ──
export async function generateStaticParams() {
  return [];
}

// ── SEO ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyBySlug(id);
  if (!company) return { title: "Không tìm thấy công ty | TalentFlow" };
  return {
    title: `${company.name} - Tuyển dụng | TalentFlow`,
    description: `Xem ${company.jobCount} việc làm đang tuyển tại ${company.name}.`,
  };
}

// ── Page ──
export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyBySlug(id);
  if (!company) notFound();

  const jobs = await getJobsByCompanySlug(id);
  const initial = company.name.charAt(0).toUpperCase();
  const hasLogo =
    company.logoUrl &&
    !company.logoUrl.includes("placeholder");
  const hasCover =
    company.coverUrl &&
    !company.coverUrl.includes("placeholder");

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      {/* ── Cover ── */}
      <div className="h-56 md:h-72 relative bg-linear-to-br from-primary via-blue-600 to-violet-600 overflow-hidden">
        {hasCover && (
          canUseNextImage(company.coverUrl!) ? (
            <Image
              src={company.coverUrl!}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.coverUrl!}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
          )
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="max-w-275 mx-auto px-6 -mt-20 relative z-10 pb-20">
        {/* ── Company header card ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-10 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* logo */}
            <div className="size-24 md:size-28 rounded-2xl border-2 border-slate-100 bg-white shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              {hasLogo ? (
                canUseNextImage(company.logoUrl!) ? (
                  <Image
                    src={company.logoUrl!}
                    alt={company.name}
                    width={112}
                    height={112}
                    sizes="112px"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logoUrl!}
                    alt={company.name}
                    className="w-full h-full object-contain p-2"
                  />
                )
              ) : (
                <span className="text-4xl font-black text-primary">
                  {initial}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-2 tracking-tight">
                {company.name}
              </h1>

              {/* Meta pills */}
              <div className="mt-3 flex flex-wrap gap-2.5">
                {company.location && (
                  <MetaPill
                    icon={<MapPin className="size-4.5" aria-hidden="true" />}
                    text={company.location}
                  />
                )}
                {company.industry.length > 0 && (
                  <MetaPill
                    icon={<Tag className="size-4.5" aria-hidden="true" />}
                    text={company.industry.join(", ")}
                  />
                )}
                {company.size && (
                  <MetaPill icon={<Users className="size-4.5" aria-hidden="true" />} text={company.size} />
                )}
                <MetaPill
                  icon={<BriefcaseBusiness className="size-4.5" aria-hidden="true" />}
                  text={`${company.jobCount} việc làm`}
                  accent
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Info cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <InfoCard
            icon={<MapPin className="size-6" aria-hidden="true" />}
            title="Địa chỉ"
            detail={company.location ?? "Chưa cập nhật"}
          />
          <InfoCard
            icon={<Users className="size-6" aria-hidden="true" />}
            title="Quy mô"
            detail={company.size ?? "Chưa cập nhật"}
          />
          <InfoCard
            icon={<Tag className="size-6" aria-hidden="true" />}
            title="Lĩnh vực"
            detail={
              company.industry.length > 0
                ? company.industry.join(", ")
                : "Chưa cập nhật"
            }
          />
        </div>

        {/* ── Open jobs section ── */}
        <section>
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 mb-6 tracking-tight">
            <span className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </span>
            Việc làm đang tuyển ({jobs.length})
          </h2>

          {jobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <Briefcase className="mx-auto mb-4 size-12 text-slate-200" aria-hidden="true" />
              <p className="text-slate-400 font-bold">
                Hiện chưa có việc làm nào đang tuyển.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <CompanyJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* ── back link ── */}
        <div className="mt-12 inline-block">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-100 bg-white text-slate-600 font-black hover:text-primary hover:border-primary/30 hover:shadow-sm hover:-translate-x-1 transition-all"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            Danh sách công ty
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ── Helper components ── */

function MetaPill({
  icon,
  text,
  accent,
}: {
  icon: ReactNode;
  text: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border ${
        accent
          ? "bg-primary/5 text-primary border-primary/10"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {icon}
      {text}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm hover:border-primary/30 transition-all">
      <div className="bg-primary/5 p-3 rounded-xl text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-0.5">
          {title}
        </p>
        <p className="text-sm font-black text-slate-900">{detail}</p>
      </div>
    </div>
  );
}

function CompanyJobCard({
  job,
}: {
  job: import("@/types/job").Job;
}) {
  const initial = job.company_name?.charAt(0) ?? "?";
  const hasLogo =
    job.logo_url &&
    !job.logo_url.includes("placeholder");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
    >
      {/* cover */}
      <div className="h-36 bg-slate-100 overflow-hidden relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.cover_url}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="flex-1 p-5 flex flex-col relative">
        {/* logo */}
        <div className="absolute -top-8 right-5 size-12 rounded-xl border-2 border-white bg-white flex items-center justify-center shadow-sm overflow-hidden z-10">
          {hasLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={job.logo_url}
              alt=""
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <span className="text-lg font-black text-primary">{initial}</span>
          )}
        </div>

        <h3 className="text-base font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2 pr-14">
          {job.title}
        </h3>

        {/* salary */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/5 text-primary font-black text-xs rounded-lg border border-primary/10">
            {job.salary || "Thỏa thuận"}
          </span>
        </div>

        {/* meta */}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <MapPin className="size-4" aria-hidden="true" />
            {job.location}
          </span>
          {job.deadline && (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Clock3 className="size-4" aria-hidden="true" />
              {job.deadline}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
