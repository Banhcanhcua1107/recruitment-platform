import type {
  CandidateEducation,
  CandidateProfileInput,
  CandidateProfileVisibility,
  CandidateProfileRecord,
  CandidateWorkExperience,
} from "@/types/candidate-profile";

export const CANDIDATE_PROFILE_CV_ROUTE = "/api/candidate/profile/cv";

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function normalizeProfileVisibility(value: unknown): CandidateProfileVisibility {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "private") {
      return "private";
    }
    if (normalized === "public") {
      return "public";
    }
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return "private";
  }

  return "public";
}

export function isPublicProfileVisibility(value: unknown) {
  return normalizeProfileVisibility(value) === "public";
}

function isValidDateValue(value: string) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

export function normalizeSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [...new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))];
  }

  return [];
}

export function createEmptyWorkExperience(
  seed: Partial<CandidateWorkExperience> = {}
): CandidateWorkExperience {
  return {
    id: normalizeString(seed.id) || crypto.randomUUID(),
    title: normalizeString(seed.title),
    company: normalizeString(seed.company),
    startDate: normalizeString(seed.startDate),
    endDate: normalizeString(seed.endDate),
    isCurrent: normalizeBoolean(seed.isCurrent),
    description: normalizeString(seed.description),
  };
}

export function createEmptyEducation(
  seed: Partial<CandidateEducation> = {}
): CandidateEducation {
  return {
    id: normalizeString(seed.id) || crypto.randomUUID(),
    school: normalizeString(seed.school),
    degree: normalizeString(seed.degree),
    startDate: normalizeString(seed.startDate),
    endDate: normalizeString(seed.endDate),
    description: normalizeString(seed.description),
  };
}

export function normalizeWorkExperiences(value: unknown): CandidateWorkExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? createEmptyWorkExperience(item as Partial<CandidateWorkExperience>)
        : createEmptyWorkExperience()
    )
    .filter((item) =>
      Boolean(
        item.title ||
          item.company ||
          item.startDate ||
          item.endDate ||
          item.description ||
          item.isCurrent
      )
    );
}

export function normalizeEducations(value: unknown): CandidateEducation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? createEmptyEducation(item as Partial<CandidateEducation>)
        : createEmptyEducation()
    )
    .filter((item) =>
      Boolean(item.school || item.degree || item.startDate || item.endDate || item.description)
    );
}

