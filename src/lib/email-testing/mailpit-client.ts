import "server-only";

import { getMailpitApiBaseUrl } from "@/lib/email-testing/config";
import type { TestInboxMessage } from "@/types/email-testing";

interface MailpitSummaryResponse {
  messages?: Array<Record<string, unknown>>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readDate(value: unknown) {
  if (typeof value !== "string") {
    return new Date(0).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function addressFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const candidate =
    (value as { Address?: unknown }).Address ||
    (value as { address?: unknown }).address ||
    (value as { Email?: unknown }).Email ||
    (value as { email?: unknown }).email;

  if (typeof candidate === "string") {
    return candidate;
  }

  return "";
}

function addressesFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const single = addressFromUnknown(value);
    return single ? [single] : [];
  }

  return value.map(addressFromUnknown).filter(Boolean);
}

function readMessageId(summary: Record<string, unknown>) {
  const id = readString(summary.ID) || readString(summary.id);
  return id;
}

async function mailpitFetch<T>(path: string): Promise<T> {
  const baseUrl = getMailpitApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mailpit API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function detailToInboxMessage(detail: Record<string, unknown>): TestInboxMessage {
  return {
    id: readString(detail.ID) || readString(detail.id),
    subject: readString(detail.Subject) || readString(detail.subject) || "(No subject)",
    from:
      addressFromUnknown(detail.From) ||
      addressFromUnknown(detail.from) ||
      "unknown@gmail.test",
    to: addressesFromUnknown(detail.To).concat(addressesFromUnknown(detail.to)),
    createdAt: readDate(detail.Created || detail.created),
    text: readString(detail.Text) || readString(detail.text),
    html: readString(detail.HTML) || readString(detail.html),
  };
}

export async function fetchInboxMessagesForRecipient(email: string, limit = 20) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) {
    return [] as TestInboxMessage[];
  }

  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit || 20)));
  const query = encodeURIComponent(`to:${recipient}`);
  const summary = await mailpitFetch<MailpitSummaryResponse>(
    `/api/v1/search?query=${query}&limit=${safeLimit}`,
  );

  const summaries = summary.messages || [];
  const ids = summaries
    .map((entry) => readMessageId(entry))
    .filter(Boolean)
    .slice(0, safeLimit);

  const details = await Promise.all(
    ids.map((id) => mailpitFetch<Record<string, unknown>>(`/api/v1/message/${id}`)),
  );

  return details
    .map(detailToInboxMessage)
    .filter((message) => message.to.some((to) => to.toLowerCase() === recipient))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
