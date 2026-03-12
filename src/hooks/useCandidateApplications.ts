"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Application } from "@/types/dashboard";

export interface ApplicationsState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
}

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

export function useCandidateApplications() {
  const [state, setState] = useState<ApplicationsState>({
    applications: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchApplications() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Bạn cần đăng nhập để xem đơn ứng tuyển.");
        }

        const { data, error } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            created_at,
            updated_at,
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
          .eq("candidate_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const applications: Application[] = (data || []).map((application) => {
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

        setState({
          applications,
          isLoading: false,
          error: null,
        });

        if (!activeChannel) {
          activeChannel = supabase
            .channel(`candidate-applications-${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "applications",
                filter: `candidate_id=eq.${user.id}`,
              },
              () => {
                void fetchApplications();
              }
            )
            .subscribe();
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách ứng tuyển.",
        }));
      }
    }

    void fetchApplications();

    return () => {
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  return state;
}
