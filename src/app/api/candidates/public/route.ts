import { NextResponse } from "next/server";
import type {
  CandidateEducation,
  CandidateWorkExperience,
  PublicCandidateSearchResult,
} from "@/types/candidate-profile";
import { searchPublicCandidateProfiles } from "@/lib/candidate-profiles";
import { getCompanyProfile, getJobs } from "@/lib/recruitment";
import { getRecruiterCandidateSignals } from "@/components/hr/hrWorkspaceContentModel";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

interface RelatedCompanyJob {
  id: string;
  title: string;
  url: string;
  matchScore: number;
}

interface RelatedCompanyJobDetail extends RelatedCompanyJob {
  location: string;
  description: string;
  requirements: string[];
  industry: string[];
  experienceLevel: string | null;
  salary: string | null;
  deadline: string | null;
  employmentType: string | null;
  level: string | null;
  candidateCount: number | null;
  targetApplications: number | null;
  isPublicVisible: boolean;
}

interface MatchedCandidateItem {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  skills: string[];
  experience: number;
  location: string;
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  expectedSalaryLabel: string;
  matchScore: number;
  matchLabel: string;
  isRecruiterApplicant: boolean;
  relatedJobs: RelatedCompanyJob[];
  relatedJobDetails: RelatedCompanyJobDetail[];
  isOpenToWork: boolean;
  email: string | null;
  profileUrl: string;
  updatedAt: string;
}

interface MatchedCandidateApiResponse {
  items: MatchedCandidateItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  activeJobCount: number;
  relevanceThreshold: number;
  matchingMode: "strict" | "relaxed" | "broad";
  contextWarning: string | null;
}

interface MatchingJob {
  id: string;
  title: string;
  location: string;
  description: string;
  requirements: string[];
  industry: string[];
  experienceLevel: string | null;
  salary: string | null;
  deadline: string | null;
  employmentType: string | null;
  level: string | null;
  candidateCount: number;
  targetApplications: number | null;
  isPublicVisible: boolean;
}

interface CandidateScoredJob {
  id: string;
  title: string;
  score: number;
}

interface RecruiterCandidateApplicationContext {
  jobStatusById: Map<string, string>;
  latestAppliedAt: string | null;
}

interface JobMatchSignals {
  id: string;
  title: string;
  location: string;
  titleTokens: Set<string>;
  allTokens: Set<string>;
  normalizedText: string;
  requiredExperienceMin: number | null;
  requiredExperienceMax: number | null;
}

const BASE_RELEVANCE_THRESHOLD_WITH_JOBS = 0.52;
const BASE_RELEVANCE_THRESHOLD_NO_JOBS = 0.22;

function toNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeWorkExperienceArray(value: unknown): CandidateWorkExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const entry = item as Record<string, unknown>;
      const title = String(entry.title ?? "").trim();
      const company = String(entry.company ?? "").trim();
      const startDate = String(entry.startDate ?? "").trim();
      const endDate = String(entry.endDate ?? "").trim();
      const description = String(entry.description ?? "").trim();

      if (!title && !company && !description) {
        return null;
      }

      return {
        id: String(entry.id ?? `legacy-work-${index + 1}`),
        title,
        company,
        startDate,
        endDate,
        isCurrent: Boolean(entry.isCurrent),
        description,
      } satisfies CandidateWorkExperience;
    })
    .filter((item): item is CandidateWorkExperience => Boolean(item));
}

function normalizeEducationArray(value: unknown): CandidateEducation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const entry = item as Record<string, unknown>;
      const school = String(entry.school ?? "").trim();
      const degree = String(entry.degree ?? "").trim();
      const description = String(entry.description ?? "").trim();

      if (!school && !degree && !description) {
        return null;
      }

      return {
        id: String(entry.id ?? `legacy-edu-${index + 1}`),
        school,
        degree,
        startDate: String(entry.startDate ?? "").trim(),
        endDate: String(entry.endDate ?? "").trim(),
        description,
      } satisfies CandidateEducation;
    })
    .filter((item): item is CandidateEducation => Boolean(item));
}

