import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Briefcase,
  BriefcaseBusiness,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Tag,
  Target,
  Users,
} from "lucide-react";
import { getCompanyBySlug, getJobsByCompanySlug } from "@/lib/companies";

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

function resolveExternalUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    return { title: "Không tìm thấy công ty | TalentFlow" };
  }

  return {
    title: `${company.name} - Tuyển dụng | TalentFlow`,
    description:
      company.companyOverview ||
      company.description ||
      `Xem ${company.jobCount} việc làm đang tuyển tại ${company.name}.`,
  };
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const jobs = await getJobsByCompanySlug(slug);
  const initial = company.name.charAt(0).toUpperCase();
  const hasLogo = company.logoUrl && !company.logoUrl.includes("placeholder");
  const hasCover = company.coverUrl && !company.coverUrl.includes("placeholder");
  const websiteUrl = resolveExternalUrl(company.website);
  const overview =
    company.companyOverview ||
    company.description ||
    "Công ty chưa cập nhật mô tả chi tiết.";
  const benefits = company.benefits ?? [];
  const culture = company.culture ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <div className="relative h-56 overflow-hidden bg-linear-to-br from-primary via-blue-600 to-violet-600 md:h-72">
        {hasCover &&
          (canUseNextImage(company.coverUrl!) ? (
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
              className="h-full w-full object-cover opacity-30"
            />
          ))}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-275 -mt-20 px-6 pb-20">
        <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-md md:size-28">
              {hasLogo ? (
                canUseNextImage(company.logoUrl!) ? (
                  <Image
                    src={company.logoUrl!}
                    alt={company.name}
                    width={112}
                    height={112}
                    sizes="112px"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logoUrl!}
                    alt={company.name}
                    className="h-full w-full object-contain p-2"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-4xl font-black text-primary">{initial}</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="mb-2 text-2xl font-black leading-tight tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
                {company.name}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2.5">
                {company.location ? (
                  <MetaPill icon={<MapPin className="size-4.5" aria-hidden="true" />} text={company.location} />
                ) : null}

                {company.industry.length > 0 ? (
                  <MetaPill
                    icon={<Tag className="size-4.5" aria-hidden="true" />}
                    text={company.industry.join(", ")}
                  />
                ) : null}

                {company.size ? (
                  <MetaPill icon={<Users className="size-4.5" aria-hidden="true" />} text={company.size} />
                ) : null}

                <MetaPill
                  icon={<BriefcaseBusiness className="size-4.5" aria-hidden="true" />}
                  text={`${jobs.length} việc làm mở`}
                  accent
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-xl font-black tracking-tight text-slate-900">Giới thiệu công ty</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{overview}</p>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-black tracking-tight text-slate-900">Thông tin liên hệ</h2>
            <div className="space-y-3 text-sm">
              <ContactItem
                icon={<Globe2 className="size-4.5" aria-hidden="true" />}
                label="Website"
                value={
                  websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    "Chưa cập nhật"
                  )
                }
              />
              <ContactItem
                icon={<Mail className="size-4.5" aria-hidden="true" />}
                label="Email"
                value={company.email || "Chưa cập nhật"}
              />
              <ContactItem
                icon={<Phone className="size-4.5" aria-hidden="true" />}
                label="Số điện thoại"
                value={company.phone || "Chưa cập nhật"}
              />
              <ContactItem
                icon={<MapPin className="size-4.5" aria-hidden="true" />}
                label="Địa điểm"
                value={company.location || "Chưa cập nhật"}
              />
            </div>
          </section>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
              <Target className="size-5 text-primary" aria-hidden="true" />
              Vision / Mission
            </h2>
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <div>
                <p className="font-black text-slate-800">Vision</p>
                <p>{company.vision || "Chưa cập nhật"}</p>
              </div>
              <div>
                <p className="font-black text-slate-800">Mission</p>
                <p>{company.mission || "Chưa cập nhật"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
              <Rocket className="size-5 text-primary" aria-hidden="true" />
              Phúc lợi & Văn hóa
            </h2>

            <div className="space-y-5 text-sm text-slate-600">
              <div>
                <p className="mb-2 font-black text-slate-800">Benefits</p>
                {benefits.length === 0 ? (
                  <p>Chưa cập nhật</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {benefits.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 font-black text-slate-800">Culture</p>
                {culture.length === 0 ? (
                  <p>Chưa cập nhật</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {culture.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section>
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </span>
            Việc làm đang tuyển ({jobs.length})
          </h2>

          {jobs.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white py-16 text-center">
              <Briefcase className="mx-auto mb-4 size-12 text-slate-200" aria-hidden="true" />
              <p className="font-bold text-slate-400">Hiện chưa có việc làm nào đang tuyển.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <CompanyJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 inline-block">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-100 bg-white px-6 py-3 font-black text-slate-600 transition-all hover:-translate-x-1 hover:border-primary/30 hover:text-primary hover:shadow-sm"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            Danh sách công ty
          </Link>
        </div>
      </div>
    </main>
  );
}

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
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold ${
        accent
          ? "border-primary/10 bg-primary/5 text-primary"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {icon}
      {text}
    </span>
  );
}

function ContactItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
        <div className="break-all font-semibold text-slate-700">{value}</div>
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
  const hasLogo = job.logo_url && !job.logo_url.includes("placeholder");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative h-36 shrink-0 overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.cover_url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="relative flex flex-1 flex-col p-5">
        <div className="absolute -top-8 right-5 z-10 flex size-12 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.logo_url} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-lg font-black text-primary">{initial}</span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 pr-14 text-base font-black leading-snug text-slate-900 transition-colors group-hover:text-primary">
          {job.title}
        </h3>

        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-black text-primary">
            {job.salary || "Thỏa thuận"}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <MapPin className="size-4" aria-hidden="true" />
            {job.location}
          </span>
          {job.deadline ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Clock3 className="size-4" aria-hidden="true" />
              {job.deadline}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
