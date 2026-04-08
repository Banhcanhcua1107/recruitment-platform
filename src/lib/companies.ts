import "server-only";

import { unstable_cache } from "next/cache";
import type { Job } from "@/types/job";
import { getAllJobs, searchPublicJobs } from "@/lib/jobs";
import { createAdminClient } from "@/utils/supabase/admin";
import { toSlug } from "@/lib/slug";

export interface Company {
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  industry: string[];
  size: string | null;
  description?: string | null;
  jobCount: number;
}

export type PublicCompaniesSort = "jobs_desc" | "name_asc";

export interface SearchPublicCompaniesParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: PublicCompaniesSort;
}

export interface SearchPublicCompaniesResult {
  items: Company[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PUBLIC_COMPANY_SUMMARY_COLUMNS = [
  "name",
  "logo_url",
  "cover_url",
  "location",
  "industry",
  "size",
  "description",
  "job_count",
].join(", ");

const FALLBACK_COMPANY_JOB_COLUMNS = [
  "company_name",
  "logo_url",
  "cover_url",
  "location",
  "industry",
  "employer_id",
  "posted_date",
].join(", ");

const PUBLIC_COMPANY_MAX_LIMIT = 50;

interface NormalizedCompanySearchParams {
  q: string;
  page: number;
  limit: number;
  sort: PublicCompaniesSort;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
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

function normalizeCount(value: unknown): number {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next) || next < 0) {
    return 0;
  }

  return Math.floor(next);
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

function shouldFallbackSummaryError(error: { message?: string } | null): boolean {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("company_directory_summary") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  );
}

function mergeIndustries(current: string[], incoming: string[]) {
  for (const industry of incoming) {
    if (industry && !current.includes(industry)) {
      current.push(industry);
    }
  }
}

function sortCompanies(companies: Company[], sort: PublicCompaniesSort): Company[] {
  const next = [...companies];

  if (sort === "name_asc") {
    next.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return next;
  }

  next.sort((a, b) => {
    if (b.jobCount !== a.jobCount) {
      return b.jobCount - a.jobCount;
    }

    return a.name.localeCompare(b.name, "vi");
  });

  return next;
}

function normalizeSearchParams(
  params: SearchPublicCompaniesParams = {},
): NormalizedCompanySearchParams {
  return {
    q: String(params.q ?? "").trim(),
    page: Math.max(1, Number(params.page ?? 1)),
    limit: Math.min(PUBLIC_COMPANY_MAX_LIMIT, Math.max(1, Number(params.limit ?? 12))),
    sort: params.sort === "name_asc" ? "name_asc" : "jobs_desc",
  };
}

function filterSortPaginateCompanies(
  companies: Company[],
  params: NormalizedCompanySearchParams,
): SearchPublicCompaniesResult {
  let filtered = companies;

  if (params.q) {
    const query = params.q.toLowerCase();
    filtered = companies.filter((company) =>
      `${company.name} ${company.location ?? ""}`.toLowerCase().includes(query),
    );
  }

  const sorted = sortCompanies(filtered, params.sort);
  const total = sorted.length;
  const from = (params.page - 1) * params.limit;
  const items = sorted.slice(from, from + params.limit);

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

async function getEmployerProfiles() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("employers")
      .select("id, company_name, logo_url, cover_url, location, industry, company_size, company_description");

    if (
      error &&
      error.message?.toLowerCase().includes('relation "employers" does not exist')
    ) {
      return new Map<string, Record<string, unknown>>();
    }

    if (error || !data) {
      return new Map<string, Record<string, unknown>>();
    }

    return new Map(
      data
        .map((row) => row as Record<string, unknown>)
        .map((row) => [toSlug(String(row.company_name ?? "")), row] as const)
        .filter(([slug]) => Boolean(slug))
    );
  } catch {
    return new Map<string, Record<string, unknown>>();
  }
}

