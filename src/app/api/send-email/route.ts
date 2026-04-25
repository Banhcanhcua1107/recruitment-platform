import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailMode } from "@/lib/email-testing/config";
import { buildEmailTemplate } from "@/lib/email-testing/templates";
import { sendModeAwareEmail } from "@/lib/email-testing/sender";
import type { EmailTemplateKind } from "@/types/email-testing";

export const runtime = "nodejs";

const sendEmailSchema = z.object({
  from: z.string().email().optional(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  template: z
    .enum([
      "otp",
      "verification",
      "password-reset",
      "apply-job",
      "notification",
      "custom",
    ])
    .default("notification"),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = sendEmailSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { from, to, template, subject, text, html, data } = parsed.data;
    const recipients = Array.isArray(to) ? to : [to];

    const builtTemplate = buildEmailTemplate({
      template: template as EmailTemplateKind,
      recipientEmail: recipients[0],
      senderEmail: from,
      customSubject: subject,
      customText: text,
      customHtml: html,
      data,
    });

    const result = await sendModeAwareEmail({
      from,
      to: recipients,
      subject: builtTemplate.subject,
      text: builtTemplate.text,
      html: builtTemplate.html,
    });

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      template,
      recipientCount: recipients.length,
      safeTestMode: getEmailMode() === "test",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email.";
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
