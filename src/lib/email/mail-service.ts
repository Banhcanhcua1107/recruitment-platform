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

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}.`);
  }
  return value;
}

function getSmtpConfig(): SMTPTransport.Options {
  const host = getRequiredEnv("SMTP_HOST");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const rawPort = process.env.SMTP_PORT?.trim() || "587";
  const port = Number(rawPort);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT không hợp lệ. Vui lòng cấu hình cổng SMTP dạng số dương.");
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  };
}

function getFromAddress() {
  return process.env.SMTP_FROM?.trim() || "";
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
    throw new Error("Thiếu SMTP_FROM để gửi email.");
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
