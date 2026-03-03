import type { Job } from "@/types/job";
import { getAllJobs } from "@/lib/jobs";
import { toSlug } from "@/lib/slug";

/* ── Company type ── */
export interface Company {
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  industry: string[];
  size: string | null;
  jobCount: number;
}

/* ── Build company map once ── */
function buildMap(): Map<string, Company> {
  const jobs = getAllJobs();
  const map = new Map<string, Company>();

  for (const j of jobs) {
    const name = j.company_name?.trim();
    if (!name) continue;
    const slug = toSlug(name);

    const existing = map.get(slug);
    if (existing) {
      existing.jobCount += 1;
      // enrich missing fields
      if (!existing.logoUrl && j.logo_url) existing.logoUrl = j.logo_url;
      if (!existing.coverUrl && j.cover_url) existing.coverUrl = j.cover_url;
      if (!existing.location && j.location) existing.location = j.location;
      for (const ind of j.industry ?? []) {
        if (ind && !existing.industry.includes(ind)) existing.industry.push(ind);
      }
    } else {
      map.set(slug, {
        slug,
        name,
        logoUrl: j.logo_url || null,
        coverUrl: j.cover_url || null,
        location: j.location || null,
        industry: (j.industry ?? []).filter(Boolean),
        size: null,
        jobCount: 1,
      });
    }
  }

  return map;
}

let _cache: Map<string, Company> | null = null;
function cache() {
  if (!_cache) _cache = buildMap();
  return _cache;
}

/** All companies sorted by jobCount desc. */
export function getAllCompanies(): Company[] {
  return [...cache().values()].sort((a, b) => b.jobCount - a.jobCount);
}

/** Single company by slug. */
export function getCompanyBySlug(slug: string): Company | undefined {
  return cache().get(slug);
}

/** All jobs belonging to a company slug. */
export function getJobsByCompanySlug(slug: string): Job[] {
  const company = cache().get(slug);
  if (!company) return [];
  return getAllJobs().filter(
    (j) => toSlug(j.company_name?.trim() ?? "") === slug
  );
}

/** Get slug for a company name. */
export function companySlug(name: string): string {
  return toSlug(name?.trim() ?? "");
}
