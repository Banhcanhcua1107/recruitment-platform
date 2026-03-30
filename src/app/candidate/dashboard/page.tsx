"use client";

import Link from "next/link";
import { useMemo } from "react";
import RecommendedJobs from "./components/RecommendedJobs";
import { useCandidateDashboard } from "@/hooks/useCandidateDashboard";
import { buildCandidateActivityItems } from "@/components/candidate/candidateWorkspaceContentModel";

const QUICK_ACTIONS = [
  {
    title: "Cập nhật hồ sơ",
    description: "Bổ sung thông tin cá nhân và tăng mức độ hoàn thiện hồ sơ.",
    href: "/candidate/profile",
    icon: "person_edit",
  },
  {
    title: "Tạo CV mới",
    description: "Bắt đầu từ thư viện mẫu và chuyển thẳng sang trình chỉnh sửa.",
    href: "/candidate/templates",
    icon: "note_add",
  },
  {
    title: "Quản lý CV",
    description: "Xem danh sách CV đã lưu, đặt CV mặc định và tải thêm file.",
    href: "/candidate/cv-builder",
    icon: "description",
  },
  {
    title: "Tìm việc làm",
    description: "Khám phá tin tuyển dụng công khai và quay lại các vị trí phù hợp.",
    href: "/jobs",
    icon: "travel_explore",
  },
];

const STAT_ITEMS = [
  {
    key: "totalApplied",
    label: "Đơn đã nộp",
    icon: "send",
    tone: "from-sky-500/15 to-sky-500/5 text-sky-700",
  },
  {
    key: "profileViews",
    label: "Lượt xem hồ sơ",
    icon: "visibility",
    tone: "from-violet-500/15 to-violet-500/5 text-violet-700",
  },
  {
    key: "interviews",
    label: "Phỏng vấn",
    icon: "calendar_month",
    tone: "from-amber-500/15 to-amber-500/5 text-amber-700",
  },
  {
    key: "savedJobs",
    label: "Việc đã lưu",
    icon: "bookmark",
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
  },
] as const;

function formatRelativeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Vừa cập nhật";
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CandidateDashboard() {
  const {
    user,
    stats,
    notificationCount,
    recentApplications,
    recommendedJobs,
    cvs,
    isLoading,
    error,
  } = useCandidateDashboard();

  const activityItems = useMemo(
    () =>
      buildCandidateActivityItems({
        recentApplications,
        cvs,
      }).slice(0, 6),
    [cvs, recentApplications]
  );

  const displayName = user?.full_name?.split(" ").filter(Boolean).at(-1) || "Ứng viên";
  const completionPercentage = user?.completion_percentage || 0;

  if (error) {
    return (
      <section className="rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-sm">
        <div className="mx-auto max-w-2xl">
          <span className="material-symbols-outlined text-[44px] text-rose-400">error</span>
          <h2 className="mt-4 text-2xl font-black text-rose-900">Không thể tải tổng quan ứng viên</h2>
          <p className="mt-3 text-base font-medium leading-7 text-rose-700">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#38bdf8_100%)] text-white shadow-[0_40px_100px_-48px_rgba(15,23,42,0.8)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:px-10 lg:py-10">
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-100/80">
              Không gian ứng viên
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-[2.7rem]">
              Chào {displayName}, hôm nay bạn có {notificationCount} thông báo mới.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-sky-50/88 sm:text-base">
              Theo dõi hồ sơ, đơn ứng tuyển và các cơ hội phù hợp từ một bảng điều khiển gọn gàng hơn,
              ưu tiên những việc bạn cần làm ngay.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/candidate/profile"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition-transform hover:-translate-y-0.5"
              >
                Cập nhật hồ sơ
              </Link>
              <Link
                href="/candidate/jobs/applied"
                className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/16"
              >
                Theo dõi ứng tuyển
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100/80">
                  Mức hoàn thiện hồ sơ
                </p>
                <p className="mt-2 text-4xl font-black">{completionPercentage}%</p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/12">
                <span className="material-symbols-outlined text-[28px]">verified_user</span>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/70">
                  Tín hiệu nhanh
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-white/90">
                  {completionPercentage >= 80
                    ? "Hồ sơ của bạn đã đủ mạnh để nổi bật hơn trong khu vực tuyển dụng."
                    : "Bổ sung hồ sơ cá nhân và CV để cải thiện tỷ lệ được nhà tuyển dụng chú ý."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/candidate/cv-builder"
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/16"
                >
                  {cvs.length} CV đã lưu
                </Link>
                <Link
                  href="/candidate/jobs/saved"
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/16"
                >
                  {stats.savedJobs} việc đã lưu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {STAT_ITEMS.map((item) => (
          <article
            key={item.key}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </p>
              <div className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                <span className="material-symbols-outlined text-[21px]">{item.icon}</span>
              </div>
            </div>
            <div className="mt-6 flex items-end gap-3">
              <span className="text-4xl font-black tracking-tight text-slate-950">
                {isLoading ? "--" : stats[item.key]}
              </span>
              <span className="mb-1 text-sm font-semibold text-slate-400">mục</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Hoạt động gần đây
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Hoạt động gần đây</h3>
            </div>
            <Link
              href="/candidate/jobs/applied"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
            >
              Xem tất cả
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <span className="material-symbols-outlined text-[40px] text-slate-300">history</span>
              <p className="mt-4 text-lg font-black text-slate-700">Chưa có hoạt động nào gần đây</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Hãy cập nhật hồ sơ, tạo CV hoặc ứng tuyển việc làm để bắt đầu hành trình của bạn.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {activityItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 rounded-[24px] border border-slate-200 px-4 py-4 transition-all hover:border-primary/20 hover:bg-slate-50"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{item.subtitle}</p>
                  </div>
                  <p className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {formatRelativeDate(item.timestamp)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
          <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Hành động nhanh
              </p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Hành động nhanh</h3>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
              Các lối tắt quan trọng giúp bạn quay lại đúng nơi cần xử lý tiếp theo.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[24px] border border-slate-200 px-4 py-4 transition-all hover:border-primary/20 hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-slate-900">{action.title}</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
        <RecommendedJobs jobs={recommendedJobs} loading={isLoading} />
      </section>
    </div>
  );
}
