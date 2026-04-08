import "server-only";

import { ObjectId, type Collection } from "mongodb";
import {
  buildVietnameseFakeIdentity,
  generateFakeGmailAddress,
} from "@/lib/email-testing/fake-account-generator";
import { getEmailTestingDb } from "@/lib/email-testing/mongodb";
import {
  buildRecruitmentSeedAccounts,
  getDefaultRecruitmentSeedRequest,
  type RecruitmentSeedRequest,
} from "@/lib/email-testing/seed-data";
import type { FakeAccount, FakeAccountRole } from "@/types/email-testing";

const COLLECTION_NAME = "fake_email_accounts";

interface FakeAccountDocument {
  _id?: ObjectId;
  email: string;
  role: FakeAccountRole;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName: string;
  createdAt: Date;
}

let indexInitPromise: Promise<void> | null = null;

export interface FakeAccountStats {
  total: number;
  candidate: number;
  recruiter: number;
}

export interface FakeAccountListOptions {
  role?: FakeAccountRole;
}

export interface FakeAccountSeedSummary {
  requested: {
    candidateCount: number;
    recruiterCount: number;
  };
  created: {
    candidate: number;
    recruiter: number;
  };
  skipped: {
    candidate: number;
    recruiter: number;
  };
  totalAccounts: number;
}

function clampCount(value: number, max = 500) {
  const normalized = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(max, Math.max(0, normalized));
}

function normalizeSeedRequest(input?: Partial<RecruitmentSeedRequest>): RecruitmentSeedRequest {
  const defaults = getDefaultRecruitmentSeedRequest();
  return {
    candidateCount: clampCount(input?.candidateCount ?? defaults.candidateCount),
    recruiterCount: clampCount(input?.recruiterCount ?? defaults.recruiterCount),
  };
}

function normalizeRole(value: unknown): FakeAccountRole {
  return value === "recruiter" ? "recruiter" : "candidate";
}

function buildRoleFilter(role?: FakeAccountRole) {
  if (role === "candidate" || role === "recruiter") {
    return { role };
  }
  return {};
}

function resolveIdentity(document: FakeAccountDocument) {
  const role = normalizeRole(document.role);
  const generated = buildVietnameseFakeIdentity(document.email, role);
  const firstName = String(document.firstName || "").trim() || generated.firstName;
  const lastName = String(document.lastName || "").trim() || generated.lastName;
  const fullName = String(document.fullName || "").trim() || `${lastName} ${firstName}`.trim();
  const displayName = role === "recruiter" ? `${fullName} (HR)` : fullName;

  return {
    firstName,
    lastName,
    fullName,
    displayName,
  };
}

function toFakeAccount(document: FakeAccountDocument): FakeAccount {
  if (!document._id) {
    throw new Error("Fake account document is missing _id.");
  }

  const identity = resolveIdentity(document);

  return {
    id: document._id.toHexString(),
    email: document.email,
    role: normalizeRole(document.role),
    firstName: identity.firstName,
    lastName: identity.lastName,
    fullName: identity.fullName,
    displayName: identity.displayName,
    createdAt: document.createdAt.toISOString(),
  };
}

async function backfillMissingIdentityFields(collection: Collection<FakeAccountDocument>) {
  const cursor = collection.find(
    {
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { fullName: { $exists: false } },
      ],
    },
    {
      projection: {
        _id: 1,
        email: 1,
        role: 1,
      },
    },
  );

  const operations: Array<{
    updateOne: {
      filter: { _id: ObjectId };
      update: {
        $set: {
          firstName: string;
          lastName: string;
          fullName: string;
          displayName: string;
        };
      };
    };
  }> = [];

  for await (const document of cursor) {
    if (!document._id) {
      continue;
    }

    const role = normalizeRole(document.role);
    const identity = buildVietnameseFakeIdentity(document.email, role);
    operations.push({
      updateOne: {
        filter: { _id: document._id },
        update: {
          $set: {
            firstName: identity.firstName,
            lastName: identity.lastName,
            fullName: identity.fullName,
            displayName: identity.displayName,
          },
        },
      },
    });

    if (operations.length >= 200) {
      await collection.bulkWrite(operations, { ordered: false });
      operations.length = 0;
    }
  }

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: false });
  }
}

async function getCollection(): Promise<Collection<FakeAccountDocument>> {
  const db = await getEmailTestingDb();
  const collection = db.collection<FakeAccountDocument>(COLLECTION_NAME);

  if (!indexInitPromise) {
    // Ensure account uniqueness even when multiple requests hit create concurrently.
    indexInitPromise = (async () => {
      await Promise.all([
        collection.createIndex({ email: 1 }, { unique: true }),
        collection.createIndex({ role: 1, email: 1 }),
        collection.updateMany(
          { role: { $exists: false } },
          { $set: { role: "candidate" as FakeAccountRole } },
        ),
      ]);

      // Legacy records only had displayName; backfill structured Vietnamese names once.
      await backfillMissingIdentityFields(collection);
    })();
  }

  await indexInitPromise;
  return collection;
}