function toCompanyFromRow(
  row: Record<string, unknown>,
  employerProfiles?: Map<string, Record<string, unknown>>,
): Company {
  const name = normalizeString(row.name) || normalizeString(row.company_name) || "Chưa cập nhật";
  const slug = toSlug(name);
  const employerProfile = employerProfiles?.get(slug);

  const employerIndustries = normalizeStringArray(employerProfile?.industry);
  const rowIndustries = normalizeStringArray(row.industry);
  const industries: string[] = [];
  mergeIndustries(industries, rowIndustries);
  mergeIndustries(industries, employerIndustries);

  return {
    slug,
    name,
    logoUrl: normalizeString(employerProfile?.logo_url) || normalizeString(row.logo_url),
    coverUrl: normalizeString(employerProfile?.cover_url) || normalizeString(row.cover_url),
    location: normalizeString(employerProfile?.location) || normalizeString(row.location),
    industry: industries,
    size: normalizeString(employerProfile?.company_size) || normalizeString(row.size),
    description:
      normalizeString(employerProfile?.company_description) || normalizeString(row.description),
    jobCount: normalizeCount(row.job_count ?? 1),
  };
}

async function getAllCompaniesFromSummaryView(): Promise<Company[] | null> {
  const supabase = createAdminClient();
  const result = await supabase
    .from("company_directory_summary")
    .select(PUBLIC_COMPANY_SUMMARY_COLUMNS)
    .order("job_count", { ascending: false })
    .order("name", { ascending: true });

  if (result.error) {
    if (shouldFallbackSummaryError(result.error)) {
      return null;
    }

    throw new Error(result.error.message);
  }

  const items = (result.data ?? [])
    .map((row) => toCompanyFromRow(row as unknown as Record<string, unknown>))
    .filter((company) => Boolean(company.slug));

  return items.length > 0 ? items : null;
}

async function searchCompaniesFromSummaryView(
  params: NormalizedCompanySearchParams,
): Promise<SearchPublicCompaniesResult | null> {
  const supabase = createAdminClient();
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  let query = supabase
    .from("company_directory_summary")
    .select(PUBLIC_COMPANY_SUMMARY_COLUMNS, { count: "exact" });

  if (params.q) {
    const safeQuery = sanitizeLikeValue(params.q);
    query = query.or(`name.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`);
  }

  if (params.sort === "name_asc") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("job_count", { ascending: false }).order("name", { ascending: true });
  }

  const result = await query.range(from, to);

  if (result.error) {
    if (shouldFallbackSummaryError(result.error)) {
      return null;
    }

    throw new Error(result.error.message);
  }

  const items = (result.data ?? [])
    .map((row) => toCompanyFromRow(row as unknown as Record<string, unknown>))
    .filter((company) => Boolean(company.slug));
  const total = Number(result.count ?? items.length);

  if (total === 0) {
    return null;
  }

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

