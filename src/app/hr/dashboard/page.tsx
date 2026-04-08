import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  PanelCard,
} from "@/components/app-shell";
import { StatusBadge as RecruitmentStatusBadge } from "@/components/recruitment/StatusBadge";
import { RecruiterSavedCandidatesPanel } from "@/components/hr/RecruiterSavedCandidatesPanel";
import {
  getActivityLogs,
  getApplicationsTrend,
  getCompanyProfile,
  getDashboardStats,
  getJobPortfolioSummary,
  getJobs,
} from "@/lib/recruitment";
import { getEmployerCandidates, getEmployerPipelineMetrics } from "@/lib/applications";

const RecruitmentChart = dynamic(
  () => import("@/components/recruitment/RecruitmentChart").then((module) => module.RecruitmentChart),
  {
    loading: () => (
      <div className="rounded-4xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 h-6 w-56 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-65 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    ),
  },
);

export default async function HRDashboardPage() {
  const [stats, trend, pipeline, activityLogs, companyProfile, portfolioSummary, activeJobs, newCandidates] =
    await Promise.all([
      getDashboardStats(),
      getApplicationsTrend(),
      getEmployerPipelineMetrics(),
      getActivityLogs(6),
      getCompanyProfile(),
      getJobPortfolioSummary(),
      getJobs({ status: "open", page: 1, limit: 4 }),
      getEmployerCandidates({ page: 1, limit: 4, status: "all" }),
    ]);

  return (
    <div className="space-y-6 pb-8">
      <PanelCard
        className="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.1),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
        contentClassName="px-6 py-6 sm:px-7 sm:py-7"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
              Recruiter workspace
            </p>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.6rem]">
              Dieu phoi tuyen dung cho {companyProfile.companyName || "workspace cua ban"}
            </h1>
            <p className="max-w-3xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
              Cung mot he shell voi Candidate va CV, nhung giu nguyen dashboard van hanh,
              pipeline ATS va job control center danh cho recruiter.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton
              href="/hr/candidates"
              variant="secondary"
              icon={<span className="material-symbols-outlined text-[18px]">groups</span>}
            >
              Kho ung vien
            </ActionButton>
            <ActionButton
              href="/hr/jobs/create"
              variant="primary"
              icon={<span className="material-symbols-outlined text-[18px]">add_circle</span>}
            >
              Tao tin tuyen dung
            </ActionButton>
          </div>
        </div>
      </PanelCard>

      <section className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Tong tin tuyen dung"
          value={portfolioSummary.totalJobs}
          hint="Toan bo tin dang thuoc recruiter workspace hien tai"
          icon={<span className="material-symbols-outlined text-[21px]">work</span>}
        />
        <DashboardCard
          label="Tin dang tuyen"
          value={portfolioSummary.openJobs}
          hint="So job dang mo nhan ho so tren he thong"
          toneClassName="bg-emerald-50 text-emerald-700"
          icon={<span className="material-symbols-outlined text-[21px]">campaign</span>}
        />
        <DashboardCard
          label="Ung vien moi hom nay"
          value={stats.candidatesToday}
          hint="So ho so vua duoc ghi nhan trong ngay"
          toneClassName="bg-amber-50 text-amber-700"
          icon={<span className="material-symbols-outlined text-[21px]">person_add</span>}
        />
        <DashboardCard
          label="Tong luot ung tuyen"
          value={portfolioSummary.totalApplicants}
          hint="Tong so ho so da di qua cac tin trong workspace"
          toneClassName="bg-violet-50 text-violet-700"
          icon={<span className="material-symbols-outlined text-[21px]">monitoring</span>}
        />
      </section>

      <RecruitmentChart data={trend} />

      <PanelCard
        eyebrow="Pipeline ATS"
        title="Anh chup nhanh trang thai ung vien"
        description="Toan bo stage duoc giu nguyen logic, chi doi shell va card de dong bo voi dashboard moi."
        actions={
          <ActionButton href="/hr/candidates?view=pipeline" size="sm" variant="secondary">
            Mo ATS
          </ActionButton>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pipeline.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <RecruitmentStatusBadge status={item.status} />
                <span className="text-sm font-semibold text-slate-600">{item.label}</span>
              </div>
              <span className="font-headline text-3xl font-extrabold tracking-tight text-slate-950">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </PanelCard>

      <section className="grid gap-6 xl:grid-cols-3">
        <PanelCard
          eyebrow="Jobs dang tuyen"
          title="Nhung vi tri can recruiter theo sat"
          description="Danh sach job van giu nguyen route va action cu."
          actions={
            <ActionButton href="/hr/jobs?status=open" size="sm" variant="secondary">
              Xem tat ca
            </ActionButton>
          }
        >
          {activeJobs.items.length === 0 ? (
            <EmptyState
              title="Chua co tin dang mo"
              description="Hay tao mot tin tuyen dung moi de bat dau nguon ung vien."
            />
          ) : (
            <div className="space-y-3">
              {activeJobs.items.map((job) => (
                <Link
                  key={job.id}
                  href={`/hr/jobs/${job.id}`}
                  className="block rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-950">{job.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.location || "Linh hoat dia diem"}
                      </p>
                    </div>
                    <RecruitmentStatusBadge status={job.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{job.candidateCount} ho so</span>
                    <span>
                      {job.postedAt
                        ? new Date(job.postedAt).toLocaleDateString("vi-VN")
                        : "Chua dang"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          eyebrow="Ung vien moi"
          title="Ho so vua vao pipeline"
          description="Theo doi nhanh cac ung vien moi nhat trong ATS."
          actions={
            <ActionButton href="/hr/candidates?view=pipeline" size="sm" variant="secondary">
              Mo ATS
            </ActionButton>
          }
        >
          {newCandidates.items.length === 0 ? (
            <EmptyState
              title="Chua co ung vien moi"
              description="Pipeline hien chua co ho so moi duoc dua vao."
            />
          ) : (
            <div className="space-y-3">
              {newCandidates.items.map((candidate) => (
                <Link
                  key={candidate.applicationId}
                  href={
                    candidate.hasPublicProfile
                      ? `/candidate/${candidate.candidateId}?from=hr`
                      : `/hr/candidates?view=pipeline&q=${encodeURIComponent(candidate.candidateCode)}`
                  }
                  className="block rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-950">
                        {candidate.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{candidate.appliedPosition}</p>
                    </div>
                    <RecruitmentStatusBadge status={candidate.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{candidate.candidateCode}</span>
                    <span>{new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PanelCard>

        <div className="xl:col-span-1">
          <RecruiterSavedCandidatesPanel
            description="Nguon ho so cong khai ban da danh dau de quay lai lien he nhanh."
            limit={4}
          />
        </div>
      </section>

      <PanelCard
        eyebrow="Hoat dong gan day"
        title="Nhat ky thao tac recruiter workspace"
        description="Van la du lieu cu, nhung duoc dua vao panel giong ngon ngu thiet ke moi."
        actions={
          <ActionButton href="/hr/jobs" size="sm" variant="secondary">
            Quan ly tin tuyen dung
          </ActionButton>
        }
      >
        {activityLogs.length === 0 ? (
          <EmptyState
            title="Chua co hoat dong nao duoc ghi nhan"
            description="Dashboard se hien cac thao tac quan trong ngay khi recruiter bat dau xu ly."
          />
        ) : (
          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{log.action}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    Nguoi dung {log.userId}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-500">
                  {new Date(log.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
