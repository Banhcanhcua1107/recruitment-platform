import {
  createEmptyDocument,
  isSectionEmpty,
  type EducationContent,
  type ExperienceContent,
  type ProfileDocument,
  type Section,
  type SkillsContent,
} from "../app/candidate/profile/types/profile";
import type {
  CandidateEducation,
  CandidateWorkExperience,
} from "../types/candidate-profile";

type LegacyProfileLike = {
  document?: unknown;
  fullName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  introduction?: string | null;
  skills?: unknown;
  workExperiences?: CandidateWorkExperience[] | null;
  educations?: CandidateEducation[] | null;
  cvUrl?: string | null;
  updatedAt?: string | null;
};

type LegacyProfilePatch = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  introduction: string | null;
  skills: string[];
  work_experiences: CandidateWorkExperience[];
  educations: CandidateEducation[];
  work_experience: string | null;
  education: string | null;
};

type PersonalInfoSection = Section<{
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
}>;

export type PublicProfileViewModel = {
  document: ProfileDocument;
  visibleSections: Section[];
  personalInfoSection: PersonalInfoSection | null;
  mainSections: Section[];
  displayName: string;
  displayHeadline: string;
  displayEmail: string | null;
  displayPhone: string | null;
  displayLocation: string | null;
  avatarUrl: string | null;
  cvUrl: string | null;
  updatedAt: string | null;
  hasContactCard: boolean;
  currentExperience: CandidateWorkExperience | null;
};

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function parseYear(value: unknown) {
  const source = normalizeString(value);
  const match = source.match(/\d{4}/);
  if (!match) {
    return undefined;
  }

  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : undefined;
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function ensureWorkExperiences(value: unknown): CandidateWorkExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const row = typeof item === "object" && item !== null ? item : {};
      return {
        id: normalizeString((row as { id?: unknown }).id) || `legacy-work-${index}`,
        title: normalizeString((row as { title?: unknown }).title),
        company: normalizeString((row as { company?: unknown }).company),
        startDate: normalizeString((row as { startDate?: unknown }).startDate),
        endDate: normalizeString((row as { endDate?: unknown }).endDate),
        isCurrent: Boolean((row as { isCurrent?: unknown }).isCurrent),
        description: normalizeString((row as { description?: unknown }).description),
      };
    })
    .filter(
      (item) =>
        item.title ||
        item.company ||
        item.startDate ||
        item.endDate ||
        item.description ||
        item.isCurrent,
    );
}

function ensureEducations(value: unknown): CandidateEducation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const row = typeof item === "object" && item !== null ? item : {};
      return {
        id: normalizeString((row as { id?: unknown }).id) || `legacy-education-${index}`,
        school: normalizeString((row as { school?: unknown }).school),
        degree: normalizeString((row as { degree?: unknown }).degree),
        startDate: normalizeString((row as { startDate?: unknown }).startDate),
        endDate: normalizeString((row as { endDate?: unknown }).endDate),
        description: normalizeString((row as { description?: unknown }).description),
      };
    })
    .filter((item) => item.school || item.degree || item.startDate || item.endDate || item.description);
}

function createSection<T extends Section["content"]>(
  type: Section["type"],
  order: number,
  content: T,
): Section<T> {
  return {
    id: `section-${type}`,
    type,
    order,
    isHidden: false,
    content,
  };
}

export function normalizeCandidateProfileDocument(value: unknown): ProfileDocument {
  const fallback = createEmptyDocument();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const rawDocument = value as { meta?: Record<string, unknown>; sections?: unknown };
  const rawSections = Array.isArray(rawDocument.sections) ? rawDocument.sections : [];

  const sections = rawSections
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const rawSection = item as Record<string, unknown>;
      const type = normalizeString(rawSection.type) as Section["type"];
      if (!type) {
        return null;
      }

      return {
        id: normalizeString(rawSection.id) || `section-${type}-${index}`,
        type,
        order: typeof rawSection.order === "number" ? rawSection.order : index,
        isHidden: Boolean(rawSection.isHidden),
        content: (rawSection.content ?? {}) as Section["content"],
      } satisfies Section;
    })
    .filter(Boolean) as Section[];

  return {
    meta: {
      version:
        typeof rawDocument.meta?.version === "number" ? rawDocument.meta.version : fallback.meta.version,
      createdAt: normalizeString(rawDocument.meta?.createdAt) || fallback.meta.createdAt,
      updatedAt: normalizeString(rawDocument.meta?.updatedAt) || fallback.meta.updatedAt,
    },
    sections,
  };
}

