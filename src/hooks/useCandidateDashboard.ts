"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { DashboardData } from "@/types/dashboard";

type DashboardPayload = Omit<DashboardData, "isLoading" | "error">;

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
        const response = await fetch("/api/candidate/dashboard", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as
          | (DashboardPayload & { error?: string })
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Khong the tai bang dieu khien moi nhat.");
        }

        setData({
          user: payload?.user ?? null,
          stats: payload?.stats ?? {
            totalApplied: 0,
            profileViews: 0,
            interviews: 0,
            savedJobs: 0,
          },
          notificationCount: payload?.notificationCount ?? 0,
          recentApplications: Array.isArray(payload?.recentApplications)
            ? payload.recentApplications
            : [],
          recommendedJobs: Array.isArray(payload?.recommendedJobs)
            ? payload.recommendedJobs
            : [],
          cvs: Array.isArray(payload?.cvs) ? payload.cvs : [],
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
            .channel(`candidate-dashboard-${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "applications",
                filter: `candidate_id=eq.${user.id}`,
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
                filter: `recipient_id=eq.${user.id}`,
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
                table: "jobs",
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
                table: "employers",
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
              : "Khong the tai du lieu bang dieu khien.",
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
