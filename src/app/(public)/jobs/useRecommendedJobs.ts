"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RECOMMENDATION_CACHE_KEY,
  resolveRecommendedJobsData,
} from "./jobs-page.utils";
import type { ResolvedRecommendedJobsData } from "./jobs-page.types";

type RecommendationStatus = "loading" | "ready" | "empty";

function readRecommendationCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRecommendationCache(payload: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / storage errors on a public page.
  }
}

export function useRecommendedJobs() {
  const [status, setStatus] = React.useState<RecommendationStatus>("loading");
  const [data, setData] = React.useState<ResolvedRecommendedJobsData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
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

      const hasAuthenticatedUser = Boolean(authResult?.data?.user);
      const apiPayload = response?.ok ? await response.json().catch(() => null) : null;
      const localPayload = hasAuthenticatedUser ? readRecommendationCache() : null;

      if (!cancelled) {
        setIsAuthenticated(hasAuthenticatedUser);
      }

      if (response?.ok && apiPayload) {
        writeRecommendationCache({
          ...apiPayload,
          cachedAt: new Date().toISOString(),
        });
      }

      const resolved = resolveRecommendedJobsData({
        apiPayload,
        localPayload,
        allowLocalFallback: hasAuthenticatedUser,
      });

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
  }, []);

  const analyzeRecommendations = React.useCallback(async () => {
    setIsAnalyzing(true);
    setStatus("loading");
    setError(null);

    try {
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

      writeRecommendationCache({
        ...payload,
        cachedAt: new Date().toISOString(),
      });

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
  }, []);

  return {
    status,
    data,
    error,
    isAnalyzing,
    isAuthenticated,
    analyzeRecommendations,
  };
}