function mapSalaryBucketToRange(
  bucket: ReturnType<typeof getRecruiterCandidateSignals>["salary"]
) {
  switch (bucket) {
    case "under_15":
      return { min: 0, max: 15, label: "< 15 triệu" };
    case "between_15_30":
      return { min: 15, max: 30, label: "15 - 30 triệu" };
    case "between_30_50":
      return { min: 30, max: 50, label: "30 - 50 triệu" };
    case "above_50":
      return { min: 50, max: 120, label: "> 50 triệu" };
    default:
      return { min: 0, max: 120, label: "Thỏa thuận" };
  }
}

function estimateExperienceYears(candidate: PublicCandidateSearchResult) {
  const fromTimelineMonths = candidate.workExperiences.reduce((total, item) => {
    if (!item.startDate) {
      return total;
    }

    const start = new Date(item.startDate);
    if (Number.isNaN(start.getTime())) {
      return total;
    }

    const end = item.isCurrent
      ? new Date()
      : item.endDate
      ? new Date(item.endDate)
      : new Date();

    if (Number.isNaN(end.getTime()) || end < start) {
      return total;
    }

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    return total + Math.max(0, months);
  }, 0);

  if (fromTimelineMonths > 0) {
    return Math.max(0, Math.round((fromTimelineMonths / 12) * 10) / 10);
  }

  const fallbackText = [candidate.workExperience, candidate.introduction].join(" ");
  const match = fallbackText.match(/(\d+)(?:\s*\+)?\s*(?:nam|năm|years?)/i);
  if (match) {
    return Number(match[1]);
  }

  return 0;
}

function parseExperienceRange(value: string) {
  if (value === "0-1") return { min: 0, max: 1 };
  if (value === "1-3") return { min: 1, max: 3 };
  if (value === "3-5") return { min: 3, max: 5 };
  if (value === "5+") return { min: 5, max: Number.POSITIVE_INFINITY };
  return null;
}

function parseJobRequiredExperience(rawValue: string | null | undefined) {
  const normalized = normalizeText(rawValue || "");
  if (!normalized || normalized.includes("khong yeu cau")) {
    return { min: null, max: null };
  }

  const between = normalized.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (between) {
    return {
      min: Number.parseInt(between[1], 10),
      max: Number.parseInt(between[2], 10),
    };
  }

  const plus = normalized.match(/(\d+)\s*\+/);
  if (plus) {
    return { min: Number.parseInt(plus[1], 10), max: null };
  }

  const single = normalized.match(/(\d+)/);
  if (single) {
    return { min: Number.parseInt(single[1], 10), max: null };
  }

  return { min: null, max: null };
}

function getExperienceFit(
  years: number,
  requiredMin: number | null,
  requiredMax: number | null
) {
  if (requiredMin == null && requiredMax == null) {
    return 0.72;
  }

  if (years <= 0) {
    return 0.58;
  }

  if (requiredMin != null && years < requiredMin) {
    const gap = requiredMin - years;
    return Math.max(0.15, 1 - gap * 0.23);
  }

  if (requiredMax != null && years > requiredMax) {
    return 0.8;
  }

  return 1;
}

function toMatchingJobFromRecruitment(item: {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  requirements: string[];
  industry: string[];
  experienceLevel: string | null;
  salary: string | null;
  deadline: string | null;
  employmentType: string | null;
  level: string | null;
  candidateCount: number;
  targetApplications: number | null;
  isPublicVisible: boolean;
}): MatchingJob {
  return {
    id: item.id,
    title: item.title,
    location: item.location || "",
    description: item.description || "",
    requirements: Array.isArray(item.requirements) ? item.requirements : [],
    industry: Array.isArray(item.industry) ? item.industry : [],
    experienceLevel: item.experienceLevel,
    salary: item.salary,
    deadline: item.deadline,
    employmentType: item.employmentType,
    level: item.level,
    candidateCount: Number.isFinite(item.candidateCount) ? item.candidateCount : 0,
    targetApplications: item.targetApplications,
    isPublicVisible: item.isPublicVisible,
  };
}

