import { CandidateTable } from "@/components/recruitment/CandidateTable";
import { PublicCandidateSearch } from "@/components/recruitment/PublicCandidateSearch";
import { RecruiterWorkspaceTabs } from "@/components/hr/RecruiterWorkspaceTabs";
import { DashboardStatsCard } from "@/components/recruitment/DashboardStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getEmployerCandidates, getEmployerPipelineMetrics } from "@/lib/applications";
import { getJobPositionOptions } from "@/lib/recruitment";

interface CandidatesPageProps {
  searchParams: Promise<{
    view?: string;
    q?: string;
    position?: string;
    status?: string;
    page?: string;
    applicationId?: string;
  }>;
}

export default async function HRCandidatesPage({
  searchParams,
}: CandidatesPageProps) {
  const params = await searchParams;
  const view = params.view === "pipeline" ? "pipeline" : "marketplace";
  const q = params.q ?? "";
  const position = params.position ?? "";
  const status = params.status ?? "all";
  const page = params.page ?? "1";
  const applicationId = params.applicationId?.trim() ?? "";

  const [candidates, positions, pipeline] = await Promise.all([
    getEmployerCandidates({
      q,
      position,
      status: status as
        | "all"
        | "applied"
        | "reviewing"
        | "interview"
        | "offer"
        | "hired"
        | "rejected",
      page: Number(page),
      limit: 8,
    }),
    getJobPositionOptions(),
    getEmployerPipelineMetrics(),
  ]);

  const interviewCount =
    pipeline.find((item) => item.status === "interview")?.count ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/90 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.28)]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Candidate operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Kho ứng viên cho cả tìm kiếm chủ động và xử lý ATS
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
            Chuyển nhanh giữa nguồn hồ sơ công khai để tìm kiếm chủ động và pipeline ATS để xử lý
            các đơn ứng tuyển hiện có trong recruiter workspace.
          </p>
        </div>
      </section>

      <section className="grid auto-rows-fr gap-4 md:grid-cols-3">
        <DashboardStatsCard
          title="Ứng viên trong ATS"
          value={candidates.total}
          subtitle="Tổng hồ sơ đang đi qua pipeline tuyển dụng hiện tại"
          icon="groups"
        />
        <DashboardStatsCard
          title="Vị trí đang theo dõi"
          value={positions.length}
          subtitle="Số title job recruiter đang dùng để lọc và quản lý hồ sơ"
          icon="work_history"
        />
        <DashboardStatsCard
          title="Đang phỏng vấn"
          value={interviewCount}
          subtitle="Nhóm ứng viên đang ở vòng phỏng vấn trong pipeline ATS"
          icon="event_available"
        />
      </section>

      <RecruiterWorkspaceTabs
        activeId={view}
        items={[
          {
            id: "marketplace",
            label: "Kho công khai",
            href: "/hr/candidates?view=marketplace",
          },
          {
            id: "pipeline",
            label: "Pipeline ATS",
            href: "/hr/candidates?view=pipeline",
            count: candidates.total,
          },
        ]}
      />

      {view === "pipeline" ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200/85 bg-white/95 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.2)]">
            <CardHeader className="border-b border-slate-200/80">
              <CardTitle>Bộ lọc ATS</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_1fr_240px_auto]">
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Tìm theo mã ứng viên, tên, email hoặc số điện thoại"
                />

                <Select name="position" defaultValue={position}>
                  <option value="">Tất cả vị trí</option>
                  {positions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>

                <Select name="status" defaultValue={status}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="applied">Đã nộp</option>
                  <option value="reviewing">Đang xử lý</option>
                  <option value="interview">Phỏng vấn</option>
                  <option value="offer">Đề nghị</option>
                  <option value="hired">Đã tuyển</option>
                  <option value="rejected">Từ chối</option>
                </Select>

                <button
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:border-primary/30 hover:bg-slate-50 active:translate-y-0"
                  type="submit"
                >
                  Áp dụng
                </button>
              </form>
            </CardContent>
          </Card>

          <CandidateTable
            data={candidates}
            focusApplicationId={applicationId || undefined}
            query={{
              view,
              q: q || undefined,
              position: position || undefined,
              status: status === "all" ? undefined : status,
            }}
          />
        </div>
      ) : (
        <PublicCandidateSearch />
      )}
    </div>
  );
}
