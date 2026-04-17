import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCheck, CircleDot, MapPin } from "lucide-react";
import { ApplyJobCard } from "@/components/jobs/ApplyJobCard";
import { JobDetailHeader } from "@/components/jobs/JobDetailHeader";
import { companySlug, getRelatedJobsByCompanySlug } from "@/lib/companies";
import { getJobById } from "@/lib/jobs";

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

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Đang cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function resolveValue(value?: string | null, fallback = "Đang cập nhật") {
  return value && value.trim() ? value : fallback;
}

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

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return {
      title: "Không tìm thấy việc làm | TalentFlow",
    };
  }

  return {
    title: `${job.title} - ${job.company_name} | TalentFlow`,
    description: job.description?.[0] ?? `Ứng tuyển ${job.title} tại ${job.company_name}`,
    openGraph: {
      title: job.title,
      description: job.description?.[0] ?? `Cơ hội nghề nghiệp tại ${job.company_name}`,
      images: job.cover_url ? [job.cover_url] : [],
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  const slug = companySlug(job.company_name);
  const postedDateLabel = formatDateLabel(job.posted_date);
  const deadlineLabel = formatDateLabel(job.deadline);
  const sidebarItems = [
    { label: "Ngày đăng", value: postedDateLabel },
    { label: "Hạn nộp", value: deadlineLabel },
    { label: "Kinh nghiệm", value: resolveValue(job.experience_level) },
    { label: "Học vấn", value: resolveValue(job.education_level) },
    { label: "Độ tuổi", value: resolveValue(job.age_range) },
    { label: "Địa chỉ", value: resolveValue(job.full_address, resolveValue(job.location)) },
  ];
  const companyInitial = job.company_name?.charAt(0) ?? "?";
  const hasCompanyLogo = Boolean(job.logo_url && !job.logo_url.includes("placeholder"));
  const companyCover = job.cover_url || "https://placehold.co/1200x720?text=TalentFlow";

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-425 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
        <Link
          href="/jobs"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Danh sách việc làm
        </Link>

        <div className="mt-5">
          <JobDetailHeader
            job={job}
            companyHref={`/companies/${slug}`}
            postedDateLabel={postedDateLabel}
            deadlineLabel={deadlineLabel}
            applicationCard={
              <ApplyJobCard
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.company_name}
                sourceUrl={job.source_url}
                compact
              />
            }
          />
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.62fr)_380px] xl:grid-cols-[minmax(0,1.72fr)_400px]">
          <div className="space-y-6">
            {job.description?.length ? (
              <PageSection
                eyebrow="Công việc"
                title="Mô tả công việc"
                description="Các đầu việc chính và phạm vi trách nhiệm của vị trí."
              >
                <BulletList
                  items={job.description}
                  icon={<CircleDot className="size-4.5" aria-hidden="true" />}
                />
              </PageSection>
            ) : null}

            {job.requirements?.length ? (
              <PageSection
                eyebrow="Ứng viên"
                title="Yêu cầu ứng viên"
                description="Những kỹ năng, kinh nghiệm và tiêu chí phù hợp với vị trí đang tuyển."
              >
                <BulletList
                  items={job.requirements}
                  icon={<CheckCheck className="size-4.5" aria-hidden="true" />}
                />
              </PageSection>
            ) : null}

            {job.benefits?.length ? (
              <PageSection
                eyebrow="Quyền lợi"
                title="Phúc lợi và đãi ngộ"
                description="Những giá trị bạn sẽ nhận được khi đồng hành cùng doanh nghiệp."
              >
                <div className="flex flex-wrap gap-3">
                  {job.benefits.map((item) => (
                    <span
                      key={item}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </PageSection>
            ) : null}
          </div>

          <aside className="space-y-6">
            <PageSection
              eyebrow="Tổng quan"
              title="Thông tin tuyển dụng"
              description="Các dữ liệu nhanh giúp bạn đánh giá mức độ phù hợp của công việc."
            >
              <div className="divide-y divide-slate-200/80">
                {sidebarItems.map((item) => (
                  <SidebarRow key={item.label} label={item.label} value={item.value} />
                ))}
                {job.industry?.length ? (
                  <SidebarRow label="Ngành nghề" value={job.industry.join(", ")} />
                ) : null}
              </div>
            </PageSection>

            <Link
              href={`/companies/${slug}`}
              prefetch={false}
              className="group block overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/30"
            >
              <div className="relative h-40 overflow-hidden bg-slate-100">
                {canUseNextImage(companyCover) ? (
                  <Image
                    src={companyCover}
                    alt=""
                    fill
                    quality={62}
                    sizes="(min-width: 1280px) 380px, (min-width: 1024px) 32vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companyCover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 flex items-center gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/90 p-2">
                    {hasCompanyLogo ? (
                      canUseNextImage(job.logo_url) ? (
                        <Image
                          src={job.logo_url}
                          alt={job.company_name}
                          width={56}
                          height={56}
                          sizes="56px"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={job.logo_url}
                          alt={job.company_name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      )
                    ) : (
                      <span className="text-xl font-black text-primary">{companyInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Doanh nghiệp
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-white">{job.company_name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <p className="text-sm leading-6 text-slate-600">
                  Khám phá thêm thông tin doanh nghiệp, văn hóa làm việc và các vị trí đang mở
                  tuyển khác.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Xem trang công ty
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </aside>
        </section>

        <Suspense fallback={null}>
          <RelatedJobsSection slug={slug} currentJobId={job.id} companyName={job.company_name} />
        </Suspense>
      </div>
    </main>
  );
}

async function RelatedJobsSection({
  slug,
  currentJobId,
  companyName,
}: {
  slug: string;
  currentJobId: string;
  companyName: string;
}) {
  const relatedJobs = await getRelatedJobsByCompanySlug(slug, {
    excludeJobId: currentJobId,
    limit: 6,
  });

  if (!relatedJobs.length) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Cùng doanh nghiệp
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Việc làm khác tại {companyName}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {relatedJobs.map((item) => (
          <Link
            key={item.id}
            href={`/jobs/${item.id}`}
            prefetch={false}
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-lg font-black leading-snug text-slate-950 transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">{item.company_name}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {resolveValue(item.salary, "Thỏa thuận")}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <InlineMeta icon={<MapPin className="size-4" aria-hidden="true" />} text={resolveValue(item.location)} />
              {item.deadline ? (
                <InlineMeta icon={<CalendarDays className="size-4" aria-hidden="true" />} text={formatDateLabel(item.deadline)} />
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PageSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)] sm:p-7">
      <div className="mb-6 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
        <p className="max-w-[65ch] text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function BulletList({
  items,
  icon,
}: {
  items: string[];
  icon: ReactNode;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="text-sm leading-7 text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SidebarRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-semibold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function InlineMeta({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
      {icon}
      {text}
    </span>
  );
}
