import "server-only";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Attachment } from "nodemailer/lib/mailer";
import {
  getMailpitSmtpConfig,
  getRealSmtpConfig,
} from "@/lib/email-testing/config";
import type { EmailMode } from "@/types/email-testing";

interface SendModeAwareEmailInput {
  from?: string;
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
}

interface DeliveryResult {
  mode: EmailMode;
  recipients: string[];
  from: string;
  replyTo: string | null;
  messageId: string;
  accepted: string[];
  rejected: string[];
}

interface SendModeAwareEmailResult {
  mode: EmailMode;
  messageId: string;
  accepted: string[];
  rejected: string[];
  deliveries: DeliveryResult[];
}

let realTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let testTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function normalizeAddress(input: string) {
  return input.trim().toLowerCase();
}

function toAddressList(value: string | string[]) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDomainFromAddress(address: string) {
  const normalizedAddress = normalizeAddress(address);
  const atIndex = normalizedAddress.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalizedAddress.length - 1) {
    return "";
  }
  return normalizedAddress.slice(atIndex + 1);
}

function normalizeDomainPattern(value: string) {
  return value.trim().toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
}

function getMailpitDomainPatterns() {
  const defaultPatterns = ["example.com"];
  const configuredPatterns = (process.env.EMAIL_TEST_RECIPIENT_DOMAINS || "")
    .split(",")
    .map((item) => normalizeDomainPattern(item))
    .filter(Boolean);

  return [...new Set([...defaultPatterns, ...configuredPatterns])];
}

function matchesMailpitDomain(domain: string, pattern: string) {
  if (!domain || !pattern) {
    return false;
  }
  return domain === pattern || domain.endsWith(`.${pattern}`);
}

export function isMailpitRecipient(address: string) {
  const domain = getDomainFromAddress(address);
  if (!domain) {
    return false;
  }

  if (domain.endsWith(".test")) {
    return true;
  }

  const patterns = getMailpitDomainPatterns();
  return patterns.some((pattern) => matchesMailpitDomain(domain, pattern));
}

export function resolveMailTransportForRecipient(address: string): EmailMode {
  return isMailpitRecipient(address) ? "test" : "real";
}

function groupRecipientsByTransport(recipients: string[]) {
  const grouped: Record<EmailMode, string[]> = {
    real: [],
    test: [],
  };

  const seen = new Set<string>();
  for (const recipient of recipients) {
    const normalized = normalizeAddress(recipient);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);

    grouped[resolveMailTransportForRecipient(normalized)].push(normalized);
  }

  return grouped;
}

function summarizeModeByRecipients(groupedRecipients: Record<EmailMode, string[]>) {
  return groupedRecipients.real.length > 0 ? "real" : "test";
}

function formatEnvelopeAddresses(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }
      if (value && typeof value === "object") {
        const candidate =
          (value as { address?: string }).address ||
          (value as { Address?: string }).Address ||
          (value as { email?: string }).email ||
          (value as { Email?: string }).Email;
        if (typeof candidate === "string") {
          return candidate;
        }
      }
      return "";
    })
    .filter(Boolean);
}

function getTransporter(mode: EmailMode) {
  if (mode === "real") {
    if (!realTransporter) {
      const config = getRealSmtpConfig();
      realTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }
    return {
      transporter: realTransporter,
      from: getRealSmtpConfig().from,
    };
  }

  if (!testTransporter) {
    const config = getMailpitSmtpConfig();
    testTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
    });
  }

  return {
    transporter: testTransporter,
    from: getMailpitSmtpConfig().from,
  };
}

export async function sendModeAwareEmail(
  input: SendModeAwareEmailInput,
): Promise<SendModeAwareEmailResult> {
  const recipients = toAddressList(input.to);

  if (recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  const groupedRecipients = groupRecipientsByTransport(recipients);
  const mode = summarizeModeByRecipients(groupedRecipients);
  const requestedFrom = input.from?.trim() || "";
  const deliveries: DeliveryResult[] = [];
  const errors: Array<{ mode: EmailMode; recipients: string[]; error: string }> = [];

  for (const recipientMode of ["test", "real"] as const) {
    const recipientsForTransport = groupedRecipients[recipientMode];
    if (recipientsForTransport.length === 0) {
      continue;
    }

    const { transporter, from: systemFrom } = getTransporter(recipientMode);
    const normalizedSystemFrom = normalizeAddress(systemFrom);
    const normalizedRequestedFrom = requestedFrom ? normalizeAddress(requestedFrom) : "";
    const replyTo =
      normalizedRequestedFrom && normalizedRequestedFrom !== normalizedSystemFrom
        ? requestedFrom
        : undefined;

    console.info("Routing outbound email by recipient.", {
      route: recipientMode === "test" ? "mailpit" : "real-smtp",
      recipients: recipientsForTransport,
      from: systemFrom,
      replyTo: replyTo || null,
      subject: input.subject,
    });

    try {
      const info = await transporter.sendMail({
        from: systemFrom,
        to: recipientsForTransport,
        replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments,
      });

      deliveries.push({
        mode: recipientMode,
        recipients: recipientsForTransport,
        from: systemFrom,
        replyTo: replyTo || null,
        messageId: info.messageId,
        accepted: formatEnvelopeAddresses(info.accepted),
        rejected: formatEnvelopeAddresses(info.rejected),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
      console.error("Failed outbound email delivery for recipient group.", {
        route: recipientMode === "test" ? "mailpit" : "real-smtp",
        recipients: recipientsForTransport,
        subject: input.subject,
        error: errorMessage,
      });

      errors.push({
        mode: recipientMode,
        recipients: recipientsForTransport,
        error: errorMessage,
      });
    }
  }

  if (deliveries.length === 0) {
    throw new Error("Unable to deliver email to any recipient.");
  }

  if (errors.length > 0) {
    const summary = errors
      .map((item) => `${item.mode}[${item.recipients.join(", ")}]: ${item.error}`)
      .join(" | ");
    throw new Error(`Partial email delivery failure. ${summary}`);
  }

  const accepted = deliveries.flatMap((delivery) => delivery.accepted);
  const rejected = deliveries.flatMap((delivery) => delivery.rejected);

  return {
    mode,
    messageId: deliveries.map((delivery) => delivery.messageId).join(","),
    accepted,
    rejected,
    deliveries,
  };
}