export async function listFakeAccounts(options: FakeAccountListOptions = {}): Promise<FakeAccount[]> {
  const collection = await getCollection();
  const documents = await collection
    .find(buildRoleFilter(options.role))
    .sort({ role: 1, email: 1 })
    .toArray();

  return documents.map(toFakeAccount);
}

export async function getFakeAccountStats(): Promise<FakeAccountStats> {
  const collection = await getCollection();
  const [candidate, recruiter, total] = await Promise.all([
    collection.countDocuments({ role: "candidate" }),
    collection.countDocuments({ role: "recruiter" }),
    collection.countDocuments({}),
  ]);

  return {
    total,
    candidate,
    recruiter,
  };
}

export async function createFakeAccounts(
  count: number,
  role: FakeAccountRole = "candidate",
): Promise<FakeAccount[]> {
  const safeCount = Math.min(200, Math.max(1, Math.floor(count || 1)));
  const normalizedRole = normalizeRole(role);
  const collection = await getCollection();

  const existingEmails = await collection.distinct("email");
  const emailSet = new Set(existingEmails.map((email) => email.toLowerCase()));

  const now = new Date();
  const toInsert: Omit<FakeAccountDocument, "_id">[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const email = generateFakeGmailAddress(emailSet, normalizedRole);
    const identity = buildVietnameseFakeIdentity(email, normalizedRole);
    toInsert.push({
      email,
      role: normalizedRole,
      firstName: identity.firstName,
      lastName: identity.lastName,
      fullName: identity.fullName,
      displayName: identity.displayName,
      createdAt: now,
    });
  }

  const result = await collection.insertMany(toInsert);
  const insertedIds = Object.values(result.insertedIds);

  const insertedDocuments = await collection
    .find({ _id: { $in: insertedIds } })
    .sort({ email: 1 })
    .toArray();

  return insertedDocuments.map(toFakeAccount);
}

export async function seedRecruitmentFakeAccounts(
  request?: Partial<RecruitmentSeedRequest>,
): Promise<FakeAccountSeedSummary> {
  const normalizedRequest = normalizeSeedRequest(request);
  const seedItems = buildRecruitmentSeedAccounts(normalizedRequest);
  const collection = await getCollection();

  if (seedItems.length === 0) {
    const stats = await getFakeAccountStats();
    return {
      requested: {
        candidateCount: normalizedRequest.candidateCount,
        recruiterCount: normalizedRequest.recruiterCount,
      },
      created: { candidate: 0, recruiter: 0 },
      skipped: {
        candidate: normalizedRequest.candidateCount,
        recruiter: normalizedRequest.recruiterCount,
      },
      totalAccounts: stats.total,
    };
  }

  const now = new Date();
  const operations = seedItems.map((item) => ({
    updateOne: {
      filter: { email: item.email },
      update: {
        $setOnInsert: {
          email: item.email,
          role: item.role,
          firstName: item.firstName,
          lastName: item.lastName,
          fullName: item.fullName,
          displayName: item.displayName,
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(operations, { ordered: false });

  const createdByRole = {
    candidate: 0,
    recruiter: 0,
  };

  for (const [operationIndex] of Object.entries(result.upsertedIds || {})) {
    const seedItem = seedItems[Number(operationIndex)];
    if (!seedItem) {
      continue;
    }
    createdByRole[seedItem.role] += 1;
  }

  const skippedByRole = {
    candidate: normalizedRequest.candidateCount - createdByRole.candidate,
    recruiter: normalizedRequest.recruiterCount - createdByRole.recruiter,
  };

  const stats = await getFakeAccountStats();

  return {
    requested: {
      candidateCount: normalizedRequest.candidateCount,
      recruiterCount: normalizedRequest.recruiterCount,
    },
    created: createdByRole,
    skipped: skippedByRole,
    totalAccounts: stats.total,
  };
}

export async function deleteFakeAccountById(id: string) {
  const collection = await getCollection();
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return { deletedCount: result.deletedCount ?? 0 };
}

export async function deleteFakeAccountByEmail(email: string) {
  const collection = await getCollection();
  const result = await collection.deleteOne({ email: email.trim().toLowerCase() });
  return { deletedCount: result.deletedCount ?? 0 };
}

export async function deleteAllFakeAccounts() {
  const collection = await getCollection();
  const result = await collection.deleteMany({});
  return { deletedCount: result.deletedCount ?? 0 };
}
