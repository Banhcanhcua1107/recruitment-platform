import "server-only";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

export interface CurrentViewer {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  // TODO(multi-role): replace this scalar role with workspace memberships plus an active workspace selection.
  role: string;
  companyName: string | null;
}

function safeTrim(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

export const getCurrentViewer = cache(async function getCurrentViewer(): Promise<CurrentViewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const [{ data: profile }, { data: employer }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, role, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("employers")
      .select("company_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return {
    id: user.id,
    email: safeTrim(profile?.email) || safeTrim(user.email) || null,
    fullName: safeTrim(profile?.full_name) || safeTrim(user.user_metadata?.full_name) || null,
    avatarUrl: safeTrim(profile?.avatar_url) || null,
    role: safeTrim(profile?.role) || safeTrim(user.user_metadata?.role) || "GUEST",
    companyName: safeTrim(employer?.company_name) || null,
  };
});
