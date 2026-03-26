export type CandidateProfileVisibility = "public" | "private";

export interface CandidateWorkExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface CandidateEducation {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CandidateProfileInput {
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  email: string;
  phone: string;
  location: string;
  introduction: string;
  skills: string[];
  workExperiences: CandidateWorkExperience[];
  educations: CandidateEducation[];
  workExperience: string;
  education: string;
  profileVisibility: CandidateProfileVisibility;
}

export interface CandidateProfileRecord extends CandidateProfileInput {
  id: string;
  userId: string;
  document?: unknown | null;
  cvFilePath: string | null;
  cvUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileCvUploadResult {
  cvUrl: string;
  fileName: string;
  filePath: string;
}

export interface CandidateProfileAvatarUploadResult {
  avatarUrl: string;
}

export interface PublicCandidateSearchFilters {
  name?: string;
  skills?: string;
  headline?: string;
  experience?: string;
  keywords?: string;
}

export interface PublicCandidateSearchResult {
  candidateId: string;
  document?: unknown | null;
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  location: string;
  email: string | null;
  phone: string | null;
  introduction: string;
  skills: string[];
  workExperiences: CandidateWorkExperience[];
  educations: CandidateEducation[];
  workExperience: string;
  education: string;
  cvUrl: string | null;
  updatedAt: string;
}
