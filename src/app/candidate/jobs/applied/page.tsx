import CandidateApplicationsPage from "@/components/candidate/CandidateApplicationsPage";
import CandidateJobsTabs from "@/components/candidate/CandidateJobsTabs";

export default function CandidateAppliedJobsPage() {
  return (
    <div className="space-y-5">
      <CandidateJobsTabs activeTab="applied" />
      <CandidateApplicationsPage />
    </div>
  );
}
