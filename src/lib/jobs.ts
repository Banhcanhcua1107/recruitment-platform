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
  "industry",
  "level",
  "employment_type",
  "deadline",
  "employer_id",
].join(", ");

const PUBLIC_JOB_LIST_MAX_LIMIT = 50;

export type PublicJobsSort = "newest" | "oldest" | "az" | "salary-high" | "salary-low";

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
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(
    PUBLIC_JOB_LIST_MAX_LIMIT,
    Math.max(1, Number(params.limit ?? 12)),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const sort = params.sort ?? "newest";

  const buildQuery = ({
    includeStatus,
    includePublicVisible,
  }: {
    includeStatus: boolean;
    includePublicVisible: boolean;
  }) => {
    let query = supabase
      .from("jobs")
      .select(PUBLIC_JOB_LIST_COLUMNS, { count: "exact" })
      .not("employer_id", "is", null);

    if (q) {
      const safeQuery = sanitizeLikeValue(q);
      query = query.or(`title.ilike.%${safeQuery}%,company_name.ilike.%${safeQuery}%`);
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

    if (industries.length > 0) {
      query = query.or(
        industries
          .map((industry) => `industry.ilike.%${sanitizeLikeValue(industry)}%`)
          .join(","),
      );
    }

    if (includeStatus) {
      query = query.eq("status", "open");
    }

    if (includePublicVisible) {
      query = query.eq("is_public_visible", true);
    }

    if (sort === "oldest") {
      query = query.order("posted_date", { ascending: true, nullsFirst: false });
    } else if (sort === "az") {
      query = query.order("title", { ascending: true });
    } else {
      query = query.order("posted_date", { ascending: false, nullsFirst: false });
    }

    return query.range(from, to);
  };

  let result = await buildQuery({ includeStatus: true, includePublicVisible: true });

  if (result.error && hasMissingColumnError(result.error, "status")) {
    result = await buildQuery({ includeStatus: false, includePublicVisible: false });
  } else if (result.error && hasMissingColumnError(result.error, "is_public_visible")) {
    result = await buildQuery({ includeStatus: true, includePublicVisible: false });
  }

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

const getCachedSupabaseJobs = unstable_cache(getSupabaseJobsImpl, ["public-jobs"], {
  revalidate: 60,
  tags: ["jobs-public"],
});

/** Return every public job. */
export async function getAllJobs(): Promise<Job[]> {
  return getCachedSupabaseJobs();
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
