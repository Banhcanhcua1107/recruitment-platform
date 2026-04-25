import RecommendedJobsClientPanel from "@/app/candidate/jobs/recommended/RecommendedJobsClientPanel";
import CandidateJobsTabs from "@/components/candidate/CandidateJobsTabs";
import {
  getLatestPublicJobSummaries,
  type PublicJobSummary,
} from "@/lib/public-job-summaries";
import type { Job as DashboardJob } from "@/types/dashboard";

function toDashboardJob(job: PublicJobSummary): DashboardJob {
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
  const publicJobs = await getLatestPublicJobSummaries(24);
  const jobs = publicJobs.map((job) => toDashboardJob(job));

  return (
    <div className="space-y-4">
      <CandidateJobsTabs activeTab="recommended" />
      <section className="rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] px-5 py-5 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)] sm:px-6">
        <p className="text-sm font-semibold leading-7 text-slate-500">
          Gợi ý việc làm tiếp tục dùng cùng nguồn dữ liệu và nút phân tích AI hiện có của candidate dashboard.
          Khi bạn làm mới phân tích, kết quả mới nhất cũng sẽ được dùng lại tại trang này.
        </p>
      </section>
      <section className="rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.26)] sm:p-6">
        <RecommendedJobsClientPanel jobs={jobs} />
      </section>
    </div>
  );
}
