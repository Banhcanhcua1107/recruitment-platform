import type { Job } from "@/types/job";

export type SortKey =
  | "newest"
  | "relevance"
  | "az"
  | "salary-high"
  | "salary-low";

export interface JobsQueryFilters {
  q: string;
  location: string;
  levels: string[];
  types: string[];
  industries: string[];
  company: string;
  sort: SortKey;
}

export interface JobsApiResponse {
  items: Job[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export interface JobCardMatchMeta {
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  badge: "Top match" | "Recommended";
  matchedSkills: string[];
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
