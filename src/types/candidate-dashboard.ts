import type { Job } from "@/types/job";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";

export interface CandidateDashboardStats {
  totalApplied: number;
  profileViews: number;
  interviews: number;
  savedJobs: number;
}

export interface CandidateDashboardUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  completionPercentage: number;
}

export interface CandidateApplicationListItem {
  id: string;
  jobId: string;
  status: RecruitmentPipelineStatus;
  appliedAt: string;
  createdAt: string;
  updatedAt?: string;
  job: {
    id: string;
    title: string;
    companyName: string;
    logoUrl?: string | null;
    salary?: string | null;
    location?: string | null;
  };
}

export interface CandidateResumeListItem {
  id: string;
  title: string;
  updatedAt: string;
  url: string;
}

export interface CandidateDashboardData {
  user: CandidateDashboardUser | null;
  stats: CandidateDashboardStats;
  notificationCount: number;
  recentApplications: CandidateApplicationListItem[];
  recommendedJobs: Job[];
  cvs: CandidateResumeListItem[];
}
