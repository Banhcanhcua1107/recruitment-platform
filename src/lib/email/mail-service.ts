import "server-only";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Attachment } from "nodemailer/lib/mailer";

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

function getSmtpConfig(): SMTPTransport.Options {
  const user = process.env.GMAIL_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_SMTP_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Thiếu GMAIL_SMTP_USER/GMAIL_SMTP_PASS (hoặc SMTP_USER/SMTP_PASS).");
  }

  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  };
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.GMAIL_SMTP_USER || process.env.SMTP_USER;
}

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
  }
  return transporter;
}

export async function sendEmail(payload: SendEmailPayload) {
  const from = getFromAddress();
  if (!from) {
    throw new Error("Thiếu SMTP_FROM (hoặc SMTP_USER/GMAIL_SMTP_USER) để gửi email.");
  }

  const info = await getTransporter().sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments,
  });

  return {
    messageId: info.messageId,
  };
}
