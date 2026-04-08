import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailMode, getMailpitWebUrl } from "@/lib/email-testing/config";
import { fetchInboxMessagesForRecipient } from "@/lib/email-testing/mailpit-client";

export const runtime = "nodejs";

const querySchema = z.object({
  email: z.string().email(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  try {
    const mode = getEmailMode();
    if (mode !== "test") {
      return NextResponse.json(
        {
          error: "Test inbox is only available when EMAIL_MODE=test.",
          mode,
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      email: searchParams.get("email") || "",
      limit: searchParams.get("limit") || "20",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const messages = await fetchInboxMessagesForRecipient(
      parsed.data.email,
      parsed.data.limit,
    );

    return NextResponse.json({
      mode,
      email: parsed.data.email,
      count: messages.length,
      items: messages,
      mailpitWebUrl: getMailpitWebUrl(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch test inbox.";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
