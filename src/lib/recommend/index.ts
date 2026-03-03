/**
 * Recommendation pipeline orchestrator.
 *
 * Flow: extractProfile → hardFilter → score & rank → format output
 */

import type { Job } from "@/types/job";
import { removeDiacritics, normalizeText, tokenizeVi, extractLocations } from "./normalize";
import { hardFilterJobs, isTechCandidate } from "./hardFilter";
import { scoreAndRank, type ScoredJob } from "./score";
import type { CandidateProfile } from "./types";

export type { CandidateProfile } from "./types";
export type { ScoredJob } from "./score";

/* ─────────────── Profile extraction ─────────────── */

/**
 * Parse free-form candidate text into a structured CandidateProfile.
 * Works with both manual input ("Frontend Developer, React/TypeScript, HCM")
 * and structured profile text from extractCandidateTextFromDocument().
 */
export function extractProfile(candidateText: string): CandidateProfile {
  const text = candidateText.trim();
  const ascii = removeDiacritics(normalizeText(text));

  // ── Desired roles ──
  const desired_roles: string[] = [];
  const rolePatternsVi: [RegExp, string][] = [
    [/frontend\s*developer/i, "Frontend Developer"],
    [/front[- ]?end\s*developer/i, "Frontend Developer"],
    [/backend\s*developer/i, "Backend Developer"],
    [/back[- ]?end\s*developer/i, "Backend Developer"],
    [/fullstack\s*developer/i, "Fullstack Developer"],
    [/full[- ]?stack\s*developer/i, "Fullstack Developer"],
    [/mobile\s*developer/i, "Mobile Developer"],
    [/web\s*developer/i, "Web Developer"],
    [/software\s*engineer/i, "Software Engineer"],
    [/data\s*engineer/i, "Data Engineer"],
    [/data\s*analyst/i, "Data Analyst"],
    [/data\s*scientist/i, "Data Scientist"],
    [/devops\s*engineer/i, "DevOps Engineer"],
    [/qa\s*engineer/i, "QA Engineer"],
    [/ky\s*su\s*kiem\s*thu/i, "QA Engineer"],
    [/ky\s*su\s*phan\s*mem/i, "Software Engineer"],
    [/lap\s*trinh\s*vien/i, "Developer"],
    [/ky\s*su\s*lap\s*trinh\s*nhung/i, "Embedded Engineer"],
    [/ky\s*su\s*phan\s*cung/i, "Hardware Engineer"],
    [/business\s*analyst/i, "Business Analyst"],
    [/phan\s*tich\s*nghiep\s*vu/i, "Business Analyst"],
    [/product\s*manager/i, "Product Manager"],
    [/project\s*manager/i, "Project Manager"],
    [/ui\/?ux\s*designer/i, "UI/UX Designer"],
    [/designer/i, "Designer"],
  ];

  for (const [re, role] of rolePatternsVi) {
    if (re.test(ascii)) {
      if (!desired_roles.includes(role)) desired_roles.push(role);
    }
  }

  // ── Hard skills (from tokenization, filtered clean) ──
  // First look for explicit "Kỹ năng:" section
  const skillSectionMatch = text.match(/[Kk]ỹ năng[:\s]+(.*?)(?:\n|$)/);
  let skillTokens: string[];
  if (skillSectionMatch) {
    // Parse comma-separated skills
    skillTokens = skillSectionMatch[1]
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
  } else {
    // Fallback: tokenize entire text
    skillTokens = tokenizeVi(text);
  }

  // Also tokenize the full text to catch skills mentioned elsewhere
  const allTokens = tokenizeVi(text);
  const hard_skills = [...new Set([...skillTokens, ...allTokens])];

  // ── Soft skills ──
  const soft_skills: string[] = [];
  const softPatterns = [
    "teamwork", "communication", "leadership", "problem solving",
    "giao tiep", "lam viec nhom", "lanh dao", "giai quyet van de",
    "tu duy sang tao", "quan ly thoi gian", "tu hoc", "nghien cuu",
  ];
  for (const pat of softPatterns) {
    if (ascii.includes(pat)) {
      soft_skills.push(pat);
    }
  }

  // ── Locations ──
  const locations = extractLocations(text);

  // ── Experience years ──
  let experience_years = 0;
  const expMatch = text.match(/(\d+)\s*(?:năm|year|yr)/i) ||
    ascii.match(/(\d+)\s*(?:nam|year|yr)/i);
  if (expMatch) {
    experience_years = parseInt(expMatch[1], 10);
  }

  return {
    desired_roles,
    hard_skills,
    soft_skills,
    locations,
    experience_years,
    raw_text: text,
  };
}

