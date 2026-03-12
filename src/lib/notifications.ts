import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

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
