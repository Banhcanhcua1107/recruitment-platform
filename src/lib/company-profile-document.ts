import {
  createDefaultCompanyProfileDocument,
  getDefaultCompanySectionContent,
  type CompanyInfoContent,
  type CompanyIntroContent,
  type CompanyProfileDocument,
  type CompanyProfileLegacySummary,
  type CompanySection,
  type CompanySectionType,
  type ContactsContent,
  type OperationsContent,
  type RecruitmentOverviewContent,
  type VisionMissionContent,
  type WorkplaceContent,
} from "@/types/company-profile";

type LegacyCompanyProfileLike = {
  document?: unknown;
  companyName?: string | null;
  companyOverview?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  location?: string | null;
  industry?: unknown;
  companySize?: string | null;
  benefits?: unknown;
  culture?: unknown;
  vision?: string | null;
  mission?: string | null;
  description?: string | null;
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

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeString(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  return [];
}

function ensureSection<T extends CompanySection["content"]>(
  type: CompanySectionType,
  order: number,
  content: T,
  seed?: Partial<CompanySection<T>>,
): CompanySection<T> {
  return {
    id: seed?.id || `company-section-${type}`,
    type,
    order,
    isHidden: Boolean(seed?.isHidden),
    content,
  };
}

function getSectionByType<T extends CompanySection["content"]>(
  document: CompanyProfileDocument,
  type: CompanySectionType,
) {
  return document.sections.find((section) => section.type === type) as CompanySection<T> | undefined;
}

export function normalizeCompanyProfileDocument(value: unknown): CompanyProfileDocument {
  const fallback = createDefaultCompanyProfileDocument();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const rawDocument = value as { meta?: Record<string, unknown>; sections?: unknown };
  const rawSections = Array.isArray(rawDocument.sections) ? rawDocument.sections : [];
  const sectionMap = new Map<CompanySectionType, CompanySection>();

  for (const [index, item] of rawSections.entries()) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const rawSection = item as Record<string, unknown>;
    const type = normalizeString(rawSection.type) as CompanySectionType;
    if (!type) {
      continue;
    }

    sectionMap.set(type, {
      id: normalizeString(rawSection.id) || `company-section-${type}-${index}`,
      type,
      order: typeof rawSection.order === "number" ? rawSection.order : index,
      isHidden: Boolean(rawSection.isHidden),
      content: (rawSection.content ?? getDefaultCompanySectionContent(type)) as CompanySection["content"],
    });
  }

  const sections = fallback.sections.map((baseSection, index) => {
    const resolved = sectionMap.get(baseSection.type);
    if (!resolved) {
      return baseSection;
    }

    return {
      ...baseSection,
      ...resolved,
      order: typeof resolved.order === "number" ? resolved.order : index,
    };
  });

  return {
    meta: {
      version:
        typeof rawDocument.meta?.version === "number"
          ? rawDocument.meta.version
          : fallback.meta.version,
      createdAt: normalizeString(rawDocument.meta?.createdAt) || fallback.meta.createdAt,
      updatedAt: normalizeString(rawDocument.meta?.updatedAt) || fallback.meta.updatedAt,
    },
    sections,
  };
}

export function buildCompanyProfileDocumentFromLegacyProfile(
  input: LegacyCompanyProfileLike,
): CompanyProfileDocument {
  const fallback = createDefaultCompanyProfileDocument();
  const industries = normalizeStringArray(input.industry);

  const companyInfoContent: CompanyInfoContent = {
    companyName: normalizeString(input.companyName),
    legalName: "",
    tagline: "",
    foundedYear: "",
    logoUrl: normalizeString(input.logoUrl),
    coverUrl: normalizeString(input.coverUrl),
  };

  const companyIntroContent: CompanyIntroContent = {
    content: normalizeString(input.companyOverview) || normalizeString(input.description),
  };

  const visionMissionContent: VisionMissionContent = {
    vision: normalizeString(input.vision),
    mission: normalizeString(input.mission),
    coreValues: [],
  };

  const operationsContent: OperationsContent = {
    industries,
    companySize: normalizeString(input.companySize),
    headquarters: normalizeString(input.location),
    regions: [],
  };

  const contactsContent: ContactsContent = {
    website: normalizeString(input.website),
    email: normalizeString(input.email),
    phone: normalizeString(input.phone),
    address: normalizeString(input.location),
    recruitmentContact: "",
  };

  const workplaceContent: WorkplaceContent = {
    benefits: normalizeStringArray(input.benefits),
    environment: "",
    cultureHighlights: normalizeStringArray(input.culture),
  };

  const recruitmentContent: RecruitmentOverviewContent = {
    hiringFocus: "",
    workModel: "",
    hiringProcess: [],
    talentMessage: "",
  };

  return {
    ...fallback,
    sections: [
      ensureSection("company_info", 0, companyInfoContent),
      ensureSection("company_intro", 1, companyIntroContent),
      ensureSection("vision_mission", 2, visionMissionContent),
      ensureSection("operations", 3, operationsContent),
      ensureSection("contacts", 4, contactsContent),
      ensureSection("workplace", 5, workplaceContent),
      ensureSection("recruitment_overview", 6, recruitmentContent),
    ],
  };
}

