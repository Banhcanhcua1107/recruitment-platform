import Link from "next/link";
import { getEmployerCandidates, getEmployerPipelineMetrics } from "@/lib/applications";
import { DashboardStatsCard } from "@/components/recruitment/DashboardStatsCard";
import { RecruitmentChart } from "@/components/recruitment/RecruitmentChart";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { RecruiterSavedCandidatesPanel } from "@/components/hr/RecruiterSavedCandidatesPanel";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getActivityLogs,
  getApplicationsTrend,
  getCompanyProfile,
  getDashboardStats,
  getJobPortfolioSummary,
  getJobs,
} from "@/lib/recruitment";

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
    <div className="space-y-6">
      <section className="rounded-4xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Recruitment command center
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Điều phối tuyển dụng cho {companyProfile.companyName || "workspace của bạn"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Theo dõi các KPI chính, job đang tuyển, hồ sơ mới và các hành động tiếp theo trong
              cùng một màn hình vận hành dành cho recruiter.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants("outline", "lg")} href="/hr/candidates">
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Kho ứng viên
            </Link>
            <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Tạo tin tuyển dụng
            </Link>
          </div>
        </div>
      </section>

      <section className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatsCard
          title="Tổng tin tuyển dụng"
          value={portfolioSummary.totalJobs}
          subtitle="Toàn bộ tin đang thuộc recruiter workspace hiện tại"
          icon="work"
        />
        <DashboardStatsCard
          title="Tin đang tuyển"
          value={portfolioSummary.openJobs}
          subtitle="Số job đang mở nhận hồ sơ trên hệ thống"
          icon="campaign"
        />
        <DashboardStatsCard
          title="Ứng viên mới hôm nay"
          value={stats.candidatesToday}
          subtitle="Số hồ sơ vừa được ghi nhận trong ngày"
          icon="person_add"
        />
        <DashboardStatsCard
          title="Tổng lượt ứng tuyển"
          value={portfolioSummary.totalApplicants}
          subtitle="Tổng số hồ sơ đã đi qua các tin trong workspace"
          icon="monitoring"
        />
      </section>

      <section>
        <RecruitmentChart data={trend} />
      </section>

      <section>
        <Card className="rounded-4xl border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Pipeline ứng tuyển</CardTitle>
              <CardDescription>
                Ảnh chụp nhanh toàn bộ trạng thái xử lý ứng viên trong ATS.
              </CardDescription>
            </div>
            <Link className={buttonVariants("outline", "sm")} href="/hr/candidates?view=pipeline">
              Mở ATS
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pipeline.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-medium text-slate-600">{item.label}</span>
                </div>
                <span className="text-2xl font-black text-slate-900">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-4xl border-slate-200/80 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Job đang tuyển</CardTitle>
              <CardDescription>
                Các vị trí cần recruiter theo dõi sát trong hôm nay.
              </CardDescription>
            </div>
            <Link className={buttonVariants("outline", "sm")} href="/hr/jobs?status=open">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeJobs.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Chưa có tin đang mở. Hãy tạo một tin tuyển dụng mới để bắt đầu nguồn ứng viên.
              </div>
            ) : (
              activeJobs.items.map((job) => (
                <Link
                  key={job.id}
                  href={`/hr/jobs/${job.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{job.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.location || "Linh hoạt địa điểm"}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{job.candidateCount} hồ sơ</span>
                    <span>
                      {job.postedAt
                        ? new Date(job.postedAt).toLocaleDateString("vi-VN")
                        : "Chưa đăng"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-4xl border-slate-200/80 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Ứng viên mới</CardTitle>
              <CardDescription>
                Các hồ sơ vừa đi vào pipeline tuyển dụng của recruiter.
              </CardDescription>
            </div>
            <Link className={buttonVariants("outline", "sm")} href="/hr/candidates?view=pipeline">
              Mở ATS
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {newCandidates.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Chưa có ứng viên mới trong pipeline.
              </div>
            ) : (
              newCandidates.items.map((candidate) => (
                <Link
                  key={candidate.applicationId}
                  href={
                    candidate.hasPublicProfile
                      ? `/candidate/${candidate.candidateId}?from=hr`
                      : `/hr/candidates?view=pipeline&q=${encodeURIComponent(candidate.candidateCode)}`
                  }
                  className="block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">
                        {candidate.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{candidate.appliedPosition}</p>
                    </div>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{candidate.candidateCode}</span>
                    <span>{new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="xl:col-span-1">
          <RecruiterSavedCandidatesPanel
            description="Nguồn hồ sơ công khai bạn đã đánh dấu để quay lại liên hệ nhanh."
            limit={4}
          />
        </div>
      </section>

      <section>
        <Card className="rounded-4xl border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Hoạt động gần đây</CardTitle>
              <CardDescription>
                Các thao tác quan trọng đã diễn ra trong recruiter workspace.
              </CardDescription>
            </div>
            <Link className={buttonVariants("outline", "sm")} href="/hr/jobs">
              Quản lý tin tuyển dụng
            </Link>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Chưa có hoạt động nào được ghi nhận.
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{log.action}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Người dùng {log.userId}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
