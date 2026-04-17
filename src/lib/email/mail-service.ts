import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { sendModeAwareEmail } from "@/lib/email-testing/sender";

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

export interface SendEmailDelivery {
  mode: "real" | "test";
  recipients: string[];
  from: string;
  replyTo: string | null;
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export interface SendEmailResult {
  messageId: string;
  mode: "real" | "test";
  accepted: string[];
  rejected: string[];
  deliveries: SendEmailDelivery[];
}

function toPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function sendEmail(payload: SendEmailPayload) {
  const result = await sendModeAwareEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text?.trim() || toPlainText(payload.html),
    attachments: payload.attachments,
  });

  return {
    messageId: result.messageId,
    mode: result.mode,
    accepted: result.accepted,
    rejected: result.rejected,
    deliveries: result.deliveries,
  } as SendEmailResult;
}
