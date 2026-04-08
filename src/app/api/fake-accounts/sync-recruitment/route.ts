import { NextResponse } from "next/server";
import { z } from "zod";
import { syncFakeAccountsToRecruitment } from "@/lib/email-testing/recruitment-sync";

export const runtime = "nodejs";

const syncSchema = z.object({
  role: z.enum(["all", "candidate", "recruiter"]).default("all"),
  seedIfEmpty: z.boolean().default(true),
  candidateCount: z.number().int().min(0).max(500).default(40),
  recruiterCount: z.number().int().min(0).max(500).default(20),
});

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("only allowed") || normalized.includes("email_mode=test")) {
    return 403;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    let payload: unknown = {};

    try {
      const textBody = await request.text();
      payload = textBody.trim() ? JSON.parse(textBody) : {};
    } catch {
      payload = {};
    }

    const parsed = syncSchema.safeParse(payload);
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

    const summary = await syncFakeAccountsToRecruitment(parsed.data);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync fake accounts.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: getStatusCode(message) },
    );
  }
}
