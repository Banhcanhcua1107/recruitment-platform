import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";

const PUBLIC_JOB_SUMMARY_COLUMNS = [
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

export interface PublicJobSummary {
  id: string;
  title: string;
  company_name: string;
  logo_url: string;
  cover_url: string;
  salary: string;
  location: string;
  posted_date: string;
  source_url: string;
  description: string[];
  requirements: string[];
  benefits: string[];
  industry: string[];
  experience_level: string | null;
  level: string;
  employment_type: string;
  deadline: string;
  education_level: string;
  age_range: string;
  full_address: string;
  employer_id?: string | null;
}

export interface PublicJobsNewestPage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: PublicJobSummary[];
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

function hasMissingJobColumnError(error: { message?: string } | null, columnName: string): boolean {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  const target = columnName.toLowerCase();
  return (
    message.includes(`column "${target}" does not exist`) ||
    message.includes(`column jobs.${target} does not exist`)
  );
}

function toPublicJobSummary(row: Record<string, unknown>): PublicJobSummary {
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
    experience_level: normalizeOptionalString(row.experience_level),
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

function applyEmployerBranding(
  job: PublicJobSummary,
  employerProfile?: EmployerProfile
): PublicJobSummary {
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

async function getLatestPublicJobSummariesImpl(limit: number): Promise<PublicJobSummary[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  try {
    const supabase = createAdminClient();
    const createQuery = () =>
      supabase
        .from("jobs")
        .select(PUBLIC_JOB_SUMMARY_COLUMNS)
        .not("employer_id", "is", null)
        .order("posted_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit);

    let { data, error } = await createQuery()
      .eq("status", "open")
      .eq("is_public_visible", true);

    if (hasMissingJobColumnError(error, "status")) {
      const fallbackResult = await createQuery();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (hasMissingJobColumnError(error, "is_public_visible")) {
      const fallbackVisibleResult = await createQuery().eq("status", "open");
      data = fallbackVisibleResult.data;
      error = fallbackVisibleResult.error;
    }

    if (error || !data || data.length === 0) {
      return [];
    }

    const jobs = data.map((row) => toPublicJobSummary(row as unknown as Record<string, unknown>));
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

const getCachedLatestPublicJobSummaries = unstable_cache(
  getLatestPublicJobSummariesImpl,
  ["public-job-summaries-latest"],
  {
    revalidate: 60,
    tags: ["jobs-public"],
  }
);

export async function getLatestPublicJobSummaries(limit: number): Promise<PublicJobSummary[]> {
  return getCachedLatestPublicJobSummaries(limit);
}

export async function getNewestPublicJobsPage(
  page: number,
  limit: number,
): Promise<PublicJobsNewestPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  try {
    const supabase = createAdminClient();
    const createQuery = () =>
      supabase
        .from("jobs")
        .select(PUBLIC_JOB_SUMMARY_COLUMNS, { count: "exact" })
        .not("employer_id", "is", null)
        .order("posted_date", { ascending: false, nullsFirst: false })
        .range(from, to);

    let { data, error, count } = await createQuery()
      .eq("status", "open")
      .eq("is_public_visible", true);

    if (hasMissingJobColumnError(error, "status")) {
      const fallbackResult = await createQuery();
      data = fallbackResult.data;
      error = fallbackResult.error;
      count = fallbackResult.count;
    }

    if (hasMissingJobColumnError(error, "is_public_visible")) {
      const fallbackVisibleResult = await createQuery().eq("status", "open");
      data = fallbackVisibleResult.data;
      error = fallbackVisibleResult.error;
      count = fallbackVisibleResult.count;
    }

    if (error || !data) {
      return {
        page: safePage,
        limit: safeLimit,
        total: 0,
        totalPages: 0,
        items: [],
      };
    }

    const jobs = data.map((row) => toPublicJobSummary(row as unknown as Record<string, unknown>));
    const employerIds = [
      ...new Set(
        jobs
          .map((job) => job.employer_id)
          .filter((employerId): employerId is string => Boolean(employerId))
      ),
    ];
    const employerProfiles = await getEmployerProfilesById(employerIds);
    const items = jobs.map((job) => applyEmployerBranding(job, employerProfiles.get(job.employer_id ?? "")));
    const total = count ?? items.length;

    return {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      items,
    };
  } catch {
    return {
      page: safePage,
      limit: safeLimit,
      total: 0,
      totalPages: 0,
      items: [],
    };
  }
}
