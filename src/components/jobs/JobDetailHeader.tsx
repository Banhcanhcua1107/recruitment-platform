import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, Building2, MapPin, Wallet } from "lucide-react";
import type { Job } from "@/types/job";

const OPTIMIZED_IMAGE_HOSTS = new Set([
  "careerviet.vn",
  "images.careerviet.vn",
  "placehold.co",
  "via.placeholder.com",
  "images.unsplash.com",
  "res.cloudinary.com",
]);

interface JobDetailHeaderProps {
  job: Job;
  companyHref: string;
  postedDateLabel: string;
  deadlineLabel: string;
  applicationCard: ReactNode;
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

function CoverImage({ src, alt }: { src: string; alt: string }) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority
        fetchPriority="high"
        quality={72}
        sizes="(min-width: 1536px) 980px, (min-width: 1280px) 62vw, 100vw"
        className="object-cover"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 bg-linear-to-br from-slate-200 via-slate-100 to-slate-50"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,77,183,0.2),transparent_55%)]" />
    </div>
  );
}

function LogoImage({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size: number;
}) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="h-full w-full object-contain"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
    />
  );
}

export function JobDetailHeader({
  job,
  companyHref,
  postedDateLabel,
  deadlineLabel,
  applicationCard,
}: JobDetailHeaderProps) {
  const companyInitial = job.company_name?.charAt(0) ?? "?";
  const hasCompanyLogo = Boolean(job.logo_url && !job.logo_url.includes("placeholder"));
  const coverUrl = job.cover_url || "https://placehold.co/1200x720?text=TalentFlow";
  const factCards = [
    {
      icon: <MapPin className="size-5" aria-hidden="true" />,
      label: "Địa điểm",
      value: resolveValue(job.location),
    },
    {
      icon: <Wallet className="size-5" aria-hidden="true" />,
      label: "Mức lương",
      value: resolveValue(job.salary, "Thỏa thuận"),
      accent: true,
    },
    {
      icon: <BriefcaseBusiness className="size-5" aria-hidden="true" />,
      label: "Loại công việc",
      value: resolveValue(job.employment_type, "Toàn thời gian"),
    },
    {
      icon: <BadgeCheck className="size-5" aria-hidden="true" />,
      label: "Cấp bậc",
      value: resolveValue(job.level, "Đang cập nhật"),
    },
  ];
  const heroLead =
    job.description?.[0] ??
    "Vị trí đang mở tuyển và sẵn sàng trao đổi thêm với những ứng viên phù hợp.";

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_390px] lg:items-start">
      <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)]">
        <div className="relative hidden h-52 overflow-hidden border-b border-slate-200 bg-slate-100 sm:block sm:h-64">
          <CoverImage src={coverUrl} alt={`Ảnh bìa tuyển dụng ${job.company_name}`} />
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/70 via-slate-950/25 to-transparent" />
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Chi tiết công việc
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Đang tuyển
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              Đăng ngày {postedDateLabel}
            </span>
          </div>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.02]">
                {job.title}
              </h1>
              <Link
                href={companyHref}
                prefetch={false}
                className="mt-4 inline-flex items-center gap-2 text-lg font-bold text-slate-600 transition-colors hover:text-primary"
              >
                <Building2 className="size-5" aria-hidden="true" />
                {job.company_name}
              </Link>
              <p className="mt-5 max-w-[68ch] text-base leading-8 text-slate-600">{heroLead}</p>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                  {hasCompanyLogo ? (
                    <LogoImage src={job.logo_url} alt={job.company_name} size={64} />
                  ) : (
                    <span className="text-2xl font-black text-primary">{companyInitial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Doanh nghiệp
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{job.company_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {resolveValue(job.full_address, resolveValue(job.location))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {factCards.map((fact) => (
              <div
                key={fact.label}
                className={[
                  "rounded-[22px] border p-4",
                  fact.accent ? "border-primary/20 bg-primary/5" : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl",
                      fact.accent ? "bg-primary text-white" : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {fact.icon}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{fact.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Thông tin thêm
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                Hạn nộp hồ sơ dự kiến: {deadlineLabel}. Ứng viên phù hợp sẽ được liên hệ trong thời
                gian sớm nhất.
              </p>
            </div>

            {job.industry?.length ? (
              <div className="flex flex-wrap gap-2">
                {job.industry.slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-6">{applicationCard}</div>
    </section>
  );
}
