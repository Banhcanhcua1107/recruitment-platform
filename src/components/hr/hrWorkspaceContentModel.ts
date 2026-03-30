import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import type { JobStatus, RecruitmentJob } from "@/types/recruitment";

export type RecruiterCandidateLevel =
  | "junior"
  | "middle"
  | "senior"
  | "manager"
  | "not_specified";

export type RecruiterCandidateWorkMode =
  | "onsite"
  | "hybrid"
  | "remote"
  | "flexible"
  | "not_specified";

export type RecruiterCandidateReadiness =
  | "ready_now"
  | "open"
  | "notice_period"
  | "not_specified";

export type RecruiterCandidateSalaryBucket =
  | "under_15"
  | "between_15_30"
  | "between_30_50"
  | "above_50"
  | "not_specified";

export interface RecruiterCandidateFilterState {
  q: string;
  skills: string;
  experience: string;
  location: string;
  salary: RecruiterCandidateSalaryBucket | "all";
  level: RecruiterCandidateLevel | "all";
  workMode: RecruiterCandidateWorkMode | "all";
  readiness: RecruiterCandidateReadiness | "all";
}

export interface RecruiterJobPortfolioSummary {
  totalJobs: number;
  openJobs: number;
  draftJobs: number;
  closedJobs: number;
  totalApplicants: number;
}

export interface RecruiterCandidateSignals {
  level: RecruiterCandidateLevel;
  workMode: RecruiterCandidateWorkMode;
  readiness: RecruiterCandidateReadiness;
  salary: RecruiterCandidateSalaryBucket;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase();
}

