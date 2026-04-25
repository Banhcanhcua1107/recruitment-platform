import "server-only";

import {
  buildEducationSummary,
  buildWorkExperienceSummary,
} from "@/lib/candidate-profile-shared";
import { buildProfileDocumentFromLegacyProfile } from "@/lib/candidate-profile-document";
import { getEmailMode } from "@/lib/email-testing/config";
import {
  listFakeAccounts,
  seedRecruitmentFakeAccounts,
} from "@/lib/email-testing/fake-accounts-repo";
import type { RecruitmentSeedRequest } from "@/lib/email-testing/seed-data";
import type {
  CandidateEducation,
  CandidateWorkExperience,
} from "@/types/candidate-profile";
import type { FakeAccount, FakeAccountRole } from "@/types/email-testing";
import { createAdminClient } from "@/utils/supabase/admin";

export type RecruitmentSyncRole = "all" | FakeAccountRole;

export interface RecruitmentSyncInput {
  role?: RecruitmentSyncRole;
  seedIfEmpty?: boolean;
  candidateCount?: number;
  recruiterCount?: number;
}

export interface RecruitmentSyncSummary {
  requestedRole: RecruitmentSyncRole;
  requestedAccounts: number;
  processedAccounts: number;
  sharedLoginPassword: string;
  seededBeforeSync: {
    attempted: boolean;
    candidateCount: number;
    recruiterCount: number;
    createdCandidate: number;
    createdRecruiter: number;
  };
  authUsers: {
    created: number;
    existing: number;
  };
  synced: {
    profiles: {
      candidate: number;
      recruiter: number;
    };
    candidateProfiles: number;
    candidates: number;
    employers: number;
  };
  publicCandidateTestAccounts: number;
  failed: Array<{
    email: string;
    reason: string;
  }>;
}

interface CandidateSeedProfile {
  fullName: string;
  headline: string;
  phone: string;
  location: string;
  introduction: string;
  skills: string[];
  workExperiences: CandidateWorkExperience[];
  educations: CandidateEducation[];
}

const DEFAULT_SYNC_COUNTS: RecruitmentSeedRequest = {
  candidateCount: 40,
  recruiterCount: 20,
};

const DEFAULT_EMAIL_TESTING_SYNC_PASSWORD = "TalentFlowTest#2026";

const CANDIDATE_HEADLINES = [
  "Frontend Developer",
  "Backend Engineer",
  "Fullstack Developer",
  "UI UX Designer",
  "Data Analyst",
  "QA Engineer",
  "Product Designer",
  "Mobile Developer",
];

const LOCATION_POOL = [
  "Ho Chi Minh",
  "Ha Noi",
  "Da Nang",
  "Can Tho",
  "Hai Phong",
  "Binh Duong",
  "Nha Trang",
  "Hue",
];

const SKILL_SETS = [
  ["React", "TypeScript", "Next.js", "Tailwind"],
  ["Node.js", "Express", "PostgreSQL", "Redis"],
  ["Java", "Spring Boot", "MySQL", "Docker"],
  ["Python", "FastAPI", "Pandas", "SQL"],
  ["Figma", "Design System", "Prototyping", "User Research"],
  ["Flutter", "Dart", "REST API", "Firebase"],
  ["C#", ".NET", "Azure", "Microservices"],
  ["Go", "gRPC", "Kubernetes", "Prometheus"],
];

const COMPANY_POOL = [
  "TalentFlow",
  "Blue Ocean Tech",
  "Acme Labs",
  "Green Works",
  "Nova Systems",
  "Skyline Studio",
  "Vertex Labs",
  "NextEdge",
];

const SCHOOL_POOL = [
  "HCMUT",
  "VNU HCM",
  "FPT University",
  "UEH",
  "HUST",
  "PTIT",
  "DUT",
  "Can Tho University",
];

