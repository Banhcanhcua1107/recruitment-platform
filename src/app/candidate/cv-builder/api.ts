/**
 * CV Builder API Layer
 * All Supabase CRUD operations for templates and resumes
 */

import { createClient } from "@/utils/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  category: string;
  is_premium: boolean;
  default_styling: Record<string, unknown>;
  structure_schema: BlockDef[];
  created_at: string;
  updated_at: string;
}

export interface ResumeRow {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  resume_data: ResumeBlock[];
  current_styling: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // joined
  template?: Pick<TemplateRow, "name" | "structure_schema" | "default_styling"> | null;
}

export interface BlockDef {
  block_id: string;
  block_type: "header" | "personal_info" | "rich_text" | "list" | "tag_list";
  label: string;
  is_required: boolean;
  icon: string;
  fields?: FieldDef[];
  item_fields?: FieldDef[];
}

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface ResumeBlock {
  block_id: string;
  is_visible: boolean;
  data: Record<string, unknown>;
}

// ─── Templates ────────────────────────────────────────────────────────────────

/** Lấy tất cả templates hệ thống */
export async function getTemplates(): Promise<TemplateRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một template theo ID */
export async function getTemplateById(id: string): Promise<TemplateRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

/** Lấy danh sách CV của user hiện tại */
export async function getMyResumes(): Promise<ResumeRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một resume theo ID */
export async function getResumeById(id: string): Promise<ResumeRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

/** Tạo CV mới từ template */
export async function createResume(
  templateId: string,
  title: string = "CV của tôi"
): Promise<ResumeRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn cần đăng nhập để tạo CV");

  // Fetch template để lấy structure_schema và default_styling
  const template = await getTemplateById(templateId);
  if (!template) throw new Error("Template không tồn tại");

  // Khởi tạo resume_data từ structure_schema (tất cả blocks rỗng)
  const initialResumeData: ResumeBlock[] = template.structure_schema.map((block) => ({
    block_id: block.block_id,
    is_visible: true,
    data: block.block_type === "list" || block.block_type === "tag_list"
      ? { items: [] }
      : {},
  }));

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      template_id: templateId,
      title,
      resume_data: initialResumeData,
      current_styling: template.default_styling,
    })
    .select("*, template:templates(name, structure_schema, default_styling)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Auto-save nội dung resume (debounced từ phía caller) */
export async function saveResume(
  id: string,
  updates: {
    title?: string;
    resume_data?: ResumeBlock[];
    current_styling?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Xóa resume */
export async function deleteResume(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Đổi tên resume */
export async function renameResume(id: string, title: string): Promise<void> {
  await saveResume(id, { title });
}
