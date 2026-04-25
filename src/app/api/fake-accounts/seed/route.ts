import { NextResponse } from "next/server";
import { z } from "zod";
import {
  seedRecruitmentFakeAccounts,
  getFakeAccountStats,
} from "@/lib/email-testing/fake-accounts-repo";

export const runtime = "nodejs";

const seedSchema = z.object({
  candidateCount: z.number().int().min(0).max(500).default(40),
  recruiterCount: z.number().int().min(0).max(500).default(20),
});

export async function POST(request: Request) {
  try {
    let payload: unknown = {};
    try {
      const textBody = await request.text();
      payload = textBody.trim() ? JSON.parse(textBody) : {};
    } catch {
      payload = {};
    }

    const parsed = seedSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const summary = await seedRecruitmentFakeAccounts(parsed.data);
    const stats = await getFakeAccountStats();

    return NextResponse.json({
      success: true,
      requested: summary.requested,
      created: summary.created,
      skipped: summary.skipped,
      totalAccounts: summary.totalAccounts,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to seed fake accounts.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
