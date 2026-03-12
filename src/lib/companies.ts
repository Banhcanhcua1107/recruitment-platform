import "server-only";

import { cache } from "react";
import type { Job } from "@/types/job";
import { getAllJobs } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";
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

const getEmployerProfiles = cache(async function getEmployerProfiles() {
  try {
    const supabase = await createClient();
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
});

const getCompaniesMap = cache(async function getCompaniesMap(): Promise<Map<string, Company>> {
  const jobs = await getAllJobs();
  const employerProfiles = await getEmployerProfiles();
  const map = new Map<string, Company>();

  for (const job of jobs) {
    const name = job.company_name?.trim();
    if (!name) {
      continue;
    }

    const slug = toSlug(name);
    const existing = map.get(slug);
    const employerProfile = employerProfiles.get(slug);

    if (existing) {
      existing.jobCount += 1;
      if (!existing.logoUrl && job.logo_url) existing.logoUrl = job.logo_url;
      if (!existing.coverUrl && job.cover_url) existing.coverUrl = job.cover_url;
      if (!existing.location && job.location) existing.location = job.location;
      for (const industry of job.industry ?? []) {
        if (industry && !existing.industry.includes(industry)) {
          existing.industry.push(industry);
        }
      }

      if (employerProfile) {
        if (!existing.logoUrl) existing.logoUrl = normalizeString(employerProfile.logo_url);
        if (!existing.coverUrl) existing.coverUrl = normalizeString(employerProfile.cover_url);
        if (!existing.location) existing.location = normalizeString(employerProfile.location);
        if (!existing.size) existing.size = normalizeString(employerProfile.company_size);
        if (!existing.description) {
          existing.description = normalizeString(employerProfile.company_description);
        }

        for (const industry of normalizeStringArray(employerProfile.industry)) {
          if (!existing.industry.includes(industry)) {
            existing.industry.push(industry);
          }
        }
      }
    } else {
      map.set(slug, {
        slug,
        name,
        logoUrl: job.logo_url || normalizeString(employerProfile?.logo_url),
        coverUrl: job.cover_url || normalizeString(employerProfile?.cover_url),
        location: job.location || normalizeString(employerProfile?.location),
        industry: [
          ...new Set([
            ...(job.industry ?? []).filter(Boolean),
            ...normalizeStringArray(employerProfile?.industry),
          ]),
        ],
        size: normalizeString(employerProfile?.company_size),
        description: normalizeString(employerProfile?.company_description),
        jobCount: 1,
      });
    }
  }

  return map;
});

export async function getAllCompanies(): Promise<Company[]> {
  return [...(await getCompaniesMap()).values()].sort((a, b) => b.jobCount - a.jobCount);
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  return (await getCompaniesMap()).get(slug);
}

export async function getJobsByCompanySlug(slug: string): Promise<Job[]> {
  const company = await getCompanyBySlug(slug);
  if (!company) {
    return [];
  }

  const jobs = await getAllJobs();
  return jobs.filter((job) => toSlug(job.company_name?.trim() ?? "") === slug);
}

export function companySlug(name: string): string {
  return toSlug(name?.trim() ?? "");
}