export function buildProfileDocumentFromLegacyProfile(input: LegacyProfileLike): ProfileDocument {
  const document = createEmptyDocument();
  const sections: Section[] = [];
  let order = 0;

  const fullName = normalizeString(input.fullName);
  const email = normalizeString(input.email);
  const phone = normalizeString(input.phone);
  const location = normalizeString(input.location);
  const introduction = normalizeString(input.introduction);
  const skills = ensureStringArray(input.skills);
  const workExperiences = ensureWorkExperiences(input.workExperiences);
  const educations = ensureEducations(input.educations);

  if (fullName || email || phone || location) {
    sections.push(
      createSection("personal_info", order++, {
        fullName,
        email,
        phone,
        address: location,
        dateOfBirth: "",
        gender: "",
      }),
    );
  }

  if (introduction) {
    sections.push(
      createSection("summary", order++, {
        content: introduction,
      }),
    );
  }

  if (skills.length > 0) {
    sections.push(
      createSection("skills", order++, {
        skills: skills.map((skill, index) => ({
          id: `legacy-skill-${index}`,
          name: skill,
        })),
      }),
    );
  }

  if (workExperiences.length > 0) {
    sections.push(
      createSection("experience", order++, {
        items: workExperiences.map((item, index) => ({
          id: item.id || `legacy-experience-${index}`,
          title: item.title,
          company: item.company,
          location: "",
          startDate: item.startDate,
          endDate: item.endDate || undefined,
          isCurrent: item.isCurrent,
          description: item.description ? [item.description] : [],
        })),
      }),
    );
  }

  if (educations.length > 0) {
    sections.push(
      createSection("education", order++, {
        items: educations.map((item, index) => ({
          id: item.id || `legacy-education-${index}`,
          school: item.school,
          major: item.description || "",
          degree: item.degree,
          startYear: parseYear(item.startDate),
          endYear: parseYear(item.endDate),
          gpa: "",
        })),
      }),
    );
  }

  return {
    ...document,
    sections,
  };
}

export function resolveCandidateProfileDocument(input: LegacyProfileLike): ProfileDocument {
  const explicitDocument = normalizeCandidateProfileDocument(input.document);

  if (explicitDocument.sections.length > 0) {
    return explicitDocument;
  }

  return buildProfileDocumentFromLegacyProfile(input);
}

export function getOrderedProfileSections(document: ProfileDocument) {
  return [...document.sections].sort((left, right) => {
    if (left.order === right.order) {
      return left.id.localeCompare(right.id);
    }

    return left.order - right.order;
  });
}

export function getPublicRenderableSections(document: ProfileDocument) {
  return getOrderedProfileSections(document).filter(
    (section) => !section.isHidden && !isSectionEmpty(section),
  );
}

