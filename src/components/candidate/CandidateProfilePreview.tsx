import { buildPublicProfileViewModel } from "@/lib/candidate-profile-document";
import type { CandidateWorkExperience } from "@/types/candidate-profile";
import { CandidateProfilePresentation } from "@/components/recruitment/CandidateProfilePresentation";
import type { ProfileDocument } from "@/app/candidate/profile/types/profile";

type CandidateProfilePreviewProps = {
  document: ProfileDocument;
  avatarUrl?: string | null;
  headline?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  cvUrl?: string | null;
  updatedAt?: string | null;
  workExperiences?: CandidateWorkExperience[] | null;
};

export default function CandidateProfilePreview({
  document,
  avatarUrl,
  headline,
  fullName,
  email,
  phone,
  location,
  cvUrl,
  updatedAt,
  workExperiences,
}: CandidateProfilePreviewProps) {
  const viewModel = buildPublicProfileViewModel({
    document,
    avatarUrl,
    headline,
    fullName,
    email,
    phone,
    location,
    cvUrl,
    updatedAt,
    workExperiences,
  });

  return <CandidateProfilePresentation viewModel={viewModel} />;
}
