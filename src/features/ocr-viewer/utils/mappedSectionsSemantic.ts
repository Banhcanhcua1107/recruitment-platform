import { normalizeMappedSections } from "@/features/cv-import/normalize-parsed-json";
import type {
  SemanticCertificationItem,
  SemanticContact,
  SemanticContactInfoItem,
  SemanticCvJson,
  SemanticEducationItem,
  SemanticExperienceItem,
  SemanticItem,
  SemanticLanguageItem,
  SemanticOtherItem,
  SemanticParagraphItem,
  SemanticProjectItem,
  SemanticSection,
  SemanticSectionType,
  SemanticSkillGroupItem,
  SemanticSourceTrace,
} from "@/features/ocr-viewer/semantic-types";

function withTrace<const T extends object>(value: T): T & SemanticSourceTrace {
  return {
    ...value,
    sourceBlockIds: [],
    pageIndexes: [],
  };
}

function hasAnyText(values: unknown[]) {
  return values.some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function buildSection(
  title: string,
  type: SemanticSectionType,
  items: SemanticItem[],
): SemanticSection | null {
  if (!items.length) return null;

  return withTrace({
    title,
    type,
    items,
  });
}

export function buildSemanticJsonFromMappedSections(input: unknown): SemanticCvJson | null {
  const mapped = normalizeMappedSections(input);
  const hasContent = hasAnyText([
    mapped.candidate.name,
    mapped.candidate.job_title,
    mapped.personal_info.email,
    mapped.personal_info.phone,
    mapped.personal_info.address,
    mapped.personal_info.current_school,
    mapped.personal_info.academic_year,
    mapped.personal_info.location,
    mapped.summary.text,
    mapped.career_objective.text,
    mapped.education,
    mapped.skills.programming_languages,
    mapped.skills.frontend,
    mapped.skills.backend,
    mapped.skills.database,
    mapped.skills.tools,
    mapped.skills.soft_skills,
    mapped.skills.others,
    mapped.projects,
    mapped.experience,
    mapped.certificates,
    mapped.hobbies,
    mapped.languages,
    mapped.awards,
    mapped.others,
  ]);

  if (!hasContent) {
    return null;
  }

  const contact: SemanticContact = withTrace({
    email: mapped.personal_info.email.trim(),
    phone: mapped.personal_info.phone.trim(),
    address: (mapped.personal_info.address || mapped.personal_info.location).trim(),
    links: mapped.personal_info.links
      .filter((link) => link.url.trim())
      .map((link) => ({
        url: link.url.trim(),
        label: link.label.trim() || undefined,
      })),
  });

  const sections: SemanticSection[] = [];

  const contactOtherLines = [
    mapped.personal_info.current_school.trim()
      ? `Current school: ${mapped.personal_info.current_school.trim()}`
      : "",
    mapped.personal_info.academic_year.trim()
      ? `Academic year: ${mapped.personal_info.academic_year.trim()}`
      : "",
    mapped.personal_info.location.trim() &&
    mapped.personal_info.location.trim() !== mapped.personal_info.address.trim()
      ? `Location: ${mapped.personal_info.location.trim()}`
      : "",
  ].filter(Boolean);

  if (contactOtherLines.length) {
    const contactItem: SemanticContactInfoItem = withTrace({
      type: "contact_info",
      otherLines: contactOtherLines,
    });
    const section = buildSection("Contact Information", "contact_info", [contactItem]);
    if (section) sections.push(section);
  }

  if (mapped.summary.text.trim()) {
    const summaryItem: SemanticParagraphItem = withTrace({
      type: "paragraph",
      text: mapped.summary.text.trim(),
    });
    const section = buildSection("Summary", "summary", [summaryItem]);
    if (section) sections.push(section);
  }

  if (mapped.career_objective.text.trim()) {
    const objectiveItem: SemanticParagraphItem = withTrace({
      type: "paragraph",
      text: mapped.career_objective.text.trim(),
    });
    const section = buildSection("Career Objective", "summary", [objectiveItem]);
    if (section) sections.push(section);
  }

  const educationItems: SemanticEducationItem[] = mapped.education
    .filter((item) => hasAnyText([item.school, item.degree, item.major, item.description]))
    .map((item) =>
      withTrace({
        type: "education",
        institution: item.school.trim(),
        degree: item.degree.trim(),
        fieldOfStudy: item.major.trim(),
        gpa: item.gpa.trim(),
        startDate: item.start_date.trim(),
        endDate: item.end_date.trim(),
        dateText: [item.start_date.trim(), item.end_date.trim()].filter(Boolean).join(" - "),
        description: item.description.trim(),
      }),
    );
  const educationSection = buildSection("Education", "education", educationItems);
  if (educationSection) sections.push(educationSection);

  const skillSections: Array<[string, string[]]> = [
    ["Programming Languages", mapped.skills.programming_languages],
    ["Front-End", mapped.skills.frontend],
    ["Back-End", mapped.skills.backend],
    ["Database", mapped.skills.database],
    ["Tools", mapped.skills.tools],
    ["Soft Skills", mapped.skills.soft_skills],
    ["Others", mapped.skills.others],
  ];
  const skillItems: SemanticSkillGroupItem[] = skillSections
    .map(([groupName, skills]) =>
      withTrace({
        type: "skill_group" as const,
        groupName,
        skills: skills.map((skill) => skill.trim()).filter(Boolean),
      }),
    )
    .filter((item) => item.skills.length > 0);
  const skillSection = buildSection("Skills", "skill_group", skillItems);
  if (skillSection) sections.push(skillSection);

  const projectItems: SemanticProjectItem[] = mapped.projects
    .filter((item) => hasAnyText([item.name, item.role, item.description, item.technologies]))
    .map((item) =>
      withTrace({
        type: "project",
        name: item.name.trim(),
        role: item.role.trim(),
        startDate: item.start_date.trim(),
        endDate: item.end_date.trim(),
        dateText: [item.start_date.trim(), item.end_date.trim()].filter(Boolean).join(" - "),
        description: item.description.trim(),
        highlights: [],
        techStack: item.technologies.map((tech) => tech.trim()).filter(Boolean),
        links: [
          item.github.trim() ? { url: item.github.trim(), label: "GitHub" } : null,
          item.url.trim() ? { url: item.url.trim(), label: "URL" } : null,
        ].filter(Boolean) as SemanticProjectItem["links"],
      }),
    );
  const projectSection = buildSection("Projects", "project", projectItems);
  if (projectSection) sections.push(projectSection);

  const experienceItems: SemanticExperienceItem[] = mapped.experience
    .filter((item) => hasAnyText([item.company, item.role, item.description]))
    .map((item) =>
      withTrace({
        type: "experience",
        company: item.company.trim(),
        position: item.role.trim(),
        location: "",
        startDate: item.start_date.trim(),
        endDate: item.end_date.trim(),
        dateText: [item.start_date.trim(), item.end_date.trim()].filter(Boolean).join(" - "),
        description: item.description.trim(),
        highlights: [],
        techStack: [],
      }),
    );
  const experienceSection = buildSection("Experience", "experience", experienceItems);
  if (experienceSection) sections.push(experienceSection);

  const certificationItems: SemanticCertificationItem[] = mapped.certificates
    .filter((item) => hasAnyText([item.name, item.issuer, item.year]))
    .map((item) =>
      withTrace({
        type: "certification",
        name: item.name.trim(),
        issuer: item.issuer.trim(),
        date: item.year.trim(),
        credentialId: "",
      }),
    );
  const certificationSection = buildSection("Certificates", "certification", certificationItems);
  if (certificationSection) sections.push(certificationSection);

  const languageItems: SemanticLanguageItem[] = mapped.languages
    .filter((item) => hasAnyText([item.name, item.proficiency]))
    .map((item) =>
      withTrace({
        type: "language",
        name: item.name.trim(),
        level: item.proficiency.trim(),
        score: "",
      }),
    );
  const languageSection = buildSection("Languages", "language", languageItems);
  if (languageSection) sections.push(languageSection);

  const otherItems: SemanticOtherItem[] = [
    ...mapped.awards
      .filter((item) => hasAnyText([item.name, item.issuer, item.year, item.description]))
      .map((item) =>
        withTrace({
          type: "other",
          text: [item.name.trim(), item.issuer.trim(), item.year.trim(), item.description.trim()]
            .filter(Boolean)
            .join(" | "),
        }),
      ),
    ...mapped.hobbies
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => withTrace({ type: "other", text: `Hobby: ${item}` })),
    ...mapped.others
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => withTrace({ type: "other", text: item })),
  ];
  const otherSection = buildSection("Other", "other", otherItems);
  if (otherSection) sections.push(otherSection);

  return {
    contact,
    sections,
  };
}