function buildJobSignals(job: MatchingJob): JobMatchSignals {
  const flattenedText = [
    job.title,
    job.location,
    job.description,
    job.experienceLevel,
    job.industry.join(" "),
    job.requirements.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const { min, max } = parseJobRequiredExperience(job.experienceLevel);

  return {
    id: job.id,
    title: job.title,
    location: job.location,
    titleTokens: new Set(tokenize(job.title)),
    allTokens: new Set(tokenize(flattenedText)),
    normalizedText: normalizeText(flattenedText),
    requiredExperienceMin: min,
    requiredExperienceMax: max,
  };
}

function scoreCandidateToJob(
  candidate: PublicCandidateSearchResult,
  candidateYears: number,
  candidateRole: string,
  candidateTokens: Set<string>,
  companyTokens: Set<string>,
  job: JobMatchSignals
): CandidateScoredJob {
  const normalizedLocationCandidate = normalizeText(candidate.location);
  const normalizedLocationJob = normalizeText(job.location);

  const matchedSkills: string[] = [];
  const filteredCandidateSkills = candidate.skills
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const skill of filteredCandidateSkills) {
    const normalizedSkill = normalizeText(skill);
    if (!normalizedSkill) {
      continue;
    }

    const skillTokens = tokenize(skill);
    if (
      job.normalizedText.includes(normalizedSkill) ||
      (skillTokens.length > 0 && skillTokens.every((token) => job.allTokens.has(token)))
    ) {
      matchedSkills.push(skill);
    }
  }

  const skillDenominator = Math.max(4, Math.min(8, filteredCandidateSkills.length || 1));
  const skillScore = Math.min(1, matchedSkills.length / skillDenominator);

  const roleTokens = tokenize(candidateRole);
  const roleOverlapCount = roleTokens.filter((token) => job.titleTokens.has(token)).length;
  const roleOverlap =
    roleTokens.length > 0
      ? roleOverlapCount / Math.max(1, Math.min(roleTokens.length, 4))
      : 0;
  const roleBoost =
    roleTokens.length > 0 && job.normalizedText.includes(normalizeText(candidateRole)) ? 0.25 : 0;
  const roleScore = roleTokens.length > 0 ? Math.min(1, roleOverlap + roleBoost) : 0.45;

  const experienceScore = getExperienceFit(
    candidateYears,
    job.requiredExperienceMin,
    job.requiredExperienceMax
  );

  const locationScore =
    normalizedLocationCandidate && normalizedLocationJob
      ? normalizedLocationCandidate.includes(normalizedLocationJob) ||
        normalizedLocationJob.includes(normalizedLocationCandidate)
        ? 1
        : 0.2
      : 0.62;

  const companyOverlapCount = Array.from(candidateTokens).filter((token) => companyTokens.has(token)).length;
  const companyScore =
    companyTokens.size > 0
      ? Math.min(1, companyOverlapCount / Math.max(1, Math.min(companyTokens.size, 8)))
      : 0.56;

  const totalScore =
    skillScore * 0.5 +
    roleScore * 0.2 +
    experienceScore * 0.13 +
    locationScore * 0.08 +
    companyScore * 0.09;

  return {
    id: job.id,
    title: job.title,
    score: totalScore,
  };
}

function scoreCandidateBroadly(
  candidate: PublicCandidateSearchResult,
  candidateYears: number,
  companyTokens: Set<string>,
  keywordTokens: string[]
) {
  const candidateText = [
    candidate.fullName,
    candidate.headline,
    candidate.location,
    candidate.introduction,
    candidate.workExperience,
    candidate.education,
    candidate.skills.join(" "),
  ].join(" ");
  const candidateTokens = new Set(tokenize(candidateText));
  const normalizedCandidateText = normalizeText(candidateText);

  const keywordScore =
    keywordTokens.length > 0
      ? keywordTokens.filter((token) => normalizedCandidateText.includes(token)).length /
        keywordTokens.length
      : 0.65;

  const companyOverlap =
    companyTokens.size > 0
      ? Array.from(companyTokens).filter((token) => candidateTokens.has(token)).length /
        Math.max(1, Math.min(companyTokens.size, 8))
      : 0.58;

  const profileCompleteness =
    (candidate.skills.length > 0 ? 0.24 : 0) +
    (candidate.headline ? 0.24 : 0) +
    (candidate.location ? 0.16 : 0) +
    (candidateYears > 0 ? 0.2 : 0) +
    (candidate.introduction ? 0.16 : 0);

  return {
    score: Math.min(1, keywordScore * 0.4 + companyOverlap * 0.28 + profileCompleteness * 0.32),
    candidateTokens,
  };
}

