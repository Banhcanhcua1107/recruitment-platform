export type JobStatus = "open" | "closed" | "draft";

export type RecruitmentPipelineStatus =
  | "new"
  | "applied"
  | "reviewing"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export type LegacyApplicationStatus =
  | "pending"
  | "viewed"
  | "interviewing"
  | "offered"
  | "rejected";

export type AnyApplicationStatus =
  | RecruitmentPipelineStatus
  | LegacyApplicationStatus;

export interface RecruitmentDashboardStats {
  totalJobs: number;
  totalCandidates: number;
  candidatesToday: number;
}

export interface RecruitmentTrendPoint {
  date: string;
  label: string;
  applications: number;
}

export interface RecruitmentPipelineMetric {
  status: RecruitmentPipelineStatus;
  label: string;
  count: number;
}

export interface RecruitmentJob {
  id: string;
  title: string;
  companyName: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  status: JobStatus;
  description: string | null;
  benefits: string[];
  industry: string[];
  experienceLevel: string | null;
  level: string | null;
  employmentType: string | null;
  deadline: string | null;
  educationLevel: string | null;
  ageRange: string | null;
  fullAddress: string | null;
  sourceUrl: string | null;
  postedDate: string | null;
  salary: string | null;
  requirements: string[];
  postedAt: string | null;
  createdAt: string | null;
  candidateCount: number;
  isPublicVisible: boolean;
}

export interface RecruitmentCompanyProfile {
  companyName: string;
  email: string;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  industry: string[];
  companySize: string | null;
  description: string | null;
}

export interface RecruitmentCandidate {
  applicationId: string;
  candidateId: string;
  fullName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  coverLetter?: string | null;
  appliedPosition: string;
  status: RecruitmentPipelineStatus;
  rawStatus: AnyApplicationStatus;
  appliedAt: string;
}

export interface RecruitmentActivityLog {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobFilters {
  q?: string;
  status?: "all" | JobStatus;
  page?: number;
  limit?: number;
}

export interface CandidateFilters {
  q?: string;
  position?: string;
  status?: "all" | RecruitmentPipelineStatus;
  page?: number;
  limit?: number;
}

export interface JobUpsertInput {
  title: string;
  location: string;
  status: JobStatus;
  description: string;
  requirements?: string[];
  salary?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  benefits?: string[];
  industry?: string[];
  experienceLevel?: string | null;
  level?: string | null;
  employmentType?: string | null;
  deadline?: string | null;
  educationLevel?: string | null;
  ageRange?: string | null;
  fullAddress?: string | null;
  sourceUrl?: string | null;
}
