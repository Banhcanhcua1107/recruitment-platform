import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_CANDIDATE_TEXT =
  "Ứng viên đang tìm việc tại Việt Nam, quan tâm công nghệ, marketing và kinh doanh.";

type CandidateProfileRecommendationRow = {
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  introduction?: string | null;
  skills?: string[] | null;
  work_experience?: string | null;
  education?: string | null;
};

function stringifyResumeData(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          return Object.values(item).flat().join(" ");
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return "";
}

export async function buildCandidateRecommendationTextForUser(
  supabase: SupabaseClient,
  userId: string,
  manualText?: string,
) {
  const rawManualText = String(manualText ?? "").trim();
  if (rawManualText) {
    return rawManualText;
  }

  if (!userId) {
    return DEFAULT_CANDIDATE_TEXT;
  }

  const { data: profile, error: profileError } = await supabase
    .from("candidate_profiles")
    .select("full_name, headline, location, introduction, skills, work_experience, education")
    .eq("user_id", userId)
    .maybeSingle();

  const profileRow = profileError ? null : (profile as CandidateProfileRecommendationRow | null);
  const parts: string[] = [];

  if (profileRow) {
    if (profileRow.full_name) parts.push(`Họ và tên: ${profileRow.full_name}`);
    if (profileRow.headline) parts.push(`Tiêu đề: ${profileRow.headline}`);
    if (profileRow.location) parts.push(`Địa điểm: ${profileRow.location}`);
    if (profileRow.introduction) parts.push(`Giới thiệu: ${profileRow.introduction}`);
    if (Array.isArray(profileRow.skills) && profileRow.skills.length > 0) {
      parts.push(`Kỹ năng: ${profileRow.skills.join(", ")}`);
    }
    if (profileRow.work_experience) parts.push(`Kinh nghiệm: ${profileRow.work_experience}`);
    if (profileRow.education) parts.push(`Học vấn: ${profileRow.education}`);
  }

  const { data: latestResume } = await supabase
    .from("resumes")
    .select("title, resume_data, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestResume) {
    parts.push(`CV Builder gần nhất: ${String(latestResume.title || "CV Builder")}`);
    const resumeText = stringifyResumeData(latestResume.resume_data).slice(0, 3000).trim();
    if (resumeText) {
      parts.push(`Nội dung CV: ${resumeText}`);
    }
  }

  return parts.join("\n").trim() || DEFAULT_CANDIDATE_TEXT;
}

export async function buildCandidateRecommendationText(manualText?: string) {
  const rawManualText = String(manualText ?? "").trim();
  if (rawManualText) {
    return rawManualText;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_CANDIDATE_TEXT;
  }

  return buildCandidateRecommendationTextForUser(supabase, user.id);
}
