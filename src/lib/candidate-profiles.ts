import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  buildEducationSummary,
  buildWorkExperienceSummary,
  createEmptyCandidateProfile,
  getCandidateProfileCvUrl,
  isPublicProfileVisibility,
  normalizeEducations,
  normalizeProfileVisibility,
  normalizeSkills,
  normalizeWorkExperiences,
  sanitizeCandidateProfileInput,
  validateCandidateProfileInput,
} from "@/lib/candidate-profile-shared";
import {
  buildProfileDocumentFromLegacyProfile,
  resolveCandidateProfileDocument,
} from "@/lib/candidate-profile-document";
import type {
  CandidateEducation,
  CandidateProfileCvUploadResult,
  CandidateProfileInput,
  CandidateProfileRecord,
  CandidateProfileVisibility,
  CandidateWorkExperience,
  PublicCandidateSearchFilters,
  PublicCandidateSearchResult,
} from "@/types/candidate-profile";

const APPLICATION_BUCKET = "cv_uploads";
const ALLOWED_CV_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PROFILE_SELECT = [
  "id",
  "user_id",
  "document",
  "full_name",
  "avatar_url",
  "headline",
  "email",
  "phone",
  "location",
  "introduction",
  "skills",
  "work_experiences",
  "educations",
  "work_experience",
  "education",
  "cv_file_path",
  "cv_url",
  "profile_visibility",
  "created_at",
  "updated_at",
].join(", ");

