import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const APPLICATION_BUCKET = "cv_uploads";
const CV_OPTIONS_CACHE_TTL_MS = 30_000;
const CV_OPTIONS_CACHE_MAX_ENTRIES = 100;

type CandidateCvOptionsCacheEntry = {
  expiresAt: number;
  items: CandidateCvOption[];
};

const candidateCvOptionsCache = new Map<string, CandidateCvOptionsCacheEntry>();

export interface CandidateCvOption {
  path: string;
  label: string;
  createdAt: string;
  source: "profile" | "uploaded" | "builder";
  resumeId?: string;
  downloadUrl?: string | null;
}

type ApplicationCvRow = {
  cv_file_path?: string | null;
  created_at?: string | null;
  jobs?: { title?: string | null; company_name?: string | null } | Array<{
    title?: string | null;
    company_name?: string | null;
  }> | null;
};

type ResumeOptionRow = {
  id?: string | null;
  title?: string | null;
  updated_at?: string | null;
};

function safeTrim(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function hasOwnedCvStoragePath(path: unknown, ownerUserId: string) {
  const normalizedPath = safeTrim(path);
  const normalizedOwner = safeTrim(ownerUserId);

  if (!normalizedPath || !normalizedOwner) {
    return false;
  }

  return normalizedPath.startsWith(`${normalizedOwner}/`);
}

function getApplicationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error ?? "");
}

function isStorageObjectMissingError(error: unknown) {
  const message = getApplicationErrorMessage(error).toLowerCase();
  return message.includes("object not found") || message.includes("not found");
}

function isApplicationSchemaError(error: unknown, markers: string[]) {
  const message = getApplicationErrorMessage(error).toLowerCase();
  return markers.some((marker) => message.includes(marker.toLowerCase()));
}

function sweepCandidateCvOptionsCache(now = Date.now()) {
  for (const [key, entry] of candidateCvOptionsCache.entries()) {
    if (entry.expiresAt <= now) {
      candidateCvOptionsCache.delete(key);
    }
  }

  while (candidateCvOptionsCache.size > CV_OPTIONS_CACHE_MAX_ENTRIES) {
    const firstKey = candidateCvOptionsCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    candidateCvOptionsCache.delete(firstKey);
  }
}

function getCachedCandidateCvOptions(userId: string) {
  const now = Date.now();
  const cached = candidateCvOptionsCache.get(userId);
  if (!cached || cached.expiresAt <= now) {
    if (cached) {
      candidateCvOptionsCache.delete(userId);
    }
    return null;
  }

  return cached.items;
}

function setCachedCandidateCvOptions(userId: string, items: CandidateCvOption[]) {
  const now = Date.now();
  candidateCvOptionsCache.set(userId, {
    expiresAt: now + CV_OPTIONS_CACHE_TTL_MS,
    items,
  });
  sweepCandidateCvOptionsCache(now);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

async function assertCandidateViewer(supabase: SupabaseClient, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (profile?.role && profile.role !== "candidate") {
    throw new Error("Only candidates can access candidate CV options.");
  }
}

export async function listCandidateCvOptions(): Promise<CandidateCvOption[]> {
  const { supabase, user } = await getAuthenticatedUser();
  await assertCandidateViewer(supabase, user.id);

  const cachedItems = getCachedCandidateCvOptions(user.id);
  if (cachedItems) {
    return cachedItems.map((item) => ({ ...item }));
  }

  const items: CandidateCvOption[] = [];
  const seen = new Set<string>();

  const [
    { data: profileCv, error: profileCvError },
    { data: applicationCvs, error: applicationCvError },
    { data: resumes, error: resumesError },
  ] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select("cv_file_path, updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("cv_file_path, created_at, jobs ( title, company_name )")
      .eq("candidate_id", user.id)
      .not("cv_file_path", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("resumes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (
    profileCvError &&
    !isApplicationSchemaError(profileCvError, [
      'relation "candidate_profiles" does not exist',
      "could not find the table 'public.candidate_profiles' in the schema cache",
      'column "cv_file_path" does not exist',
    ])
  ) {
    throw new Error(profileCvError.message);
  }

  if (applicationCvError) {
    throw new Error(applicationCvError.message);
  }

  if (resumesError) {
    throw new Error(resumesError.message);
  }

  const profilePath = safeTrim(profileCv?.cv_file_path);
  if (profilePath && hasOwnedCvStoragePath(profilePath, user.id) && !seen.has(profilePath)) {
    seen.add(profilePath);
    items.push({
      path: profilePath,
      label: "CV trong hồ sơ",
      createdAt: String(profileCv?.updated_at || new Date().toISOString()),
      source: "profile",
    });
  }

  for (const row of (applicationCvs ?? []) as ApplicationCvRow[]) {
    const path = safeTrim(row.cv_file_path);
    if (!path || seen.has(path) || !hasOwnedCvStoragePath(path, user.id)) {
      continue;
    }

    seen.add(path);
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const jobTitle = safeTrim(job?.title) || "CV đã tải lên";
    const companyName = safeTrim(job?.company_name);

    items.push({
      path,
      label: companyName ? `${jobTitle} - ${companyName}` : jobTitle,
      createdAt: String(row.created_at || new Date().toISOString()),
      source: "uploaded",
    });
  }

  for (const resume of (resumes ?? []) as ResumeOptionRow[]) {
    items.push({
      path: "",
      label: `${String(resume.title || "CV đã tạo")} (CV Builder)`,
      createdAt: String(resume.updated_at || new Date().toISOString()),
      source: "builder",
      resumeId: String(resume.id),
    });
  }

  const admin = createAdminClient();
  const availableItems = await Promise.all(
    items.map(async (item) => {
      if (!item.path || item.source === "builder") {
        return item;
      }

      const { data, error } = await admin.storage
        .from(APPLICATION_BUCKET)
        .createSignedUrl(item.path, 60);

      if (data?.signedUrl) {
        return {
          ...item,
          downloadUrl: data.signedUrl,
        };
      }

      if (isStorageObjectMissingError(error)) {
        return null;
      }

      return {
        ...item,
        downloadUrl: null,
      };
    })
  );

  const result = availableItems
    .filter((item): item is CandidateCvOption => Boolean(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  setCachedCandidateCvOptions(user.id, result);
  return result.map((item) => ({ ...item }));
}
