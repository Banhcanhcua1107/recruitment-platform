import "server-only";

import { unstable_cache } from "next/cache";
import type { Job } from "@/types/job";
import { getAllJobs, getFreshPublicJobs } from "@/lib/jobs";
import { createAdminClient } from "@/utils/supabase/admin";
import { toSlug } from "@/lib/slug";

export interface Company {
  slug: string;
  name: string;
  aliases?: string[];
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  industry: string[];
  size: string | null;
  description?: string | null;
  companyOverview?: string | null;
  employerId?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  benefits?: string[];
  culture?: string[];
  vision?: string | null;
  mission?: string | null;
  updatedAt?: string | null;
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

interface EmployerDirectoryRow {
  id: string;
  company_name: string | null;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
  industry: unknown;
  company_size: string | null;
  company_description: string | null;
}

interface CompanyProfileDirectoryRow {
  user_id: string;
  company_name: string | null;
  company_overview: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
  industry: unknown;
  company_size: string | null;
  benefits: unknown;
  culture: unknown;
  vision: string | null;
  mission: string | null;
  company_description: string | null;
  updated_at: string | null;
}

interface NormalizedCompanySearchParams {
  q: string;
  page: number;
  limit: number;
  sort: PublicCompaniesSort;
}

const PUBLIC_COMPANY_MAX_LIMIT = 50;
const COMPANY_NAME_PLACEHOLDER_SLUG = "chua-cap-nhat-ten-cong-ty";
const COMPANY_PROFILES_TABLE_MARKERS = [
  'relation "company_profiles" does not exist',
  "could not find the table 'public.company_profiles' in the schema cache",
];
const EMPLOYERS_TABLE_MARKERS = [
  'relation "employers" does not exist',
  "could not find the table 'public.employers' in the schema cache",
];

function normalizeString(value: unknown): string | null {
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

function normalizeCount(value: unknown): number {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next) || next < 0) {
    return 0;
  }

  return Math.floor(next);
}

function isSchemaError(error: { message?: string } | null, markers: string[]) {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  return markers.some((marker) => message.includes(marker.toLowerCase()));
}

function isPublicCompanyName(name: string | null) {
  if (!name) {
    return false;
  }

  const slug = toSlug(name);
  return Boolean(slug) && slug !== COMPANY_NAME_PLACEHOLDER_SLUG;
}

function mergeUniqueItems(target: string[], incoming: string[]) {
  for (const item of incoming) {
    if (!target.includes(item)) {
      target.push(item);
    }
  }
}

