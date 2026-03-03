/**
 * Weighted scoring & ranking for the recommendation pipeline.
 *
 * Weights:
 *   60% skill match
 *   25% role similarity
 *   10% experience fit
 *    5% location fit
 */

import type { Job } from "@/types/job";
import {
  removeDiacritics,
  normalizeText,
  tokenizeVi,
  getSynonyms,
  isDisplayableSkill,
} from "./normalize";
import type { CandidateProfile } from "./types";

/* ─────────────── Helpers ─────────────── */

function toAscii(text: string): string {
  return removeDiacritics(normalizeText(text));
}

function buildJobTokens(job: Job): string[] {
  const parts = [
    job.title,
    ...(job.requirements ?? []),
    ...(job.description ?? []).slice(0, 5),
    ...(job.industry ?? []),
  ].filter(Boolean);
  return tokenizeVi(parts.join(" "));
}

function buildJobFullText(job: Job): string {
  const parts = [
    job.title,
    ...(job.requirements ?? []),
    ...(job.description ?? []),
    ...(job.industry ?? []),
    job.level,
  ].filter(Boolean);
  return toAscii(parts.join(" "));
}

/* ─────────────── Skill Match (60%) ─────────────── */

interface SkillMatchResult {
  score: number; // 0..1
  matchedSkills: string[];
  missingSkills: string[];
}

