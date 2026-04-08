import "server-only";

import { buildVietnameseFakeIdentity } from "@/lib/email-testing/fake-account-generator";
import type { FakeAccountRole } from "@/types/email-testing";

export interface RecruitmentSeedRequest {
  candidateCount: number;
  recruiterCount: number;
}

export interface SeedAccountInput {
  email: string;
  role: FakeAccountRole;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
}

const DEFAULT_SEED: RecruitmentSeedRequest = {
  candidateCount: 40,
  recruiterCount: 20,
};

function padSequence(index: number, width: number) {
  return String(index).padStart(width, "0");
}

function resolvePaddingWidth(count: number) {
  return Math.max(2, String(Math.max(1, count)).length);
}

function buildSeededRoleAccounts(
  role: FakeAccountRole,
  count: number,
): SeedAccountInput[] {
  const safeCount = Math.max(0, Math.floor(count));
  const width = resolvePaddingWidth(safeCount);
  const rolePrefix = role === "candidate" ? "candidate" : "recruiter";

  const items: SeedAccountInput[] = [];
  for (let index = 1; index <= safeCount; index += 1) {
    const sequence = padSequence(index, width);
    const email = `${rolePrefix}${sequence}@gmail.test`;
    const identity = buildVietnameseFakeIdentity(email, role);
    items.push({
      email,
      role,
      firstName: identity.firstName,
      lastName: identity.lastName,
      fullName: identity.fullName,
      displayName: identity.displayName,
    });
  }

  return items;
}

export function getDefaultRecruitmentSeedRequest(): RecruitmentSeedRequest {
  return { ...DEFAULT_SEED };
}

export function buildRecruitmentSeedAccounts(
  request: RecruitmentSeedRequest,
): SeedAccountInput[] {
  return [
    ...buildSeededRoleAccounts("candidate", request.candidateCount),
    ...buildSeededRoleAccounts("recruiter", request.recruiterCount),
  ];
}