export function buildPublicProfileViewModel(input: LegacyProfileLike): PublicProfileViewModel {
  const document = resolveCandidateProfileDocument(input);
  const visibleSections = getPublicRenderableSections(document);
  const personalInfoSection =
    (visibleSections.find((section) => section.type === "personal_info") as PersonalInfoSection | undefined) ??
    null;
  const mainSections = visibleSections.filter((section) => section.type !== "personal_info");
  const personalInfoContent = personalInfoSection?.content;
  const workExperiences = ensureWorkExperiences(input.workExperiences);
  const currentExperience = workExperiences.find((item) => item.isCurrent) || workExperiences[0] || null;
  const displayName = normalizeString(personalInfoContent?.fullName) || normalizeString(input.fullName) || "Ứng viên";
  const displayEmail = normalizeString(personalInfoContent?.email) || normalizeString(input.email) || null;
  const displayPhone = normalizeString(personalInfoContent?.phone) || normalizeString(input.phone) || null;
  const displayLocation =
    normalizeString(personalInfoContent?.address) || normalizeString(input.location) || null;
  const displayHeadline =
    normalizeString(input.headline) ||
    normalizeString(currentExperience?.title) ||
    "Ứng viên đang cập nhật tiêu đề chuyên môn";

  return {
    document,
    visibleSections,
    personalInfoSection,
    mainSections,
    displayName,
    displayHeadline,
    displayEmail,
    displayPhone,
    displayLocation,
    avatarUrl: normalizeString(personalInfoContent?.avatarUrl) || normalizeString(input.avatarUrl) || null,
    cvUrl: normalizeString(input.cvUrl) || null,
    updatedAt: normalizeString(input.updatedAt) || null,
    hasContactCard: Boolean(displayEmail || displayPhone || displayLocation),
    currentExperience,
  };
}

function summarizeWorkExperience(items: CandidateWorkExperience[]) {
  return items
    .map((item) =>
      [item.title, item.company, item.description].map((part) => normalizeString(part)).filter(Boolean).join(" - "),
    )
    .filter(Boolean)
    .join("\n");
}

function summarizeEducation(items: CandidateEducation[]) {
  return items
    .map((item) =>
      [item.degree, item.school, item.description].map((part) => normalizeString(part)).filter(Boolean).join(" - "),
    )
    .filter(Boolean)
    .join("\n");
}

export function buildLegacyProfilePatchFromDocument(document: ProfileDocument): LegacyProfilePatch {
  const orderedSections = getOrderedProfileSections(document);
  const personalInfo = orderedSections.find((section) => section.type === "personal_info");
  const summary = orderedSections.find((section) => section.type === "summary");
  const skills = orderedSections.find((section) => section.type === "skills");
  const experience = orderedSections.find((section) => section.type === "experience");
  const education = orderedSections.find((section) => section.type === "education");

  const personalInfoContent = personalInfo?.content as
    | {
        fullName?: string;
        email?: string;
        phone?: string;
        address?: string;
      }
    | undefined;
  const summaryContent = summary?.content as { content?: string } | undefined;
  const skillsContent = skills?.content as SkillsContent | undefined;
  const experienceContent = experience?.content as ExperienceContent | undefined;
  const educationContent = education?.content as EducationContent | undefined;

  const legacySkills = (skillsContent?.skills ?? [])
    .map((skill) => normalizeString(skill.name))
    .filter(Boolean);

  const legacyWorkExperiences: CandidateWorkExperience[] = (experienceContent?.items ?? []).map((item) => ({
    id: item.id,
    title: normalizeString(item.title),
    company: normalizeString(item.company),
    startDate: normalizeString(item.startDate),
    endDate: normalizeString(item.endDate),
    isCurrent: Boolean(item.isCurrent),
    description: item.description.join("\n"),
  }));

  const legacyEducations: CandidateEducation[] = (educationContent?.items ?? []).map((item) => {
    const descriptionParts = [normalizeString(item.major)];
    if (item.gpa) {
      descriptionParts.push(`GPA: ${normalizeString(item.gpa)}`);
    }

    return {
      id: item.id,
      school: normalizeString(item.school),
      degree: normalizeString(item.degree),
      startDate: item.startYear ? `${item.startYear}-01-01` : "",
      endDate: item.endYear ? `${item.endYear}-01-01` : "",
      description: descriptionParts.filter(Boolean).join(" • "),
    };
  });

  return {
    full_name: normalizeString(personalInfoContent?.fullName) || null,
    email: normalizeString(personalInfoContent?.email) || null,
    phone: normalizeString(personalInfoContent?.phone) || null,
    location: normalizeString(personalInfoContent?.address) || null,
    introduction: normalizeString(summaryContent?.content) || null,
    skills: legacySkills,
    work_experiences: legacyWorkExperiences,
    educations: legacyEducations,
    work_experience: summarizeWorkExperience(legacyWorkExperiences) || null,
    education: summarizeEducation(legacyEducations) || null,
  };
}
