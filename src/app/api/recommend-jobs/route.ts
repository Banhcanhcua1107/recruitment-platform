import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getLatestPublicJobSummaries } from "@/lib/public-job-summaries";
import type { Job } from "@/types/job";
import { recommendJobs, preFilterForGemini } from "@/lib/recommend";
import {
  buildCandidateRecommendationText,
  buildCandidateRecommendationTextForUser,
} from "@/lib/recommend/candidate-text";

export const dynamic = "force-dynamic";

type FitLevel = "High" | "Medium" | "Low";

interface RecommendationEntry {
  jobId: string;
  matchScore: number;
  fitLevel: FitLevel;
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

interface RecommendationItem extends RecommendationEntry {
  job: Job;
}

interface RecommendationResponse {
  candidateSummary: string;
  suggestedRoles: string[];
  suggestedCompanies: string[];
  items: RecommendationItem[];
  source?: "cache" | "ai" | "rule-fallback" | "recent-fallback" | "guest-fallback" | "no-jobs";
  cachedAt?: string;
}

const TOP_K = 6;
const GET_TOP_K = 5;
const AUTH_GET_CACHE_TTL_MS = 30_000;
const AUTH_GET_CACHE_MAX_ENTRIES = 80;

type AuthGetCacheEntry = {
  expiresAt: number;
  promise: Promise<RecommendationResponse>;
};

const authGetCache = new Map<string, AuthGetCacheEntry>();

function hasSupabaseAuthCookieHeader(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .some((name) => (
      /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
      || name === "supabase-auth-token"
      || /^supabase-auth-token\.\d+$/.test(name)
    ));
}

function sweepAuthGetCache(now = Date.now()) {
  for (const [key, entry] of authGetCache.entries()) {
    if (entry.expiresAt <= now) {
      authGetCache.delete(key);
    }
  }

  while (authGetCache.size > AUTH_GET_CACHE_MAX_ENTRIES) {
    const firstKey = authGetCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    authGetCache.delete(firstKey);
  }
}

function deleteAuthGetCache(userId: string) {
  authGetCache.delete(userId);
}

async function getAllJobsForRecommendation(): Promise<Job[]> {
  const { getAllJobs } = await import("@/lib/jobs");
  return getAllJobs();
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function clampScore(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.min(100, Math.round(fallback)));
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function resolveFitLevel(value: unknown, score: number): FitLevel {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "high") {
    return "High";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  if (normalized === "low") {
    return "Low";
  }

  if (score >= 80) {
    return "High";
  }

  if (score >= 60) {
    return "Medium";
  }

  return "Low";
}

function sortJobsByFreshness(jobs: Job[]) {
  return [...jobs].sort((left, right) => {
    const leftDate = +new Date(left.posted_date || "");
    const rightDate = +new Date(right.posted_date || "");
    return rightDate - leftDate;
  });
}

function toRecommendationItems(
  recommendations: RecommendationEntry[],
  jobs: Job[],
  topK: number,
): RecommendationItem[] {
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  return recommendations
    .map((recommendation) => {
      const job = jobMap.get(recommendation.jobId);
      if (!job) {
        return null;
      }

      return {
        ...recommendation,
        job,
      } satisfies RecommendationItem;
    })
    .filter((item): item is RecommendationItem => Boolean(item))
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, topK);
}

function buildRecentFallbackItems(jobs: Job[], topK: number): RecommendationItem[] {
  return sortJobsByFreshness(jobs)
    .slice(0, topK)
    .map((job, index) => {
      const score = Math.max(55, 80 - index * 5);
      return {
        jobId: job.id,
        matchScore: score,
        fitLevel: resolveFitLevel(null, score),
        reasons: [
          index === 0
            ? "Việc làm mới nhất trên hệ thống"
            : "Đang được quan tâm trong danh sách tuyển dụng",
        ],
        matchedSkills: [],
        missingSkills: [],
        job,
      } satisfies RecommendationItem;
    });
}

function buildRuleBasedFallback(
  candidateText: string,
  jobs: Job[],
  topK: number,
): RecommendationResponse {
  const ruleResult = recommendJobs(candidateText, jobs, topK);

  const recommendations: RecommendationEntry[] = ruleResult.recommendations.map((item) => {
    const score = clampScore(item.matchScore);
    return {
      jobId: item.jobId,
      matchScore: score,
      fitLevel: resolveFitLevel(item.fitLevel, score),
      reasons: normalizeStringList(item.reasons).slice(0, 2),
      matchedSkills: normalizeStringList(item.matchedSkills).slice(0, 6),
      missingSkills: normalizeStringList(item.missingSkills).slice(0, 4),
    };
  });

  const items = toRecommendationItems(recommendations, jobs, topK);
  const safeItems = items.length > 0 ? items : buildRecentFallbackItems(jobs, topK);
  const suggestedRoles = ruleResult.profile.desired_roles.slice(0, 8);
  const suggestedCompanies = [
    ...new Set(safeItems.map((item) => item.job.company_name).filter(Boolean)),
  ].slice(0, 8);

  const skillPreview = ruleResult.profile.hard_skills.slice(0, 4).join(", ");
  const rolePreview = suggestedRoles.slice(0, 3).join(", ");

  let candidateSummary = "Gợi ý dựa trên hồ sơ hiện có và dữ liệu việc làm đang mở.";
  if (rolePreview && skillPreview) {
    candidateSummary = `Gợi ý theo vai trò ${rolePreview} và nhóm kỹ năng ${skillPreview}.`;
  } else if (rolePreview) {
    candidateSummary = `Gợi ý theo định hướng vai trò ${rolePreview}.`;
  } else if (skillPreview) {
    candidateSummary = `Gợi ý theo kỹ năng nổi bật: ${skillPreview}.`;
  }

  return {
    candidateSummary,
    suggestedRoles,
    suggestedCompanies,
    items: safeItems,
    source: items.length > 0 ? "rule-fallback" : "recent-fallback",
  };
}

function buildGuestFallback(jobs: Job[]): RecommendationResponse {
  const items = buildRecentFallbackItems(jobs, GET_TOP_K);

  return {
    candidateSummary:
      "Đăng nhập để cá nhân hóa gợi ý theo CV và kỹ năng. Dưới đây là các việc làm mới đáng chú ý.",
    suggestedRoles: [],
    suggestedCompanies: [
      ...new Set(items.map((item) => item.job.company_name).filter(Boolean)),
    ].slice(0, 8),
    items,
    source: "guest-fallback",
  };
}

function buildEmptyResponse(source: RecommendationResponse["source"] = "no-jobs"): RecommendationResponse {
  return {
    candidateSummary: "",
    suggestedRoles: [],
    suggestedCompanies: [],
    items: [],
    source,
  };
}

async function buildAuthenticatedGetResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<RecommendationResponse> {
  const { data: cached, error: cacheError } = await supabase
    .from("job_recommendations")
    .select("items, candidate_summary, suggested_roles, suggested_companies, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!cacheError && Array.isArray(cached?.items) && cached.items.length > 0) {
    return {
      candidateSummary: cached.candidate_summary ?? "",
      suggestedRoles: cached.suggested_roles ?? [],
      suggestedCompanies: cached.suggested_companies ?? [],
      items: cached.items,
      cachedAt: cached.updated_at,
      source: "cache",
    } satisfies RecommendationResponse;
  }

  const allJobs = await getAllJobsForRecommendation();

  if (allJobs.length === 0) {
    return buildEmptyResponse("no-jobs");
  }

  const candidateText = await buildCandidateRecommendationTextForUser(supabase, userId);
  const fallback = buildRuleBasedFallback(candidateText, allJobs, GET_TOP_K);

  if (fallback.items.length > 0) {
    await supabase.from("job_recommendations").upsert(
      {
        user_id: userId,
        items: fallback.items,
        candidate_summary: fallback.candidateSummary,
        suggested_roles: fallback.suggestedRoles,
        suggested_companies: fallback.suggestedCompanies,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return fallback;
}

function getAuthenticatedGetResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const now = Date.now();
  const cached = authGetCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = buildAuthenticatedGetResponse(supabase, userId).catch((error) => {
    deleteAuthGetCache(userId);
    throw error;
  });

  authGetCache.set(userId, {
    expiresAt: now + AUTH_GET_CACHE_TTL_MS,
    promise,
  });
  sweepAuthGetCache(now);

  return promise;
}

/* GET: cached-first, but never dead-empty if jobs exist */
export async function GET(request: Request) {
  try {
    if (!hasSupabaseAuthCookieHeader(request)) {
      const allJobs = (await getLatestPublicJobSummaries(GET_TOP_K)) as Job[];
      return NextResponse.json(
        allJobs.length > 0 ? buildGuestFallback(allJobs) : buildEmptyResponse("no-jobs"),
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const allJobs = (await getLatestPublicJobSummaries(GET_TOP_K)) as Job[];
      return NextResponse.json(
        allJobs.length > 0 ? buildGuestFallback(allJobs) : buildEmptyResponse("no-jobs"),
      );
    }

    return NextResponse.json(await getAuthenticatedGetResponse(supabase, user.id));
  } catch (err: unknown) {
    console.error("recommend-jobs GET error:", err);
    return NextResponse.json(buildEmptyResponse("no-jobs"));
  }
}

export async function POST(request: Request) {
  try {
    let manualText = "";
    try {
      const body = (await request.json()) as { candidate_text?: unknown };
      manualText = typeof body?.candidate_text === "string" ? body.candidate_text.trim() : "";
    } catch {
      manualText = "";
    }

    const authUser = hasSupabaseAuthCookieHeader(request)
      ? (await (async () => {
          const supabase = await createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          return { supabase, user };
        })())
      : null;

    const candidateText = authUser?.user
      ? await buildCandidateRecommendationTextForUser(authUser.supabase, authUser.user.id, manualText)
      : await buildCandidateRecommendationText(manualText);
    const allJobs: Job[] = await getAllJobsForRecommendation();

    if (allJobs.length === 0) {
      return NextResponse.json(buildEmptyResponse("no-jobs"));
    }

    let source: RecommendationResponse["source"] = "ai";
    let candidateSummary = "";
    let suggestedRoles: string[] = [];
    let suggestedCompanies: string[] = [];
    let recommendations: RecommendationEntry[] = [];

    try {
      const { filteredJobs } = preFilterForGemini(candidateText, allJobs, 40);
      const { rankJobsWithGemini } = await import("@/lib/gemini");
      const aiResult = await rankJobsWithGemini({
        candidateText,
        jobs: filteredJobs.length > 0 ? filteredJobs : allJobs,
        topK: TOP_K,
      });

      candidateSummary = String(aiResult.candidateSummary ?? "").trim();
      suggestedRoles = normalizeStringList(aiResult.suggestedRoles).slice(0, 8);
      suggestedCompanies = normalizeStringList(aiResult.suggestedCompanies).slice(0, 8);

      recommendations = aiResult.recommendations.map((item) => {
        const score = clampScore(item.matchScore);
        return {
          jobId: item.jobId,
          matchScore: score,
          fitLevel: resolveFitLevel(item.fitLevel, score),
          reasons: normalizeStringList(item.reasons).slice(0, 2),
          matchedSkills: normalizeStringList(item.matchedSkills).slice(0, 6),
          missingSkills: normalizeStringList(item.missingSkills).slice(0, 4),
        };
      });

      if (recommendations.length === 0) {
        source = "rule-fallback";
      }
    } catch (aiErr) {
      source = "rule-fallback";
      console.warn(
        "Ollama unavailable, using local recommendation pipeline:",
        aiErr instanceof Error ? aiErr.message : aiErr,
      );
    }

    let items = toRecommendationItems(recommendations, allJobs, TOP_K);

    if (items.length === 0) {
      const fallback = buildRuleBasedFallback(candidateText, allJobs, TOP_K);
      items = fallback.items;
      source = fallback.source ?? "rule-fallback";

      if (!candidateSummary) {
        candidateSummary = fallback.candidateSummary;
      }

      if (suggestedRoles.length === 0) {
        suggestedRoles = fallback.suggestedRoles;
      }

      if (suggestedCompanies.length === 0) {
        suggestedCompanies = fallback.suggestedCompanies;
      }
    }

    if (!candidateSummary) {
      candidateSummary = "Gợi ý được làm mới tự động theo hồ sơ và nhu cầu tuyển dụng hiện có.";
    }

    if (suggestedCompanies.length === 0) {
      suggestedCompanies = [
        ...new Set(items.map((item) => item.job.company_name).filter(Boolean)),
      ].slice(0, 8);
    }

    if (authUser?.user && items.length > 0) {
      await authUser.supabase
        .from("job_recommendations")
        .upsert(
          {
            user_id: authUser.user.id,
            items,
            candidate_summary: candidateSummary,
            suggested_roles: suggestedRoles,
            suggested_companies: suggestedCompanies,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      deleteAuthGetCache(authUser.user.id);
    }

    return NextResponse.json({
      candidateSummary,
      suggestedRoles,
      suggestedCompanies,
      items,
      source,
    } satisfies RecommendationResponse);
  } catch (err: unknown) {
    console.error("recommend-jobs error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message, ...buildEmptyResponse("no-jobs") }, { status: 500 });
  }
}
