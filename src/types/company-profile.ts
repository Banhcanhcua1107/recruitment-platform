export type CompanySectionType =
  | "company_info"
  | "company_intro"
  | "vision_mission"
  | "operations"
  | "contacts"
  | "workplace"
  | "recruitment_overview";

export interface CompanySectionMeta {
  id: CompanySectionType;
  name: string;
  icon: string;
  description: string;
  category: "brand" | "business" | "people";
}

export const COMPANY_SECTION_DEFINITIONS: CompanySectionMeta[] = [
  {
    id: "company_info",
    name: "Thong tin cong ty",
    icon: "apartment",
    description: "Ten cong ty, slogan, logo va anh bia doanh nghiep",
    category: "brand",
  },
  {
    id: "company_intro",
    name: "Gioi thieu cong ty",
    icon: "article",
    description: "Cau chuyen, nang luc cot loi va diem khac biet cua doanh nghiep",
    category: "brand",
  },
  {
    id: "vision_mission",
    name: "Tam nhin va su menh",
    icon: "flag",
    description: "Dinh huong phat trien va gia tri doanh nghiep theo duoi",
    category: "business",
  },
  {
    id: "operations",
    name: "Linh vuc va quy mo",
    icon: "factory",
    description: "Linh vuc hoat dong, quy mo, tru so va khu vuc van hanh",
    category: "business",
  },
  {
    id: "contacts",
    name: "Dia chi va lien he",
    icon: "contact_mail",
    description: "Website, email, so dien thoai va dau moi tuyen dung",
    category: "brand",
  },
  {
    id: "workplace",
    name: "Phuc loi va van hoa",
    icon: "favorite",
    description: "Moi truong lam viec, van hoa va trai nghiem danh cho nhan su",
    category: "people",
  },
  {
    id: "recruitment_overview",
    name: "Tong quan tuyen dung",
    icon: "work",
    description: "Thong tin tong quat phuc vu viec dang tin va thu hut ung vien",
    category: "people",
  },
];

export interface CompanyInfoContent {
  companyName: string;
  legalName: string;
  tagline: string;
  foundedYear: string;
  logoUrl: string;
  coverUrl: string;
}

export interface CompanyIntroContent {
  content: string;
}

export interface VisionMissionContent {
  vision: string;
  mission: string;
  coreValues: string[];
}

export interface OperationsContent {
  industries: string[];
  companySize: string;
  headquarters: string;
  regions: string[];
}

export interface ContactsContent {
  website: string;
  email: string;
  phone: string;
  address: string;
  recruitmentContact: string;
}

export interface WorkplaceContent {
  benefits: string[];
  environment: string;
  cultureHighlights: string[];
}

export interface RecruitmentOverviewContent {
  hiringFocus: string;
  workModel: string;
  hiringProcess: string[];
  talentMessage: string;
}

export type CompanySectionContent =
  | CompanyInfoContent
  | CompanyIntroContent
  | VisionMissionContent
  | OperationsContent
  | ContactsContent
  | WorkplaceContent
  | RecruitmentOverviewContent;

export interface CompanySection<T extends CompanySectionContent = CompanySectionContent> {
  id: string;
  type: CompanySectionType;
  order: number;
  isHidden: boolean;
  content: T;
}

export interface CompanyProfileDocumentMeta {
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyProfileDocument {
  meta: CompanyProfileDocumentMeta;
  sections: CompanySection[];
}

export interface CompanyProfileLegacySummary {
  company_name: string | null;
  company_overview: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
  industry: string[];
  company_size: string | null;
  benefits: string[];
  culture: string[];
  vision: string | null;
  mission: string | null;
  company_description: string | null;
}

export function getCompanySectionMeta(
  type: CompanySectionType,
): CompanySectionMeta | undefined {
  return COMPANY_SECTION_DEFINITIONS.find((section) => section.id === type);
}

export function getDefaultCompanySectionContent(
  type: CompanySectionType,
): CompanySectionContent {
  switch (type) {
    case "company_info":
      return {
        companyName: "",
        legalName: "",
        tagline: "",
        foundedYear: "",
        logoUrl: "",
        coverUrl: "",
      } satisfies CompanyInfoContent;
    case "company_intro":
      return { content: "" } satisfies CompanyIntroContent;
    case "vision_mission":
      return {
        vision: "",
        mission: "",
        coreValues: [],
      } satisfies VisionMissionContent;
    case "operations":
      return {
        industries: [],
        companySize: "",
        headquarters: "",
        regions: [],
      } satisfies OperationsContent;
    case "contacts":
      return {
        website: "",
        email: "",
        phone: "",
        address: "",
        recruitmentContact: "",
      } satisfies ContactsContent;
    case "workplace":
      return {
        benefits: [],
        environment: "",
        cultureHighlights: [],
      } satisfies WorkplaceContent;
    case "recruitment_overview":
      return {
        hiringFocus: "",
        workModel: "",
        hiringProcess: [],
        talentMessage: "",
      } satisfies RecruitmentOverviewContent;
    default:
      return { content: "" } satisfies CompanyIntroContent;
  }
}

export function createDefaultCompanyProfileDocument(): CompanyProfileDocument {
  const now = new Date().toISOString();

  return {
    meta: {
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    sections: COMPANY_SECTION_DEFINITIONS.map((section, index) => ({
      id: `company-section-${section.id}`,
      type: section.id,
      order: index,
      isHidden: false,
      content: getDefaultCompanySectionContent(section.id),
    })),
  };
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyItems(value: unknown) {
  return Array.isArray(value) && value.some((item) => isNonEmptyString(item));
}

export function isCompanySectionEmpty(section: CompanySection) {
  switch (section.type) {
    case "company_info": {
      const content = section.content as CompanyInfoContent;
      return !(
        isNonEmptyString(content.companyName) ||
        isNonEmptyString(content.legalName) ||
        isNonEmptyString(content.tagline) ||
        isNonEmptyString(content.foundedYear) ||
        isNonEmptyString(content.logoUrl) ||
        isNonEmptyString(content.coverUrl)
      );
    }
    case "company_intro": {
      const content = section.content as CompanyIntroContent;
      return !isNonEmptyString(content.content);
    }
    case "vision_mission": {
      const content = section.content as VisionMissionContent;
      return !(
        isNonEmptyString(content.vision) ||
        isNonEmptyString(content.mission) ||
        hasNonEmptyItems(content.coreValues)
      );
    }
    case "operations": {
      const content = section.content as OperationsContent;
      return !(
        hasNonEmptyItems(content.industries) ||
        isNonEmptyString(content.companySize) ||
        isNonEmptyString(content.headquarters) ||
        hasNonEmptyItems(content.regions)
      );
    }
    case "contacts": {
      const content = section.content as ContactsContent;
      return !(
        isNonEmptyString(content.website) ||
        isNonEmptyString(content.email) ||
        isNonEmptyString(content.phone) ||
        isNonEmptyString(content.address) ||
        isNonEmptyString(content.recruitmentContact)
      );
    }
    case "workplace": {
      const content = section.content as WorkplaceContent;
      return !(
        hasNonEmptyItems(content.benefits) ||
        isNonEmptyString(content.environment) ||
        hasNonEmptyItems(content.cultureHighlights)
      );
    }
    case "recruitment_overview": {
      const content = section.content as RecruitmentOverviewContent;
      return !(
        isNonEmptyString(content.hiringFocus) ||
        isNonEmptyString(content.workModel) ||
        hasNonEmptyItems(content.hiringProcess) ||
        isNonEmptyString(content.talentMessage)
      );
    }
    default:
      return true;
  }
}
