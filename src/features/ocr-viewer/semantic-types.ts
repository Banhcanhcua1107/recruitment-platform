export type SemanticSectionType =
  | "section"
  | "contact_info"
  | "skill_group"
  | "education"
  | "project"
  | "experience"
  | "certification"
  | "language"
  | "other";

export type SemanticItemType =
  | "paragraph"
  | "list"
  | "contact_info"
  | "skill_group"
  | "education"
  | "project"
  | "experience"
  | "certification"
  | "language"
  | "other";

export interface SemanticSourceTrace {
  sourceBlockIds: string[];
  pageIndexes: number[];
}

export interface SemanticLink {
  url: string;
  label?: string;
}

export interface SemanticContact extends SemanticSourceTrace {
  email: string;
  phone: string;
  address: string;
  links: SemanticLink[];
}

export interface SemanticParagraphItem extends SemanticSourceTrace {
  type: "paragraph";
  text: string;
}

export interface SemanticListItem extends SemanticSourceTrace {
  type: "list";
  items: string[];
}

export interface SemanticContactInfoItem extends SemanticSourceTrace {
  type: "contact_info";
  email?: string;
  phone?: string;
  address?: string;
  links?: SemanticLink[];
  otherLines?: string[];
}

export interface SemanticSkillGroupItem extends SemanticSourceTrace {
  type: "skill_group";
  groupName: string;
  skills: string[];
}

export interface SemanticEducationItem extends SemanticSourceTrace {
  type: "education";
  institution: string;
  degree: string;
  fieldOfStudy: string;
  gpa: string;
  startDate: string;
  endDate: string;
  dateText: string;
  description: string;
}

export interface SemanticExperienceItem extends SemanticSourceTrace {
  type: "experience";
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  dateText: string;
  description: string;
  highlights: string[];
  techStack: string[];
}

export interface SemanticProjectItem extends SemanticSourceTrace {
  type: "project";
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  dateText: string;
  description: string;
  highlights: string[];
  techStack: string[];
  links: SemanticLink[];
}

export interface SemanticCertificationItem extends SemanticSourceTrace {
  type: "certification";
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
}

export interface SemanticLanguageItem extends SemanticSourceTrace {
  type: "language";
  name: string;
  level: string;
  score: string;
}

export interface SemanticOtherItem extends SemanticSourceTrace {
  type: "other";
  text: string;
}

export type SemanticItem =
  | SemanticParagraphItem
  | SemanticListItem
  | SemanticContactInfoItem
  | SemanticSkillGroupItem
  | SemanticEducationItem
  | SemanticExperienceItem
  | SemanticProjectItem
  | SemanticCertificationItem
  | SemanticLanguageItem
  | SemanticOtherItem;

export interface SemanticSection extends SemanticSourceTrace {
  title: string;
  type: SemanticSectionType;
  items: SemanticItem[];
}

export interface SemanticCvJson {
  contact: SemanticContact;
  sections: SemanticSection[];
}