export function resolveCompanyProfileDocument(
  input: LegacyCompanyProfileLike,
): CompanyProfileDocument {
  const explicitDocument = normalizeCompanyProfileDocument(input.document);
  const hasMeaningfulDocument = explicitDocument.sections.some((section) => {
    const content = section.content as unknown as Record<string, unknown>;
    return Object.values(content).some((value) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return Array.isArray(value) && value.some((item) => normalizeString(item));
    });
  });

  if (hasMeaningfulDocument) {
    return explicitDocument;
  }

  return buildCompanyProfileDocumentFromLegacyProfile(input);
}

export function getOrderedCompanyProfileSections(document: CompanyProfileDocument) {
  return [...document.sections].sort((left, right) => {
    if (left.order === right.order) {
      return left.id.localeCompare(right.id);
    }

    return left.order - right.order;
  });
}

export function buildLegacyCompanyProfilePatchFromDocument(
  document: CompanyProfileDocument,
): CompanyProfileLegacySummary {
  const companyInfo = getSectionByType<CompanyInfoContent>(document, "company_info");
  const companyIntro = getSectionByType<CompanyIntroContent>(document, "company_intro");
  const visionMission = getSectionByType<VisionMissionContent>(document, "vision_mission");
  const operations = getSectionByType<OperationsContent>(document, "operations");
  const contacts = getSectionByType<ContactsContent>(document, "contacts");
  const workplace = getSectionByType<WorkplaceContent>(document, "workplace");
  const recruitment = getSectionByType<RecruitmentOverviewContent>(
    document,
    "recruitment_overview",
  );

  const descriptionParts = [
    normalizeString(companyIntro?.content.content),
    normalizeString(visionMission?.content.mission),
    normalizeString(workplace?.content.environment),
    normalizeString(recruitment?.content.talentMessage),
  ].filter(Boolean);

  const companyName = normalizeString(companyInfo?.content.companyName);
  const companyOverview = normalizeString(companyIntro?.content.content);
  const email = normalizeString(contacts?.content.email);
  const website = normalizeString(contacts?.content.website);
  const phone = normalizeString(contacts?.content.phone);
  const logoUrl = normalizeString(companyInfo?.content.logoUrl);
  const coverUrl = normalizeString(companyInfo?.content.coverUrl);
  const location =
    normalizeString(contacts?.content.address) || normalizeString(operations?.content.headquarters);
  const industry = normalizeStringArray(operations?.content.industries);
  const companySize = normalizeString(operations?.content.companySize);
  const benefits = normalizeStringArray(workplace?.content.benefits);
  const culture = normalizeStringArray(workplace?.content.cultureHighlights);
  const vision = normalizeString(visionMission?.content.vision);
  const mission = normalizeString(visionMission?.content.mission);
  const description = descriptionParts.join("\n\n");

  return {
    company_name: companyName || null,
    company_overview: companyOverview || null,
    email: email || null,
    website: website || null,
    phone: phone || null,
    logo_url: logoUrl || null,
    cover_url: coverUrl || null,
    location: location || null,
    industry,
    company_size: companySize || null,
    benefits,
    culture,
    vision: vision || null,
    mission: mission || null,
    company_description: description || null,
  };
}