export function buildWorkExperienceSummary(
  experiences: CandidateWorkExperience[],
  fallback?: string | null
) {
  const normalized = normalizeWorkExperiences(experiences);
  if (normalized.length === 0) {
    return normalizeString(fallback);
  }

  return normalized
    .map((item) => {
      const titleLine = [item.title, item.company ? `tại ${item.company}` : ""]
        .filter(Boolean)
        .join(" ");
      const range = formatDateRange(item.startDate, item.isCurrent ? "" : item.endDate, item.isCurrent);
      return [titleLine, range, item.description].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
    .join("\n");
}

export function buildEducationSummary(
  educations: CandidateEducation[],
  fallback?: string | null
) {
  const normalized = normalizeEducations(educations);
  if (normalized.length === 0) {
    return normalizeString(fallback);
  }

  return normalized
    .map((item) => {
      const titleLine = [item.degree, item.school ? `tại ${item.school}` : ""]
        .filter(Boolean)
        .join(" ");
      const range = formatDateRange(item.startDate, item.endDate);
      return [titleLine, range, item.description].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
    .join("\n");
}

export function sanitizeCandidateProfileInput(
  input: CandidateProfileInput
): CandidateProfileInput {
  const workExperiences = normalizeWorkExperiences(input.workExperiences);
  const educations = normalizeEducations(input.educations);

  return {
    fullName: normalizeString(input.fullName),
    avatarUrl: normalizeString(input.avatarUrl) || null,
    headline: normalizeString(input.headline),
    email: normalizeString(input.email),
    phone: normalizeString(input.phone),
    location: normalizeString(input.location),
    introduction: normalizeString(input.introduction),
    skills: normalizeSkills(input.skills),
    workExperiences,
    educations,
    workExperience:
      normalizeString(input.workExperience) ||
      buildWorkExperienceSummary(workExperiences),
    education:
      normalizeString(input.education) ||
      buildEducationSummary(educations),
    profileVisibility: normalizeProfileVisibility(input.profileVisibility),
  };
}

export function validateCandidateProfileInput(input: CandidateProfileInput) {
  const profile = sanitizeCandidateProfileInput(input);

  if (!profile.fullName) {
    return "Họ tên không được để trống";
  }

  if (!profile.email) {
    return "Email không được để trống";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(profile.email)) {
    return "Email không hợp lệ";
  }

  if (profile.phone) {
    const phonePattern = /^[0-9+()\s.-]{8,20}$/;
    if (!phonePattern.test(profile.phone)) {
      return "Số điện thoại không hợp lệ";
    }
  }

  for (const item of profile.workExperiences) {
    if (!item.title) {
      return "Vui lòng nhập chức danh cho từng kinh nghiệm làm việc";
    }

    if (!item.company) {
      return "Vui lòng nhập tên công ty cho từng kinh nghiệm làm việc";
    }

    if (!item.startDate || !isValidDateValue(item.startDate)) {
      return "Vui lòng chọn ngày bắt đầu hợp lệ cho kinh nghiệm làm việc";
    }

    if (!item.isCurrent && (!item.endDate || !isValidDateValue(item.endDate))) {
      return "Vui lòng chọn ngày kết thúc hợp lệ hoặc đánh dấu Hiện tại";
    }

    if (!item.description) {
      return "Vui lòng nhập mô tả cho từng kinh nghiệm làm việc";
    }
  }

  for (const item of profile.educations) {
    if (!item.school) {
      return "Vui lòng nhập tên trường cho từng mục học vấn";
    }

    if (!item.degree) {
      return "Vui lòng nhập chương trình học hoặc bằng cấp";
    }

    if (!item.startDate || !isValidDateValue(item.startDate)) {
      return "Vui lòng chọn ngày bắt đầu hợp lệ cho học vấn";
    }

    if (!item.endDate || !isValidDateValue(item.endDate)) {
      return "Vui lòng chọn ngày kết thúc hợp lệ cho học vấn";
    }
  }

  return null;
}

export function calculateCandidateProfileCompletion(
  profile: Pick<
    CandidateProfileInput,
    | "fullName"
    | "avatarUrl"
    | "headline"
    | "email"
    | "phone"
    | "location"
    | "introduction"
    | "skills"
    | "workExperiences"
    | "educations"
    | "workExperience"
    | "education"
  > & { cvUrl?: string | null; cvFilePath?: string | null }
) {
  const normalizedExperiences = normalizeWorkExperiences(profile.workExperiences);
  const normalizedEducations = normalizeEducations(profile.educations);

  const checkpoints = [
    Boolean(normalizeString(profile.fullName)),
    Boolean(normalizeString(profile.headline)),
    Boolean(normalizeString(profile.email) || normalizeString(profile.phone)),
    Boolean(normalizeString(profile.location)),
    Boolean(normalizeString(profile.introduction)),
    normalizeSkills(profile.skills).length > 0,
    normalizedExperiences.length > 0 || Boolean(normalizeString(profile.workExperience)),
    normalizedEducations.length > 0 || Boolean(normalizeString(profile.education)),
    Boolean(normalizeString(profile.avatarUrl)),
    Boolean(normalizeString(profile.cvUrl) || normalizeString(profile.cvFilePath)),
  ];

  const completed = checkpoints.filter(Boolean).length;
  return Math.round((completed / checkpoints.length) * 100);
}

export function getCurrentExperience(experiences: CandidateWorkExperience[]) {
  const normalized = normalizeWorkExperiences(experiences);
  return normalized.find((item) => item.isCurrent) || normalized[0] || null;
}

export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean
) {
  const start = normalizeString(startDate);
  const end = normalizeString(endDate);

  const formatDate = (value: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("vi-VN", {
      month: "2-digit",
      year: "numeric",
    });
  };

  const startLabel = formatDate(start);
  const endLabel = isCurrent ? "Hiện tại" : formatDate(end);

  if (!startLabel && !endLabel) {
    return "";
  }

  if (!startLabel) {
    return endLabel;
  }

  if (!endLabel) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
}

export function formatProfileUpdatedAt(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getCandidateProfileCvUrl(userId?: string | null) {
  if (!userId) {
    return CANDIDATE_PROFILE_CV_ROUTE;
  }

  const params = new URLSearchParams({ userId });
  return `${CANDIDATE_PROFILE_CV_ROUTE}?${params.toString()}`;
}

export function getCvFileName(profile: Pick<CandidateProfileRecord, "cvFilePath" | "cvUrl">) {
  const source = normalizeString(profile.cvFilePath) || normalizeString(profile.cvUrl);
  if (!source) {
    return "";
  }

  const cleanSource = source.split("?")[0];
  const segments = cleanSource.split("/");
  return segments[segments.length - 1] || "cv.pdf";
}

export function createEmptyCandidateProfile(
  seed: Partial<CandidateProfileRecord> & {
    userId: string;
  }
): CandidateProfileRecord {
  const now = new Date().toISOString();
  const workExperiences = normalizeWorkExperiences(seed.workExperiences);
  const educations = normalizeEducations(seed.educations);

  return {
    id: seed.id ?? "",
    userId: seed.userId,
    fullName: normalizeString(seed.fullName),
    avatarUrl: normalizeString(seed.avatarUrl) || null,
    headline: normalizeString(seed.headline),
    email: normalizeString(seed.email),
    phone: normalizeString(seed.phone),
    location: normalizeString(seed.location),
    introduction: normalizeString(seed.introduction),
    skills: normalizeSkills(seed.skills),
    workExperiences,
    educations,
    workExperience:
      normalizeString(seed.workExperience) ||
      buildWorkExperienceSummary(workExperiences),
    education:
      normalizeString(seed.education) ||
      buildEducationSummary(educations),
    cvFilePath: normalizeString(seed.cvFilePath) || null,
    cvUrl: normalizeString(seed.cvUrl) || null,
    profileVisibility: normalizeProfileVisibility(seed.profileVisibility),
    createdAt: seed.createdAt ?? now,
    updatedAt: seed.updatedAt ?? now,
  };
}
