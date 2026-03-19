import "server-only";

import { getCurrentCandidateProfile } from "@/lib/candidate-profiles";
import { createClient } from "@/utils/supabase/server";

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
    return "Ứng viên đang tìm việc tại Việt Nam, quan tâm công nghệ, marketing và kinh doanh.";
  }

  const profile = await getCurrentCandidateProfile().catch(() => null);
  const parts: string[] = [];

  if (profile) {
    if (profile.fullName) parts.push(`Họ và tên: ${profile.fullName}`);
    if (profile.headline) parts.push(`Tiêu đề: ${profile.headline}`);
    if (profile.location) parts.push(`Địa điểm: ${profile.location}`);
    if (profile.introduction) parts.push(`Giới thiệu: ${profile.introduction}`);
    if (profile.skills.length > 0) parts.push(`Kỹ năng: ${profile.skills.join(", ")}`);
    if (profile.workExperience) parts.push(`Kinh nghiệm: ${profile.workExperience}`);
    if (profile.education) parts.push(`Học vấn: ${profile.education}`);
  }

  const { data: latestResume } = await supabase
    .from("resumes")
    .select("title, resume_data, updated_at")
    .eq("user_id", user.id)
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

  return parts.join("\n").trim() || "Ứng viên đang tìm việc tại Việt Nam, quan tâm công nghệ, marketing và kinh doanh.";
}