function computeSkillMatch(
  candidateSkills: string[],
  jobTokens: string[],
  jobFullText: string
): SkillMatchResult {
  if (candidateSkills.length === 0) {
    return { score: 0, matchedSkills: [], missingSkills: [] };
  }

  const jobTokenSet = new Set(jobTokens.map((t) => t.toLowerCase()));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of candidateSkills) {
    const skillLower = skill.toLowerCase();
    const ascii = removeDiacritics(skillLower);
    const variants = getSynonyms(ascii);

    let found = false;

    // Check 1: exact token match (including synonyms)
    for (const v of variants) {
      if (jobTokenSet.has(v)) {
        found = true;
        break;
      }
    }

    // Check 2: substring in full text (for multi-word skills like "machine learning")
    if (!found) {
      for (const v of variants) {
        if (jobFullText.includes(v)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = matched.length / candidateSkills.length;
  return { score, matchedSkills: matched, missingSkills: missing };
}

/* ─────────────── Role Similarity (25%) ─────────────── */

/** Common IT role keywords (ASCII) for sub-matching */
const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["frontend", "front-end", "front end", "react", "vue", "angular", "html", "css", "ui", "web"],
  backend: ["backend", "back-end", "back end", "api", "server", "node", "java", "python", "golang", "spring", "django", "express"],
  fullstack: ["fullstack", "full-stack", "full stack"],
  mobile: ["mobile", "ios", "android", "react native", "flutter", "kotlin", "swift"],
  devops: ["devops", "dev-ops", "cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "sre"],
  data: ["data", "analytics", "analyst", "scientist", "machine learning", "ai", "deep learning", "bi", "etl"],
  qa: ["qa", "qc", "testing", "kiem thu", "automation", "selenium", "cypress"],
  embedded: ["embedded", "nhung", "firmware", "iot", "hardware", "phan cung"],
  ba: ["business analyst", "ba", "phan tich nghiep vu", "requirement"],
  security: ["security", "bao mat", "penetration", "cybersecurity"],
  designer: ["designer", "ux", "ui/ux", "figma", "design"],
};

function computeRoleScore(profile: CandidateProfile, jobFullText: string): number {
  const candidateText = toAscii(
    [...profile.desired_roles, ...profile.hard_skills].join(" ")
  );

  // Determine candidate's tech domain(s)
  const candidateDomains: string[] = [];
  for (const [domain, keywords] of Object.entries(ROLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (candidateText.includes(kw)) {
        candidateDomains.push(domain);
        break;
      }
    }
  }

  if (candidateDomains.length === 0) {
    // If candidate has no identifiable domain, give a neutral score
    return 0.3;
  }

  // Check how many of the candidate's domains match the job
  let domainMatches = 0;
  for (const domain of candidateDomains) {
    const keywords = ROLE_KEYWORDS[domain];
    for (const kw of keywords) {
      if (jobFullText.includes(kw)) {
        domainMatches++;
        break;
      }
    }
  }

  // Full stack matches both frontend and backend domains
  if (candidateDomains.includes("fullstack")) {
    for (const kw of ROLE_KEYWORDS.frontend) {
      if (jobFullText.includes(kw)) { domainMatches += 0.5; break; }
    }
    for (const kw of ROLE_KEYWORDS.backend) {
      if (jobFullText.includes(kw)) { domainMatches += 0.5; break; }
    }
  }

  return Math.min(1, domainMatches / candidateDomains.length);
}

/* ─────────────── Experience Fit (10%) ─────────────── */

function computeExperienceFit(
  candidateYears: number,
  job: Job
): number {
  if (candidateYears <= 0) return 0.5; // unknown → neutral

  const raw = job.experience_level;
  if (!raw) return 0.7; // no requirement → slightly favorable

  const match = raw.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    if (candidateYears >= min && candidateYears <= max) return 1.0;
    if (candidateYears >= min) return 0.8; // exceeds range
    // Below minimum
    const gap = min - candidateYears;
    return Math.max(0, 1 - gap * 0.3);
  }

  // Single number like "3 Năm"
  const single = raw.match(/(\d+)/);
  if (single) {
    const required = parseInt(single[1], 10);
    if (candidateYears >= required) return 1.0;
    const gap = required - candidateYears;
    return Math.max(0, 1 - gap * 0.3);
  }

  // "Không yêu cầu" / no requirement
  if (toAscii(raw).includes("khong yeu cau")) return 0.9;

  return 0.5;
}

/* ─────────────── Location Fit (5%) ─────────────── */

function computeLocationFit(locationPenalty: number): number {
  // locationPenalty = 0 (match) → 1.0, = 1 (mismatch) → 0.0
  return 1 - locationPenalty;
}

/* ─────────────── Combined Score ─────────────── */

export interface ScoredJob {
  job: Job;
  totalScore: number;
  skillScore: number;
  roleScore: number;
  experienceScore: number;
  locationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  /** A label: "excellent" | "good" | "fair" | "poor" */
  fitLevel: string;
}

const WEIGHTS = {
  skill: 0.60,
  role: 0.25,
  experience: 0.10,
  location: 0.05,
} as const;

export function scoreJob(
  job: Job,
  profile: CandidateProfile,
  locationPenalty: number
): ScoredJob {
  const jobTokens = buildJobTokens(job);
  const jobFullText = buildJobFullText(job);

  const skillResult = computeSkillMatch(profile.hard_skills, jobTokens, jobFullText);
  const roleScore = computeRoleScore(profile, jobFullText);
  const experienceScore = computeExperienceFit(profile.experience_years, job);
  const locationScore = computeLocationFit(locationPenalty);

  const totalScore =
    WEIGHTS.skill * skillResult.score +
    WEIGHTS.role * roleScore +
    WEIGHTS.experience * experienceScore +
    WEIGHTS.location * locationScore;

  // Filter display skills
  const matchedSkills = skillResult.matchedSkills.filter(isDisplayableSkill);
  const missingSkills = skillResult.missingSkills.filter(isDisplayableSkill);

  let fitLevel: string;
  if (totalScore >= 0.7) fitLevel = "excellent";
  else if (totalScore >= 0.5) fitLevel = "good";
  else if (totalScore >= 0.3) fitLevel = "fair";
  else fitLevel = "poor";

  return {
    job,
    totalScore,
    skillScore: skillResult.score,
    roleScore,
    experienceScore,
    locationScore,
    matchedSkills,
    missingSkills,
    fitLevel,
  };
}

/**
 * Score and rank a list of jobs. Returns sorted descending by totalScore.
 */
export function scoreAndRank(
  jobs: Array<{ job: Job; locationPenalty: number }>,
  profile: CandidateProfile,
  topN: number = 10
): ScoredJob[] {
  const scored = jobs.map(({ job, locationPenalty }) =>
    scoreJob(job, profile, locationPenalty)
  );

  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.slice(0, topN);
}
