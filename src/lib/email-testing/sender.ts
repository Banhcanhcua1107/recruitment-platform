import "server-only";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Attachment } from "nodemailer/lib/mailer";
import {
  getEmailMode,
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

interface SendModeAwareEmailResult {
  mode: EmailMode;
  messageId: string;
  accepted: string[];
  rejected: string[];
}

let realTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let testTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function normalizeAddress(input: string) {
  return input.trim().toLowerCase();
}

function isTestAddress(address: string) {
  return /@[^@]+\.test$/i.test(address);
}

function assertSafeTestAddresses(addresses: string[]) {
  const invalid = addresses.filter((address) => !isTestAddress(address));
  if (invalid.length > 0) {
    throw new Error(
      `TEST mode only allows .test recipients/senders. Rejected: ${invalid.join(", ")}`,
    );
  }
}

function toAddressList(value: string | string[]) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => item.trim())
    .filter(Boolean);
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
  const mode = getEmailMode();
  const recipients = toAddressList(input.to);

  if (recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  const { transporter, from: defaultFrom } = getTransporter(mode);
  const from = input.from?.trim() || defaultFrom;

  if (!from) {
    throw new Error("A sender address is required.");
  }

  if (mode === "test") {
    const allAddresses = [from, ...recipients].map(normalizeAddress);
    assertSafeTestAddresses(allAddresses);
  }

  const info = await transporter.sendMail({
    from,
    to: recipients,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
  });

  return {
    mode,
    messageId: info.messageId,
    accepted: formatEnvelopeAddresses(info.accepted),
    rejected: formatEnvelopeAddresses(info.rejected),
  };
}