function parsePostedTime(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function pickLatestJob(jobs: Job[]): Job | null {
  if (jobs.length === 0) {
    return null;
  }

  let latest = jobs[0];
  let latestTimestamp = parsePostedTime(latest.posted_date);

  for (const job of jobs) {
    const currentTimestamp = parsePostedTime(job.posted_date);
    if (currentTimestamp > latestTimestamp) {
      latest = job;
      latestTimestamp = currentTimestamp;
    }
  }

  return latest;
}

function resolveCompanyName(
  profile: CompanyProfileDirectoryRow | null,
  employer: EmployerDirectoryRow | null,
  jobs: Job[],
): string | null {
  const profileName = normalizeString(profile?.company_name);
  if (isPublicCompanyName(profileName)) {
    return profileName;
  }

  const employerName = normalizeString(employer?.company_name);
  if (isPublicCompanyName(employerName)) {
    return employerName;
  }

  for (const job of jobs) {
    const jobCompanyName = normalizeString(job.company_name);
    if (isPublicCompanyName(jobCompanyName)) {
      return jobCompanyName;
    }
  }

  return null;
}

function mergeCompany(existing: Company, incoming: Company) {
  existing.jobCount += incoming.jobCount;

  mergeUniqueItems(existing.aliases ?? [], incoming.aliases ?? []);

  if (!existing.logoUrl && incoming.logoUrl) {
    existing.logoUrl = incoming.logoUrl;
  }

  if (!existing.coverUrl && incoming.coverUrl) {
    existing.coverUrl = incoming.coverUrl;
  }

  if (!existing.location && incoming.location) {
    existing.location = incoming.location;
  }

  if (!existing.size && incoming.size) {
    existing.size = incoming.size;
  }

  if (!existing.description && incoming.description) {
    existing.description = incoming.description;
  }

  if (!existing.companyOverview && incoming.companyOverview) {
    existing.companyOverview = incoming.companyOverview;
  }

  if (!existing.website && incoming.website) {
    existing.website = incoming.website;
  }

  if (!existing.email && incoming.email) {
    existing.email = incoming.email;
  }

  if (!existing.phone && incoming.phone) {
    existing.phone = incoming.phone;
  }

  if (!existing.vision && incoming.vision) {
    existing.vision = incoming.vision;
  }

  if (!existing.mission && incoming.mission) {
    existing.mission = incoming.mission;
  }

  if (!existing.updatedAt && incoming.updatedAt) {
    existing.updatedAt = incoming.updatedAt;
  }

  if (!existing.employerId && incoming.employerId) {
    existing.employerId = incoming.employerId;
  }

  mergeUniqueItems(existing.industry, incoming.industry);
  mergeUniqueItems(existing.benefits ?? [], incoming.benefits ?? []);
  mergeUniqueItems(existing.culture ?? [], incoming.culture ?? []);
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
    filtered = companies.filter((company) => {
      const searchSource = [
        company.name,
        company.location ?? "",
        company.industry.join(" "),
        company.companyOverview ?? "",
        company.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchSource.includes(query);
    });
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

async function getEmployerDirectoryRows(): Promise<EmployerDirectoryRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("employers")
      .select(
        "id, company_name, email, logo_url, cover_url, location, industry, company_size, company_description",
      );

    if (error) {
      if (isSchemaError(error, EMPLOYERS_TABLE_MARKERS)) {
        return [];
      }

      throw new Error(error.message);
    }

    return (data ?? []) as EmployerDirectoryRow[];
  } catch {
    return [];
  }
}

async function getCompanyProfileDirectoryRows(): Promise<CompanyProfileDirectoryRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("company_profiles")
      .select(
        "user_id, company_name, company_overview, email, website, phone, logo_url, cover_url, location, industry, company_size, benefits, culture, vision, mission, company_description, updated_at",
      );

    if (error) {
      if (isSchemaError(error, COMPANY_PROFILES_TABLE_MARKERS)) {
        return [];
      }

      throw new Error(error.message);
    }

    return (data ?? []) as CompanyProfileDirectoryRow[];
  } catch {
    return [];
  }
}

