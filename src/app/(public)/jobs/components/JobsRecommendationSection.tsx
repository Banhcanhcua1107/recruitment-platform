"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { JobCardMatchMeta, ResolvedRecommendedJobsData } from "../jobs-page.types";
import { UnifiedJobCard } from "./UnifiedJobCard";

interface JobsRecommendationSectionProps {
  status: "loading" | "ready" | "empty";
  data: ResolvedRecommendedJobsData | null;
  error: string | null;
  onBrowseAll: () => void;
}

function RecommendationCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-2xl bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-50" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-6 w-28 rounded-xl bg-slate-100" />
          <div className="h-6 w-full rounded-xl bg-slate-50" />
        </div>

        <div className="space-y-2 md:text-right">
          <div className="h-7 w-24 rounded bg-slate-100 md:ml-auto" />
          <div className="h-6 w-28 rounded-full bg-slate-50 md:ml-auto" />
          <div className="h-10 w-44 rounded-xl bg-slate-100 md:ml-auto" />
        </div>
      </div>
    </div>
  );
}

function toMatchMeta(item: ResolvedRecommendedJobsData["items"][number]): JobCardMatchMeta {
  return {
    matchScore: item.matchScore,
    fitLevel: item.fitLevel,
    badge: item.fitLevel === "High" ? "Top match" : "Recommended",
    matchedSkills: item.matchedSkills,
  };
}

export function JobsRecommendationSection({
  status,
  data,
  error,
  onBrowseAll,
}: JobsRecommendationSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const collapsedLimit = 4;
  const visibleItems = React.useMemo(() => {
    if (!data) {
      return [];
    }

    return expanded ? data.items : data.items.slice(0, collapsedLimit);
  }, [collapsedLimit, data, expanded]);

  const totalRecommendations = data?.items.length ?? 0;
  const canExpand = totalRecommendations > collapsedLimit;

  const sourceLabel =
    data?.source === "local"
      ? "Đang dùng gợi ý đã lưu gần nhất"
      : "Đồng bộ từ hồ sơ và cache hiện tại";

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
            AI recommendations
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
            Gợi ý việc làm cho bạn
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gợi ý nhanh 4 cơ hội nổi bật dựa trên hồ sơ, hiển thị gọn để so sánh trong vài giây.
          </p>
        </div>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <RecommendationCardSkeleton key={item} />
          ))}
        </div>
      )}

      {status === "ready" && data && (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                {sourceLabel}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                {totalRecommendations} job liên quan
              </span>
            </div>

            {data.candidateSummary ? (
              <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-600">{data.candidateSummary}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleItems.map((item) => (
              <UnifiedJobCard
                key={`${item.jobId}-${item.matchScore}`}
                job={item.job}
                matchMeta={toMatchMeta(item)}
                variant="compact"
              />
            ))}
          </div>

          {canExpand && !expanded ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
              >
                Xem thêm
              </button>
            </div>
          ) : null}
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Sparkles className="size-4.5" aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-[0.18em]">AI recommendations</span>
          </div>
          <h3 className="text-base font-black text-slate-900">
            Chưa có gợi ý AI khả dụng, bạn vẫn duyệt toàn bộ việc làm bình thường bên dưới.
          </h3>

          {error && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBrowseAll}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-primary/30 hover:text-primary"
            >
              Xem tất cả việc làm
            </button>
            <Link
              href="/candidate/profile"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-primary/30 hover:text-primary"
            >
              Cập nhật hồ sơ
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
