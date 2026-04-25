import "server-only";

import { calculateCandidateProfileCompletion } from "@/lib/candidate-profile-shared";
import { getCurrentCandidateProfile } from "@/lib/candidate-profiles";
import { getCandidateApplicationsList } from "@/lib/applications";
import { getFreshPublicJobs } from "@/lib/jobs";
import type { CandidateDashboardData } from "@/types/candidate-dashboard";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";
import { createClient } from "@/utils/supabase/server";

const PROFILE_VIEWS_SCHEMA_MARKERS = [
  'relation "profile_views" does not exist',
  "could not find the table 'public.profile_views' in the schema cache",
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error ?? "");
}

function isSchemaError(error: unknown, markers: string[]) {
  const message = getErrorMessage(error).toLowerCase();
  return markers.some((marker) => message.includes(marker.toLowerCase()));
}

function normalizeDashboardStatus(status: string): RecruitmentPipelineStatus {
  switch (status) {
    case "pending":
    case "new":
    case "applied":
      return "applied";
    case "viewed":
    case "reviewing":
      return "reviewing";
    case "interviewing":
    case "interview":
      return "interview";
    case "offered":
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "applied";
  }
}

export async function getCandidateDashboardData(): Promise<CandidateDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Bạn cần đăng nhập để xem bảng điều khiển.");
  }

  const [
    profile,
    recentApplications,
    recommendedJobs,
    { count: savedJobsCount, error: savedJobsError },
    { count: unreadNotificationCount, error: notificationsError },
    { count: profileViewsCount, error: profileViewsError },
    { data: resumeRows, error: resumesError },
  ] = await Promise.all([
    getCurrentCandidateProfile(),
    getCandidateApplicationsList(),
    getFreshPublicJobs(),
    supabase
      .from("saved_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false),
    supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", user.id),
    supabase
      .from("resumes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  if (savedJobsError) {
    throw new Error(savedJobsError.message);
  }

  if (notificationsError) {
    throw new Error(notificationsError.message);
  }

  if (profileViewsError && !isSchemaError(profileViewsError, PROFILE_VIEWS_SCHEMA_MARKERS)) {
    throw new Error(profileViewsError.message);
  }

  if (resumesError) {
    throw new Error(resumesError.message);
  }

  const completionPercentage = calculateCandidateProfileCompletion(profile);
  const interviews = recentApplications.filter(
    (application) => normalizeDashboardStatus(application.status) === "interview"
  ).length;

  return {
    user: {
      id: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone || null,
      avatarUrl: profile.avatarUrl,
      completionPercentage,
    },
    stats: {
      totalApplied: recentApplications.length,
      profileViews: profileViewsCount ?? 0,
      interviews,
      savedJobs: savedJobsCount ?? 0,
    },
    notificationCount: unreadNotificationCount ?? 0,
    recentApplications: recentApplications.slice(0, 5).map((application) => ({
      id: application.id,
      jobId: application.job_id,
      status: normalizeDashboardStatus(application.status),
      appliedAt: application.created_at,
      createdAt: application.created_at,
      updatedAt: application.created_at,
      job: {
        id: application.job.id,
        title: application.job.title,
        companyName: application.job.company_name,
        logoUrl: application.job.logo_url ?? null,
        salary: application.job.salary ?? null,
        location: application.job.location ?? null,
      },
    })),
    recommendedJobs: recommendedJobs.slice(0, 6),
    cvs: (resumeRows ?? []).map((resume) => ({
      id: String(resume.id),
      title: String(resume.title || "CV của tôi"),
      updatedAt: String(resume.updated_at || new Date().toISOString()),
      url: `/candidate/cv-builder/${resume.id}/edit`,
    })),
  };
}
