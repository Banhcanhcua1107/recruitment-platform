import "server-only";

import { unstable_cache } from "next/cache";
import type { Job } from "@/types/job";
import { createAdminClient } from "@/utils/supabase/admin";

const PUBLIC_JOB_LIST_COLUMNS = [
  "id",
  "title",
  "company_name",
  "logo_url",
  "cover_url",
  "salary",
  "location",
  "posted_date",
  "source_url",
  "description",
  "requirements",
  "benefits",
  "industry",
  "experience_level",
  "level",
  "employment_type",
  "deadline",
  "education_level",
  "age_range",
  "full_address",
  "employer_id",
].join(", ");

const PUBLIC_JOB_LIST_MAX_LIMIT = 50;
const PUBLIC_JOB_SEARCH_SCAN_CHUNK = 200;
const PUBLIC_JOB_SEARCH_MAX_SCAN_ROWS = 2000;

export type PublicJobsSort =
  | "newest"
  | "oldest"
  | "relevance"
  | "az"
  | "salary-high"
  | "salary-low";

export interface SearchPublicJobsParams {
  q?: string;
  location?: string;
  company?: string;
  page?: number;
  limit?: number;
  sort?: PublicJobsSort;
  levels?: string[];
  types?: string[];
  industries?: string[];
  salaryMin?: number;
  salaryMax?: number;
  hideUnknownSalary?: boolean;
}