function resolveMatchLabel(scorePercent: number) {
  if (scorePercent >= 88) {
    return "Rất phù hợp";
  }

  if (scorePercent >= 74) {
    return "Phù hợp cao";
  }

  return "Phù hợp";
}

function getApplicationStatusScore(status: string | null | undefined) {
  const normalized = normalizeText(status || "");

  if (normalized === "hired" || normalized === "offered" || normalized === "offer") {
    return 97;
  }

  if (normalized === "interviewing" || normalized === "interview") {
    return 93;
  }

  if (
    normalized === "reviewing" ||
    normalized === "viewed" ||
    normalized === "pending" ||
    normalized === "new" ||
    normalized === "applied"
  ) {
    return 88;
  }

  if (normalized === "rejected") {
    return 76;
  }

  return 84;
}

function isPlaceholderCompanyName(value: string) {
  const normalized = normalizeText(value);
  return !normalized || normalized.includes("chua cap nhat") || normalized.includes("nha tuyen dung");
}

function buildLegacyCandidateProfile(row: Record<string, unknown>): PublicCandidateSearchResult {
  const fullName = String(row.full_name ?? row.name ?? "Ứng viên").trim() || "Ứng viên";
  const email = typeof row.email === "string" ? row.email : null;
  const phone = typeof row.phone === "string" ? row.phone : null;

  return {
    candidateId: String(row.user_id ?? row.id ?? ""),
    fullName,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    headline: String(row.headline ?? "").trim(),
    location: String(row.location ?? "").trim(),
    email,
    phone,
    introduction: String(row.introduction ?? "").trim(),
    skills: normalizeStringArray(row.skills),
    workExperiences: normalizeWorkExperienceArray(row.work_experiences),
    educations: normalizeEducationArray(row.educations),
    workExperience: String(row.work_experience ?? "").trim(),
    education: String(row.education ?? "").trim(),
    cvUrl: typeof row.cv_url === "string" ? row.cv_url : null,
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

async function loadFallbackCandidateProfiles() {
  const supabase = await createClient();

  const { data: profileRows, error: profileError } = await supabase
    .from("candidate_profiles")
    .select(
      "user_id, full_name, avatar_url, headline, location, email, phone, introduction, skills, work_experiences, educations, work_experience, education, cv_url, profile_visibility, updated_at, created_at"
    )
    .order("updated_at", { ascending: false })
    .limit(220);

  if (!profileError && Array.isArray(profileRows) && profileRows.length > 0) {
    const allProfiles = profileRows.map((row) => buildLegacyCandidateProfile(row as Record<string, unknown>));
    const publicProfiles = profileRows
      .filter((row) => {
        const visibility = (row as { profile_visibility?: unknown }).profile_visibility;
        if (visibility === "public" || visibility === true || visibility === "true") {
          return true;
        }

        return false;
      })
      .map((row) => buildLegacyCandidateProfile(row as Record<string, unknown>));

    if (publicProfiles.length > 0) {
      return {
        items: publicProfiles,
        source: "candidate_profiles_public" as const,
      };
    }

    return {
      items: allProfiles,
      source: "candidate_profiles_all" as const,
    };
  }

  const { data: candidateRows, error: candidateError } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone, resume_url, created_at")
    .order("created_at", { ascending: false })
    .limit(220);

  if (candidateError || !Array.isArray(candidateRows) || candidateRows.length === 0) {
    return {
      items: [] as PublicCandidateSearchResult[],
      source: "none" as const,
    };
  }

  const ids = candidateRows.map((row) => String((row as { id: string }).id));
  const { data: profileBasics } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);

  const profileMap = new Map(
    (profileBasics || []).map((item) => [String((item as { id: string }).id), item as Record<string, unknown>])
  );

  const items = candidateRows.map((row) => {
    const candidate = row as Record<string, unknown>;
    const id = String(candidate.id ?? "");
    const profile = profileMap.get(id);

    return {
      candidateId: id,
      fullName:
        String(candidate.full_name ?? profile?.full_name ?? "Ứng viên").trim() ||
        "Ứng viên",
      avatarUrl: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
      headline: "",
      location: "",
      email: typeof candidate.email === "string" ? candidate.email : null,
      phone: typeof candidate.phone === "string" ? candidate.phone : null,
      introduction: "",
      skills: [],
      workExperiences: [],
      educations: [],
      workExperience: "",
      education: "",
      cvUrl: typeof candidate.resume_url === "string" ? candidate.resume_url : null,
      updatedAt: String(candidate.created_at ?? new Date().toISOString()),
    } satisfies PublicCandidateSearchResult;
  });

  return {
    items,
    source: "legacy_candidates" as const,
  };
}

async function loadOpenEmployerJobs(): Promise<MatchingJob[]> {
  const firstPage = await getJobs({ status: "open", page: 1, limit: 20 });
  const items = firstPage.items.map(toMatchingJobFromRecruitment);
  const boundedTotalPages = Math.min(firstPage.totalPages, 5);

  for (let page = 2; page <= boundedTotalPages; page += 1) {
    const nextPage = await getJobs({ status: "open", page, limit: 20 });
    items.push(...nextPage.items.map(toMatchingJobFromRecruitment));
  }

  return items;
}

async function loadCompanyOpenJobsByName(companyName: string): Promise<MatchingJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, location, description, requirements, industry, experience_level, salary, deadline, employment_type, level, is_public_visible, target_applications")
    .eq("status", "open")
    .eq("is_public_visible", true)
    .eq("company_name", companyName)
    .order("posted_date", { ascending: false })
    .limit(40);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id ?? ""),
      title: String(item.title ?? "Vị trí tuyển dụng"),
      location: String(item.location ?? ""),
      description: Array.isArray(item.description)
        ? (item.description as unknown[]).map((entry) => String(entry ?? "")).join(" ")
        : String(item.description ?? ""),
      requirements: normalizeStringArray(item.requirements),
      industry: normalizeStringArray(item.industry),
      experienceLevel: typeof item.experience_level === "string" ? item.experience_level : null,
      salary: typeof item.salary === "string" ? item.salary : null,
      deadline: typeof item.deadline === "string" ? item.deadline : null,
      employmentType: typeof item.employment_type === "string" ? item.employment_type : null,
      level: typeof item.level === "string" ? item.level : null,
      candidateCount: 0,
      targetApplications: typeof item.target_applications === "number" ? item.target_applications : null,
      isPublicVisible:
        typeof item.is_public_visible === "boolean" ? item.is_public_visible : true,
    } satisfies MatchingJob;
  });
}

function getStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("nhà tuyển dụng") || normalized.includes("recruiter")) {
    return 403;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const keywordRaw = (searchParams.get("keyword") || "").trim();
    const keyword = normalizeText(keywordRaw);
    const keywordTokens = tokenize(keywordRaw);
    const location = normalizeText(searchParams.get("location") || "");
    const skills = (searchParams.get("skills") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const experience = (searchParams.get("experience") || "").trim();
    const minSalary = Math.max(0, toNumber(searchParams.get("minSalary"), 0));
    const maxSalary = Math.max(minSalary, toNumber(searchParams.get("maxSalary"), 100));
    const minMatchScore = Math.max(0, Math.min(100, toNumber(searchParams.get("minMatch"), 0)));
    const sort = searchParams.get("sort") === "latest" ? "latest" : "best_match";
    const page = Math.max(1, toNumber(searchParams.get("page"), 1));
    const pageSize = Math.min(30, Math.max(1, toNumber(searchParams.get("pageSize"), 12)));

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "hr") {
      throw new Error("Chỉ nhà tuyển dụng mới có thể tìm kiếm ứng viên.");
    }

    const [strictProfiles, fallbackProfilesResult, companyProfileResult, recruiterJobsResult] =
      await Promise.allSettled([
        searchPublicCandidateProfiles({
          name: "",
          headline: "",
          experience: "",
          skills: "",
          keywords: "",
        }),
        loadFallbackCandidateProfiles(),
        getCompanyProfile(),
        loadOpenEmployerJobs(),
      ]);

    const strictItems =
      strictProfiles.status === "fulfilled" ? strictProfiles.value : [];
    const fallbackItems =
      fallbackProfilesResult.status === "fulfilled" ? fallbackProfilesResult.value.items : [];
    const fallbackSource =
      fallbackProfilesResult.status === "fulfilled" ? fallbackProfilesResult.value.source : "none";

    const candidatesSource = strictItems.length > 0 ? strictItems : fallbackItems;

    const companyProfile =
      companyProfileResult.status === "fulfilled"
        ? companyProfileResult.value
        : {
            companyName: "",
            email: "",
            logoUrl: null,
            coverUrl: null,
            location: null,
            industry: [] as string[],
            companySize: null,
            description: null,
          };

    let jobs = recruiterJobsResult.status === "fulfilled" ? recruiterJobsResult.value : [];

    const hasCompanyName =
      companyProfile.companyName && !isPlaceholderCompanyName(companyProfile.companyName);

    if (jobs.length === 0 && hasCompanyName) {
      const fallbackJobs = await loadCompanyOpenJobsByName(companyProfile.companyName);
      if (fallbackJobs.length > 0) {
        jobs = fallbackJobs;
      }
    }

    const companyTokens = new Set(
      tokenize(
        [
          hasCompanyName ? companyProfile.companyName : "",
          companyProfile.location,
          companyProfile.industry.join(" "),
          companyProfile.description || "",
        ].join(" ")
      )
    );

    const contextIsWeak = jobs.length === 0 && companyTokens.size === 0;
    const skillFilters = skills.map((item) => normalizeText(item));
    const experienceRange = parseExperienceRange(experience);
    const hasNarrowFilter =
      Boolean(keyword) ||
      Boolean(location) ||
      skillFilters.length > 0 ||
      Boolean(experienceRange) ||
      minSalary > 0 ||
      maxSalary < 100 ||
      minMatchScore > 0;

    const jobSignals = jobs.map(buildJobSignals);
    const jobsById = new Map(jobs.map((job) => [job.id, job]));

    const recruiterApplicationsByCandidate = new Map<
      string,
      RecruiterCandidateApplicationContext
    >();

    if (jobs.length > 0) {
      const jobIds = jobs.map((job) => job.id).filter(Boolean);

      if (jobIds.length > 0) {
        const { data: recruiterApplications } = await supabase
          .from("applications")
          .select("candidate_id, job_id, status, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
          .limit(3000);

        for (const row of recruiterApplications ?? []) {
          if (!row.candidate_id || !row.job_id) {
            continue;
          }

          const candidateId = String(row.candidate_id);
          const jobId = String(row.job_id);

          const current = recruiterApplicationsByCandidate.get(candidateId) ?? {
            jobStatusById: new Map<string, string>(),
            latestAppliedAt: null,
          };

          const status = String(row.status ?? "applied");
          const createdAt = typeof row.created_at === "string" ? row.created_at : null;

          if (!current.jobStatusById.has(jobId)) {
            current.jobStatusById.set(jobId, status);
          }

          if (createdAt && (!current.latestAppliedAt || createdAt > current.latestAppliedAt)) {
            current.latestAppliedAt = createdAt;
          }

          recruiterApplicationsByCandidate.set(candidateId, current);
        }
      }
    }

    const scoredCandidates = candidatesSource
      .map((candidate) => {
        const candidateSignals = getRecruiterCandidateSignals(candidate);
        const expectedSalary = mapSalaryBucketToRange(candidateSignals.salary);
        const candidateYears = estimateExperienceYears(candidate);
        const role = candidate.headline || candidate.workExperiences[0]?.title || "Ứng viên";

        const candidateContextTokens = new Set(
          tokenize(
            [
              candidate.fullName,
              role,
              candidate.introduction,
              candidate.workExperience,
              candidate.education,
              candidate.skills.join(" "),
            ].join(" ")
          )
        );

        const searchableHaystack = normalizeText(
          [
            candidate.fullName,
            role,
            candidate.location,
            candidate.introduction,
            candidate.workExperience,
            candidate.education,
            candidate.skills.join(" "),
          ].join(" ")
        );

        const scoredJobs =
          jobSignals.length > 0
            ? jobSignals
                .map((jobSignal) =>
                  scoreCandidateToJob(
                    candidate,
                    candidateYears,
                    role,
                    candidateContextTokens,
                    companyTokens,
                    jobSignal
                  )
                )
                .sort((left, right) => right.score - left.score)
            : [];

        const recruiterApplicationContext = recruiterApplicationsByCandidate.get(
          candidate.candidateId
        );
        const isRecruiterApplicant =
          (recruiterApplicationContext?.jobStatusById.size ?? 0) > 0;

        const applicantStatusScores = recruiterApplicationContext
          ? Array.from(recruiterApplicationContext.jobStatusById.values()).map(
              (status) => getApplicationStatusScore(status)
            )
          : [];

        const appliedScoreFloor =
          applicantStatusScores.length > 0
            ? Math.max(...applicantStatusScores) / 100
            : 0;

        const broadScoreData = scoreCandidateBroadly(
          candidate,
          candidateYears,
          companyTokens,
          keywordTokens
        );

        const topMatchScore =
          scoredJobs.length > 0
            ? Math.max(scoredJobs[0].score, appliedScoreFloor)
            : Math.max(broadScoreData.score, appliedScoreFloor);

        const scoredRelatedJobs =
          scoredJobs.length > 0
            ? scoredJobs
                .filter((job) => job.score >= 0.38)
                .slice(0, 3)
                .map((job) => ({
                  id: job.id,
                  title: job.title,
                  url: `/hr/jobs/${job.id}`,
                  matchScore: Math.round(job.score * 100),
                }))
            : [];

        const appliedRelatedJobs = recruiterApplicationContext
          ? Array.from(recruiterApplicationContext.jobStatusById.entries())
              .map(([jobId, status]) => {
                const job = jobsById.get(jobId);
                if (!job) {
                  return null;
                }

                return {
                  id: jobId,
                  title: job.title,
                  url: `/hr/jobs/${jobId}`,
                  matchScore: getApplicationStatusScore(status),
                } satisfies RelatedCompanyJob;
              })
              .filter((job): job is RelatedCompanyJob => Boolean(job))
          : [];

        const relatedJobsMap = new Map<string, RelatedCompanyJob>();
        for (const job of scoredRelatedJobs) {
          relatedJobsMap.set(job.id, job);
        }
        for (const job of appliedRelatedJobs) {
          const existing = relatedJobsMap.get(job.id);
          if (!existing || job.matchScore > existing.matchScore) {
            relatedJobsMap.set(job.id, job);
          }
        }

        const relatedJobs = Array.from(relatedJobsMap.values())
          .sort((left, right) => right.matchScore - left.matchScore)
          .slice(0, 3);

        const relatedJobDetails =
          relatedJobs.length > 0
            ? relatedJobs.map((job) => {
                const jobDetail = jobsById.get(job.id);
                return {
                  id: job.id,
                  title: job.title,
                  url: `/hr/jobs/${job.id}`,
                  matchScore: job.matchScore,
                  location: jobDetail?.location || "",
                  description: jobDetail?.description || "",
                  requirements: jobDetail?.requirements || [],
                  industry: jobDetail?.industry || [],
                  experienceLevel: jobDetail?.experienceLevel || null,
                  salary: jobDetail?.salary || null,
                  deadline: jobDetail?.deadline || null,
                  employmentType: jobDetail?.employmentType || null,
                  level: jobDetail?.level || null,
                  candidateCount:
                    typeof jobDetail?.candidateCount === "number"
                      ? jobDetail.candidateCount
                      : null,
                  targetApplications: jobDetail?.targetApplications ?? null,
                  isPublicVisible: jobDetail?.isPublicVisible ?? true,
                } satisfies RelatedCompanyJobDetail;
              })
            : [];

        const matchScore = Math.round(topMatchScore * 100);

        const keywordPass = keyword
          ? keywordTokens.length > 0
            ? keywordTokens.every((token) => searchableHaystack.includes(token))
            : searchableHaystack.includes(keyword)
          : true;

        if (!keywordPass) {
          return null;
        }

        if (location) {
          const normalizedLocation = normalizeText(candidate.location);
          if (!normalizedLocation.includes(location)) {
            return null;
          }
        }

        if (skillFilters.length > 0) {
          const normalizedSkills = candidate.skills.map((item) => normalizeText(item));
          const hasAllSkills = skillFilters.every((token) =>
            normalizedSkills.some((skill) => skill.includes(token))
          );
          if (!hasAllSkills) {
            return null;
          }
        }

        if (experienceRange) {
          if (
            candidateYears < experienceRange.min ||
            candidateYears > experienceRange.max
          ) {
            return null;
          }
        }

        if (
          expectedSalary.max < minSalary ||
          expectedSalary.min > maxSalary
        ) {
          return null;
        }

        return {
          id: candidate.candidateId,
          name: candidate.fullName,
          avatar: candidate.avatarUrl,
          role,
          skills: candidate.skills,
          experience: candidateYears,
          location: candidate.location,
          expectedSalaryMin: expectedSalary.min,
          expectedSalaryMax: expectedSalary.max,
          expectedSalaryLabel: expectedSalary.label,
          matchScore,
          matchLabel: isRecruiterApplicant ? "Đã ứng tuyển" : resolveMatchLabel(matchScore),
          relatedJobs,
          relatedJobDetails,
          isRecruiterApplicant,
          isOpenToWork:
            candidateSignals.readiness === "ready_now" ||
            candidateSignals.readiness === "open",
          email: candidate.email,
          profileUrl: `/candidate/${candidate.candidateId}?from=hr`,
          updatedAt:
            recruiterApplicationContext?.latestAppliedAt || candidate.updatedAt,
          rawTopScore: topMatchScore,
        };
      })
      .filter(
        (
          item
        ): item is MatchedCandidateItem & {
          rawTopScore: number;
        } => Boolean(item)
      );

    const baseThreshold = jobs.length > 0
      ? BASE_RELEVANCE_THRESHOLD_WITH_JOBS
      : contextIsWeak
      ? 0.12
      : BASE_RELEVANCE_THRESHOLD_NO_JOBS;
    const configuredThreshold = Math.max(baseThreshold, minMatchScore / 100);

    let matchingMode: MatchedCandidateApiResponse["matchingMode"] = "strict";
    let effectiveThreshold = configuredThreshold;

    let matchedCandidates = scoredCandidates.filter(
      (candidate) =>
        (candidate.isRecruiterApplicant && candidate.matchScore >= minMatchScore) ||
        (candidate.rawTopScore >= configuredThreshold && candidate.matchScore >= minMatchScore)
    );

    if (matchedCandidates.length === 0 && scoredCandidates.length > 0 && minMatchScore === 0) {
      matchingMode = "relaxed";
      effectiveThreshold = Math.max(0.08, configuredThreshold - 0.18);
      matchedCandidates = scoredCandidates.filter(
        (candidate) => candidate.rawTopScore >= effectiveThreshold
      );
    }

    if (
      matchedCandidates.length === 0 &&
      scoredCandidates.length > 0 &&
      minMatchScore === 0 &&
      !hasNarrowFilter
    ) {
      matchingMode = "broad";
      effectiveThreshold = 0;
      matchedCandidates = [...scoredCandidates]
        .sort((left, right) => right.rawTopScore - left.rawTopScore)
        .slice(0, 30);
    }

    const sorted = [...matchedCandidates].sort((left, right) => {
      if (sort === "latest") {
        return +new Date(right.updatedAt) - +new Date(left.updatedAt);
      }

      return right.matchScore - left.matchScore || +new Date(right.updatedAt) - +new Date(left.updatedAt);
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const start = (normalizedPage - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map(({ rawTopScore, ...candidate }) => {
      void rawTopScore;
      return candidate;
    });

    let contextWarning: string | null = null;

    if (jobs.length === 0) {
      contextWarning =
        "Chưa có tin tuyển dụng đang mở. Hệ thống đang mở rộng phạm vi ghép theo hồ sơ công ty và mức độ phù hợp tổng quan.";
    }

    if (!contextWarning && fallbackSource === "candidate_profiles_all") {
      contextWarning =
        "Hồ sơ ứng viên chưa cấu hình hiển thị công khai đầy đủ. Đang dùng chế độ fallback để tránh bỏ sót ứng viên phù hợp.";
    }

    if (!contextWarning && fallbackSource === "legacy_candidates") {
      contextWarning =
        "Đang dùng dữ liệu ứng viên từ nguồn legacy do hồ sơ public chưa đầy đủ.";
    }

    const payload: MatchedCandidateApiResponse = {
      items,
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
      activeJobCount: jobs.length,
      relevanceThreshold: Number(effectiveThreshold.toFixed(2)),
      matchingMode,
      contextWarning,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách ứng viên phù hợp.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}