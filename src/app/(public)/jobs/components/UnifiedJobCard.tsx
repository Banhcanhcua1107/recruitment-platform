import Link from "next/link";
import { BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import type { Job } from "@/types/job";
import { toSlug } from "@/lib/slug";
import type { JobCardMatchMeta } from "../jobs-page.types";

interface UnifiedJobCardProps {
  job: Job;
  matchMeta?: JobCardMatchMeta;
  className?: string;
  variant?: "default" | "compact";
}

function normalizeTagText(value: string) {
  return value
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[,:;|].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequirementTags(requirements: string[]) {
  return requirements
    .map(normalizeTagText)
    .filter((tag) => {
      if (!tag) {
        return false;
      }

      const words = tag.split(" ").filter(Boolean);
      return words.length <= 4 && tag.length <= 28;
    });
}

function buildSkillTags(job: Job, maxVisible: number, matchMeta?: JobCardMatchMeta) {
  const candidates = [
    job.employment_type,
    ...(matchMeta?.matchedSkills ?? []),
    ...extractRequirementTags(job.requirements ?? []),
    ...(job.industry ?? []),
  ];

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeTagText(candidate);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(normalized);
  }

  const visible = unique.slice(0, maxVisible);
  const overflow = Math.max(0, unique.length - visible.length);

  return {
    visible,
    overflow,
  };
}

function resolveExperienceLabel(job: Job) {
  return job.level || job.experience_level || "Any level";
}

function resolvePostedLabel(postedDate: string) {
  if (!postedDate) {
    return "Mới cập nhật";
  }

  const parsed = new Date(postedDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Mới cập nhật";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `Đăng ${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return `Đăng ${diffDays} ngày trước`;
  }

  return `Đăng ${new Intl.DateTimeFormat("vi-VN").format(parsed)}`;
}

function isFreshJob(postedDate: string) {
  if (!postedDate) {
    return false;
  }

  const parsed = new Date(postedDate);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const ageMs = Date.now() - parsed.getTime();
  return ageMs <= 1000 * 60 * 60 * 24 * 2;
}

function resolveSalaryLabel(rawSalary: string) {
  const raw = (rawSalary || "").trim();
  if (!raw) {
    return "Lương cạnh tranh";
  }

  const cleaned = raw
    .replace(/^mức\s*lương\s*[:：-]?\s*/i, "")
    .replace(/^lương\s*[:：-]?\s*/i, "")
    .trim();

  if (!cleaned) {
    return "Lương cạnh tranh";
  }

  if (/(thỏa thuận|thoả thuận|thương lượng|thuong luong|cạnh tranh|canh tranh|negotiable|deal)/i.test(cleaned)) {
    return "Lương cạnh tranh";
  }

  return `Lương ${cleaned}`;
}

function scoreBadgeClasses(score: number) {
  if (score >= 85) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (score >= 65) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function UnifiedJobCard({
  job,
  matchMeta,
  className,
  variant = "default",
}: UnifiedJobCardProps) {
  const isCompact = variant === "compact";
  const jobHref = `/jobs/${job.id}`;
  const companySlug = toSlug(job.company_name?.trim() ?? "");
  const postedLabel = resolvePostedLabel(job.posted_date);
  const showNewBadge = isFreshJob(job.posted_date);
  const salaryLabel = resolveSalaryLabel(job.salary);
  const { visible, overflow } = buildSkillTags(job, isCompact ? 3 : 5, matchMeta);
  const hasLogo =
    job.logo_url &&
    job.logo_url !== "https://via.placeholder.com/150" &&
    !job.logo_url.includes("placeholder");
  const initial = (job.company_name || "?").charAt(0).toUpperCase();

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg ${
        isCompact ? "min-h-36 p-3 md:min-h-36 md:p-4" : "min-h-40 p-4 md:min-h-44 md:p-5"
      } ${
        className ?? ""
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-4">
        <div className="flex items-center md:items-start">
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 ${
              isCompact ? "size-12" : "size-14"
            }`}
          >
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.logo_url}
                alt={job.company_name}
                className={`${isCompact ? "size-8" : "size-10"} object-contain`}
              />
            ) : (
              <span className={`${isCompact ? "text-sm" : "text-base"} font-black text-primary`}>{initial}</span>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={jobHref}
              className={`min-w-0 line-clamp-1 font-black text-slate-900 transition hover:text-primary ${
                isCompact ? "text-sm md:text-base" : "text-base md:text-lg"
              }`}
            >
              {job.title}
            </Link>
            {showNewBadge ? (
              <span className="inline-flex h-5 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Mới
              </span>
            ) : null}
          </div>

          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 ${isCompact ? "text-[11px]" : "text-xs"}`}>
            <span className="line-clamp-1 font-semibold text-slate-700">
              {companySlug ? (
                <Link href={`/companies/${companySlug}`} className="transition hover:text-primary">
                  {job.company_name}
                </Link>
              ) : (
                job.company_name
              )}
            </span>

            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {job.location || "Toàn quốc"}
            </span>

            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {postedLabel}
            </span>

            <span className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
              {resolveExperienceLabel(job)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {visible.map((tag) => (
              <span
                key={`${job.id}-${tag}`}
                className={`rounded-full bg-blue-50 px-2 py-1 font-semibold text-primary ${
                  isCompact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {tag}
              </span>
            ))}

            {overflow > 0 ? (
              <span
                className={`rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 ${
                  isCompact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                +{overflow}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 md:flex-col md:items-end md:justify-center md:text-right">
          <div className="text-left md:text-right">
            <p className={`${isCompact ? "text-base md:text-xl" : "text-lg md:text-2xl"} line-clamp-1 font-black leading-none text-primary`}>
              {salaryLabel}
            </p>
            {matchMeta ? (
              <span
                className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${scoreBadgeClasses(
                  matchMeta.matchScore,
                )}`}
              >
                {matchMeta.badge} {matchMeta.matchScore}%
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={jobHref}
              className={`inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:border-primary/30 hover:text-primary ${
                isCompact ? "h-9" : "h-10"
              }`}
            >
              Xem chi tiết
            </Link>
            <Link
              href={`${jobHref}#apply`}
              className={`inline-flex items-center justify-center rounded-xl bg-primary px-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-700 ${
                isCompact ? "h-9" : "h-10"
              }`}
            >
              Ứng tuyển ngay
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