export interface SearchPublicJobsResult {
  items: Job[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type EmployerProfile = {
  id: string;
  company_name: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

function normalizeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return String(value);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    const next = value.trim();
    return next || null;
  }

  if (value == null) {
    return null;
  }

  const next = String(value).trim();
  return next || null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toJob(row: Record<string, unknown>): Job {
  return {
    id: normalizeString(row.id),
    title: normalizeString(row.title),
    company_name: normalizeString(row.company_name, "Chưa cập nhật tên công ty"),
    logo_url: normalizeString(row.logo_url),
    cover_url: normalizeString(row.cover_url),
    salary: normalizeString(row.salary, "Thỏa thuận"),
    location: normalizeString(row.location, "Chưa cập nhật"),
    posted_date: normalizeString(row.posted_date),
    source_url: normalizeString(row.source_url),
    description: normalizeStringArray(row.description),
    requirements: normalizeStringArray(row.requirements),
    benefits: normalizeStringArray(row.benefits),
    industry: normalizeStringArray(row.industry),
    experience_level: normalizeString(row.experience_level) || null,
    level: normalizeString(row.level),
    employment_type: normalizeString(row.employment_type),
    deadline: normalizeString(row.deadline),
    education_level: normalizeString(row.education_level),
    age_range: normalizeString(row.age_range),
    full_address: normalizeString(row.full_address),
    employer_id: normalizeOptionalString(row.employer_id),
  };
}

async function getEmployerProfilesById(employerIds: string[]) {
  if (employerIds.length === 0) {
    return new Map<string, EmployerProfile>();
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("employers")
      .select("id, company_name, logo_url, cover_url")
      .in("id", employerIds);

    if (
      error &&
      error.message?.toLowerCase().includes('relation "employers" does not exist')
    ) {
      return new Map<string, EmployerProfile>();
    }

    if (error || !data) {
      return new Map<string, EmployerProfile>();
    }

    return new Map(
      data.map((row) => {
        const profile = row as EmployerProfile;
        return [profile.id, profile] as const;
      })
    );
  } catch {
    return new Map<string, EmployerProfile>();
  }
}

function applyEmployerBranding(job: Job, employerProfile?: EmployerProfile): Job {
  if (!employerProfile) {
    return job;
  }

  const companyName = normalizeOptionalString(employerProfile.company_name);
  const logoUrl = normalizeOptionalString(employerProfile.logo_url);
  const coverUrl = normalizeOptionalString(employerProfile.cover_url);

  return {
    ...job,
    company_name: companyName ?? job.company_name,
    logo_url: logoUrl ?? job.logo_url,
    cover_url: job.cover_url || coverUrl || "",
  };
}

function normalizeFilterValues(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function sanitizeLikeValue(value: string): string {
  return value.replace(/[%,_]/g, " ").trim();
}

function hasMissingColumnError(error: { message?: string } | null, columnName: string): boolean {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  const target = columnName.toLowerCase();
  return (
    message.includes(`column \"${target}\" does not exist`) ||
    message.includes(`column jobs.${target} does not exist`)
  );
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function parseSalaryRange(value: string): { min: number; max: number } | null {
  const salaryText = String(value ?? "").trim();
  if (!salaryText || /cạnh tranh|thỏa thuận|thuong luong|thương lượng/i.test(salaryText)) {
    return null;
  }

  const numbers = [...salaryText.matchAll(/([\d]+[,.]?[\d]*)/g)].map((match) =>
    Number.parseFloat(match[1].replace(",", ".")),
  );

  if (numbers.length === 0) {
    return null;
  }

  if (numbers.length === 1) {
    if (/trên|tren/i.test(salaryText)) {
      return { min: numbers[0], max: Number.POSITIVE_INFINITY };
    }

    if (/dưới|duoi/i.test(salaryText)) {
      return { min: 0, max: numbers[0] };
    }

    return { min: numbers[0], max: numbers[0] };
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function salarySortValue(job: Job): number {
  const salary = parseSalaryRange(job.salary);
  if (!salary) {
    return -1;
  }

  if (salary.max === Number.POSITIVE_INFINITY) {
    return salary.min;
  }

  return (salary.min + salary.max) / 2;
}

function matchesKeyword(job: Job, q: string): boolean {
  const query = normalizeSearchText(q);
  if (!query) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      job.title,
      job.company_name,
      job.location,
      job.level,
      job.employment_type,
      job.experience_level,
      ...job.industry,
      ...job.requirements,
      ...job.description,
      ...job.benefits,
    ].join(" "),
  );

  if (haystack.includes(query)) {
    return true;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }

  return tokens.every((token) => haystack.includes(token));
}

function matchesAnyIndustry(job: Job, selectedIndustries: string[]): boolean {
  if (selectedIndustries.length === 0) {
    return true;
  }

  const normalizedIndustries = job.industry.map((item) => normalizeSearchText(item));

  return selectedIndustries.some((selectedIndustry) => {
    const target = normalizeSearchText(selectedIndustry);
    return normalizedIndustries.some((industry) => industry.includes(target));
  });
}

function computeRelevanceScore(job: Job, q: string): number {
  const query = normalizeSearchText(q);
  if (!query) {
    return 0;
  }

  const queryTokens = query.split(/\s+/).filter(Boolean);
  const titleText = normalizeSearchText(job.title);
  const companyText = normalizeSearchText(job.company_name);
  const locationText = normalizeSearchText(job.location);
  const skillText = normalizeSearchText([...job.industry, ...job.requirements].join(" "));
  const descriptionText = normalizeSearchText(job.description.join(" "));

  let score = 0;

  if (titleText.includes(query)) score += 6;
  if (companyText.includes(query)) score += 3;
  if (locationText.includes(query)) score += 2;
  if (skillText.includes(query)) score += 4;
  if (descriptionText.includes(query)) score += 2;

  if (queryTokens.length > 0) {
    const titleTokenHits = queryTokens.filter((token) => titleText.includes(token)).length;
    const skillTokenHits = queryTokens.filter((token) => skillText.includes(token)).length;
    const descriptionTokenHits = queryTokens.filter((token) => descriptionText.includes(token)).length;

    score += titleTokenHits * 2;
    score += skillTokenHits * 1.5;
    score += descriptionTokenHits;
  }

  return score;
}

function applySalaryFilter(
  jobs: Job[],
  salaryMin: number | null,
  salaryMax: number | null,
  hideUnknownSalary: boolean,
): Job[] {
  if (salaryMin === null && salaryMax === null && !hideUnknownSalary) {
    return jobs;
  }

  return jobs.filter((job) => {
    const salary = parseSalaryRange(job.salary);
    if (!salary) {
      return !hideUnknownSalary;
    }

    if (salaryMin !== null && salary.max < salaryMin) {
      return false;
    }

    if (salaryMax !== null && salary.min > salaryMax) {
      return false;
    }

    return true;
  });
}

export async function searchPublicJobs(
  params: SearchPublicJobsParams = {},
): Promise<SearchPublicJobsResult> {
  const supabase = createAdminClient();

  const q = String(params.q ?? "").trim();
  const location = String(params.location ?? "").trim();
  const company = String(params.company ?? "").trim();
  const levels = normalizeFilterValues(params.levels);
  const types = normalizeFilterValues(params.types);
  const industries = normalizeFilterValues(params.industries);
  const salaryMin =
    typeof params.salaryMin === "number" && Number.isFinite(params.salaryMin)
      ? params.salaryMin
      : null;
  const salaryMax =
    typeof params.salaryMax === "number" && Number.isFinite(params.salaryMax)
      ? params.salaryMax
      : null;
  const hideUnknownSalary = Boolean(params.hideUnknownSalary);
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(
    PUBLIC_JOB_LIST_MAX_LIMIT,
    Math.max(1, Number(params.limit ?? 12)),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const sort = params.sort ?? "newest";

  const requiresServerPostProcessing =
    Boolean(q) ||
    industries.length > 0 ||
    sort === "salary-high" ||
    sort === "salary-low" ||
    sort === "relevance" ||
    salaryMin !== null ||
    salaryMax !== null ||
    hideUnknownSalary;

  const buildQuery = ({
    includeStatus,
    includePublicVisible,
    includeCount,
    rangeFrom,
    rangeTo,
    applyKeywordInSql,
  }: {
    includeStatus: boolean;
    includePublicVisible: boolean;
    includeCount: boolean;
    rangeFrom: number;
    rangeTo: number;
    applyKeywordInSql: boolean;
  }) => {
    let query = supabase
      .from("jobs")
      .select(PUBLIC_JOB_LIST_COLUMNS, includeCount ? { count: "exact" } : undefined)
      .not("employer_id", "is", null);

    if (applyKeywordInSql && q) {
      const safeQuery = sanitizeLikeValue(q);
      query = query.or(
        [
          `title.ilike.%${safeQuery}%`,
          `company_name.ilike.%${safeQuery}%`,
          `location.ilike.%${safeQuery}%`,
        ].join(","),
      );
    }

    if (location) {
      query = query.filter("location", "ilike", `%${sanitizeLikeValue(location)}%`);
    }

    if (company) {
      query = query.filter("company_name", "ilike", `%${sanitizeLikeValue(company)}%`);
    }

    if (levels.length > 0) {
      query = query.in("level", levels);
    }

    if (types.length > 0) {
      query = query.in("employment_type", types);
    }

    if (includeStatus) {
      query = query.eq("status", "open");
    }

    if (includePublicVisible) {
      query = query.eq("is_public_visible", true);
    }

    if (sort === "oldest" && !requiresServerPostProcessing) {
      query = query.order("posted_date", { ascending: true, nullsFirst: false });
    } else if (sort === "az" && !requiresServerPostProcessing) {
      query = query.order("title", { ascending: true });
    } else {
      query = query.order("posted_date", { ascending: false, nullsFirst: false });
    }

    return query.range(rangeFrom, rangeTo);
  };

  async function runQueryWithFallback({
    includeCount,
    rangeFrom,
    rangeTo,
    applyKeywordInSql,
    includeStatus,
    includePublicVisible,
  }: {
    includeCount: boolean;
    rangeFrom: number;
    rangeTo: number;
    applyKeywordInSql: boolean;
    includeStatus: boolean;
    includePublicVisible: boolean;
  }) {
    let result = await buildQuery({
      includeStatus,
      includePublicVisible,
      includeCount,
      rangeFrom,
      rangeTo,
      applyKeywordInSql,
    });

    if (result.error && hasMissingColumnError(result.error, "status")) {
      result = await buildQuery({
        includeStatus: false,
        includePublicVisible: false,
        includeCount,
        rangeFrom,
        rangeTo,
        applyKeywordInSql,
      });
    } else if (result.error && hasMissingColumnError(result.error, "is_public_visible")) {
      result = await buildQuery({
        includeStatus: true,
        includePublicVisible: false,
        includeCount,
        rangeFrom,
        rangeTo,
        applyKeywordInSql,
      });
    }

    return result;
  }

  if (!requiresServerPostProcessing) {
    const result = await runQueryWithFallback({
      includeCount: true,
      rangeFrom: from,
      rangeTo: to,
      applyKeywordInSql: true,
      includeStatus: true,
      includePublicVisible: true,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const jobs = (result.data ?? []).map((row) =>
      toJob(row as unknown as Record<string, unknown>),
    );
    const employerIds = [
      ...new Set(
        jobs
          .map((job) => job.employer_id)
          .filter((employerId): employerId is string => Boolean(employerId)),
      ),
    ];
    const employerProfiles = await getEmployerProfilesById(employerIds);
    const items = jobs.map((job) =>
      applyEmployerBranding(job, employerProfiles.get(job.employer_id ?? "")),
    );

    const total = Number(result.count ?? items.length);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  const scanLimit = Math.min(
    PUBLIC_JOB_SEARCH_MAX_SCAN_ROWS,
    Math.max(PUBLIC_JOB_SEARCH_SCAN_CHUNK, page * limit * 8),
  );
  const rawRows: Record<string, unknown>[] = [];

  for (
    let offset = 0;
    offset < scanLimit;
    offset += PUBLIC_JOB_SEARCH_SCAN_CHUNK
  ) {
    const chunkResult = await runQueryWithFallback({
      includeCount: false,
      rangeFrom: offset,
      rangeTo: Math.min(offset + PUBLIC_JOB_SEARCH_SCAN_CHUNK - 1, scanLimit - 1),
      applyKeywordInSql: false,
      includeStatus: true,
      includePublicVisible: true,
    });

    if (chunkResult.error) {
      throw new Error(chunkResult.error.message);
    }

    const rows = (chunkResult.data ?? []) as unknown as Record<string, unknown>[];
    rawRows.push(...rows);

    if (rows.length < PUBLIC_JOB_SEARCH_SCAN_CHUNK) {
      break;
    }
  }

  const jobs = rawRows.map((row) =>
    toJob(row as unknown as Record<string, unknown>),
  );
  const employerIds = [
    ...new Set(
      jobs
        .map((job) => job.employer_id)
        .filter((employerId): employerId is string => Boolean(employerId)),
    ),
  ];
  const employerProfiles = await getEmployerProfilesById(employerIds);
  let filteredItems = jobs.map((job) =>
    applyEmployerBranding(job, employerProfiles.get(job.employer_id ?? "")),
  );

  if (q) {
    filteredItems = filteredItems.filter((job) => matchesKeyword(job, q));
  }

  if (industries.length > 0) {
    filteredItems = filteredItems.filter((job) => matchesAnyIndustry(job, industries));
  }

  filteredItems = applySalaryFilter(filteredItems, salaryMin, salaryMax, hideUnknownSalary);

  if (sort === "oldest") {
    filteredItems.sort((left, right) =>
      normalizeSearchText(left.posted_date).localeCompare(normalizeSearchText(right.posted_date)),
    );
  } else if (sort === "az") {
    filteredItems.sort((left, right) => left.title.localeCompare(right.title, "vi"));
  } else if (sort === "salary-high") {
    filteredItems.sort((left, right) => salarySortValue(right) - salarySortValue(left));
  } else if (sort === "salary-low") {
    filteredItems.sort((left, right) => salarySortValue(left) - salarySortValue(right));
  } else if (sort === "relevance" && q) {
    filteredItems.sort((left, right) => {
      const scoreDiff = computeRelevanceScore(right, q) - computeRelevanceScore(left, q);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return normalizeSearchText(right.posted_date).localeCompare(normalizeSearchText(left.posted_date));
    });
  } else {
    filteredItems.sort((left, right) =>
      normalizeSearchText(right.posted_date).localeCompare(normalizeSearchText(left.posted_date)),
    );
  }

  const total = filteredItems.length;
  const items = filteredItems.slice(from, to + 1);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getLatestPublicJobs(limit = 12): Promise<Job[]> {
  const result = await searchPublicJobs({
    page: 1,
    limit,
    sort: "newest",
  });

  return result.items;
}

async function getSupabaseJobsImpl(): Promise<Job[]> {
  try {
    const supabase = createAdminClient();

    const query = supabase
      .from("jobs")
      .select("*")
      .not("employer_id", "is", null)
      .order("posted_date", { ascending: false, nullsFirst: false });

    let { data, error } = await query
      .eq("status", "open")
      .eq("is_public_visible", true);

    if (error && error.message?.toLowerCase().includes('column "status" does not exist')) {
      const fallbackResult = await query;
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (
      error &&
      (
        error.message?.toLowerCase().includes('column "is_public_visible" does not exist') ||
        error.message?.toLowerCase().includes("column jobs.is_public_visible does not exist")
      )
    ) {
      const fallbackVisibleResult = await query.eq("status", "open");
      data = fallbackVisibleResult.data;
      error = fallbackVisibleResult.error;
    }

    if (error || !data || data.length === 0) {
      return [];
    }

    const jobs = data.map((row) => toJob(row as Record<string, unknown>));
    const employerIds = [
      ...new Set(
        jobs
          .map((job) => job.employer_id)
          .filter((employerId): employerId is string => Boolean(employerId))
      ),
    ];
    const employerProfiles = await getEmployerProfilesById(employerIds);

    return jobs.map((job) => applyEmployerBranding(job, employerProfiles.get(job.employer_id ?? "")));
  } catch {
    return [];
  }
}

async function getRecentSupabaseJobsImpl(limit: number): Promise<Job[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  try {
    const supabase = createAdminClient();
    const createQuery = () =>
      supabase
        .from("jobs")
        .select(PUBLIC_JOB_LIST_COLUMNS)
        .not("employer_id", "is", null)
        .order("posted_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit);

    let { data, error } = await createQuery()
      .eq("status", "open")
      .eq("is_public_visible", true);

    if (error && error.message?.toLowerCase().includes('column "status" does not exist')) {
      const fallbackResult = await createQuery();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (
      error &&
      (
        error.message?.toLowerCase().includes('column "is_public_visible" does not exist') ||
        error.message?.toLowerCase().includes("column jobs.is_public_visible does not exist")
      )
    ) {
      const fallbackVisibleResult = await createQuery().eq("status", "open");
      data = fallbackVisibleResult.data;
      error = fallbackVisibleResult.error;
    }

    if (error || !data || data.length === 0) {
      return [];
    }

    const jobs = data.map((row) => toJob(row as unknown as Record<string, unknown>));
    const employerIds = [
      ...new Set(
        jobs
          .map((job) => job.employer_id)
          .filter((employerId): employerId is string => Boolean(employerId))
      ),
    ];
    const employerProfiles = await getEmployerProfilesById(employerIds);

    return jobs.map((job) => applyEmployerBranding(job, employerProfiles.get(job.employer_id ?? "")));
  } catch {
    return [];
  }
}

const getCachedSupabaseJobs = unstable_cache(getSupabaseJobsImpl, ["public-jobs"], {
  revalidate: 60,
  tags: ["jobs-public"],
});

const getCachedRecentSupabaseJobs = unstable_cache(
  getRecentSupabaseJobsImpl,
  ["public-jobs-recent"],
  {
    revalidate: 60,
    tags: ["jobs-public"],
  }
);

/** Return every public job. */
export async function getAllJobs(): Promise<Job[]> {
  return getCachedSupabaseJobs();
}

/** Return the newest public jobs for lightweight surfaces that do not need scoring. */
export async function getRecentPublicJobs(limit: number): Promise<Job[]> {
  return getCachedRecentSupabaseJobs(limit);
}

/** Return fresh public jobs without the React request cache. */
export async function getFreshPublicJobs(): Promise<Job[]> {
  return getSupabaseJobsImpl();
}

/** Find a single public job by id. */
export async function getJobById(id: string): Promise<Job | undefined> {
  const jobs = await getAllJobs();
  return jobs.find((job) => job.id === id);
}

/** Return all unique locations present in the dataset. */
export async function getAllLocations(): Promise<string[]> {
  const jobs = await getAllJobs();
  return [...new Set(jobs.map((job) => job.location).filter(Boolean))];
}

/** Return all unique industries present in the dataset. */
export async function getAllIndustries(): Promise<string[]> {
  const jobs = await getAllJobs();
  const set = new Set<string>();

  for (const job of jobs) {
    for (const industry of job.industry) {
      if (industry) {
        set.add(industry);
      }
    }
  }

  return [...set];
}
