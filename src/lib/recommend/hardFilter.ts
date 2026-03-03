/**
 * Hard filters — STRICT pre-scoring gates.
 * Eliminates clearly irrelevant jobs before any scoring happens.
 */

import type { Job } from "@/types/job";
import { removeDiacritics, normalizeText } from "./normalize";
import type { CandidateProfile } from "./types";

/* ─────────────── Industry indicators ─────────────── */

/** IT / Tech keywords that signal an IT role (ASCII-lowered) */
const IT_INDICATORS = new Set([
  "frontend", "front-end", "front end",
  "backend", "back-end", "back end",
  "fullstack", "full-stack", "full stack",
  "developer", "software engineer", "software developer",
  "programmer", "programming",
  "web developer", "mobile developer", "app developer",
  "devops", "sre", "cloud computing",
  "data engineer", "data analyst", "data scientist", "machine learning",
  "artificial intelligence", "deep learning",
  "react", "reactjs", "react.js",
  "vue", "vuejs", "vue.js",
  "angular", "angularjs",
  "javascript", "typescript", "python", "golang", "rust", "kotlin", "swift",
  "nodejs", "node.js", "nextjs", "next.js",
  "html", "tailwind", "tailwindcss", "bootstrap",
  "mongodb", "postgres", "postgresql", "mysql", "redis",
  "docker", "kubernetes", "ci/cd", "cicd",
  "github", "gitlab",
  "rest api", "graphql", "microservice",
  "automation testing", "selenium", "cypress",
  "figma",
  "cntt", "cong nghe thong tin",
  "lap trinh", "ky su phan mem", "phat trien phan mem",
  "embedded", "firmware", "lap trinh nhung",
  "kiem thu phan mem", "phan tich nghiep vu",
  ".net", "dotnet", "c#", "c++",
]);

/** Non-IT keywords — strong signals the job is NOT tech */
const NON_IT_INDICATORS = new Set([
  "sales", "telesales", "tele sales",
  "kinh doanh", "ban hang",
  "tu van tuyen sinh", "tuyen sinh",
  "bat dong san", "bds",
  "nha hang", "khach san", "le tan",
  "ke toan", "kiem toan",
  "ngan hang", "tai chinh",
  "luat", "phap ly",
  "thu hoi no", "xu ly no",
  "marketing", "tiep thi",
  "truyen thong", "bao chi",
  "kho van", "giao nhan",
  "bao tri", "sua chua",
  "co khi", "dien cong nghiep",
  "xay dung", "kien truc",
  "lao dong pho thong",
  "cham soc khach hang",
]);

/* ─────────────── Helpers ─────────────── */

function textToAscii(text: string): string {
  return removeDiacritics(normalizeText(text));
}

function textContainsAny(text: string, indicators: Set<string>): boolean {
  for (const kw of indicators) {
    // For short keywords (<=3 chars), require word boundaries to avoid
    // substring false positives (e.g. "ai" matching inside "ngoài")
    if (kw.length <= 3) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) return true;
    } else {
      if (text.includes(kw)) return true;
    }
  }
  return false;
}

function buildJobText(job: Job): string {
  const parts = [
    job.title,
    ...(job.requirements ?? []),
    ...(job.description ?? []).slice(0, 3),
    ...(job.industry ?? []),
    job.level,
  ].filter(Boolean);
  return textToAscii(parts.join(" "));
}

function buildCandidateText(profile: CandidateProfile): string {
  const parts = [
    ...profile.desired_roles,
    ...profile.hard_skills,
    profile.raw_text,
  ].filter(Boolean);
  return textToAscii(parts.join(" "));
}

/* ─────────────── Detection ─────────────── */

/** Is the candidate an IT/Tech candidate? */
export function isTechCandidate(profile: CandidateProfile): boolean {
  const text = buildCandidateText(profile);
  return textContainsAny(text, IT_INDICATORS);
}

/** Does a job contain IT indicators? */
function jobHasITSignals(jobText: string): boolean {
  return textContainsAny(jobText, IT_INDICATORS);
}

