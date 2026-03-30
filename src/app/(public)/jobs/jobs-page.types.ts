import type { Job } from "@/types/job";

export type SortKey = "newest" | "az" | "salary-high" | "salary-low";

export interface JobsPageFilters {
  q: string;
  selectedLocation: string;
  selectedLevels: string[];
  selectedTypes: string[];
  selectedIndustries: string[];
  salaryMin: string;
  salaryMax: string;
  hideUnknownSalary: boolean;
  sort: SortKey;
  onlyMyCompanyJobs: boolean;
  employerCompanyName: string;
}

export interface RecommendedJobItem {
  jobId: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  job: Job;
}

export interface RecommendedJobsPayload {
  items?: unknown;
  candidateSummary?: unknown;
  suggestedRoles?: unknown;
  suggestedCompanies?: unknown;
}

export interface ResolvedRecommendedJobsData {
  source: "api" | "local";
  items: RecommendedJobItem[];
  candidateSummary: string;
  suggestedRoles: string[];
  suggestedCompanies: string[];
}
