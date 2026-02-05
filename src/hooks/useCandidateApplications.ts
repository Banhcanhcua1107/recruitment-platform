
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Application, Job } from "@/types/dashboard";

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

        const applications: Application[] = (data || []).map((app: any) => ({
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

        setState({
          applications,
          isLoading: false,
          error: null,
        });

      } catch (err: any) {
        console.error("Applications Fetch Error:", err);
        setState(prev => ({ ...prev, isLoading: false, error: err.message || "Failed to load applications" }));
      }
    }

    fetchApplications();
  }, []);

  return state;
}