/** Does a job contain strong non-IT indicators? */
function jobHasNonITSignals(jobText: string): boolean {
  return textContainsAny(jobText, NON_IT_INDICATORS);
}

/* ─────────────── Experience parsing ─────────────── */

/** Try to extract min years from job experience_level like "2 - 3 Năm" */
function parseJobMinYears(job: Job): number | null {
  const raw = job.experience_level;
  if (!raw) return null;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Check if job title/level suggests Senior */
function jobIsSenior(job: Job): boolean {
  const text = textToAscii(`${job.title} ${job.level ?? ""}`);
  return (
    text.includes("senior") ||
    text.includes("truong nhom") ||
    text.includes("truong bo phan") ||
    text.includes("lead") ||
    text.includes("principal") ||
    text.includes("manager")
  );
}

/* ─────────────── Location parsing ─────────────── */

const CITY_ALIASES: Record<string, string[]> = {
  "ho chi minh": ["ho chi minh", "hcm", "tphcm", "sg", "sai gon"],
  "ha noi": ["ha noi", "hn", "hanoi"],
  "da nang": ["da nang", "danang"],
  "hai phong": ["hai phong", "haiphong"],
  "can tho": ["can tho", "cantho"],
  "binh duong": ["binh duong"],
  "dong nai": ["dong nai"],
};

function normalizeCity(raw: string): string | null {
  const ascii = textToAscii(raw);
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    for (const alias of aliases) {
      if (ascii.includes(alias)) return canonical;
    }
  }
  return null;
}

function jobMatchesLocation(job: Job, candidateCities: string[]): boolean {
  if (candidateCities.length === 0) return true; // no location pref
  const jobCity = normalizeCity(job.location ?? "");
  const jobAddress = normalizeCity(job.full_address ?? "");
  if (!jobCity && !jobAddress) return true; // unknown location = don't exclude

  for (const city of candidateCities) {
    if (jobCity === city || jobAddress === city) return true;
  }
  // "Toàn quốc" ~ remote
  const jobText = textToAscii(job.location ?? "");
  if (jobText.includes("toan quoc") || jobText.includes("remote")) return true;

  return false;
}

/* ─────────────── Main hard filter ─────────────── */

export interface FilterResult {
  job: Job;
  excluded: boolean;
  excludeReason?: string;
  locationPenalty: number; // 0 = perfect, 1 = full penalty
}

export function hardFilterJobs(
  jobs: Job[],
  profile: CandidateProfile
): FilterResult[] {
  const isIT = isTechCandidate(profile);
  const candidateCities = profile.locations
    .map((loc: string) => normalizeCity(loc))
    .filter((c: string | null): c is string => c !== null);
  const candidateYears = profile.experience_years;

  return jobs.map((job) => {
    const jobText = buildJobText(job);

    // ── 1. Role gate (IT candidate → only IT-related jobs) ──
    if (isIT) {
      const hasIT = jobHasITSignals(jobText);
      const hasNonIT = jobHasNonITSignals(jobText);

      // Exclude if clearly non-IT, or if no IT signals at all
      if (!hasIT) {
        return {
          job,
          excluded: true,
          excludeReason: hasNonIT ? "non-IT job for IT candidate" : "no IT signals in job",
          locationPenalty: 0,
        };
      }
    }

    // ── 2. Experience gate ──
    if (candidateYears > 0) {
      const jobMin = parseJobMinYears(job);
      if (jobMin !== null && candidateYears < jobMin - 1) {
        return { job, excluded: true, excludeReason: `requires ${jobMin}+ years`, locationPenalty: 0 };
      }
    }
    if (candidateYears < 3 && jobIsSenior(job)) {
      return { job, excluded: true, excludeReason: "senior role, candidate < 3 years", locationPenalty: 0 };
    }

    // ── 3. Location gate (penalty, not exclusion) ──
    const locMatch = jobMatchesLocation(job, candidateCities);
    const locationPenalty = locMatch ? 0 : 1;

    return { job, excluded: false, locationPenalty };
  });
}