function buildCompaniesFromSources(
  jobs: Job[],
  employers: EmployerDirectoryRow[],
  profiles: CompanyProfileDirectoryRow[],
): Company[] {
  const jobsByEmployerId = new Map<string, Job[]>();
  for (const job of jobs) {
    const employerId = normalizeString(job.employer_id);
    if (!employerId) {
      continue;
    }

    const list = jobsByEmployerId.get(employerId) ?? [];
    list.push(job);
    jobsByEmployerId.set(employerId, list);
  }

  const employersById = new Map<string, EmployerDirectoryRow>();
  for (const employer of employers) {
    employersById.set(employer.id, employer);
  }

  const profilesByUserId = new Map<string, CompanyProfileDirectoryRow>();
  for (const profile of profiles) {
    profilesByUserId.set(profile.user_id, profile);
  }

  const employerIds = new Set<string>();
  for (const employerId of jobsByEmployerId.keys()) {
    employerIds.add(employerId);
  }
  for (const employer of employers) {
    employerIds.add(employer.id);
  }
  for (const profile of profiles) {
    employerIds.add(profile.user_id);
  }

  const mergedBySlug = new Map<string, Company>();

  for (const employerId of employerIds) {
    const employer = employersById.get(employerId) ?? null;
    const profile = profilesByUserId.get(employerId) ?? null;
    const employerJobs = jobsByEmployerId.get(employerId) ?? [];
    const latestJob = pickLatestJob(employerJobs);
    const companyName = resolveCompanyName(profile, employer, employerJobs);

    if (!companyName) {
      continue;
    }

    const slug = toSlug(companyName);
    if (!slug || slug === COMPANY_NAME_PLACEHOLDER_SLUG) {
      continue;
    }

    const aliases: string[] = [];
    const candidateNames = [
      companyName,
      normalizeString(profile?.company_name),
      normalizeString(employer?.company_name),
      ...employerJobs.map((job) => normalizeString(job.company_name)),
    ];

    for (const candidateName of candidateNames) {
      if (!isPublicCompanyName(candidateName)) {
        continue;
      }

      const aliasSlug = toSlug(candidateName!);
      if (aliasSlug) {
        mergeUniqueItems(aliases, [aliasSlug]);
      }
    }

    const industry: string[] = [];
    mergeUniqueItems(industry, normalizeStringArray(profile?.industry));
    mergeUniqueItems(industry, normalizeStringArray(employer?.industry));
    for (const job of employerJobs) {
      mergeUniqueItems(industry, normalizeStringArray(job.industry));
    }

    const companyOverview =
      normalizeString(profile?.company_overview) ||
      normalizeString(profile?.company_description) ||
      normalizeString(employer?.company_description) ||
      null;

    const company: Company = {
      slug,
      name: companyName,
      aliases,
      employerId,
      logoUrl: normalizeString(profile?.logo_url) || normalizeString(employer?.logo_url) || normalizeString(latestJob?.logo_url),
      coverUrl: normalizeString(profile?.cover_url) || normalizeString(employer?.cover_url) || normalizeString(latestJob?.cover_url),
      location: normalizeString(profile?.location) || normalizeString(employer?.location) || normalizeString(latestJob?.location),
      industry,
      size: normalizeString(profile?.company_size) || normalizeString(employer?.company_size),
      description: companyOverview,
      companyOverview,
      website: normalizeString(profile?.website),
      email: normalizeString(profile?.email) || normalizeString(employer?.email),
      phone: normalizeString(profile?.phone),
      benefits: normalizeStringArray(profile?.benefits),
      culture: normalizeStringArray(profile?.culture),
      vision: normalizeString(profile?.vision),
      mission: normalizeString(profile?.mission),
      updatedAt: normalizeString(profile?.updated_at),
      jobCount: normalizeCount(employerJobs.length),
    };

    const existing = mergedBySlug.get(slug);
    if (!existing) {
      mergedBySlug.set(slug, company);
      continue;
    }

    mergeCompany(existing, company);
  }

  return sortCompanies([...mergedBySlug.values()], "jobs_desc");
}

async function getAllCompaniesImpl(): Promise<Company[]> {
  try {
    const [jobs, employers, profiles] = await Promise.all([
      getAllJobs(),
      getEmployerDirectoryRows(),
      getCompanyProfileDirectoryRows(),
    ]);

    return buildCompaniesFromSources(jobs, employers, profiles);
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
  const companies = await getAllCompanies();
  return filterSortPaginateCompanies(companies, normalizedParams);
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  const normalizedSlug = toSlug(slug.trim());
  if (!normalizedSlug) {
    return undefined;
  }

  // Resolve detail pages against fresh profile/employer snapshots
  // so HR edits are reflected immediately after reload.
  const companies = await getAllCompaniesImpl();
  return companies.find(
    (company) => company.slug === normalizedSlug || (company.aliases ?? []).includes(normalizedSlug),
  );
}

export async function getRelatedJobsByCompanySlug(
  slug: string,
  options: {
    excludeJobId?: string;
    limit?: number;
  } = {},
): Promise<Job[]> {
  const limit = Math.max(1, Math.min(12, Number(options.limit ?? 6)));
  const jobs = await getJobsByCompanySlug(slug);

  return jobs
    .filter((job) => (options.excludeJobId ? job.id !== options.excludeJobId : true))
    .slice(0, limit);
}

export async function getJobsByCompanySlug(slug: string): Promise<Job[]> {
  const company = await getCompanyBySlug(slug);
  if (!company) {
    return [];
  }

  const jobs = await getFreshPublicJobs();

  if (company.employerId) {
    const byEmployer = jobs.filter((job) => normalizeString(job.employer_id) === company.employerId);
    if (byEmployer.length > 0) {
      return byEmployer;
    }
  }

  return jobs.filter((job) => toSlug(job.company_name?.trim() ?? "") === company.slug);
}

export function companySlug(name: string): string {
  return toSlug(name?.trim() ?? "");
}
