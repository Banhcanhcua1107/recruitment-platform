import type { Job } from "@/types/job";
import type {
  JobsPageFilters,
  RecommendedJobItem,
  RecommendedJobsPayload,
  ResolvedRecommendedJobsData,
  SortKey,
} from "./jobs-page.types";

export const PAGE_SIZE = 12;

export const SUGGESTION_CHIPS = [
  "Remote",
  "Marketing",
  "IT Software",
  "Ngân hàng",
  "Kế toán",
  "Bán hàng",
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "relevance", label: "Phù hợp nhất" },
  { value: "az", label: "A → Z" },
  { value: "salary-high", label: "Lương cao → thấp" },
  { value: "salary-low", label: "Lương thấp → cao" },
];

export const RECOMMENDATION_CACHE_KEY = "rec_jobs_cache";

export function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function parseSalary(value: string): { min: number; max: number } | null {
  if (!value) return null;
  if (/cạnh tranh|thỏa thuận|thương lượng/i.test(value)) return null;

  const numbers = [...value.matchAll(/([\d]+[,.]?[\d]*)/g)].map((match) =>
    Number.parseFloat(match[1].replace(",", ".")),
  );

  if (numbers.length === 0) return null;

  if (numbers.length === 1) {
    if (/trên/i.test(value)) return { min: numbers[0], max: Number.POSITIVE_INFINITY };
    if (/dưới/i.test(value)) return { min: 0, max: numbers[0] };
    return { min: numbers[0], max: numbers[0] };
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

export function uniqueValues(jobs: Job[], key: keyof Job): string[] {
  const values = new Set<string>();

  for (const job of jobs) {
    const value = job[key];
    if (typeof value === "string" && value) {
      values.add(value);
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b, "vi"));
}

export function uniqueIndustries(jobs: Job[]): string[] {
  const values = new Set<string>();

  for (const job of jobs) {
    for (const industry of job.industry ?? []) {
      if (industry) {
        values.add(industry);
      }
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b, "vi"));
}

export function filterJobs(jobs: Job[], filters: JobsPageFilters): Job[] {
  const {
    q,
    selectedLocation,
    selectedLevels,
    selectedTypes,
    selectedIndustries,
    salaryMin,
    salaryMax,
    hideUnknownSalary,
    sort,
    onlyMyCompanyJobs,
    employerCompanyName,
  } = filters;

  let nextJobs = [...jobs];

  if (q) {
    const query = normalize(q);
    nextJobs = nextJobs.filter(
      (job) =>
        normalize(job.title).includes(query) ||
        normalize(job.company_name).includes(query) ||
        normalize(job.location).includes(query) ||
        (job.industry ?? []).some((industry) => normalize(industry).includes(query)),
    );
  }

  if (selectedLocation) {
    nextJobs = nextJobs.filter((job) => job.location === selectedLocation);
  }

  if (selectedLevels.length > 0) {
    nextJobs = nextJobs.filter((job) => Boolean(job.level) && selectedLevels.includes(job.level));
  }

  if (selectedTypes.length > 0) {
    nextJobs = nextJobs.filter(
      (job) => Boolean(job.employment_type) && selectedTypes.includes(job.employment_type),
    );
  }

  if (selectedIndustries.length > 0) {
    nextJobs = nextJobs.filter((job) =>
      (job.industry ?? []).some((industry) => selectedIndustries.includes(industry)),
    );
  }

  if (onlyMyCompanyJobs && employerCompanyName) {
    nextJobs = nextJobs.filter(
      (job) => normalize(job.company_name) === normalize(employerCompanyName),
    );
  }

  const minSalary = salaryMin ? Number.parseFloat(salaryMin) : null;
  const maxSalary = salaryMax ? Number.parseFloat(salaryMax) : null;

  if (minSalary !== null || maxSalary !== null || hideUnknownSalary) {
    nextJobs = nextJobs.filter((job) => {
      const salary = parseSalary(job.salary);
      if (!salary) return !hideUnknownSalary;
      if (minSalary !== null && salary.max < minSalary) return false;
      if (maxSalary !== null && salary.min > maxSalary) return false;
      return true;
    });
  }

  if (sort === "az") {
    nextJobs.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  } else if (sort === "relevance" && q) {
    const query = normalize(q);
    nextJobs.sort((a, b) => {
      const scoreA =
        (normalize(a.title).includes(query) ? 4 : 0) +
        (normalize(a.company_name).includes(query) ? 2 : 0) +
        (normalize(a.location).includes(query) ? 1 : 0) +
        ((a.industry ?? []).some((industry) => normalize(industry).includes(query)) ? 2 : 0);
      const scoreB =
        (normalize(b.title).includes(query) ? 4 : 0) +
        (normalize(b.company_name).includes(query) ? 2 : 0) +
        (normalize(b.location).includes(query) ? 1 : 0) +
        ((b.industry ?? []).some((industry) => normalize(industry).includes(query)) ? 2 : 0);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      return normalize(b.posted_date).localeCompare(normalize(a.posted_date));
    });
  } else if (sort === "salary-high" || sort === "salary-low") {
    nextJobs.sort((a, b) => {
      const salaryA = parseSalary(a.salary);
      const salaryB = parseSalary(b.salary);
      const valueA = salaryA
        ? salaryA.max === Number.POSITIVE_INFINITY
          ? salaryA.min
          : (salaryA.min + salaryA.max) / 2
        : -1;
      const valueB = salaryB
        ? salaryB.max === Number.POSITIVE_INFINITY
          ? salaryB.min
          : (salaryB.min + salaryB.max) / 2
        : -1;

      return sort === "salary-high" ? valueB - valueA : valueA - valueB;
    });
  }

  return nextJobs;
}

export function paginateJobs<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toSafeString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return String(value);
}

function toSafeOptionalString(value: unknown): string | null {
  const normalized = toSafeString(value, "").trim();
  return normalized ? normalized : null;
}

function normalizeMatchScore(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeFitLevel(value: unknown, score: number): "High" | "Medium" | "Low" {
  const normalized = toSafeString(value).trim().toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";

  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function normalizeJobLike(value: unknown, fallbackJobId: string): Job | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const job = value as Partial<Job>;
  const id = toSafeString(job.id, fallbackJobId).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    title: toSafeString(job.title, "Cơ hội việc làm"),
    company_name: toSafeString(job.company_name, "Doanh nghiệp"),
    logo_url: toSafeString(job.logo_url),
    cover_url: toSafeString(job.cover_url),
    salary: toSafeString(job.salary, "Thỏa thuận"),
    location: toSafeString(job.location, "Toàn quốc"),
    posted_date: toSafeString(job.posted_date),
    source_url: toSafeString(job.source_url),
    description: normalizeStringList(job.description),
    requirements: normalizeStringList(job.requirements),
    benefits: normalizeStringList(job.benefits),
    industry: normalizeStringList(job.industry),
    experience_level: toSafeOptionalString(job.experience_level),
    level: toSafeString(job.level),
    employment_type: toSafeString(job.employment_type),
    deadline: toSafeString(job.deadline),
    education_level: toSafeString(job.education_level),
    age_range: toSafeString(job.age_range),
    full_address: toSafeString(job.full_address),
    employer_id: toSafeOptionalString(job.employer_id),
  };
}

function normalizeRecommendationItem(value: unknown): RecommendedJobItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<RecommendedJobItem> & Record<string, unknown>;
  const jobId =
    typeof item.jobId === "string"
      ? item.jobId
      : typeof item.job_id === "string"
        ? item.job_id
        : typeof item.job === "object" && item.job && typeof (item.job as { id?: unknown }).id === "string"
          ? ((item.job as { id: string }).id)
          : "";

  if (!jobId) {
    return null;
  }

  const matchScore = normalizeMatchScore(item.matchScore ?? item.score);
  const fitLevel = normalizeFitLevel(item.fitLevel, matchScore);
  const normalizedJob = normalizeJobLike(item.job, jobId);

  const fallbackJob =
    normalizedJob ||
    normalizeJobLike(
      {
        id: jobId,
        title: item.jobTitle,
        company_name: item.companyName,
      },
      jobId,
    );

  if (!fallbackJob) {
    return null;
  }

  return {
    jobId,
    matchScore,
    fitLevel,
    reasons: normalizeStringList(item.reasons),
    matchedSkills: normalizeStringList(item.matchedSkills),
    missingSkills: normalizeStringList(item.missingSkills),
    job: fallbackJob,
  };
}

function normalizeRecommendedJobsPayload(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const payload = value as RecommendedJobsPayload;
  const items = Array.isArray(payload.items)
    ? payload.items.map(normalizeRecommendationItem).filter(Boolean)
    : [];

  if (items.length === 0) {
    return null;
  }

  return {
    items: items as RecommendedJobItem[],
    candidateSummary:
      typeof payload.candidateSummary === "string" ? payload.candidateSummary : "",
    suggestedRoles: normalizeStringList(payload.suggestedRoles),
    suggestedCompanies: normalizeStringList(payload.suggestedCompanies),
  };
}

export function resolveRecommendedJobsData({
  apiPayload,
  localPayload,
  allowLocalFallback = true,
}: {
  apiPayload: unknown;
  localPayload: unknown;
  allowLocalFallback?: boolean;
}): ResolvedRecommendedJobsData | null {
  const apiData = normalizeRecommendedJobsPayload(apiPayload);
  if (apiData) {
    return {
      source: "api",
      ...apiData,
    };
  }

  const localData = allowLocalFallback
    ? normalizeRecommendedJobsPayload(localPayload)
    : null;
  if (localData) {
    return {
      source: "local",
      ...localData,
    };
  }

  return null;
}
