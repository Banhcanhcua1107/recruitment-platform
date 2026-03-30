import "server-only";

import { cache } from "react";
import type { Job } from "@/types/job";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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

async function getSupabaseJobsImpl(): Promise<Job[]> {
  try {
    const supabase = await createClient();

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

const getCachedSupabaseJobs = cache(getSupabaseJobsImpl);

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
