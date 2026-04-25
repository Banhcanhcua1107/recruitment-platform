"use client";

type RecommendJobsPayload = unknown;

const GET_DEDUPE_TTL_MS = 10_000;
const POST_DEDUPE_TTL_MS = 3_000;

type CacheEntry = {
  expiresAt: number;
  promise: Promise<RecommendJobsPayload | null>;
};

const postCache = new Map<string, CacheEntry>();
let getCache: CacheEntry | null = null;

function sweepPostCache(now = Date.now()) {
  for (const [key, entry] of postCache.entries()) {
    if (entry.expiresAt <= now) {
      postCache.delete(key);
    }
  }
}

async function readJsonPayload(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error || "")
        : "";
    throw new Error(message || "Khong the tai goi y viec lam luc nay.");
  }

  return payload;
}

export function invalidateRecommendJobsCache() {
  getCache = null;
  postCache.clear();
}

export async function getRecommendedJobsPayload() {
  const now = Date.now();
  if (getCache && getCache.expiresAt > now) {
    return getCache.promise;
  }

  const promise = fetch("/api/recommend-jobs", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(readJsonPayload)
    .catch(() => null);

  getCache = {
    expiresAt: now + GET_DEDUPE_TTL_MS,
    promise,
  };

  return promise;
}

export async function postRecommendedJobsPayload(body: Record<string, unknown> = {}) {
  const now = Date.now();
  sweepPostCache(now);

  const cacheKey = JSON.stringify(body);
  const cached = postCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetch("/api/recommend-jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
  })
    .then(readJsonPayload)
    .then((payload) => {
      getCache = null;
      return payload;
    });

  postCache.set(cacheKey, {
    expiresAt: now + POST_DEDUPE_TTL_MS,
    promise,
  });

  return promise;
}
