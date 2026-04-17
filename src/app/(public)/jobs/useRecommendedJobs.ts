"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RECOMMENDATION_CACHE_KEY,
  resolveRecommendedJobsData,
} from "./jobs-page.utils";
import type { ResolvedRecommendedJobsData } from "./jobs-page.types";

type RecommendationStatus = "loading" | "ready" | "empty";

interface RecommendationCacheEnvelope {
  ownerUserId: string;
  payload: unknown;
  cachedAt: string;
}

function readRecommendationCache(ownerUserId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RecommendationCacheEnvelope | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (
      typeof parsed.ownerUserId !== "string" ||
      parsed.ownerUserId.trim().length === 0 ||
      parsed.ownerUserId !== ownerUserId
    ) {
      return null;
    }

    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

function writeRecommendationCache(payload: unknown, ownerUserId: string) {
  if (typeof window === "undefined") return;

  try {
    const envelope: RecommendationCacheEnvelope = {
      ownerUserId,
      payload,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota / storage errors on a public page.
  }
}

interface UseRecommendedJobsOptions {
  enabled?: boolean;
}

export function useRecommendedJobs(options: UseRecommendedJobsOptions = {}) {
  const { enabled = true } = options;
  const [status, setStatus] = React.useState<RecommendationStatus>("loading");
  const [data, setData] = React.useState<ResolvedRecommendedJobsData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      setStatus("empty");
      setData(null);
      setError(null);
      setIsAnalyzing(false);
      setIsAuthenticated(false);
      return;
    }

    let cancelled = false;

    async function loadRecommendations() {
      setStatus("loading");
      setError(null);

      const supabase = createClient();

      const [authResult, response] = await Promise.all([
        supabase.auth.getUser().catch(() => null),
        fetch("/api/recommend-jobs", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }).catch(() => null),
      ]);

      const authUserId = authResult?.data?.user?.id || "";
      const hasAuthenticatedUser = authUserId.length > 0;
      let apiPayload = response?.ok ? await response.json().catch(() => null) : null;
      const localPayload = hasAuthenticatedUser
        ? readRecommendationCache(authUserId)
        : null;

      if (!cancelled) {
        setIsAuthenticated(hasAuthenticatedUser);
      }

      if (response?.ok && apiPayload && hasAuthenticatedUser) {
        writeRecommendationCache(apiPayload, authUserId);
      }

      let resolved = resolveRecommendedJobsData({
        apiPayload,
        localPayload,
        allowLocalFallback: hasAuthenticatedUser,
      });

      if (!resolved && hasAuthenticatedUser) {
        const regenerateResponse = await fetch("/api/recommend-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          credentials: "same-origin",
        }).catch(() => null);

        const regeneratedPayload = regenerateResponse?.ok
          ? await regenerateResponse.json().catch(() => null)
          : null;

        if (regeneratedPayload) {
          apiPayload = regeneratedPayload;
          writeRecommendationCache(regeneratedPayload, authUserId);

          resolved = resolveRecommendedJobsData({
            apiPayload,
            localPayload,
            allowLocalFallback: true,
          });
        }
      }

      if (cancelled) return;

      if (resolved) {
        setData(resolved);
        setStatus("ready");
        return;
      }

      setData(null);
      setStatus("empty");
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const analyzeRecommendations = React.useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsAnalyzing(true);
    setStatus("loading");
    setError(null);

    try {
      const supabase = createClient();
      const authUserResult = await supabase.auth.getUser().catch(() => null);
      const authUserId = authUserResult?.data?.user?.id || "";

      const response = await fetch("/api/recommend-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Không thể phân tích hồ sơ lúc này.");
      }

      if (authUserId) {
        writeRecommendationCache(payload, authUserId);
      }

      const resolved = resolveRecommendedJobsData({
        apiPayload: payload,
        localPayload: null,
      });

      if (resolved) {
        setData(resolved);
        setStatus("ready");
      } else {
        setData(null);
        setStatus("empty");
        setError("Hồ sơ hiện chưa đủ dữ liệu để tạo gợi ý phù hợp.");
      }
    } catch (nextError) {
      setData(null);
      setStatus("empty");
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Không thể phân tích hồ sơ lúc này.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled]);

  return {
    status,
    data,
    error,
    isAnalyzing,
    isAuthenticated,
    analyzeRecommendations,
  };
}
