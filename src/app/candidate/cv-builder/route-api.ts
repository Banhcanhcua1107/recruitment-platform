import type { ResumeBlock, ResumeRow } from "./api";

export type { ResumeRow } from "./api";

async function requestCvBuilderApi<T>(
  input: string,
  init?: RequestInit & {
    errorMessage?: string;
  }
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error || init?.errorMessage || "Khong the xu ly yeu cau CV.");
  }

  return payload;
}

const RESUME_LIST_CACHE_TTL_MS = 5_000;
let resumeListCache:
  | {
      expiresAt: number;
      promise: Promise<ResumeRow[]>;
    }
  | null = null;

function invalidateResumeListCache() {
  resumeListCache = null;
}

export async function getMyResumes(): Promise<ResumeRow[]> {
  const now = Date.now();
  if (resumeListCache && resumeListCache.expiresAt > now) {
    return resumeListCache.promise;
  }

  const promise = requestCvBuilderApi<{ items?: ResumeRow[] }>("/api/cv-builder/resumes", {
    errorMessage: "Khong the tai danh sach CV.",
  }).then((payload) => (Array.isArray(payload.items) ? payload.items : []));

  resumeListCache = {
    expiresAt: now + RESUME_LIST_CACHE_TTL_MS,
    promise,
  };

  return promise;
}

export async function getResumeById(id: string): Promise<ResumeRow | null> {
  try {
    const payload = await requestCvBuilderApi<{ item?: ResumeRow | null }>(
      `/api/cv-builder/resumes/${encodeURIComponent(id)}`,
      {
        errorMessage: "Khong the tai CV da chon.",
      },
    );
    return payload.item ?? null;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      return null;
    }

    throw error;
  }
}

export async function createResume(
  templateId: string,
  title = "CV cua toi",
): Promise<ResumeRow | null> {
  const payload = await requestCvBuilderApi<{ item?: ResumeRow | null }>(
    "/api/cv-builder/resumes",
    {
      method: "POST",
      body: JSON.stringify({
        templateId,
        title,
      }),
      errorMessage: "Khong the tao CV moi.",
    },
  );
  invalidateResumeListCache();
  return payload.item ?? null;
}

export async function saveResume(
  id: string,
  updates: {
    title?: string;
    resume_data?: ResumeBlock[];
    current_styling?: Record<string, unknown>;
  },
): Promise<void> {
  await requestCvBuilderApi<{ ok?: boolean }>(`/api/cv-builder/resumes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
    errorMessage: "Khong the luu CV.",
  });
  invalidateResumeListCache();
}

export async function deleteResume(id: string): Promise<void> {
  await requestCvBuilderApi<{ ok?: boolean }>(`/api/cv-builder/resumes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    errorMessage: "Khong the xoa CV.",
  });
  invalidateResumeListCache();
}

export async function renameResume(id: string, title: string): Promise<void> {
  await saveResume(id, { title });
}

export async function createResumeFromSections(
  sections: Array<{
    type: string;
    isVisible: boolean;
    data: unknown;
  }>,
  options?: {
    title?: string;
    templateId?: string | null;
  },
): Promise<ResumeRow | null> {
  const payload = await requestCvBuilderApi<{ item?: ResumeRow | null }>(
    "/api/cv-builder/resumes",
    {
      method: "POST",
      body: JSON.stringify({
        sections,
        options,
      }),
      errorMessage: "Khong the tao CV tu du lieu da phan tich.",
    },
  );
  invalidateResumeListCache();
  return payload.item ?? null;
}
