import Link from "next/link";
import { getEmployerPipelineMetrics } from "@/lib/applications";
import { DashboardStatsCard } from "@/components/recruitment/DashboardStatsCard";
import { RecruitmentChart } from "@/components/recruitment/RecruitmentChart";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActivityLogs, getApplicationsTrend, getDashboardStats } from "@/lib/recruitment";

export default async function HRDashboardPage() {
  const [stats, trend, pipeline, activityLogs] = await Promise.all([
    getDashboardStats(),
    getApplicationsTrend(),
    getEmployerPipelineMetrics(),
    getActivityLogs(6),
  ]);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Bảng điều khiển tuyển dụng
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
            Tổng quan tuyển dụng nhà tuyển dụng
          </h1>
          <p className="max-w-2xl text-base text-slate-500 lg:text-lg">
            Theo dõi số lượng tuyển dụng, biến động pipeline và hoạt động vận hành
            trên một màn hình tổng quan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className={buttonVariants("outline", "lg")} href="/hr/candidates">
            Xem ứng viên
          </Link>
          <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
            Tạo tin tuyển dụng
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <DashboardStatsCard
          title="Tổng số tin tuyển dụng"
          value={stats.totalJobs}
          subtitle="Số tin hiện đang thuộc tài khoản nhà tuyển dụng của bạn"
          icon="work"
        />
        <DashboardStatsCard
          title="Tổng số ứng viên"
          value={stats.totalCandidates}
          subtitle="Số ứng viên duy nhất trong toàn bộ pipeline tuyển dụng"
          icon="groups"
        />
        <DashboardStatsCard
          title="Ứng viên hôm nay"
          value={stats.candidatesToday}
          subtitle="Số hồ sơ mới được ghi nhận trong ngày hiện tại"
          icon="today"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <RecruitmentChart data={trend} />

        <Card className="rounded-[32px] border-slate-200/80">
          <CardHeader>
            <CardTitle>Pipeline ứng tuyển</CardTitle>
            <CardDescription>
              Phân bố trạng thái trong quy trình tuyển dụng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-medium text-slate-600">
                    {item.label}
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {item.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[32px] border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Nhật ký hoạt động</CardTitle>
              <CardDescription>
                Lưu lại các thao tác xem hồ sơ, phỏng vấn, tuyển dụng và vòng đời tin tuyển dụng.
              </CardDescription>
            </div>
            <Link className={buttonVariants("outline", "sm")} href="/hr/candidates">
              Mở danh sách ứng viên
            </Link>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Chưa có hoạt động nào được ghi nhận.
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{log.action}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Người dùng {log.userId}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" disabled>
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </Button>
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
