import type {
  CorrectionLogEntry,
  DocumentAnalysis,
  MappedSections,
  NormalizedParsedCV,
} from "../../types/cv-import";

export function buildEmptyMappedSections(): MappedSections {
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

export function buildEmptyDocumentAnalysis(): DocumentAnalysis {
  return {
    document_type: "unknown",
    level: "unknown",
    role: "unknown",
    render_folder: "/cv/unknown/unknown/",
  };
}

function buildRenderFolder(level: DocumentAnalysis["level"], role: DocumentAnalysis["role"]) {
  return `/cv/${level}/${role}/`;
}

export function normalizeMappedSections(input: unknown): MappedSections {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const empty = buildEmptyMappedSections();
  const candidateSource = (source.candidate && typeof source.candidate === "object"
    ? source.candidate
    : {}) as Record<string, unknown>;
  const personalSource = (source.personal_info && typeof source.personal_info === "object"
    ? source.personal_info
    : {}) as Record<string, unknown>;
  const skillsSource = (source.skills && typeof source.skills === "object"
    ? source.skills
    : {}) as Record<string, unknown>;

  return {
    candidate: {
      name: String(candidateSource.name ?? ""),
      job_title: String(candidateSource.job_title ?? ""),
      avatar_url: String(candidateSource.avatar_url ?? ""),
    },
    personal_info: {
      email: String(personalSource.email ?? ""),
      phone: String(personalSource.phone ?? ""),
      address: String(personalSource.address ?? ""),
      current_school: String(personalSource.current_school ?? ""),
      academic_year: String(personalSource.academic_year ?? ""),
      location: String(personalSource.location ?? ""),
      links: Array.isArray(personalSource.links)
        ? (personalSource.links as Array<Record<string, unknown>>).map((item) => ({
            label: String(item.label ?? ""),
            url: String(item.url ?? ""),
          }))
        : [],
    },
    summary:
      source.summary && typeof source.summary === "object" && !Array.isArray(source.summary)
        ? { text: String((source.summary as Record<string, unknown>).text ?? "") }
        : empty.summary,
    career_objective:
      source.career_objective &&
      typeof source.career_objective === "object" &&
      !Array.isArray(source.career_objective)
        ? { text: String((source.career_objective as Record<string, unknown>).text ?? "") }
        : empty.career_objective,
    education: Array.isArray(source.education) ? (source.education as MappedSections["education"]) : [],
    skills: {
      programming_languages: Array.isArray(skillsSource.programming_languages) ? (skillsSource.programming_languages as string[]) : empty.skills.programming_languages,
      frontend: Array.isArray(skillsSource.frontend) ? (skillsSource.frontend as string[]) : empty.skills.frontend,
      backend: Array.isArray(skillsSource.backend) ? (skillsSource.backend as string[]) : empty.skills.backend,
      database: Array.isArray(skillsSource.database) ? (skillsSource.database as string[]) : empty.skills.database,
      tools: Array.isArray(skillsSource.tools) ? (skillsSource.tools as string[]) : empty.skills.tools,
      soft_skills: Array.isArray(skillsSource.soft_skills) ? (skillsSource.soft_skills as string[]) : empty.skills.soft_skills,
      others: Array.isArray(skillsSource.others) ? (skillsSource.others as string[]) : empty.skills.others,
    },
    projects: Array.isArray(source.projects) ? (source.projects as MappedSections["projects"]) : [],
    experience: Array.isArray(source.experience) ? (source.experience as MappedSections["experience"]) : [],
    certificates: Array.isArray(source.certificates) ? (source.certificates as MappedSections["certificates"]) : [],
    hobbies: Array.isArray(source.hobbies) ? (source.hobbies as string[]) : [],
    languages: Array.isArray(source.languages) ? (source.languages as MappedSections["languages"]) : [],
    awards: Array.isArray(source.awards) ? (source.awards as MappedSections["awards"]) : [],
    others: Array.isArray(source.others) ? (source.others as string[]) : [],
  };
}

export function normalizeCorrectionLog(input: unknown): CorrectionLogEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      field: String(item.field ?? ""),
      before: String(item.before ?? ""),
      after: String(item.after ?? ""),
      reason: String(item.reason ?? ""),
    }))
    .filter((item) => item.field.trim().length > 0);
}

