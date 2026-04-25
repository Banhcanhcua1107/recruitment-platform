import { NextResponse } from "next/server";
import { getCandidateDashboardData } from "@/lib/candidate-dashboard";
import type { DashboardData } from "@/types/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  return 500;
}

function toDashboardPayload(data: Awaited<ReturnType<typeof getCandidateDashboardData>>): Omit<DashboardData, "isLoading" | "error"> {
  return {
    user: data.user
      ? {
          id: data.user.id,
          full_name: data.user.fullName,
          email: data.user.email,
          phone: data.user.phone ?? undefined,
          avatar_url: data.user.avatarUrl ?? undefined,
          completion_percentage: data.user.completionPercentage,
        }
      : null,
    stats: data.stats,
    notificationCount: data.notificationCount,
    recentApplications: data.recentApplications.map((application) => ({
      id: application.id,
      job_id: application.jobId,
      status: application.status,
      created_at: application.createdAt,
      job: {
        id: application.job.id,
        title: application.job.title,
        company_name: application.job.companyName,
        logo_url: application.job.logoUrl ?? undefined,
        salary: application.job.salary ?? undefined,
        location: application.job.location ?? undefined,
      },
    })),
    recommendedJobs: data.recommendedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      company_name: job.company_name,
      logo_url: job.logo_url || undefined,
      location: job.location || undefined,
      salary: job.salary || undefined,
      requirements: Array.isArray(job.requirements) ? job.requirements : undefined,
      posted_date: job.posted_date,
      created_at: undefined,
    })),
    cvs: data.cvs.map((cv) => ({
      id: cv.id,
      title: cv.title,
      updated_at: cv.updatedAt,
      url: cv.url,
    })),
  };
}

export async function GET() {
  try {
    const dashboardData = await getCandidateDashboardData();

    return NextResponse.json(toDashboardPayload(dashboardData), {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Khong the tai bang dieu khien moi nhat.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
