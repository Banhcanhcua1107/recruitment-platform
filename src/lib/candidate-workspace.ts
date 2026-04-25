import "server-only";

import type { Job } from "@/types/job";
import { createClient } from "@/utils/supabase/server";

export interface CandidateSavedJobItem {
  savedAt: string;
  job: Job;
}

export interface CandidateRecommendedJobItem {
  jobId: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  job: Job;
}

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
    employer_id:
      typeof row.employer_id === "string" && row.employer_id.trim().length > 0
        ? row.employer_id
        : null,
  };
}

function toRecommendationItem(value: unknown): CandidateRecommendedJobItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const job = item.job;

  if (!job || typeof job !== "object") {
    return null;
  }

  const fitLevel = normalizeString(item.fitLevel, "Low");
  const normalizedFitLevel =
    fitLevel === "High" || fitLevel === "Medium" ? fitLevel : "Low";

  return {
    jobId: normalizeString(item.jobId),
    matchScore: Number(item.matchScore ?? 0) || 0,
    fitLevel: normalizedFitLevel,
    reasons: normalizeStringArray(item.reasons),
    matchedSkills: normalizeStringArray(item.matchedSkills),
    missingSkills: normalizeStringArray(item.missingSkills),
    job: toJob(job as Record<string, unknown>),
  };
}

export async function getCandidateSavedJobs(): Promise<CandidateSavedJobItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .select(
      `
        created_at,
        job:jobs (
          id,
          title,
          company_name,
          logo_url,
          cover_url,
          salary,
          location,
          posted_date,
          source_url,
          description,
          requirements,
          benefits,
          industry,
          experience_level,
          level,
          employment_type,
          deadline,
          education_level,
          age_range,
          full_address,
          employer_id
        )
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const job = row.job;
      if (!job || typeof job !== "object" || Array.isArray(job)) {
        return null;
      }

      return {
        savedAt: normalizeString(row.created_at, new Date().toISOString()),
        job: toJob(job as Record<string, unknown>),
      };
    })
    .filter((item): item is CandidateSavedJobItem => Boolean(item));
}

export async function getCandidateCachedRecommendations(): Promise<CandidateRecommendedJobItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("job_recommendations")
    .select("items")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data || !Array.isArray(data.items)) {
    return [];
  }

  return data.items
    .map((item) => toRecommendationItem(item))
    .filter((item): item is CandidateRecommendedJobItem => Boolean(item));
}
