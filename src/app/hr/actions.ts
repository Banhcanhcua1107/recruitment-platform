"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateApplicationStatusForEmployer } from "@/lib/applications";
import {
  closeJob,
  createJob,
  recordCandidateViewed,
  toggleJobPublicVisibility,
  updateCompanyProfile,
  updateJob,
} from "@/lib/recruitment";
import type {
  JobStatus,
  RecruitmentCompanyProfile,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

function parseRequirements(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") {
    return [];
  }

  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseList(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") {
    return [];
  }

  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const numeric = Number(raw.trim());

  if (!Number.isFinite(numeric)) {
    return null;
  }

  const normalized = Math.trunc(numeric);
  return normalized > 0 ? normalized : null;
}

function parseJobInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    status: String(formData.get("status") ?? "draft") as JobStatus,
    description: String(formData.get("description") ?? "").trim(),
    requirements: parseRequirements(formData.get("requirements")),
    salary: String(formData.get("salary") ?? "").trim() || null,
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    coverUrl: String(formData.get("coverUrl") ?? "").trim() || null,
    benefits: parseList(formData.get("benefits")),
    industry: parseList(formData.get("industry")),
    experienceLevel: String(formData.get("experienceLevel") ?? "").trim() || null,
    level: String(formData.get("level") ?? "").trim() || null,
    employmentType: String(formData.get("employmentType") ?? "").trim() || null,
    deadline: String(formData.get("deadline") ?? "").trim() || null,
    educationLevel: String(formData.get("educationLevel") ?? "").trim() || null,
    ageRange: String(formData.get("ageRange") ?? "").trim() || null,
    fullAddress: String(formData.get("fullAddress") ?? "").trim() || null,
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
    targetApplications: parsePositiveInteger(formData.get("targetApplications")),
  };
}

function parseCompanyProfileInput(formData: FormData): RecruitmentCompanyProfile {
  return {
    companyName: String(formData.get("companyName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    coverUrl: String(formData.get("coverUrl") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    industry: parseList(formData.get("industry")),
    companySize: String(formData.get("companySize") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  };
}

export async function createJobAction(formData: FormData) {
  const payload = parseJobInput(formData);
  await createJob(payload);
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/jobs");
  redirect("/hr/jobs");
}

export async function updateJobAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = parseJobInput(formData);
  await updateJob(id, payload);
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/jobs");
  revalidatePath(`/hr/jobs/${id}`);
  redirect("/hr/jobs");
}

export async function closeJobAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await closeJob(id);
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/jobs");
}

export async function toggleJobPublicVisibilityAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const isPublicVisible = String(formData.get("isPublicVisible") ?? "false") === "true";

  await toggleJobPublicVisibility(id, isPublicVisible);
  revalidatePath("/hr/jobs");
  revalidatePath("/jobs");
  revalidatePath("/companies");
}

export async function updateApplicationStatusAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const status = String(
    formData.get("status") ?? "applied"
  ) as RecruitmentPipelineStatus;

  await updateApplicationStatusForEmployer(applicationId, status);
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/candidates");
  revalidatePath("/candidate/applications");
}

export async function recordCandidateViewedAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  await recordCandidateViewed(applicationId);
  revalidatePath("/hr/dashboard");
}

export async function updateCompanyProfileAction(formData: FormData) {
  const payload = parseCompanyProfileInput(formData);
  await updateCompanyProfile(payload);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/jobs/[id]", "page");
  revalidatePath("/companies");
  revalidatePath("/companies/[id]", "page");
  revalidatePath("/hr/dashboard");
  revalidatePath("/hr/jobs");
  revalidatePath("/hr/company");
}