const DEGREE_POOL = [
  "Computer Science",
  "Software Engineering",
  "Information Technology",
  "Data Science",
  "Information Systems",
  "Multimedia Design",
];

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function parseSequenceFromEmail(email: string) {
  const localPart = email.split("@")[0] || "";
  const match = localPart.match(/(\d+)$/);
  if (!match) {
    return 1;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function pickDeterministic<T>(items: T[], seed: number): T {
  if (items.length === 0) {
    throw new Error("Deterministic pool is empty.");
  }

  const safeIndex = Math.abs(seed) % items.length;
  return items[safeIndex] as T;
}

function buildPhoneNumber(sequence: number) {
  const suffix = String((sequence * 7919) % 100_000_000).padStart(8, "0");
  return `09${suffix}`;
}

function buildCandidateWorkExperiences(
  sequence: number,
  email: string,
  primaryHeadline: string,
): CandidateWorkExperience[] {
  const years = 1 + (sequence % 6);
  const now = new Date();
  const currentYear = now.getFullYear();
  const primaryStartYear = currentYear - Math.max(1, years - 1);
  const previousStartYear = Math.max(primaryStartYear - 2, currentYear - 8);
  const previousEndYear = Math.max(previousStartYear + 1, primaryStartYear - 1);
  const primaryCompany = pickDeterministic(COMPANY_POOL, sequence + 3);
  const previousCompany = pickDeterministic(COMPANY_POOL, sequence + 11);

  return [
    {
      id: `${email}-work-current`,
      title: primaryHeadline,
      company: primaryCompany,
      startDate: `${primaryStartYear}-01-01`,
      endDate: "",
      isCurrent: true,
      description:
        "Responsible for delivering product features, collaborating with cross-functional teams, and maintaining code quality.",
    },
    {
      id: `${email}-work-previous`,
      title: `Junior ${primaryHeadline}`,
      company: previousCompany,
      startDate: `${previousStartYear}-01-01`,
      endDate: `${previousEndYear}-12-31`,
      isCurrent: false,
      description:
        "Supported feature implementation, bug fixing, and internal tooling improvements in agile projects.",
    },
  ];
}

function buildCandidateEducations(
  sequence: number,
  email: string,
): CandidateEducation[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const graduationYear = currentYear - (2 + (sequence % 5));
  const startYear = graduationYear - 4;
  const school = pickDeterministic(SCHOOL_POOL, sequence + 5);
  const degree = pickDeterministic(DEGREE_POOL, sequence + 9);

  return [
    {
      id: `${email}-education-1`,
      school,
      degree,
      startDate: `${startYear}-09-01`,
      endDate: `${graduationYear}-06-01`,
      description: "Graduated with a solid foundation in software development and teamwork.",
    },
  ];
}

function buildCandidateSeedProfile(account: FakeAccount): CandidateSeedProfile {
  const sequence = parseSequenceFromEmail(account.email);
  const headline = pickDeterministic(CANDIDATE_HEADLINES, sequence);
  const location = pickDeterministic(LOCATION_POOL, sequence + 7);
  const skills = pickDeterministic(SKILL_SETS, sequence + 13);
  const workExperiences = buildCandidateWorkExperiences(sequence, account.email, headline);
  const educations = buildCandidateEducations(sequence, account.email);

  return {
    fullName: account.fullName,
    headline,
    phone: buildPhoneNumber(sequence),
    location,
    introduction:
      "Candidate account seeded from email testing pool for HR discovery, profile review, and recruiter outreach flow validation.",
    skills,
    workExperiences,
    educations,
  };
}

function normalizeRole(input: RecruitmentSyncRole | undefined): RecruitmentSyncRole {
  if (input === "candidate" || input === "recruiter") {
    return input;
  }

  return "all";
}

function toPlatformRole(role: FakeAccountRole) {
  return role === "candidate" ? "candidate" : "hr";
}

function isAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists")
  );
}

function resolveEmailTestingSyncPassword() {
  const configuredPassword = process.env.EMAIL_TESTING_SYNC_PASSWORD?.trim();
  return configuredPassword || DEFAULT_EMAIL_TESTING_SYNC_PASSWORD;
}

