
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Application } from "@/types/dashboard";

export interface ApplicationsState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
}

export function useCandidateApplications() {
  const [state, setState] = useState<ApplicationsState>({
    applications: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchApplications() {
      const supabase = createClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
          .from("applications")
          .select(`
            id, status, created_at, job_id,
            jobs (
              id, title, company_name, logo_url, salary, location
            )
          `)
          .eq("candidate_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;



        const applications: Application[] = (data || []).map((app) => {
          const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
          return {
            id: app.id,
            job_id: app.job_id,
            status: app.status as Application["status"],
            created_at: app.created_at,
            job: {
              id: job.id,
              title: job.title,
              company_name: job.company_name,
              logo_url: job.logo_url,
              salary: job.salary,
              location: job.location
            }
          };
        });

        setState({
          applications,
          isLoading: false,
          error: null,
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load applications";
        console.error("Applications Fetch Error:", err);
        setState(prev => ({ ...prev, isLoading: false, error: message }));
      }
    }

    fetchApplications();
  }, []);

  return state;
}