/* ─────────────── Main pipeline ─────────────── */

export interface RecommendationResult {
  jobId: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

/**
 * Run the full local recommendation pipeline.
 *
 * @param candidateText - Raw candidate text (from profile or manual input)
 * @param jobs          - All available jobs
 * @param topK          - Number of recommendations to return
 * @returns Sorted recommendations with scores and tags
 */
export function recommendJobs(
  candidateText: string,
  jobs: Job[],
  topK: number = 6
): { profile: CandidateProfile; recommendations: RecommendationResult[] } {
  const profile = extractProfile(candidateText);
  const isIT = isTechCandidate(profile);

  // ── Step 1: Hard filter ──
  const filterResults = hardFilterJobs(jobs, profile);
  const passed = filterResults.filter((r) => !r.excluded);

  // ── Step 2: Score & rank ──
  const scoredJobs = scoreAndRank(
    passed.map((r) => ({ job: r.job, locationPenalty: r.locationPenalty })),
    profile,
    topK
  );

  // ── Step 3: Format output ──
  const recommendations = scoredJobs.map((scored) => formatResult(scored, isIT));

  // ── Step 4: Fallback — if nothing passed hard filters, relax and try again ──
  if (recommendations.length === 0) {
    console.warn("[recommend] No jobs passed hard filter, falling back to relaxed scoring");
    const allScored = scoreAndRank(
      jobs.map((job) => ({ job, locationPenalty: 0 })),
      profile,
      topK
    );
    return {
      profile,
      recommendations: allScored.map((scored) => formatResult(scored, isIT)),
    };
  }

  return { profile, recommendations };
}

function formatResult(scored: ScoredJob, isIT: boolean): RecommendationResult {
  const matchScore = Math.round(scored.totalScore * 100);

  let fitLevel: "High" | "Medium" | "Low";
  if (scored.fitLevel === "excellent" || scored.fitLevel === "good") {
    fitLevel = "High";
  } else if (scored.fitLevel === "fair") {
    fitLevel = "Medium";
  } else {
    fitLevel = "Low";
  }

  const reasons: string[] = [];
  if (scored.matchedSkills.length > 0) {
    reasons.push(
      `Phù hợp kỹ năng: ${scored.matchedSkills.slice(0, 4).join(", ")}`
    );
  }
  if (scored.roleScore >= 0.6) {
    reasons.push("Vai trò phù hợp với định hướng nghề nghiệp");
  }
  if (scored.experienceScore >= 0.8) {
    reasons.push("Phù hợp kinh nghiệm");
  }
  if (reasons.length === 0) {
    reasons.push(
      isIT
        ? "Công việc liên quan đến công nghệ"
        : "Gợi ý dựa trên hồ sơ của bạn"
    );
  }

  return {
    jobId: scored.job.id,
    matchScore,
    fitLevel,
    reasons,
    matchedSkills: scored.matchedSkills.slice(0, 8),
    missingSkills: scored.missingSkills.slice(0, 6),
  };
}

/**
 * Pre-filter jobs for Gemini: use hard filter + rough scoring to pick
 * the top N most relevant candidates to send to Gemini (saves tokens/time).
 */
export function preFilterForGemini(
  candidateText: string,
  jobs: Job[],
  topN: number = 30
): { profile: CandidateProfile; filteredJobs: Job[] } {
  const profile = extractProfile(candidateText);
  const filterResults = hardFilterJobs(jobs, profile);
  const passed = filterResults.filter((r) => !r.excluded);

  if (passed.length <= topN) {
    return {
      profile,
      filteredJobs: passed.map((r) => r.job),
    };
  }

  // Score to pick best topN
  const scored = scoreAndRank(
    passed.map((r) => ({ job: r.job, locationPenalty: r.locationPenalty })),
    profile,
    topN
  );

  return {
    profile,
    filteredJobs: scored.map((s) => s.job),
  };
}