async function getFallbackCompanyRows(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();

  const buildQuery = ({
    includeStatus,
    includePublicVisible,
  }: {
    includeStatus: boolean;
    includePublicVisible: boolean;
  }) => {
    let query = supabase
      .from("jobs")
      .select(FALLBACK_COMPANY_JOB_COLUMNS)
      .not("employer_id", "is", null)
      .order("posted_date", { ascending: false, nullsFirst: false });

    if (includeStatus) {
      query = query.eq("status", "open");
    }

    if (includePublicVisible) {
      query = query.eq("is_public_visible", true);
    }

    return query;
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

  return (result.data ?? []) as unknown as Record<string, unknown>[];
}

function buildCompaniesFromFallbackRows(
  rows: Record<string, unknown>[],
  employerProfiles: Map<string, Record<string, unknown>>,
): Company[] {
  const map = new Map<string, Company>();

  for (const row of rows) {
    const name = normalizeString(row.company_name);
    if (!name) {
      continue;
    }

    const slug = toSlug(name);
    const existing = map.get(slug);
    const employerProfile = employerProfiles.get(slug);

    const jobIndustries = normalizeStringArray(row.industry);
    const employerIndustries = normalizeStringArray(employerProfile?.industry);
    const employerLogoUrl = normalizeString(employerProfile?.logo_url);
    const employerCoverUrl = normalizeString(employerProfile?.cover_url);
    const employerLocation = normalizeString(employerProfile?.location);
    const employerSize = normalizeString(employerProfile?.company_size);
    const employerDescription = normalizeString(employerProfile?.company_description);
    const jobLogoUrl = normalizeString(row.logo_url);
    const jobCoverUrl = normalizeString(row.cover_url);
    const jobLocation = normalizeString(row.location);

    if (existing) {
      existing.jobCount += 1;

      if (employerLogoUrl) {
        existing.logoUrl = employerLogoUrl;
      } else if (!existing.logoUrl && jobLogoUrl) {
        existing.logoUrl = jobLogoUrl;
      }

      if (employerCoverUrl) {
        existing.coverUrl = employerCoverUrl;
      } else if (!existing.coverUrl && jobCoverUrl) {
        existing.coverUrl = jobCoverUrl;
      }

      if (employerLocation) {
        existing.location = employerLocation;
      } else if (!existing.location && jobLocation) {
        existing.location = jobLocation;
      }

      if (!existing.size && employerSize) {
        existing.size = employerSize;
      }

      if (!existing.description && employerDescription) {
        existing.description = employerDescription;
      }

      mergeIndustries(existing.industry, jobIndustries);
      mergeIndustries(existing.industry, employerIndustries);
      continue;
    }

    const industries: string[] = [];
    mergeIndustries(industries, jobIndustries);
    mergeIndustries(industries, employerIndustries);

    map.set(slug, {
      slug,
      name,
      logoUrl: employerLogoUrl || jobLogoUrl,
      coverUrl: employerCoverUrl || jobCoverUrl,
      location: employerLocation || jobLocation,
      industry: industries,
      size: employerSize,
      description: employerDescription,
      jobCount: 1,
    });
  }

  return sortCompanies([...map.values()], "jobs_desc");
}

async function getAllCompaniesImpl(): Promise<Company[]> {
  try {
    const fromSummaryView = await getAllCompaniesFromSummaryView();
    if (fromSummaryView) {
      return fromSummaryView;
    }

    const employerProfiles = await getEmployerProfiles();
    const fallbackRows = await getFallbackCompanyRows();
    return buildCompaniesFromFallbackRows(fallbackRows, employerProfiles);
  } catch {
    return [];
  }
}

const getCachedCompanies = unstable_cache(getAllCompaniesImpl, ["public-companies"], {
  revalidate: 300,
  tags: ["companies-public"],
});

export async function getAllCompanies(): Promise<Company[]> {
  return getCachedCompanies();
}

export async function searchPublicCompanies(
  params: SearchPublicCompaniesParams = {},
): Promise<SearchPublicCompaniesResult> {
  const normalizedParams = normalizeSearchParams(params);

  try {
    const fromSummaryView = await searchCompaniesFromSummaryView(normalizedParams);
    if (fromSummaryView) {
      return fromSummaryView;
    }
  } catch {
    // Fall back to cached list flow below.
  }

  const companies = await getAllCompanies();
  return filterSortPaginateCompanies(companies, normalizedParams);
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  const companies = await getAllCompanies();
  return companies.find((company) => company.slug === slug);
}

export async function getRelatedJobsByCompanySlug(
  slug: string,
  options: {
    excludeJobId?: string;
    limit?: number;
  } = {},
): Promise<Job[]> {
  const company = await getCompanyBySlug(slug);
  if (!company) {
    return [];
  }

  const limit = Math.max(1, Math.min(12, Number(options.limit ?? 6)));
  const pageSize = Math.min(24, limit + 6);
  const result = await searchPublicJobs({
    company: company.name,
    page: 1,
    limit: pageSize,
    sort: "newest",
  });

  return result.items
    .filter((job) => {
      if (options.excludeJobId && job.id === options.excludeJobId) {
        return false;
      }

      return toSlug(job.company_name?.trim() ?? "") === company.slug;
    })
    .slice(0, limit);
}

export async function getJobsByCompanySlug(slug: string): Promise<Job[]> {
  const company = await getCompanyBySlug(slug);
  if (!company) {
    return [];
  }

  const jobs = await getAllJobs();
  return jobs.filter((job) => toSlug(job.company_name?.trim() ?? "") === company.slug);
}

export function companySlug(name: string): string {
  return toSlug(name?.trim() ?? "");
}
