import { notFound } from "next/navigation";
import { PublicCandidateProfileView } from "@/components/recruitment/PublicCandidateProfileView";
import { getRecruiterCandidateProfile } from "@/lib/candidate-profiles";

interface HRCandidateProfilePageProps {
  params: Promise<{ candidateId: string }>;
}

export default async function HRCandidateProfilePage({
  params,
}: HRCandidateProfilePageProps) {
  const { candidateId } = await params;
  const candidate = await getRecruiterCandidateProfile(candidateId).catch(() => null);

  if (!candidate) {
    notFound();
  }

  return <PublicCandidateProfileView candidate={candidate} />;
}
