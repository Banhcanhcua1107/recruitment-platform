import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export interface ViewerNotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

function isMissingNotificationsTableMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('relation "notifications" does not exist') ||
    normalized.includes("could not find the table 'public.notifications' in the schema cache")
  );
}

export async function listViewerNotifications(limit = 20): Promise<ViewerNotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const primary = await supabase
    .from("notifications")
    .select("id,type,title,description,href,metadata,is_read,created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!primary.error) {
    const rows = (primary.data ?? []) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id ?? ""),
      type: String(row.type ?? "general"),
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      href: typeof row.href === "string" ? row.href : null,
      metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
      isRead: Boolean(row.is_read),
      createdAt: String(row.created_at ?? ""),
    }));
  }

  const primaryMessage = primary.error.message;
  if (isMissingNotificationsTableMessage(primaryMessage)) {
    return [];
  }

  if (primaryMessage.toLowerCase().includes("column") || primaryMessage.toLowerCase().includes("recipient_id")) {
    const fallback = await supabase
      .from("notifications")
      .select("id,type,title,description,href,metadata,read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!fallback.error) {
      const rows = (fallback.data ?? []) as Array<Record<string, unknown>>;
      return rows.map((row) => ({
        id: String(row.id ?? ""),
        type: String(row.type ?? "general"),
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        href: typeof row.href === "string" ? row.href : null,
        metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
        isRead: Boolean(row.read),
        createdAt: String(row.created_at ?? ""),
      }));
    }

    if (isMissingNotificationsTableMessage(fallback.error.message)) {
      return [];
    }

    throw new Error(fallback.error.message);
  }

  throw new Error(primaryMessage);
}

export async function markViewerNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return;
  }

  const primary = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (!primary.error) {
    return;
  }

  const primaryMessage = primary.error.message;
  if (isMissingNotificationsTableMessage(primaryMessage)) {
    return;
  }

  if (primaryMessage.toLowerCase().includes("column") || primaryMessage.toLowerCase().includes("recipient_id")) {
    const fallback = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!fallback.error || isMissingNotificationsTableMessage(fallback.error.message)) {
      return;
    }

    throw new Error(fallback.error.message);
  }

  throw new Error(primaryMessage);
}

export async function createSystemNotification(input: {
  recipientId: string;
  actorId?: string | null;
  type?: string;
  title: string;
  description: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    recipient_id: input.recipientId,
    actor_id: input.actorId ?? null,
    type: input.type ?? "general",
    title: input.title,
    description: input.description,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
    is_read: false,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('relation "notifications" does not exist') ||
      message.includes("could not find the table 'public.notifications' in the schema cache")
    ) {
      return;
    }
    throw new Error(error.message);
  }
}
