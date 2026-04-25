"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Application } from "@/types/dashboard";

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
    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchApplications() {
      try {
        const response = await fetch("/api/candidate/applications", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as
          | { applications?: Application[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Khong the tai danh sach ung tuyen moi nhat.");
        }

        setState({
          applications: Array.isArray(payload?.applications) ? payload.applications : [],
          isLoading: false,
          error: null,
        });

        if (!activeChannel) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            return;
          }

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
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "jobs",
              },
              () => {
                void fetchApplications();
              }
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "employers",
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
              : "Khong the tai danh sach ung tuyen.",
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
