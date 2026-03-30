import { NextResponse } from "next/server";
import { searchPublicCandidateProfiles } from "@/lib/candidate-profiles";
import { getRecruiterCandidateSignals } from "@/components/hr/hrWorkspaceContentModel";

export const runtime = "nodejs";

const MOCK_CANDIDATES = [
  {
    id: "mock-candidate-1",
    name: "Nguyen Minh Anh",
    avatar: null,
    role: "Frontend Developer",
    skills: ["React", "Next.js", "TypeScript", "Tailwind"],
    experience: 3,
    location: "Ho Chi Minh",
    isOpenToWork: true,
    email: "minhanh@example.com",
    profileUrl: "/candidate/mock-candidate-1?from=hr",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-candidate-2",
    name: "Tran Bao Chau",
    avatar: null,
    role: "UI/UX Designer",
    skills: ["Figma", "Design System", "User Research", "Prototyping"],
    experience: 4,
    location: "Da Nang",
    isOpenToWork: true,
    email: "baochau@example.com",
    profileUrl: "/candidate/mock-candidate-2?from=hr",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-candidate-3",
    name: "Le Quoc Hung",
    avatar: null,
    role: "Backend Engineer",
    skills: ["Node.js", "Java", "PostgreSQL", "Redis"],
    experience: 5,
    location: "Ha Noi",
    isOpenToWork: false,
    email: "quochung@example.com",
    profileUrl: "/candidate/mock-candidate-3?from=hr",
    updatedAt: new Date().toISOString(),
  },
];

function toNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseExperienceRange(value: string) {
  if (value === "0-1") return { min: 0, max: 1 };
  if (value === "1-3") return { min: 1, max: 3 };
  if (value === "3-5") return { min: 3, max: 5 };
  if (value === "5+") return { min: 5, max: Number.POSITIVE_INFINITY };
  return null;
}

function estimateExperienceYears(value: {
  workExperience: string;
  workExperiences: Array<{ startDate?: string; endDate?: string; isCurrent?: boolean }>;
}) {
  const fromTimelineMonths = value.workExperiences.reduce((total, item) => {
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

  const match = value.workExperience.match(/(\d+)(?:\s*\+)?\s*(?:năm|nam|years?)/i);
  if (match) {
    return Number(match[1]);
  }

  return 0;
}

function mapSalaryBucketToRange(bucket: ReturnType<typeof getRecruiterCandidateSignals>["salary"]) {
  switch (bucket) {
    case "under_15":
      return { min: 0, max: 15 };
    case "between_15_30":
      return { min: 15, max: 30 };
    case "between_30_50":
      return { min: 30, max: 50 };
    case "above_50":
      return { min: 50, max: 120 };
    default:
      return { min: 0, max: 120 };
  }
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

    const keyword = (searchParams.get("keyword") || "").trim();
    const location = (searchParams.get("location") || "").trim().toLowerCase();
    const skills = (searchParams.get("skills") || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const experience = (searchParams.get("experience") || "").trim();
    const availableNow = searchParams.get("availableNow") === "true";
    const openToWork = searchParams.get("openToWork") === "true";
    const minSalary = Math.max(0, toNumber(searchParams.get("minSalary"), 0));
    const maxSalary = Math.max(minSalary, toNumber(searchParams.get("maxSalary"), 100));
    const sort = searchParams.get("sort") === "best_match" ? "best_match" : "latest";
    const page = Math.max(1, toNumber(searchParams.get("page"), 1));
    const pageSize = Math.min(30, Math.max(1, toNumber(searchParams.get("pageSize"), 12)));

    const profiles = await searchPublicCandidateProfiles({
      keywords: keyword,
      skills: skills.join(","),
      experience,
      name: "",
      headline: "",
    });

    const mapped = profiles
      .map((profile) => {
        const signals = getRecruiterCandidateSignals(profile);
        const salaryRange = mapSalaryBucketToRange(signals.salary);
        const experienceYears = estimateExperienceYears({
          workExperience: profile.workExperience,
          workExperiences: profile.workExperiences,
        });

        const roleLabel =
          profile.headline || profile.workExperiences[0]?.title || "Ứng viên";

        return {
          id: profile.candidateId,
          name: profile.fullName,
          avatar: profile.avatarUrl,
          role: roleLabel,
          skills: profile.skills,
          experience: experienceYears,
          location: profile.location,
          isOpenToWork: signals.readiness === "ready_now" || signals.readiness === "open",
          isAvailableNow: signals.readiness === "ready_now",
          email: profile.email,
          profileUrl: `/candidate/${profile.candidateId}?from=hr`,
          updatedAt: profile.updatedAt,
          score:
            (keyword ? (profile.headline + " " + profile.skills.join(" ")).toLowerCase().includes(keyword.toLowerCase()) ? 2 : 0 : 0) +
            (skills.length > 0
              ? skills.filter((skill) =>
                  profile.skills.some((candidateSkill) =>
                    candidateSkill.toLowerCase().includes(skill.toLowerCase())
                  )
                ).length
              : 0),
          salaryMin: salaryRange.min,
          salaryMax: salaryRange.max,
        };
      })
      .filter((candidate) => {
        if (location && !candidate.location.toLowerCase().includes(location)) {
          return false;
        }

        if (availableNow && !candidate.isAvailableNow) {
          return false;
        }

        if (openToWork && !candidate.isOpenToWork) {
          return false;
        }

        const expRange = parseExperienceRange(experience);
        if (expRange) {
          if (candidate.experience < expRange.min || candidate.experience > expRange.max) {
            return false;
          }
        }

        if (candidate.salaryMax < minSalary || candidate.salaryMin > maxSalary) {
          return false;
        }

        return true;
      });

    const sorted = [...mapped].sort((a, b) => {
      if (sort === "best_match") {
        return b.score - a.score || +new Date(b.updatedAt) - +new Date(a.updatedAt);
      }

      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const start = (normalizedPage - 1) * pageSize;
    const paged = sorted.slice(start, start + pageSize).map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      avatar: candidate.avatar,
      role: candidate.role,
      skills: candidate.skills,
      experience: candidate.experience,
      location: candidate.location,
      isOpenToWork: candidate.isOpenToWork,
      email: candidate.email,
      profileUrl: candidate.profileUrl,
      updatedAt: candidate.updatedAt,
    }));

    const items = paged.length > 0 ? paged : MOCK_CANDIDATES.slice(0, pageSize);
    const outputTotal = paged.length > 0 ? total : MOCK_CANDIDATES.length;
    const outputTotalPages = paged.length > 0 ? totalPages : Math.max(1, Math.ceil(outputTotal / pageSize));

    return NextResponse.json({
      items,
      page: normalizedPage,
      pageSize,
      total: outputTotal,
      totalPages: outputTotalPages,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách ứng viên public.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
