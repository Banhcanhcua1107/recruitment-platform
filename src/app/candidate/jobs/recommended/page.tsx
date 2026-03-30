import RecommendedJobs from "@/app/candidate/dashboard/components/RecommendedJobs";
import CandidateJobsTabs from "@/components/candidate/CandidateJobsTabs";
import { getFreshPublicJobs } from "@/lib/jobs";
import type { Job as DashboardJob } from "@/types/dashboard";

function toDashboardJob(job: Awaited<ReturnType<typeof getFreshPublicJobs>>[number]): DashboardJob {
  return {
    id: job.id,
    title: job.title,
    company_name: job.company_name,
    logo_url: job.logo_url || undefined,
    location: job.location || undefined,
    salary: job.salary || undefined,
    requirements: job.requirements,
    posted_date: job.posted_date,
    created_at: undefined,
  };
}

export default async function CandidateRecommendedJobsPage() {
  const publicJobs = await getFreshPublicJobs();
  const jobs = publicJobs.map((job) => toDashboardJob(job));

  return (
    <div className="space-y-5">
      <CandidateJobsTabs activeTab="recommended" />
      <section className="rounded-[30px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)] sm:px-6">
        <p className="text-sm font-semibold leading-7 text-slate-500">
          Gợi ý việc làm tiếp tục dùng cùng nguồn dữ liệu và nút phân tích AI hiện có của candidate dashboard.
          Khi bạn làm mới phân tích, kết quả mới nhất cũng sẽ được dùng lại tại trang này.
        </p>
      </section>
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
        <RecommendedJobs jobs={jobs} />
      </section>
    </div>
  );
}