async function findAuthUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 30) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const users = data?.users || [];
    const match = users.find(
      (user) => String(user.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (match?.id) {
      return match.id;
    }

    if (!data?.nextPage || users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function ensureAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  account: FakeAccount,
): Promise<{ userId: string; created: boolean }> {
  const normalizedEmail = account.email.trim().toLowerCase();
  const sharedPassword = resolveEmailTestingSyncPassword();

  const syncAuthCredentials = async (userId: string) => {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: sharedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        source: "email-testing",
      },
    });

    if (updateError) {
      throw new Error(updateError.message);
    }
  };

  const { data: profileMatch, error: profileLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (profileLookupError) {
    throw new Error(profileLookupError.message);
  }

  if (profileMatch?.id) {
    const existingProfileUserId = String(profileMatch.id);
    await syncAuthCredentials(existingProfileUserId);

    return {
      userId: existingProfileUserId,
      created: false,
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: sharedPassword,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      source: "email-testing",
    },
  });

  if (error) {
    if (!isAlreadyRegisteredError(error.message)) {
      throw new Error(error.message);
    }

    const recoveredUserId = await findAuthUserIdByEmail(admin, normalizedEmail);
    if (!recoveredUserId) {
      throw new Error(
        `User ${normalizedEmail} already exists but cannot be resolved by admin listUsers.`,
      );
    }

    await syncAuthCredentials(recoveredUserId);

    return {
      userId: recoveredUserId,
      created: false,
    };
  }

  if (!data?.user?.id) {
    throw new Error(`Supabase did not return user id for ${normalizedEmail}.`);
  }

  await syncAuthCredentials(data.user.id);

  return {
    userId: data.user.id,
    created: true,
  };
}