function inferDocumentAnalysis(mappedSections: MappedSections): DocumentAnalysis {
  if (!hasMeaningfulMappedSections(mappedSections)) {
    return buildEmptyDocumentAnalysis();
  }

  const text = [
    mappedSections.candidate.name,
    mappedSections.candidate.job_title,
    mappedSections.summary.text,
    mappedSections.career_objective.text,
    mappedSections.personal_info.current_school,
    mappedSections.personal_info.academic_year,
    ...Object.values(mappedSections.skills).flat(),
    ...mappedSections.projects.flatMap((item) => [
      item.name,
      item.description,
      item.role,
      ...item.technologies,
    ]),
    ...mappedSections.experience.flatMap((item) => [item.company, item.role, item.description]),
    ...mappedSections.education.flatMap((item) => [item.school, item.degree, item.major, item.description]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let documentType: DocumentAnalysis["document_type"] = "cv";
  if (
    mappedSections.summary.text &&
    !mappedSections.experience.length &&
    !mappedSections.education.length &&
    !mappedSections.projects.length &&
    !Object.values(mappedSections.skills).some((items) => items.length > 0)
  ) {
    documentType = "profile";
  } else if (
    mappedSections.experience.length &&
    !mappedSections.education.length &&
    !mappedSections.projects.length &&
    !mappedSections.career_objective.text
  ) {
    documentType = "resume";
  }

  let level: DocumentAnalysis["level"] = "unknown";
  if (/(^|\W)(intern|internship)(\W|$)/.test(text) || text.includes("thuc tap")) {
    level = "intern";
  } else if (/(^|\W)student(\W|$)/.test(text) || text.includes("sinh vien")) {
    level = "student";
  } else if (text.includes("fresher") || text.includes("new graduate") || text.includes("moi tot nghiep")) {
    level = "fresher";
  } else {
    const yearMatches = [...text.matchAll(/(\d+)\+?\s*(?:years?|yrs?|nam)\b/g)].map((match) =>
      Number(match[1]),
    );
    const maxYears = yearMatches.length ? Math.max(...yearMatches) : 0;
    if (maxYears >= 5) {
      level = "senior";
    } else if (maxYears >= 3) {
      level = "middle";
    } else if (maxYears >= 1 || mappedSections.experience.length > 0) {
      level = "junior";
    } else if (mappedSections.personal_info.current_school || mappedSections.education.length > 0) {
      level = "student";
    } else if (mappedSections.projects.length > 0) {
      level = "fresher";
    }
  }

  const frontendHits = ["frontend", "front-end", "react", "next.js", "vue", "angular", "html", "css", "tailwind"].filter((keyword) => text.includes(keyword)).length;
  const backendHits = ["backend", "back-end", "node.js", "node", "express", "nestjs", "nest", "spring", "django", "api", "server"].filter((keyword) => text.includes(keyword)).length;
  const mobileHits = ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin"].filter((keyword) => text.includes(keyword)).length;
  const testerHits = ["tester", "qa", "quality assurance", "testing", "selenium", "cypress"].filter((keyword) => text.includes(keyword)).length;
  const devopsHits = ["devops", "docker", "kubernetes", "terraform", "ci/cd", "aws", "azure", "gcp"].filter((keyword) => text.includes(keyword)).length;
  const dataHits = ["data", "machine learning", "deep learning", "analytics", "power bi", "tableau", "pandas"].filter((keyword) => text.includes(keyword)).length;
  const uiuxHits = ["ui/ux", "ux/ui", "figma", "wireframe", "prototype", "product designer"].filter((keyword) => text.includes(keyword)).length;

  let role: DocumentAnalysis["role"] = "unknown";
  if (text.includes("fullstack") || text.includes("full stack") || (frontendHits > 0 && backendHits > 0)) {
    role = "fullstack";
  } else if (mobileHits > 0) {
    role = "mobile";
  } else if (testerHits > 0) {
    role = "tester";
  } else if (devopsHits > 0) {
    role = "devops";
  } else if (dataHits > 0) {
    role = "data";
  } else if (uiuxHits > 0) {
    role = "uiux";
  } else if (frontendHits > 0) {
    role = "frontend";
  } else if (backendHits > 0) {
    role = "backend";
  } else if (text.includes("software engineer") || text.includes("developer") || text.includes("engineer")) {
    role = "software-engineer";
  }

  return {
    document_type: documentType,
    level,
    role,
    render_folder: buildRenderFolder(level, role),
  };
}

export function normalizeDocumentAnalysis(
  input: unknown,
  mappedSections: MappedSections = buildEmptyMappedSections(),
): DocumentAnalysis {
  const inferred = inferDocumentAnalysis(mappedSections);
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const documentTypes = new Set<DocumentAnalysis["document_type"]>(["cv", "resume", "profile", "unknown"]);
  const levels = new Set<DocumentAnalysis["level"]>([
    "student",
    "intern",
    "fresher",
    "junior",
    "middle",
    "senior",
    "unknown",
  ]);
  const roles = new Set<DocumentAnalysis["role"]>([
    "frontend",
    "backend",
    "fullstack",
    "mobile",
    "tester",
    "devops",
    "data",
    "uiux",
    "software-engineer",
    "unknown",
  ]);

  const documentType = String(source.document_type ?? "").trim().toLowerCase();
  const level = String(source.level ?? "").trim().toLowerCase();
  const role = String(source.role ?? "").trim().toLowerCase();

  const normalized: DocumentAnalysis = {
    document_type: documentTypes.has(documentType as DocumentAnalysis["document_type"])
      ? (documentType as DocumentAnalysis["document_type"])
      : inferred.document_type,
    level: levels.has(level as DocumentAnalysis["level"])
      ? (level as DocumentAnalysis["level"])
      : inferred.level,
    role: roles.has(role as DocumentAnalysis["role"])
      ? (role as DocumentAnalysis["role"])
      : inferred.role,
    render_folder: inferred.render_folder,
  };

  normalized.render_folder = buildRenderFolder(normalized.level, normalized.role);
  return normalized;
}

function hasMeaningfulMappedSections(mappedSections: MappedSections) {
  return Boolean(
    mappedSections.candidate.name ||
      mappedSections.candidate.job_title ||
      mappedSections.personal_info.email ||
      mappedSections.personal_info.phone ||
      mappedSections.summary.text ||
      mappedSections.career_objective.text ||
      mappedSections.education.length ||
      mappedSections.projects.length ||
      mappedSections.experience.length ||
      mappedSections.certificates.length ||
      mappedSections.languages.length ||
      mappedSections.awards.length ||
      mappedSections.hobbies.length ||
      mappedSections.others.length ||
      Object.values(mappedSections.skills).some((items) => items.length > 0),
  );
}

export function normalizeParsedJsonRecord(input: unknown): NormalizedParsedCV {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const mappedSections = normalizeMappedSections(source.mapped_sections);
  const cleanedJson = normalizeMappedSections(source.cleaned_json);
  const preferCleanedJson = hasMeaningfulMappedSections(cleanedJson);
  const effectiveMappedSections = preferCleanedJson ? cleanedJson : mappedSections;
  const documentAnalysis = normalizeDocumentAnalysis(source.document_analysis, effectiveMappedSections);
  const correctionLog = normalizeCorrectionLog(source.correction_log);
  const mappedCandidate = effectiveMappedSections.candidate;
  const mappedPersonal = effectiveMappedSections.personal_info;
  const mappedLinks = mappedPersonal.links ?? [];
  const firstNonEmpty = (...values: Array<unknown>) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value;
      if (value !== null && value !== undefined) return value;
    }
    return null;
  };

  const profileSource = (source.profile && typeof source.profile === "object"
    ? source.profile
    : {}) as Record<string, unknown>;
  const profile: Record<string, unknown> = {
    ...profileSource,
    full_name: preferCleanedJson
      ? firstNonEmpty(mappedCandidate.name, profileSource.full_name, source.full_name)
      : firstNonEmpty(profileSource.full_name, source.full_name, mappedCandidate.name),
    job_title: preferCleanedJson
      ? firstNonEmpty(mappedCandidate.job_title, profileSource.job_title, source.job_title)
      : firstNonEmpty(profileSource.job_title, source.job_title, mappedCandidate.job_title),
    summary: preferCleanedJson
      ? firstNonEmpty(
          effectiveMappedSections.summary.text,
          profileSource.summary,
          typeof source.summary === "string" && source.summary.trim() ? source.summary : null,
        )
      : firstNonEmpty(
          profileSource.summary,
          typeof source.summary === "string" && source.summary.trim() ? source.summary : null,
          effectiveMappedSections.summary.text,
        ),
    career_objective: preferCleanedJson
      ? firstNonEmpty(
          effectiveMappedSections.career_objective.text,
          profileSource.career_objective,
          typeof source.career_objective === "string" && source.career_objective.trim()
            ? source.career_objective
            : null,
        )
      : firstNonEmpty(
          profileSource.career_objective,
          typeof source.career_objective === "string" && source.career_objective.trim()
            ? source.career_objective
            : null,
          effectiveMappedSections.career_objective.text,
        ),
  };

  const contactsSource = (source.contacts && typeof source.contacts === "object"
    ? source.contacts
    : source.contact && typeof source.contact === "object"
      ? source.contact
      : {}) as Record<string, unknown>;
  const contacts: Record<string, unknown> = {
    ...contactsSource,
    email: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.email, contactsSource.email)
      : firstNonEmpty(contactsSource.email, mappedPersonal.email),
    phone: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.phone, contactsSource.phone)
      : firstNonEmpty(contactsSource.phone, mappedPersonal.phone),
    address: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.address, mappedPersonal.location, contactsSource.address)
      : firstNonEmpty(contactsSource.address, mappedPersonal.address, mappedPersonal.location),
    current_school: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.current_school, contactsSource.current_school)
      : firstNonEmpty(contactsSource.current_school, mappedPersonal.current_school),
    academic_year: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.academic_year, contactsSource.academic_year)
      : firstNonEmpty(contactsSource.academic_year, mappedPersonal.academic_year),
    location: preferCleanedJson
      ? firstNonEmpty(mappedPersonal.location, contactsSource.location)
      : firstNonEmpty(contactsSource.location, mappedPersonal.location),
    links: preferCleanedJson ? mappedLinks : Array.isArray(contactsSource.links) ? contactsSource.links : mappedLinks,
    linkedin: firstNonEmpty(
      contactsSource.linkedin,
      mappedLinks.find((item) => item.label.toLowerCase() === "linkedin")?.url,
    ),
  };

  const flattenedSkills = [
    ...effectiveMappedSections.skills.programming_languages,
    ...effectiveMappedSections.skills.frontend,
    ...effectiveMappedSections.skills.backend,
    ...effectiveMappedSections.skills.database,
    ...effectiveMappedSections.skills.tools,
    ...effectiveMappedSections.skills.soft_skills,
    ...effectiveMappedSections.skills.others,
  ];

  const derivedExperience = effectiveMappedSections.experience.map((item) => ({
    company: item.company,
    title: item.role,
    start_date: item.start_date,
    end_date: item.end_date,
    description: item.description,
  }));

  const derivedEducation = effectiveMappedSections.education.map((item) => ({
    institution: item.school,
    degree: item.degree,
    field_of_study: item.major,
    gpa: item.gpa,
    start_date: item.start_date,
    end_date: item.end_date,
    description: item.description,
  }));

  const derivedProjects = effectiveMappedSections.projects.map((item) => ({
    name: item.name,
    description: item.description,
    technologies: item.technologies,
    role: item.role,
    start_date: item.start_date,
    end_date: item.end_date,
    github: item.github,
    url: item.url,
  }));

  const derivedCertifications = effectiveMappedSections.certificates.map((item) => ({
    name: item.name,
    issuer: item.issuer,
    date_obtained: item.year,
    url: item.url,
  }));

  const derivedLanguages = effectiveMappedSections.languages
    .filter((item) => item.name)
    .map((item) => (item.proficiency ? `${item.name} (${item.proficiency})` : item.name));

  const derivedAwards = effectiveMappedSections.awards.map((item) => ({
    name: item.name,
    issuer: item.issuer,
    year: item.year,
    description: item.description,
  }));

  return {
    profile,
    contacts,
    summary: preferCleanedJson
      ? effectiveMappedSections.summary.text
      : typeof source.summary === "string" && source.summary.trim()
        ? source.summary
        : effectiveMappedSections.summary.text,
    career_objective: preferCleanedJson
      ? effectiveMappedSections.career_objective.text
      : typeof source.career_objective === "string" && source.career_objective.trim()
        ? source.career_objective
        : effectiveMappedSections.career_objective.text,
    experience: preferCleanedJson
      ? derivedExperience
      : Array.isArray(source.experience)
        ? (source.experience as Array<Record<string, unknown>>)
        : derivedExperience,
    education: preferCleanedJson
      ? derivedEducation
      : Array.isArray(source.education)
        ? (source.education as Array<Record<string, unknown>>)
        : derivedEducation,
    skills: preferCleanedJson
      ? flattenedSkills
      : Array.isArray(source.skills)
        ? (source.skills as Array<Record<string, unknown> | string>)
        : flattenedSkills,
    projects: preferCleanedJson
      ? derivedProjects
      : Array.isArray(source.projects)
        ? (source.projects as Array<Record<string, unknown>>)
        : derivedProjects,
    certifications: preferCleanedJson
      ? derivedCertifications
      : Array.isArray(source.certifications)
        ? (source.certifications as Array<Record<string, unknown>>)
        : derivedCertifications,
    languages: preferCleanedJson
      ? derivedLanguages
      : Array.isArray(source.languages)
        ? (source.languages as Array<Record<string, unknown> | string>)
        : derivedLanguages,
    awards: preferCleanedJson
      ? derivedAwards
      : Array.isArray(source.awards)
        ? (source.awards as Array<Record<string, unknown>>)
        : derivedAwards,
    hobbies: preferCleanedJson
      ? effectiveMappedSections.hobbies
      : Array.isArray(source.hobbies)
        ? (source.hobbies as string[])
        : effectiveMappedSections.hobbies,
    others: preferCleanedJson
      ? effectiveMappedSections.others
      : Array.isArray(source.others)
        ? (source.others as string[])
        : effectiveMappedSections.others,
    mapped_sections: mappedSections,
    cleaned_json: cleanedJson,
    document_analysis: documentAnalysis,
    correction_log: correctionLog,
    avatar:
      source.avatar && typeof source.avatar === "object"
        ? (source.avatar as Record<string, unknown>)
        : mappedCandidate.avatar_url
          ? { url: mappedCandidate.avatar_url }
          : {},
    raw_ocr_blocks: Array.isArray(source.raw_ocr_blocks)
      ? (source.raw_ocr_blocks as Array<Record<string, unknown>>)
      : Array.isArray(source.blocks)
        ? (source.blocks as Array<Record<string, unknown>>)
        : [],
    layout_blocks: Array.isArray(source.layout_blocks)
      ? (source.layout_blocks as Array<Record<string, unknown>>)
      : [],
  };
}
