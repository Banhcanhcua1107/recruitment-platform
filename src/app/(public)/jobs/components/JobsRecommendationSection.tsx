"use client";

import Link from "next/link";
import type { ResolvedRecommendedJobsData } from "../jobs-page.types";

interface JobsRecommendationSectionProps {
  status: "loading" | "ready" | "empty";
  data: ResolvedRecommendedJobsData | null;
  error: string | null;
  isAnalyzing: boolean;
  isAuthenticated: boolean;
  onAnalyze: () => void;
  onBrowseAll: () => void;
}

function fitLevelLabel(level: "High" | "Medium" | "Low") {
  switch (level) {
    case "High":
      return "Rất phù hợp";
    case "Medium":
      return "Phù hợp";
    default:
      return "Cần bổ sung thêm";
  }
}

function scoreBadgeClasses(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 65) return "bg-amber-500";
  return "bg-slate-500";
}

function RecommendationSkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-50" />
          </div>
        </div>
        <div className="h-7 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mb-4 h-4 w-28 rounded bg-slate-100" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-slate-50" />
        <div className="h-4 w-5/6 rounded bg-slate-50" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-7 w-24 rounded-full bg-slate-100" />
        <div className="h-7 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function RecommendationCard({
  item,
}: {
  item: ResolvedRecommendedJobsData["items"][number];
}) {
  const hasLogo =
    item.job.logo_url &&
    item.job.logo_url !== "https://via.placeholder.com/150" &&
    !item.job.logo_url.includes("placeholder");
  const initial = item.job.company_name?.charAt(0) ?? "?";
  const summaryTag = item.reasons[0] || fitLevelLabel(item.fitLevel);

  return (
    <Link
      href={`/jobs/${item.job.id}`}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-blue-900/5"
    >
      <div
        className={`absolute right-0 top-0 rounded-bl-2xl px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white ${scoreBadgeClasses(
          item.matchScore,
        )}`}
      >
        {item.matchScore}% Match
      </div>

      <div className="mb-5 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.job.logo_url}
              alt={item.job.company_name}
              className="size-11 object-contain"
            />
          ) : (
            <span className="text-lg font-black text-primary">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-black text-slate-900 transition group-hover:text-primary">
            {item.job.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
            {item.job.company_name}
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">
            payments
          </span>
          <span className="font-bold">{item.job.salary || "Thỏa thuận"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">
            location_on
          </span>
          <span>{item.job.location || "Toàn quốc"}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
          {summaryTag}
        </span>
        <span className="text-sm font-black text-primary transition group-hover:translate-x-1">
          Ứng tuyển ngay
        </span>
      </div>
    </Link>
  );
}

export function JobsRecommendationSection({
  status,
  data,
  error,
  isAnalyzing,
  isAuthenticated,
  onAnalyze,
  onBrowseAll,
}: JobsRecommendationSectionProps) {
  const visibleItems = data?.items.slice(0, 3) ?? [];
  const sourceLabel =
    data?.source === "local"
      ? "Đang dùng gợi ý đã lưu gần nhất"
      : "Đồng bộ từ hồ sơ và cache hiện tại";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Việc làm đề xuất cho bạn
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
            Ưu tiên hiển thị các cơ hội phù hợp với hồ sơ, CV và dữ liệu gợi ý đã
            lưu từ khu vực ứng viên.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseAll}
          className="inline-flex items-center gap-1 self-start text-sm font-black text-primary transition hover:gap-2"
        >
          Xem tất cả việc làm
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <RecommendationSkeletonCard key={item} />
          ))}
        </div>
      )}

      {status === "ready" && data && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                  {sourceLabel}
                </p>
                {data.candidateSummary ? (
                  <p className="max-w-4xl text-sm font-medium leading-relaxed text-slate-600">
                    {data.candidateSummary}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-slate-500">
                    Các công việc bên dưới được ưu tiên từ nguồn gợi ý hiện có và
                    không làm thay đổi danh sách tất cả việc làm.
                  </p>
                )}
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-primary transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {isAnalyzing ? "Đang làm mới..." : "Phân tích lại"}
                </button>
              )}
            </div>

            {(data.suggestedRoles.length > 0 || data.suggestedCompanies.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.suggestedRoles.map((role) => (
                  <span
                    key={`role-${role}`}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary"
                  >
                    {role}
                  </span>
                ))}
                {data.suggestedCompanies.map((company) => (
                  <span
                    key={`company-${company}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {company}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {visibleItems.map((item) => (
              <RecommendationCard key={`${item.jobId}-${item.matchScore}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-[32px] border border-dashed border-blue-200 bg-white px-6 py-10 text-center shadow-sm md:px-10">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-primary">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Chưa có gợi ý đủ tốt để hiển thị
          </h3>
          <p className="mx-auto mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
            Hệ thống chưa tìm thấy recommendation usable từ hồ sơ hoặc cache hiện
            tại. Bạn vẫn có thể tiếp tục xem toàn bộ việc làm ngay bên dưới, hoặc
            cập nhật hồ sơ để nhận gợi ý sát hơn.
          </p>

          {error && (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isAnalyzing ? "Đang phân tích..." : "Phân tích từ hồ sơ"}
                </button>
                <Link
                  href="/candidate/profile"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-black text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  Cập nhật hồ sơ
                </Link>
                <Link
                  href="/candidate/cv-builder"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-black text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  Cập nhật CV
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Đăng nhập để nhận gợi ý
                </Link>
                <button
                  type="button"
                  onClick={onBrowseAll}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-black text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  Xem tất cả việc làm
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
