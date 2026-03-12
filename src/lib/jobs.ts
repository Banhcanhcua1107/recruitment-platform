import "server-only";

import { cache } from "react";
import type { Job } from "@/types/job";
import { createClient } from "@/utils/supabase/server";

function normalizeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return String(value);
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
  };
}

const getSupabaseJobs = cache(async function getSupabaseJobs(): Promise<Job[]> {
  try {
    const supabase = await createClient();

    let query = supabase
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

    return data.map((row) => toJob(row as Record<string, unknown>));
  } catch {
    return [];
  }
});

/** Return every public job. */
export async function getAllJobs(): Promise<Job[]> {
  return getSupabaseJobs();
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
