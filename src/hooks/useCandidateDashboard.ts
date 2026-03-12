"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Application, CV, DashboardData, DashboardStats, Job } from "@/types/dashboard";

function normalizeStatus(status: string | null | undefined): Application["status"] {
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

export function useCandidateDashboard() {
  const [data, setData] = useState<DashboardData>({
    user: null,
    stats: {
      totalApplied: 0,
      profileViews: 0,
      interviews: 0,
      savedJobs: 0,
    },
    notificationCount: 0,
    recentApplications: [],
    recommendedJobs: [],
    cvs: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchDashboardData() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          throw new Error("Bạn cần đăng nhập để xem bảng điều khiển.");
        }

        const [
          profileResponse,
          applicationsResponse,
          savedJobsResponse,
          resumesResponse,
          viewsResponse,
          recommendedJobsResponse,
          notificationsResponse,
        ] = await Promise.all([
          supabase.from("candidate_profiles").select("*").eq("user_id", authUser.id).single(),
          supabase
            .from("applications")
            .select(`
              id,
              status,
              created_at,
              job_id,
              jobs (
                id,
                title,
                company_name,
                logo_url,
                salary,
                location
              )
            `)
            .eq("candidate_id", authUser.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("saved_jobs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authUser.id),
          supabase
            .from("resumes")
            .select("id, title, updated_at")
            .eq("user_id", authUser.id)
            .order("updated_at", { ascending: false })
            .limit(3),
          supabase
            .from("profile_views")
            .select("id", { count: "exact", head: true })
            .eq("candidate_id", authUser.id),
          supabase
            .from("jobs")
            .select("id, title, company_name, logo_url, salary, location, requirements")
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", authUser.id)
            .eq("is_read", false),
        ]);

        const applicationsRaw = applicationsResponse.data || [];
        const recentApplications: Application[] = applicationsRaw.slice(0, 5).map((application) => {
          const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
          return {
            id: String(application.id),
            job_id: String(application.job_id),
            status: normalizeStatus(application.status),
            created_at: String(application.created_at),
            job: {
              id: String(job.id),
              title: String(job.title),
              company_name: String(job.company_name),
              logo_url: job.logo_url ? String(job.logo_url) : undefined,
              salary: job.salary ? String(job.salary) : undefined,
              location: job.location ? String(job.location) : undefined,
            },
          };
        });

        const stats: DashboardStats = {
          totalApplied: applicationsRaw.length,
          interviews: applicationsRaw.filter((application) =>
            ["interviewing", "interview"].includes(String(application.status))
          ).length,
          savedJobs: savedJobsResponse.count || 0,
          profileViews: viewsResponse.count || 0,
        };

        const profile = profileResponse.data || {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email,
          email: authUser.email,
          avatar_url: authUser.user_metadata?.avatar_url,
        };

        const completionPercentage = profileResponse.data ? 70 : 30;

        const recommendedJobs: Job[] = (recommendedJobsResponse.data || []).map((job) => ({
          id: String(job.id),
          title: String(job.title),
          company_name: String(job.company_name),
          logo_url: job.logo_url ? String(job.logo_url) : undefined,
          salary: job.salary ? String(job.salary) : undefined,
          location: job.location ? String(job.location) : undefined,
          requirements: Array.isArray(job.requirements)
            ? job.requirements.map((item) => String(item))
            : undefined,
        }));

        const cvs: CV[] = (resumesResponse.data || []).map((resume) => ({
          id: String(resume.id),
          title: String(resume.title || "CV của tôi"),
          updated_at: String(resume.updated_at),
          url: `/candidate/cv-builder/${resume.id}/edit`,
        }));

        setData({
          user: { ...profile, completion_percentage: completionPercentage },
          stats,
          notificationCount: notificationsResponse.count || 0,
          recentApplications,
          recommendedJobs,
          cvs,
          isLoading: false,
          error: null,
        });

        if (!activeChannel) {
          activeChannel = supabase
            .channel(`candidate-dashboard-${authUser.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "applications",
                filter: `candidate_id=eq.${authUser.id}`,
              },
              () => {
                void fetchDashboardData();
              }
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "notifications",
                filter: `recipient_id=eq.${authUser.id}`,
              },
              () => {
                void fetchDashboardData();
              }
            )
            .subscribe();
        }
      } catch (error) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Không thể tải dữ liệu bảng điều khiển.",
        }));
      }
    }

    void fetchDashboardData();

    return () => {
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  return data;
}
