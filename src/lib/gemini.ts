import type { Job } from "@/types/job";

/* ─── Compact job object sent to the LLM (saves tokens) ─── */
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

/* ─── Public types ─── */
export interface Recommendation {
  jobId: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

export interface GeminiResult {
  candidateSummary: string;
  suggestedRoles: string[];
  suggestedCompanies: string[];
  recommendations: Recommendation[];
}

/* ─── Ollama caller (shared config) ─── */
async function callOllamaJSON(prompt: string, numPredict = 2048): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model   = process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      options: { temperature: 0.3, num_predict: numPredict, top_p: 0.9 },
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý tuyển dụng thông minh. Trả lời ĐÚNG JSON hợp lệ, không markdown, không giải thích thêm.",
        },
        { role: "user", content: prompt + " /no_think" },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const body = await res.json();
  return (body?.message?.content ?? "").trim();
}

/* ─── JSON extraction helper ─── */
function extractJSON(raw: string): string {
  // Strip <think> blocks
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown fences
  text = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  // Find first { ... last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

/**
 * Call Ollama (local) to rank jobs based on candidate text / profile.
 * Drop-in replacement for the old Gemini-based ranker.
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

  const prompt = `You are a smart recruitment assistant.

Your task is to analyze a candidate profile and CV, then:
1. Suggest suitable job roles
2. Suggest suitable companies
3. Recommend the most relevant jobs from the provided job list

=====================================
CANDIDATE PROFILE:
${candidateText}

AVAILABLE JOBS (JSON array):
${JSON.stringify(compactJobs)}
=====================================

Instructions:

STEP 1 – Analyze Candidate:
- Identify main technical skills
- Identify strongest technologies
- Estimate seniority level
- Identify main domain or industry
- Identify preferred location (if available)

STEP 2 – Suggest:
- 5–8 suitable job roles based on skills
- 5–8 suitable company types or specific companies (based on industry + tech stack)

STEP 3 – From AVAILABLE JOBS:
- Select only jobs from the provided list
- Return top ${topK} most suitable jobs
- Provide matchScore (0–100)
- Keep reasoning simple and factual
- Do NOT invent skills
- Do NOT assume experience not mentioned

Scoring logic (simple):
- 80–100: Strong skill match + relevant experience
- 60–79: Partial match
- 40–59: Weak match but transferable skills
- Below 40: Do not include

Output format (STRICT JSON only):

{
  "candidateSummary": "Short summary of candidate strength and likely job direction",
  "suggestedRoles": ["role1", "role2"],
  "suggestedCompanies": ["company or company type"],
  "recommendations": [
    {
      "jobId": "string",
      "jobTitle": "string",
      "companyName": "string",
      "matchScore": 0,
      "fitLevel": "High | Medium",
      "reasons": ["clear factual reason based on CV"],
      "matchedSkills": ["skill1", "skill2"],
      "missingSkills": ["skill1"]
    }
  ]
}
Important:
- If information is missing, state "Not mentioned in CV".
- Do not create fake skills.
- Only use data from the CANDIDATE PROFILE text.
- candidateSummary and reasons should be in Vietnamese.`;

  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callOllamaJSON(prompt, 2048);
      const cleaned = extractJSON(raw);

      const parsed = JSON.parse(cleaned) as GeminiResult;

      // Validate & clamp
      const recommendations = (parsed.recommendations ?? [])
        .filter(
          (r) =>
            r.jobId &&
            typeof r.matchScore === "number" &&
            r.matchScore >= 40
        )
        .slice(0, topK)
        .map((r) => ({
          jobId: String(r.jobId),
          jobTitle: r.jobTitle ?? "",
          companyName: r.companyName ?? "",
          matchScore: Math.min(100, Math.max(0, Math.round(r.matchScore))),
          fitLevel: (["High", "Medium", "Low"].includes(r.fitLevel)
            ? r.fitLevel
            : r.matchScore >= 75
              ? "High"
              : "Medium") as "High" | "Medium" | "Low",
          reasons: Array.isArray(r.reasons) ? r.reasons.slice(0, 4) : [],
          matchedSkills: Array.isArray(r.matchedSkills)
            ? r.matchedSkills.slice(0, 8)
            : [],
          missingSkills: Array.isArray(r.missingSkills)
            ? r.missingSkills.slice(0, 6)
            : [],
        }));

      return {
        candidateSummary: parsed.candidateSummary ?? "",
        suggestedRoles: Array.isArray(parsed.suggestedRoles)
          ? parsed.suggestedRoles.slice(0, 8)
          : [],
        suggestedCompanies: Array.isArray(parsed.suggestedCompanies)
          ? parsed.suggestedCompanies.slice(0, 8)
          : [],
        recommendations,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[recommend] Ollama attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
        lastError
      );
      if (attempt < MAX_RETRIES) continue;
    }
  }

  throw new Error(
    `Ollama recommendation failed after ${MAX_RETRIES + 1} attempts: ${lastError}`
  );
}