type AuthProfileRow = {
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type CandidateProfileRow = {
  id: string;
  user_id: string;
  document: unknown;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  introduction: string | null;
  skills: string[] | null;
  work_experiences: CandidateWorkExperience[] | null;
  educations: CandidateEducation[] | null;
  work_experience: string | null;
  education: string | null;
  cv_file_path: string | null;
  cv_url: string | null;
  profile_visibility: CandidateProfileVisibility | boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function getDisplayName(user: User, authProfile?: AuthProfileRow | null) {
  const name =
    authProfile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Ứng viên";

  return String(name).trim();
}

function getProfileEmail(user: User, authProfile?: AuthProfileRow | null) {
  return String(authProfile?.email || user.email || "").trim();
}

async function canRemoveStoredCv(
  supabase: SupabaseClient,
  candidateId: string,
  cvFilePath: string
) {
  try {
    const { count, error } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", candidateId)
      .eq("cv_file_path", cvFilePath);

    if (error) {
      return false;
    }

    return (count ?? 0) === 0;
  } catch {
    return false;
  }
}

function toCandidateProfileRecord(
  row: CandidateProfileRow,
  user: User,
  authProfile?: AuthProfileRow | null
): CandidateProfileRecord {
  const workExperiences = normalizeWorkExperiences(row.work_experiences);
  const educations = normalizeEducations(row.educations);
  const document = resolveCandidateProfileDocument({
    document: row.document,
    fullName: row.full_name || getDisplayName(user, authProfile),
    email: row.email || getProfileEmail(user, authProfile),
    phone: row.phone || "",
    location: row.location || "",
    introduction: row.introduction || "",
    skills: row.skills,
    workExperiences,
    educations,
  });

  return createEmptyCandidateProfile({
    id: String(row.id || ""),
    userId: String(row.user_id || user.id),
    document,
    fullName: row.full_name || getDisplayName(user, authProfile),
    avatarUrl: row.avatar_url || authProfile?.avatar_url || null,
    headline: row.headline || "",
    email: row.email || getProfileEmail(user, authProfile),
    phone: row.phone || "",
    location: row.location || "",
    introduction: row.introduction || "",
    skills: normalizeSkills(row.skills),
    workExperiences,
    educations,
    workExperience: buildWorkExperienceSummary(workExperiences, row.work_experience),
    education: buildEducationSummary(educations, row.education),
    cvFilePath: row.cv_file_path || null,
    cvUrl: row.cv_file_path
      ? getCandidateProfileCvUrl(String(row.user_id || user.id))
      : row.cv_url || null,
    profileVisibility: normalizeProfileVisibility(row.profile_visibility),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  });
}

function toPublicCandidateSearchResult(row: CandidateProfileRow): PublicCandidateSearchResult {
  const workExperiences = normalizeWorkExperiences(row.work_experiences);
  const educations = normalizeEducations(row.educations);
  const workExperience = buildWorkExperienceSummary(workExperiences, row.work_experience);
  const education = buildEducationSummary(educations, row.education);
  const document = resolveCandidateProfileDocument({
    document: row.document,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    introduction: row.introduction,
    skills: row.skills,
    workExperiences,
    educations,
  });

  return {
    candidateId: String(row.user_id),
    document,
    fullName: normalizeString(row.full_name),
    avatarUrl: row.avatar_url || null,
    headline: normalizeString(row.headline),
    location: normalizeString(row.location),
    email: row.email || null,
    phone: row.phone || null,
    introduction: normalizeString(row.introduction),
    skills: normalizeSkills(row.skills),
    workExperiences,
    educations,
    workExperience,
    education,
    cvUrl: row.cv_file_path
      ? getCandidateProfileCvUrl(String(row.user_id))
      : row.cv_url || null,
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

async function getAuthenticatedContext(requiredRole?: "candidate" | "hr") {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: authProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (requiredRole && authProfile?.role && authProfile.role !== requiredRole) {
    throw new Error(
      requiredRole === "candidate"
        ? "Chỉ ứng viên mới có thể quản lý hồ sơ cá nhân."
        : "Chỉ nhà tuyển dụng mới có thể tìm kiếm ứng viên."
    );
  }

  return { supabase, user, authProfile };
}

async function ensureCurrentCandidateProfileRow(
  user: User,
  authProfile?: AuthProfileRow | null
) {
  const { supabase } = await getAuthenticatedContext("candidate");
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as unknown as CandidateProfileRow;
  }

  const insertPayload = {
    user_id: user.id,
    document: buildProfileDocumentFromLegacyProfile({
      fullName: getDisplayName(user, authProfile),
      email: getProfileEmail(user, authProfile),
    }),
    full_name: getDisplayName(user, authProfile),
    avatar_url: authProfile?.avatar_url || null,
    headline: "",
    email: getProfileEmail(user, authProfile),
    phone: "",
    location: "",
    introduction: "",
    skills: [],
    work_experiences: [],
    educations: [],
    work_experience: "",
    education: "",
    profile_visibility: "public",
    cv_file_path: null,
    cv_url: null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("candidate_profiles")
    .insert(insertPayload)
    .select(PROFILE_SELECT)
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted as unknown as CandidateProfileRow;
}

async function getCurrentCandidateProfileRow() {
  const { supabase, user, authProfile } = await getAuthenticatedContext("candidate");
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return { row: data as unknown as CandidateProfileRow, user, authProfile, supabase };
  }

  const inserted = await ensureCurrentCandidateProfileRow(user, authProfile);
  return { row: inserted, user, authProfile, supabase };
}

async function syncProfileDirectoryRows(input: CandidateProfileRecord, user: User) {
  const { supabase } = await getAuthenticatedContext("candidate");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName || getDisplayName(user),
      email: input.email || getProfileEmail(user),
      avatar_url: input.avatarUrl,
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: candidateError } = await supabase.from("candidates").upsert({
    id: user.id,
    full_name: input.fullName || getDisplayName(user),
    email: input.email || getProfileEmail(user),
    phone: input.phone || null,
    resume_url: input.cvUrl || null,
  });

  if (candidateError) {
    throw new Error(candidateError.message);
  }
}

export async function getCurrentCandidateProfile() {
  const { row, user, authProfile } = await getCurrentCandidateProfileRow();
  return toCandidateProfileRecord(row, user, authProfile);
}

export async function upsertCurrentCandidateProfile(input: CandidateProfileInput) {
  const validationError = validateCandidateProfileInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const { row: currentRow, user, authProfile, supabase } = await getCurrentCandidateProfileRow();
  const payload = sanitizeCandidateProfileInput(input);
  const nextCvUrl = currentRow.cv_file_path
    ? getCandidateProfileCvUrl(user.id)
    : currentRow.cv_url || null;
  const document = resolveCandidateProfileDocument({
    document: currentRow.document,
    fullName: payload.fullName || getDisplayName(user, authProfile),
    email: payload.email || getProfileEmail(user, authProfile),
    phone: payload.phone,
    location: payload.location,
    introduction: payload.introduction,
    skills: payload.skills,
    workExperiences: payload.workExperiences,
    educations: payload.educations,
  });

  const { data, error } = await supabase
    .from("candidate_profiles")
    .upsert(
      {
        id: currentRow.id,
        user_id: user.id,
        document,
        full_name: payload.fullName || getDisplayName(user, authProfile),
        avatar_url: payload.avatarUrl,
        headline: payload.headline || null,
        email: payload.email || getProfileEmail(user, authProfile),
        phone: payload.phone || null,
        location: payload.location || null,
        introduction: payload.introduction || null,
        skills: payload.skills,
        work_experiences: payload.workExperiences,
        educations: payload.educations,
        work_experience: payload.workExperience || null,
        education: payload.education || null,
        profile_visibility: payload.profileVisibility,
        cv_file_path: currentRow.cv_file_path || null,
        cv_url: nextCvUrl,
      },
      { onConflict: "user_id" }
    )
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const record = toCandidateProfileRecord(data as unknown as CandidateProfileRow, user, authProfile);
  await syncProfileDirectoryRows(record, user);
  return record;
}

export async function uploadCurrentCandidateProfileCv(
  file: File
): Promise<CandidateProfileCvUploadResult> {
  const { row: currentRow, user, authProfile, supabase } = await getCurrentCandidateProfileRow();

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Vui lòng tải lên CV");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("CV vượt quá dung lượng tối đa 10MB");
  }

  if (file.type && !ALLOWED_CV_CONTENT_TYPES.has(file.type)) {
    throw new Error("Chỉ hỗ trợ tệp PDF, DOC hoặc DOCX");
  }

  const safeFilename = sanitizeFilename(file.name || "candidate-profile-cv.pdf");
  const extension = safeFilename.includes(".") ? safeFilename.split(".").pop() : "pdf";
  const filePath = `${user.id}/profile/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(APPLICATION_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const nextCvUrl = getCandidateProfileCvUrl(user.id);
  const document = resolveCandidateProfileDocument({
    document: currentRow.document,
    fullName: currentRow.full_name || getDisplayName(user, authProfile),
    email: currentRow.email || getProfileEmail(user, authProfile),
    phone: currentRow.phone,
    location: currentRow.location,
    introduction: currentRow.introduction,
    skills: currentRow.skills,
    workExperiences: normalizeWorkExperiences(currentRow.work_experiences),
    educations: normalizeEducations(currentRow.educations),
  });
  const { data, error } = await supabase
    .from("candidate_profiles")
    .upsert(
      {
        id: currentRow.id,
        user_id: user.id,
        document,
        full_name: currentRow.full_name || getDisplayName(user, authProfile),
        avatar_url: currentRow.avatar_url,
        headline: currentRow.headline,
        email: currentRow.email || getProfileEmail(user, authProfile),
        phone: currentRow.phone,
        location: currentRow.location,
        introduction: currentRow.introduction,
        skills: normalizeSkills(currentRow.skills),
        work_experiences: normalizeWorkExperiences(currentRow.work_experiences),
        educations: normalizeEducations(currentRow.educations),
        work_experience: normalizeString(currentRow.work_experience),
        education: normalizeString(currentRow.education),
        profile_visibility: normalizeProfileVisibility(currentRow.profile_visibility),
        cv_file_path: filePath,
        cv_url: nextCvUrl,
      },
      { onConflict: "user_id" }
    )
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    await admin.storage.from(APPLICATION_BUCKET).remove([filePath]);
    throw new Error(error.message);
  }

  if (
    currentRow.cv_file_path &&
    currentRow.cv_file_path !== filePath &&
    await canRemoveStoredCv(supabase, user.id, currentRow.cv_file_path)
  ) {
    await admin.storage.from(APPLICATION_BUCKET).remove([currentRow.cv_file_path]);
  }

  const record = toCandidateProfileRecord(data as unknown as CandidateProfileRow, user, authProfile);
  await syncProfileDirectoryRows(record, user);

  return {
    cvUrl: record.cvUrl || nextCvUrl,
    fileName: safeFilename,
    filePath,
  };
}

export async function getCandidateProfileCvDownloadUrl(requestedUserId?: string | null) {
  const { supabase, user } = await getAuthenticatedContext();
  const targetUserId = String(requestedUserId || user.id).trim();

  if (!targetUserId) {
    throw new Error("Không tìm thấy hồ sơ ứng viên.");
  }

  const { data: row, error } = await supabase
    .from("candidate_profiles")
    .select("user_id, profile_visibility, cv_file_path, cv_url")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error || !row) {
    throw new Error(error?.message || "Không tìm thấy hồ sơ ứng viên.");
  }

  const isOwner = row.user_id === user.id;
  let allowed = isOwner;

  if (!allowed) {
    const { data: viewerProfile, error: viewerError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (viewerError) {
      throw new Error(viewerError.message);
    }

    allowed = isPublicProfileVisibility(row.profile_visibility) && viewerProfile?.role === "hr";
  }

  if (!allowed) {
    throw new Error("Bạn không có quyền truy cập CV này.");
  }

  if (!row.cv_file_path) {
    if (row.cv_url) {
      return row.cv_url;
    }

    throw new Error("Ứng viên chưa tải CV lên.");
  }

  const admin = createAdminClient();
  const { data, error: signedUrlError } = await admin.storage
    .from(APPLICATION_BUCKET)
    .createSignedUrl(row.cv_file_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    throw new Error(signedUrlError?.message || "Không thể tạo liên kết tải CV.");
  }

  return data.signedUrl;
}

export async function searchPublicCandidateProfiles(
  filters: PublicCandidateSearchFilters
): Promise<PublicCandidateSearchResult[]> {
  const { supabase } = await getAuthenticatedContext("hr");
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_SELECT)
    .eq("profile_visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as CandidateProfileRow[];
  const nameFilter = normalizeString(filters.name).toLowerCase();
  const headlineFilter = normalizeString(filters.headline).toLowerCase();
  const experienceFilter = normalizeString(filters.experience).toLowerCase();
  const keywordTokens = normalizeString(filters.keywords)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const skillTokens = normalizeString(filters.skills)
    .split(/\r?\n|,/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return rows
    .map((row) => toPublicCandidateSearchResult(row))
    .filter((profile) => {
      const haystack = [
        profile.fullName,
        profile.headline,
        profile.location,
        profile.introduction,
        profile.workExperience,
        profile.education,
        profile.workExperiences
          .map((item) => [item.title, item.company, item.description].filter(Boolean).join(" "))
          .join(" "),
        profile.skills.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (nameFilter && !profile.fullName.toLowerCase().includes(nameFilter)) {
        return false;
      }

      if (headlineFilter && !profile.headline.toLowerCase().includes(headlineFilter)) {
        return false;
      }

      if (experienceFilter && !profile.workExperience.toLowerCase().includes(experienceFilter)) {
        return false;
      }

      if (
        skillTokens.length > 0 &&
        !skillTokens.every((token) =>
          profile.skills.some((skill) => skill.toLowerCase().includes(token))
        )
      ) {
        return false;
      }

      if (keywordTokens.length > 0 && !keywordTokens.every((token) => haystack.includes(token))) {
        return false;
      }

      return true;
    });
}

export async function getRecruiterCandidateProfile(
  candidateId: string
): Promise<PublicCandidateSearchResult> {
  const normalizedCandidateId = normalizeString(candidateId);
  if (!normalizedCandidateId) {
    throw new Error("Không tìm thấy hồ sơ ứng viên công khai.");
  }

  const { supabase } = await getAuthenticatedContext("hr");
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", normalizedCandidateId)
    .eq("profile_visibility", "public")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Không tìm thấy hồ sơ ứng viên công khai.");
  }

  return toPublicCandidateSearchResult(data as unknown as CandidateProfileRow);
}
