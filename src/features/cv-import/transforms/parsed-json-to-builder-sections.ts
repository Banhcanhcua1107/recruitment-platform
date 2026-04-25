import { normalizeParsedJsonRecord } from "@/features/cv-import/normalize-parsed-json";
import type { MappedSections } from "@/types/cv-import";

interface BuilderSectionPayload {
  type: string;
  isVisible: boolean;
  data: unknown;
}

interface BuilderSectionResult {
  sections: BuilderSectionPayload[];
  title: string;
}

function toText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildId(prefix: string, index: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${index + 1}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${index + 1}-${Math.random().toString(36).slice(2, 10)}`;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function hasMappedContent(mapped: MappedSections | undefined) {
  if (!mapped) return false;

  return Boolean(
    mapped.candidate.name ||
      mapped.candidate.job_title ||
      mapped.personal_info.email ||
      mapped.personal_info.phone ||
      mapped.personal_info.address ||
      mapped.personal_info.location ||
      mapped.summary.text ||
      mapped.career_objective.text ||
      mapped.education.length ||
      mapped.experience.length ||
      mapped.projects.length ||
      mapped.certificates.length ||
      mapped.awards.length ||
      mapped.hobbies.length ||
      mapped.languages.length ||
      mapped.others.length ||
      Object.values(mapped.skills).some((items) => items.length > 0),
  );
}

function pickMappedSections(input: unknown): MappedSections {
  const normalized = normalizeParsedJsonRecord(input);
  const cleaned = normalized.cleaned_json;
  const mapped = normalized.mapped_sections;

  if (hasMappedContent(cleaned)) {
    return cleaned as MappedSections;
  }

  if (mapped) {
    return mapped;
  }

  return {
    candidate: {
      name: "",
      job_title: "",
      avatar_url: "",
    },
    personal_info: {
      email: "",
      phone: "",
      address: "",
      current_school: "",
      academic_year: "",
      location: "",
      links: [],
    },
    summary: { text: "" },
    career_objective: { text: "" },
    education: [],
    skills: {
      programming_languages: [],
      frontend: [],
      backend: [],
      database: [],
      tools: [],
      soft_skills: [],
      others: [],
    },
    projects: [],
    experience: [],
    certificates: [],
    hobbies: [],
    languages: [],
    awards: [],
    others: [],
  };
}

function buildSummaryText(mapped: MappedSections) {
  const parts = uniqueStrings([mapped.summary.text, mapped.career_objective.text]);
  return parts.join("\n\n");
}

export function buildResumeSectionsFromParsedJson(input: unknown): BuilderSectionResult {
  const normalized = normalizeParsedJsonRecord(input);
  const mapped = pickMappedSections(input);

  const profileSource =
    normalized.profile && typeof normalized.profile === "object"
      ? (normalized.profile as Record<string, unknown>)
      : {};
  const contactsSource =
    normalized.contacts && typeof normalized.contacts === "object"
      ? (normalized.contacts as Record<string, unknown>)
      : {};

  const fullName = toText(mapped.candidate.name) || toText(profileSource.full_name) || "Ung vien";
  const jobTitle = toText(mapped.candidate.job_title) || toText(profileSource.job_title);
  const avatarUrl = toText(mapped.candidate.avatar_url);

  const email = toText(mapped.personal_info.email) || toText(contactsSource.email);
  const phone = toText(mapped.personal_info.phone) || toText(contactsSource.phone);
  const address =
    toText(mapped.personal_info.address) ||
    toText(mapped.personal_info.location) ||
    toText(contactsSource.address);

  const socials = mapped.personal_info.links
    .map((link) => ({
      network: toText(link.label) || "Link",
      url: toText(link.url),
    }))
    .filter((link) => link.url);

  const summaryText =
    buildSummaryText(mapped) ||
    uniqueStrings([toText(normalized.summary), toText(normalized.career_objective)]).join("\n\n");

  const experienceItems = mapped.experience
    .map((item, index) => ({
      id: buildId("exp", index),
      company: toText(item.company),
      position: toText(item.role),
      startDate: toText(item.start_date),
      endDate: toText(item.end_date),
      description: toText(item.description),
    }))
    .filter((item) => Object.values(item).some((value) => typeof value === "string" && value.trim()));

  const educationItems = mapped.education
    .map((item, index) => {
      const degree = uniqueStrings([toText(item.degree), toText(item.major)]).join(" - ");
      return {
        id: buildId("edu", index),
        institution: toText(item.school),
        degree,
        startDate: toText(item.start_date),
        endDate: toText(item.end_date),
      };
    })
    .filter((item) => Object.values(item).some((value) => typeof value === "string" && value.trim()));

  const skillItems = uniqueStrings([
    ...mapped.skills.programming_languages,
    ...mapped.skills.frontend,
    ...mapped.skills.backend,
    ...mapped.skills.database,
    ...mapped.skills.tools,
    ...mapped.skills.soft_skills,
    ...mapped.skills.others,
  ]).map((name, index) => ({
    id: buildId("skill", index),
    name,
    level: 70,
  }));

  const projectItems = mapped.projects
    .map((item, index) => ({
      id: buildId("project", index),
      name: toText(item.name),
      role: toText(item.role),
      startDate: toText(item.start_date),
      endDate: toText(item.end_date),
      description: toText(item.description),
      technologies: uniqueStrings(item.technologies).join(", "),
      link: toText(item.url) || toText(item.github) || undefined,
    }))
    .filter((item) => Object.values(item).some((value) => typeof value === "string" && value.trim()));

  const certificateItems = mapped.certificates
    .map((item, index) => ({
      id: buildId("cert", index),
      name: toText(item.name),
      issuer: toText(item.issuer),
      date: toText(item.year),
      url: toText(item.url) || undefined,
    }))
    .filter((item) => Object.values(item).some((value) => typeof value === "string" && value.trim()));

  const awardItems = mapped.awards
    .map((item, index) => ({
      id: buildId("award", index),
      title: toText(item.name),
      date: toText(item.year),
      issuer: toText(item.issuer),
      description: toText(item.description),
    }))
    .filter((item) => Object.values(item).some((value) => typeof value === "string" && value.trim()));

  const sections: BuilderSectionPayload[] = [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName,
        title: jobTitle,
        avatarUrl: avatarUrl || undefined,
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email,
        phone,
        address,
        socials,
      },
    },
  ];

  if (summaryText) {
    sections.push({
      type: "summary",
      isVisible: true,
      data: {
        text: summaryText,
      },
    });
  }

  if (experienceItems.length) {
    sections.push({
      type: "experience_list",
      isVisible: true,
      data: { items: experienceItems },
    });
  }

  if (educationItems.length) {
    sections.push({
      type: "education_list",
      isVisible: true,
      data: { items: educationItems },
    });
  }

  if (skillItems.length) {
    sections.push({
      type: "skill_list",
      isVisible: true,
      data: { items: skillItems },
    });
  }

  if (projectItems.length) {
    sections.push({
      type: "project_list",
      isVisible: true,
      data: { items: projectItems },
    });
  }

  if (certificateItems.length) {
    sections.push({
      type: "certificate_list",
      isVisible: true,
      data: { items: certificateItems },
    });
  }

  if (awardItems.length) {
    sections.push({
      type: "award_list",
      isVisible: true,
      data: { items: awardItems },
    });
  }

  return {
    sections,
    title: fullName ? `CV ${fullName}` : "CV tu OCR",
  };
}
