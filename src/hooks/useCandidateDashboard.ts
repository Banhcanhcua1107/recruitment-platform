"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { DashboardData, DashboardStats, Application, Job, CV } from "@/types/dashboard";

export function useCandidateDashboard() {
  const [data, setData] = useState<DashboardData>({
    user: null,
    stats: {
      totalApplied: 0,
      profileViews: 0,
      interviews: 0,
      savedJobs: 0,
    },
    recentApplications: [],
    recommendedJobs: [],
    cvs: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient();
      
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          throw new Error("User not authenticated");
        }

        // 1. Fetch User Profile & Stats using Promise.all
        const [
          profileResponse,
          applicationsResponse,
          savedJobsResponse,
          cvsResponse,
          viewsResponse
        ] = await Promise.all([
            // Profile
            supabase
              .from("candidate_profiles")
              .select("*")
              .eq("user_id", authUser.id)
              .single(),
            
            // Applications (Recent & Count) - No nested companies query needed now
            supabase
              .from("applications")
              .select(`
                id, status, created_at, job_id,
                jobs (
                  id, title, company_name, logo_url, salary, location
                )
              `)
              .eq("candidate_id", authUser.id)
              .order("created_at", { ascending: false }),

            // Saved Jobs Count
            supabase
              .from("saved_jobs")
              .select("id", { count: "exact", head: true })
              .eq("user_id", authUser.id),

            // CVs
            supabase
              .from("cvs")
              .select("*")
              .eq("user_id", authUser.id)
              .order("updated_at", { ascending: false })
              .limit(3),

            // Profile Views
            supabase
               .from("profile_views")
               .select("id", { count: "exact", head: true })
               .eq("candidate_id", authUser.id)
        ]);

        // Process Applications
        const applications = applicationsResponse.data || [];
        const recentApplications: Application[] = applications.slice(0, 5).map((app: any) => ({
          id: app.id,
          job_id: app.job_id,
          status: app.status,
          created_at: app.created_at,
          job: {
            id: app.jobs.id,
            title: app.jobs.title,
            company_name: app.jobs.company_name,
            logo_url: app.jobs.logo_url,
            salary: app.jobs.salary,
            location: app.jobs.location
          }
        }));

        // Calculate Stats
        const stats: DashboardStats = {
          totalApplied: applications.length,
          interviews: applications.filter((app: any) => app.status === 'interviewing').length,
          savedJobs: savedJobsResponse.count || 0,
          profileViews: viewsResponse.count || 0,
        };

        // User Profile Data
        const profile = profileResponse.data || {
           id: authUser.id,
           full_name: authUser.user_metadata?.full_name || authUser.email,
           email: authUser.email,
           avatar_url: authUser.user_metadata?.avatar_url
        };

        const completionPercentage = profileResponse.data ? 70 : 30;

        // Suggested Jobs
        const { data: recommendedJobsData } = await supabase
            .from("jobs")
            .select(`
                id, title, company_name, logo_url, salary, location, requirements
            `)
            .limit(4)
            .order("created_at", { ascending: false });
        
        const recommendedJobs: Job[] = (recommendedJobsData || []).map((job: any) => ({
            id: job.id,
            title: job.title,
            company_name: job.company_name,
            logo_url: job.logo_url,
            salary: job.salary,
            location: job.location,
            requirements: job.requirements
        }));

        const cvs: CV[] = (cvsResponse.data || []).map((cv: any) => ({
            id: cv.id,
            title: cv.title || "Untitled CV",
            thumbnail_url: cv.thumbnail_url,
            updated_at: cv.updated_at,
            url: cv.url
        }));

        setData({
          user: { ...profile, completion_percentage: completionPercentage },
          stats,
          recentApplications,
          recommendedJobs,
          cvs,
          isLoading: false,
          error: null,
        });

      } catch (err: any) {
        console.error("Dashboard Fetch Error:", err);
        setData(prev => ({ ...prev, isLoading: false, error: err.message || "Failed to load dashboard data" }));
      }
    }

    fetchDashboardData();
  }, []);

  return data;
}
