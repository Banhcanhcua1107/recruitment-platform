import "server-only";

import { createClient } from "@/utils/supabase/server";

export interface ResumeListTemplateRow {
  name: string;
  structure_schema: unknown;
  default_styling: Record<string, unknown>;
  thumbnail_url: string | null;
}

export interface ResumeListRow {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  resume_data: Array<{
    block_id: string;
    is_visible: boolean;
    data: Record<string, unknown>;
  }>;
  current_styling: Record<string, unknown>;
  is_public: boolean;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
  template?: ResumeListTemplateRow | null;
}

async function getAuthenticatedResumeListContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function getMyResumeList(): Promise<ResumeListRow[]> {
  const { supabase, user } = await getAuthenticatedResumeListContext();

  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling, thumbnail_url)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResumeListRow[];
}
