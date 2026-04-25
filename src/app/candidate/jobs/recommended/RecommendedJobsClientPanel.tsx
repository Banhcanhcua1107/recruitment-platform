"use client";

import dynamic from "next/dynamic";
import type { Job as DashboardJob } from "@/types/dashboard";

function RecommendedJobsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    </div>
  );
}

const RecommendedJobs = dynamic(
  () => import("@/app/candidate/dashboard/components/RecommendedJobs"),
  {
    ssr: false,
    loading: () => <RecommendedJobsLoading />,
  }
);

export default function RecommendedJobsClientPanel({
  jobs,
}: {
  jobs: DashboardJob[];
}) {
  return <RecommendedJobs jobs={jobs} />;
}
