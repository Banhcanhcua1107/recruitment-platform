import CandidateJobsTabs from "@/components/candidate/CandidateJobsTabs";
import CandidateSavedJobsPanel from "@/components/candidate/CandidateSavedJobsPanel";
import { getCandidateSavedJobs } from "@/lib/candidate-workspace";

export default async function CandidateSavedJobsPage() {
  const savedJobs = await getCandidateSavedJobs();

  return (
    <div className="space-y-4">
      <CandidateJobsTabs activeTab="saved" />
      <CandidateSavedJobsPanel items={savedJobs} />
    </div>
  );
}
