"use client";

export type CandidateCvOptionClientItem = {
  path: string;
  label: string;
  createdAt: string;
  source: "profile" | "uploaded" | "builder";
  resumeId?: string;
  downloadUrl?: string | null;
};

const CV_OPTIONS_CACHE_TTL_MS = 10_000;

let cachedOptions:
  | {
      expiresAt: number;
      promise: Promise<CandidateCvOptionClientItem[]>;
    }
  | null = null;

export function invalidateCandidateCvOptionsClientCache() {
  cachedOptions = null;
}

export async function getCandidateCvOptionsCached(options: { force?: boolean } = {}) {
  const now = Date.now();
  if (!options.force && cachedOptions && cachedOptions.expiresAt > now) {
    return cachedOptions.promise;
  }

  const promise = fetch("/api/candidate/cv-options", {
    cache: "no-store",
    credentials: "same-origin",
  }).then(async (response) => {
    const payload = (await response.json().catch(() => ({}))) as {
      items?: CandidateCvOptionClientItem[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Khong the tai danh sach CV da upload.");
    }

    return Array.isArray(payload.items) ? payload.items : [];
  });

  cachedOptions = {
    expiresAt: now + CV_OPTIONS_CACHE_TTL_MS,
    promise,
  };

  return promise;
}