function tokenize(value: string) {
  return value
    .split(/\r?\n|,|\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function buildCandidateHaystack(candidate: PublicCandidateSearchResult) {
  return [
    candidate.fullName,
    candidate.headline,
    candidate.location,
    candidate.introduction,
    candidate.workExperience,
    candidate.education,
    candidate.skills.join(" "),
    candidate.workExperiences
      .map((item) => [item.title, item.company, item.description].filter(Boolean).join(" "))
      .join(" "),
    candidate.educations
      .map((item) => [item.school, item.degree, item.description].filter(Boolean).join(" "))
      .join(" "),
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function containsAny(haystack: string, patterns: string[]) {
  return patterns.some((pattern) => haystack.includes(normalizeText(pattern)));
}

export function getRecruiterJobStatusLabel(status: JobStatus) {
  switch (status) {
    case "draft":
      return "Bản nháp";
    case "closed":
      return "Đã đóng";
    case "open":
    default:
      return "Đã đăng";
  }
}

export function buildRecruiterJobPortfolioSummary(
  jobs: Pick<RecruitmentJob, "status" | "candidateCount">[]
): RecruiterJobPortfolioSummary {
  return jobs.reduce<RecruiterJobPortfolioSummary>(
    (summary, job) => {
      summary.totalJobs += 1;
      summary.totalApplicants += Number(job.candidateCount ?? 0);

      if (job.status === "draft") {
        summary.draftJobs += 1;
      } else if (job.status === "closed") {
        summary.closedJobs += 1;
      } else {
        summary.openJobs += 1;
      }

      return summary;
    },
    {
      totalJobs: 0,
      openJobs: 0,
      draftJobs: 0,
      closedJobs: 0,
      totalApplicants: 0,
    }
  );
}

export function getRecruiterCandidateSignals(
  candidate: PublicCandidateSearchResult
): RecruiterCandidateSignals {
  const haystack = buildCandidateHaystack(candidate);

  const level: RecruiterCandidateLevel = containsAny(haystack, [
    "trưởng nhóm",
    "manager",
    "management",
    "lead",
    "head of",
  ])
    ? "manager"
    : containsAny(haystack, [
        "senior",
        "principal",
        "architect",
        "chuyên gia",
        "5 năm",
        "6 năm",
        "7 năm",
        "8 năm",
        "9 năm",
        "10 năm",
      ])
      ? "senior"
      : containsAny(haystack, [
          "mid",
          "middle",
          "specialist",
          "chuyên viên",
          "3 năm",
          "4 năm",
        ])
        ? "middle"
        : containsAny(haystack, [
            "junior",
            "fresher",
            "intern",
            "mới tốt nghiệp",
            "1 năm",
            "2 năm",
          ])
          ? "junior"
          : "not_specified";

  const workMode: RecruiterCandidateWorkMode = containsAny(haystack, [
    "hybrid",
    "linh hoạt",
  ])
    ? "hybrid"
    : containsAny(haystack, ["remote", "từ xa", "work from home"])
      ? "remote"
      : containsAny(haystack, ["onsite", "on-site", "văn phòng", "tại công ty"])
        ? "onsite"
        : containsAny(haystack, ["flexible", "linh dong"])
          ? "flexible"
          : "not_specified";

  const readiness: RecruiterCandidateReadiness = containsAny(haystack, [
    "sẵn sàng đi làm ngay",
    "available immediately",
    "available now",
    "open to work ngay",
  ])
    ? "ready_now"
    : containsAny(haystack, [
        "notice period",
        "báo trước",
        "30 ngày",
        "60 ngày",
      ])
      ? "notice_period"
      : containsAny(haystack, [
          "open to work",
          "đang tìm việc",
          "tìm kiếm cơ hội",
          "actively looking",
        ])
        ? "open"
        : "not_specified";

  const salary: RecruiterCandidateSalaryBucket = containsAny(haystack, [
    "55m",
    "60m",
    "65m",
    "70m",
    "80m",
    "90m",
    "100m",
    "55 triệu",
    "60 triệu",
    "65 triệu",
    "70 triệu",
    "80 triệu",
    "90 triệu",
    "100 triệu",
  ])
      ? "above_50"
      : containsAny(haystack, [
          "30m",
          "35m",
          "40m",
          "45m",
          "50m",
        "30 triệu",
        "35 triệu",
        "40 triệu",
        "45 triệu",
        "50 triệu",
      ])
        ? "between_30_50"
        : containsAny(haystack, [
            "15m",
            "18m",
            "20m",
            "25m",
            "28m",
          "15 triệu",
          "18 triệu",
          "20 triệu",
          "25 triệu",
          "28 triệu",
        ])
          ? "between_15_30"
          : containsAny(haystack, [
              "8m",
              "10m",
              "12m",
              "14m",
            "8 triệu",
            "10 triệu",
            "12 triệu",
            "14 triệu",
          ])
          ? "under_15"
          : "not_specified";

  return {
    level,
    workMode,
    readiness,
    salary,
  };
}

export function getRecruiterCandidateSignalLabels(signals: RecruiterCandidateSignals) {
  return {
    level:
      signals.level === "manager"
        ? "Quản lý"
        : signals.level === "senior"
          ? "Senior"
          : signals.level === "middle"
            ? "Middle"
            : signals.level === "junior"
              ? "Junior"
              : null,
    workMode:
      signals.workMode === "hybrid"
        ? "Hybrid"
        : signals.workMode === "remote"
          ? "Từ xa"
          : signals.workMode === "onsite"
            ? "Tại văn phòng"
            : signals.workMode === "flexible"
              ? "Linh hoạt"
              : null,
    readiness:
      signals.readiness === "ready_now"
        ? "Sẵn sàng ngay"
        : signals.readiness === "open"
          ? "Đang mở cơ hội"
          : signals.readiness === "notice_period"
            ? "Có thời gian báo trước"
            : null,
    salary:
      signals.salary === "above_50"
        ? "> 50 triệu"
        : signals.salary === "between_30_50"
          ? "30 - 50 triệu"
          : signals.salary === "between_15_30"
            ? "15 - 30 triệu"
            : signals.salary === "under_15"
              ? "< 15 triệu"
              : null,
  };
}

export function matchesRecruiterCandidateFilters(
  candidate: PublicCandidateSearchResult,
  filters: RecruiterCandidateFilterState
) {
  const haystack = buildCandidateHaystack(candidate);
  const normalizedQuery = normalizeText(filters.q);
  const normalizedLocation = normalizeText(filters.location);
  const signals = getRecruiterCandidateSignals(candidate);

  if (normalizedQuery && !haystack.includes(normalizedQuery)) {
    return false;
  }

  const requiredSkillTokens = tokenize(filters.skills);
  if (
    requiredSkillTokens.length > 0 &&
    !requiredSkillTokens.every((token) =>
      candidate.skills.some((skill) => normalizeText(skill).includes(token))
    )
  ) {
    return false;
  }

  const requiredExperienceTokens = tokenize(filters.experience);
  if (
    requiredExperienceTokens.length > 0 &&
    !requiredExperienceTokens.every((token) => haystack.includes(token))
  ) {
    return false;
  }

  if (normalizedLocation) {
    const locationHaystack = normalizeText([candidate.location, candidate.introduction].join(" "));
    if (!locationHaystack.includes(normalizedLocation)) {
      return false;
    }
  }

  if (filters.level !== "all" && signals.level !== "not_specified" && signals.level !== filters.level) {
    return false;
  }

  if (
    filters.workMode !== "all" &&
    signals.workMode !== "not_specified" &&
    signals.workMode !== filters.workMode
  ) {
    return false;
  }

  if (
    filters.readiness !== "all" &&
    signals.readiness !== "not_specified" &&
    signals.readiness !== filters.readiness
  ) {
    return false;
  }

  if (
    filters.salary !== "all" &&
    signals.salary !== "not_specified" &&
    signals.salary !== filters.salary
  ) {
    return false;
  }

  return true;
}
