import "server-only";

import type { EmailMode } from "@/types/email-testing";

interface SmtpRuntimeConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value?.trim() || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getDefaultMailpitHost() {
  return process.env.DOCKER_DEV === "true" ? "mailpit" : "127.0.0.1";
}

export function getEmailMode(): EmailMode {
  const value = process.env.EMAIL_MODE?.trim().toLowerCase();
  return value === "real" ? "real" : "test";
}

export function getMailpitSmtpConfig(): SmtpRuntimeConfig {
  const host = process.env.MAILPIT_SMTP_HOST?.trim() || getDefaultMailpitHost();
  const port = parsePort(process.env.MAILPIT_SMTP_PORT, 1025);
  const from = process.env.TEST_SMTP_FROM?.trim() || "no-reply@gmail.test";

  return {
    host,
    port,
    secure: false,
    from,
  };
}

export function getRealSmtpConfig(): SmtpRuntimeConfig {
  const host =
    process.env.REAL_SMTP_HOST?.trim() ||
    process.env.SMTP_HOST?.trim() ||
    "smtp.gmail.com";
  const port = parsePort(process.env.REAL_SMTP_PORT || process.env.SMTP_PORT, 587);
  const secure = parseBoolean(
    process.env.REAL_SMTP_SECURE || process.env.SMTP_SECURE,
    false,
  );
  const user = process.env.REAL_SMTP_USER?.trim() || process.env.SMTP_USER?.trim() || "";
  const pass = process.env.REAL_SMTP_PASS?.trim() || process.env.SMTP_PASS?.trim() || "";
  const from =
    process.env.REAL_SMTP_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user;

  if (!user || !pass || !from) {
    throw new Error(
      "REAL mode requires REAL_SMTP_USER / REAL_SMTP_PASS / REAL_SMTP_FROM (or SMTP_USER / SMTP_PASS / SMTP_FROM).",
    );
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

export function getMailpitApiBaseUrl() {
  const explicit = process.env.MAILPIT_API_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  return `http://${getDefaultMailpitHost()}:8025`;
}

export function getMailpitWebUrl() {
  return process.env.MAILPIT_WEB_URL?.trim() || "http://localhost:8025";
}

export function getMongoDbUri() {
  return (
    process.env.MONGODB_URI?.trim() ||
    (process.env.DOCKER_DEV === "true"
      ? "mongodb://mongodb:27017/recruitment_platform"
      : "mongodb://127.0.0.1:27017/recruitment_platform")
  );
}

export function getMongoDbName() {
  return process.env.MONGODB_DB?.trim() || "recruitment_platform";
}
