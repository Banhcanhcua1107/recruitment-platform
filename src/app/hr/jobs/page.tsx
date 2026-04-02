import Link from "next/link";
import { JobTable } from "@/components/recruitment/JobTable";
import { JobDetailsPanel } from "@/components/recruitment/JobDetailsPanel";
import { RecruiterWorkspaceTabs } from "@/components/hr/RecruiterWorkspaceTabs";
import { DashboardStatsCard } from "@/components/recruitment/DashboardStatsCard";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getJobById, getJobPortfolioSummary, getJobs } from "@/lib/recruitment";

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    view?: string;
  }>;
}

export default async function HRJobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const page = params.page ?? "1";
  const view = params.view ?? "";

  const [jobs, portfolioSummary, selectedJob] = await Promise.all([
    getJobs({
      q,
      status: status as "all" | "open" | "closed" | "draft",
      page: Number(page),
      limit: 8,
    }),
    getJobPortfolioSummary(),
    view ? getJobById(view) : Promise.resolve(null),
  ]);

  const tableQuery = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    page: page === "1" ? undefined : page,
    view: selectedJob?.id ?? undefined,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/90 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Job operations
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Quản lý danh mục tin tuyển dụng của recruiter
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Theo dõi bản nháp, tin đã đăng, tin đã đóng và số lượng ứng viên cho từng vị trí
              trong một bảng vận hành dễ quét.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Tổng ứng viên
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {portfolioSummary.totalApplicants}
              </p>
            </div>
            <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Tạo tin mới
            </Link>
          </div>
        </div>
      </section>

      <section className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatsCard
          title="Tổng tin"
          value={portfolioSummary.totalJobs}
          subtitle="Toàn bộ tin trong recruiter workspace"
          icon="work"
        />
        <DashboardStatsCard
          title="Đã đăng"
          value={portfolioSummary.openJobs}
          subtitle="Các vị trí đang nhận hồ sơ ứng tuyển"
          icon="campaign"
        />
        <DashboardStatsCard
          title="Bản nháp"
          value={portfolioSummary.draftJobs}
          subtitle="Tin đang được chuẩn bị trước khi public"
          icon="edit_note"
        />
        <DashboardStatsCard
          title="Đã đóng"
          value={portfolioSummary.closedJobs}
          subtitle="Tin đã ngừng nhận hồ sơ và cần lưu trữ"
          icon="inventory_2"
        />
      </section>

      <RecruiterWorkspaceTabs
        activeId={status === "all" ? "all" : status}
        items={[
          { id: "all", label: "Tất cả", href: "/hr/jobs", count: portfolioSummary.totalJobs },
          { id: "open", label: "Đã đăng", href: "/hr/jobs?status=open", count: portfolioSummary.openJobs },
          { id: "draft", label: "Bản nháp", href: "/hr/jobs?status=draft", count: portfolioSummary.draftJobs },
          { id: "closed", label: "Đã đóng", href: "/hr/jobs?status=closed", count: portfolioSummary.closedJobs },
        ]}
      />

      <Card className="rounded-3xl border-slate-200/85 bg-white/95 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.2)]">
        <CardHeader>
          <CardTitle>Bộ lọc danh mục tin</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,2fr)_220px_auto]">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tiêu đề, địa điểm hoặc mô tả"
            />
            <Select name="status" defaultValue={status}>
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Đã đăng</option>
              <option value="draft">Bản nháp</option>
              <option value="closed">Đã đóng</option>
            </Select>
            <button className={buttonVariants("outline", "default")} type="submit">
              Áp dụng
            </button>
          </form>
        </CardContent>
      </Card>

      <JobTable
        data={jobs}
        query={tableQuery}
        selectedJobId={selectedJob?.id ?? null}
      />

      {selectedJob ? <JobDetailsPanel job={selectedJob} query={tableQuery} /> : null}
    </div>
  );
}
