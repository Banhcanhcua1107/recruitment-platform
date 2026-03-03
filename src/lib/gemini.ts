import type { Job } from "@/types/job";

interface CompactJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  industry: string;
  level: string;
  snippet: string;
}

export interface Recommendation {
  jobId: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

export interface GeminiResult {
  candidateSummary: string;
  recommendations: Recommendation[];
}

/**
 * Call Gemini to rank jobs based on candidate text / profile.
 * Returns at most `topK` recommendations with match details.
 */
export async function rankJobsWithGemini({
  candidateText,
  jobs,
  topK = 6,
}: {
  candidateText: string;
  jobs: Job[];
  topK?: number;
}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  // Build a compact job list so the prompt stays small
  const compactJobs: CompactJob[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company_name,
    location: j.location,
    salary: j.salary,
    industry: j.industry?.join(", ") ?? "",
    level: j.level ?? "",
    snippet: (j.description ?? []).slice(0, 2).join(" ").slice(0, 200),
  }));

  const prompt = `You are an intelligent recruitment assistant.

Your task is to analyze a candidate profile and CV, then recommend the most suitable jobs from the provided job list.

=====================================
CANDIDATE PROFILE:
"""
${candidateText}
"""

AVAILABLE JOBS (JSON array):
${JSON.stringify(compactJobs)}
=====================================

Instructions:

1. Carefully analyze the candidate's:
   - Skills (hard skills first)
   - Experience (years + role)
   - Technologies used
   - Industry exposure
   - Projects
   - Location preference (if mentioned)
   - Career objective

2. Determine:
   - Which job roles the candidate is MOST suitable for
   - Which skills strongly match job requirements
   - Which skills are missing

3. From the provided job list:
   - Select ONLY jobs from the list (do NOT invent any jobs or IDs)
   - Rank top ${topK} most suitable jobs
   - Provide matchScore (0-100 integer)
   - Provide fitLevel: "High" (≥75), "Medium" (50-74), or "Low" (<50)
   - Provide clear reasons in Vietnamese referencing real candidate skills
   - Do not invent facts

Output MUST be valid JSON only (no markdown, no extra text) in this exact format:

{
  "candidateSummary": "Tóm tắt ngắn gọn bằng tiếng Việt về ứng viên phù hợp vai trò gì",
  "recommendations": [
    {
      "jobId": "string",
      "matchScore": 0,
      "fitLevel": "High | Medium | Low",
      "reasons": ["...", "..."],
      "matchedSkills": ["..."],
      "missingSkills": ["..."]
    }
  ]
}

Constraints:
- matchScore is integer 0-100
- Return exactly ${topK} items (or fewer if jobs list has less than ${topK})
- matchedSkills and missingSkills max 8 items each
- candidateSummary max 2 sentences in Vietnamese`;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    // Rate-limited — wait and retry
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = 25; // seconds
      console.warn(`Gemini 429 — retrying in ${retryAfter}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (!res.ok) {
      lastError = await res.text();
      if (attempt < MAX_RETRIES) continue;
      throw new Error(`Gemini API error ${res.status}: ${lastError}`);
    }

    const body = await res.json();

    // Extract the text content from the Gemini response
    const text: string =
      body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Parse safely — strip possible markdown fences
    const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as GeminiResult;
      return {
        candidateSummary: parsed.candidateSummary ?? "",
        recommendations: (parsed.recommendations ?? []).slice(0, topK),
      };
    } catch {
      console.error("Gemini returned non-JSON:", cleaned);
      return { candidateSummary: "", recommendations: [] };
    }
  }

  // All retries exhausted
  throw new Error(`Gemini API failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}