async function upsertProfile(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    email: string;
    fullName: string;
    role: FakeAccountRole;
  },
) {
  const now = new Date().toISOString();
  const { error } = await admin.from("profiles").upsert(
    {
      id: input.userId,
      full_name: input.fullName,
      email: input.email.toLowerCase(),
      avatar_url: null,
      role: toPlatformRole(input.role),
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertCandidateRows(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    account: FakeAccount;
  },
) {
  const seedProfile = buildCandidateSeedProfile(input.account);
  const workExperienceSummary = buildWorkExperienceSummary(seedProfile.workExperiences);
  const educationSummary = buildEducationSummary(seedProfile.educations);
  const document = buildProfileDocumentFromLegacyProfile({
    fullName: seedProfile.fullName,
    headline: seedProfile.headline,
    email: input.account.email,
    phone: seedProfile.phone,
    location: seedProfile.location,
    introduction: seedProfile.introduction,
    skills: seedProfile.skills,
    workExperiences: seedProfile.workExperiences,
    educations: seedProfile.educations,
  });

  const now = new Date().toISOString();
  const { error: candidateProfileError } = await admin
    .from("candidate_profiles")
    .upsert(
      {
        user_id: input.userId,
        document,
        full_name: seedProfile.fullName,
        avatar_url: null,
        headline: seedProfile.headline,
        email: input.account.email,
        phone: seedProfile.phone,
        location: seedProfile.location,
        introduction: seedProfile.introduction,
        skills: seedProfile.skills,
        work_experiences: seedProfile.workExperiences,
        educations: seedProfile.educations,
        work_experience: workExperienceSummary,
        education: educationSummary,
        cv_file_path: null,
        cv_url: null,
        profile_visibility: "public",
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

  if (candidateProfileError) {
    throw new Error(candidateProfileError.message);
  }

  const { error: candidateDirectoryError } = await admin
    .from("candidates")
    .upsert(
      {
        id: input.userId,
        full_name: seedProfile.fullName,
        email: input.account.email,
        phone: seedProfile.phone,
        resume_url: null,
      },
      { onConflict: "id" },
    );

  if (candidateDirectoryError) {
    throw new Error(candidateDirectoryError.message);
  }
}

async function upsertRecruiterRows(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    account: FakeAccount;
  },
) {
  const { error } = await admin
    .from("employers")
    .upsert(
      {
        id: input.userId,
        company_name: `${input.account.fullName} Recruiting`,
        email: input.account.email,
        password_hash: null,
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message);
  }
}

function filterAccountsByRole(accounts: FakeAccount[], role: RecruitmentSyncRole) {
  if (role === "all") {
    return accounts;
  }

  return accounts.filter((account) => account.role === role);
}

function getSafeSeedCounts(input: RecruitmentSyncInput) {
  const candidateCount = Math.max(
    0,
    Math.floor(input.candidateCount ?? DEFAULT_SYNC_COUNTS.candidateCount),
  );
  const recruiterCount = Math.max(
    0,
    Math.floor(input.recruiterCount ?? DEFAULT_SYNC_COUNTS.recruiterCount),
  );

  return {
    candidateCount,
    recruiterCount,
  };
}

export async function syncFakeAccountsToRecruitment(
  input: RecruitmentSyncInput = {},
): Promise<RecruitmentSyncSummary> {
  if (getEmailMode() !== "test") {
    throw new Error("Fake account recruitment sync is only allowed in EMAIL_MODE=test.");
  }

  const role = normalizeRole(input.role);
  const admin = createAdminClient();
  const safeSeedCounts = getSafeSeedCounts(input);

  let allAccounts = await listFakeAccounts();
  const shouldSeedIfEmpty = input.seedIfEmpty !== false;
  let seededBeforeSync = {
    attempted: false,
    candidateCount: safeSeedCounts.candidateCount,
    recruiterCount: safeSeedCounts.recruiterCount,
    createdCandidate: 0,
    createdRecruiter: 0,
  };

  if (allAccounts.length === 0 && shouldSeedIfEmpty) {
    seededBeforeSync.attempted = true;
    const seedResult = await seedRecruitmentFakeAccounts(safeSeedCounts);
    seededBeforeSync = {
      attempted: true,
      candidateCount: seedResult.requested.candidateCount,
      recruiterCount: seedResult.requested.recruiterCount,
      createdCandidate: seedResult.created.candidate,
      createdRecruiter: seedResult.created.recruiter,
    };
    allAccounts = await listFakeAccounts();
  }

  const scopedAccounts = filterAccountsByRole(allAccounts, role).filter((account) =>
    account.email.toLowerCase().endsWith("@gmail.test"),
  );

  const summary: RecruitmentSyncSummary = {
    requestedRole: role,
    requestedAccounts: scopedAccounts.length,
    processedAccounts: 0,
    sharedLoginPassword: resolveEmailTestingSyncPassword(),
    seededBeforeSync,
    authUsers: {
      created: 0,
      existing: 0,
    },
    synced: {
      profiles: {
        candidate: 0,
        recruiter: 0,
      },
      candidateProfiles: 0,
      candidates: 0,
      employers: 0,
    },
    publicCandidateTestAccounts: 0,
    failed: [],
  };

  for (const account of scopedAccounts) {
    try {
      const authUser = await ensureAuthUser(admin, account);
      if (authUser.created) {
        summary.authUsers.created += 1;
      } else {
        summary.authUsers.existing += 1;
      }

      await upsertProfile(admin, {
        userId: authUser.userId,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
      });
      summary.synced.profiles[account.role] += 1;

      if (account.role === "candidate") {
        await upsertCandidateRows(admin, {
          userId: authUser.userId,
          account,
        });
        summary.synced.candidateProfiles += 1;
        summary.synced.candidates += 1;
      } else {
        await upsertRecruiterRows(admin, {
          userId: authUser.userId,
          account,
        });
        summary.synced.employers += 1;
      }

      summary.processedAccounts += 1;
    } catch (error) {
      summary.failed.push({
        email: account.email,
        reason: toErrorMessage(error),
      });
    }
  }

  const { count } = await admin
    .from("candidate_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("profile_visibility", "public")
    .ilike("email", "%@gmail.test");

  summary.publicCandidateTestAccounts = count ?? 0;

  return summary;
}
