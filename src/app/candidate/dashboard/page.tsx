"use client";

import Link from "next/link";
import { useMemo } from "react";
import RecommendedJobs from "./components/RecommendedJobs";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  PanelCard,
  StatusBadge,
} from "@/components/app-shell";
import { useCandidateDashboard } from "@/hooks/useCandidateDashboard";
import { buildCandidateActivityItems } from "@/components/candidate/candidateWorkspaceContentModel";

const QUICK_ACTIONS = [
  {
    title: "Cap nhat ho so",
    description: "Bo sung thong tin ca nhan va tang muc do hoan thien ho so.",
    href: "/candidate/profile",
    icon: "person_edit",
  },
  {
    title: "Tao CV moi",
    description: "Bat dau tu thu vien mau va chuyen thang sang trinh chinh sua.",
    href: "/candidate/templates",
    icon: "note_add",
  },
  {
    title: "Quan ly CV",
    description: "Xem danh sach CV da luu, dat CV mac dinh va tai them file.",
    href: "/candidate/cv-builder",
    icon: "description",
  },
  {
    title: "Tim viec lam",
    description: "Kham pha tin tuyen dung cong khai va cac vi tri phu hop.",
    href: "/jobs",
    icon: "travel_explore",
  },
];

const STAT_ITEMS = [
  {
    key: "totalApplied",
    label: "Don da nop",
    icon: "send",
    toneClassName: "bg-sky-50 text-sky-700",
  },
  {
    key: "profileViews",
    label: "Luot xem ho so",
    icon: "visibility",
    toneClassName: "bg-violet-50 text-violet-700",
  },
  {
    key: "interviews",
    label: "Phong van",
    icon: "calendar_month",
    toneClassName: "bg-amber-50 text-amber-700",
  },
  {
    key: "savedJobs",
    label: "Viec da luu",
    icon: "bookmark",
    toneClassName: "bg-emerald-50 text-emerald-700",
  },
] as const;

function formatRelativeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Vua cap nhat";
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
    [cvs, recentApplications],
  );

  const displayName = user?.full_name?.split(" ").filter(Boolean).at(-1) || "Ung vien";
  const completionPercentage = user?.completion_percentage || 0;

  if (error) {
    return (
      <PanelCard className="border-rose-200 bg-rose-50/90">
        <div className="mx-auto max-w-2xl py-8 text-center">
          <span className="material-symbols-outlined text-[44px] text-rose-400">error</span>
          <h2 className="mt-4 font-headline text-2xl font-extrabold text-rose-900">
            Khong the tai tong quan ung vien
          </h2>
          <p className="mt-3 text-base font-medium leading-7 text-rose-700">{error}</p>
        </div>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PanelCard
        className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.1),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
        contentClassName="px-6 py-6 sm:px-7 sm:py-7"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
              Candidate workspace
            </p>
            <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.6rem]">
              Chao {displayName}, hom nay ban co {notificationCount} thong bao moi.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
              Theo doi ho so, CV va cac co hoi phu hop trong mot bang dieu khien sang, gon
              gang va thong nhat voi khu CV ban dang dung.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <ActionButton
                href="/candidate/profile"
                variant="primary"
                icon={<span className="material-symbols-outlined text-[18px]">person_edit</span>}
              >
                Cap nhat ho so
              </ActionButton>
              <ActionButton
                href="/candidate/cv-builder"
                variant="secondary"
                icon={<span className="material-symbols-outlined text-[18px]">description</span>}
              >
                Quan ly CV
              </ActionButton>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-white/92 p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                  Muc hoan thien ho so
                </p>
                <p className="mt-3 font-headline text-5xl font-extrabold tracking-tight text-slate-950">
                  {completionPercentage}%
                </p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-primary">
                <span className="material-symbols-outlined text-[28px]">verified_user</span>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Tin hieu nhanh
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {completionPercentage >= 80
                    ? "Ho so cua ban da du manh de noi bat hon trong khu vuc tuyen dung."
                    : "Bo sung ho so ca nhan va CV de cai thien ty le duoc nha tuyen dung chu y."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={`${cvs.length} CV da luu`} tone="primary" />
                <StatusBadge label={`${stats.savedJobs} viec da luu`} tone="success" />
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      <section className="grid gap-4 lg:grid-cols-4">
        {STAT_ITEMS.map((item) => (
          <DashboardCard
            key={item.key}
            label={item.label}
            value={isLoading ? "--" : stats[item.key]}
            toneClassName={item.toneClassName}
            icon={<span className="material-symbols-outlined text-[21px]">{item.icon}</span>}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <PanelCard
          eyebrow="Hoat dong gan day"
          title="Nhung dieu dang can ban chu y"
          description="Tiep tuc tu dung muc can xu ly tiep theo trong hanh trinh ung tuyen."
          actions={
            <ActionButton href="/candidate/jobs/applied" size="sm" variant="secondary">
              Xem tat ca
            </ActionButton>
          }
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-[22px] bg-slate-100" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-[28px]">history</span>}
              title="Chua co hoat dong nao gan day"
              description="Hay cap nhat ho so, tao CV hoac ung tuyen viec lam de bat dau hanh trinh cua ban."
            />
          ) : (
            <div className="space-y-3">
              {activityItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4 transition-all duration-200 hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.25)]">
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{item.subtitle}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    {formatRelativeDate(item.timestamp)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          eyebrow="Tac vu nhanh"
          title="Quay lai dung cho can xu ly"
          description="Tat ca shortcut quan trong cho profile, CV va tim viec deu dung chung mot he giao dien."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[22px] border border-slate-200 bg-slate-50/75 px-4 py-4 transition-all duration-200 hover:border-sky-200 hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.25)] transition-colors group-hover:text-primary">
                    <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900">{action.title}</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Goi y cong viec"
        title="De xuat phu hop cho ho so hien tai"
        description="Cung mot ngon ngu thiet ke, nhung van giu nguyen danh sach viec duoc ca nhan hoa."
      >
        <RecommendedJobs jobs={recommendedJobs} loading={isLoading} />
      </PanelCard>
    </div>
  );
}
