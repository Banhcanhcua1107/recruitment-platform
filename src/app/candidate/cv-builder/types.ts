
export type CVMode = 'template' | 'canvas';

export interface CVProfile {
  id: string;
  userId: string;
  title: string;
  mode: CVMode;
  thumbnailUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  content: CVContent;
}

export interface CVContent {
  meta: {
    templateId?: string; // e.g., 'modern-slate', 'minimalist'
    pageSize: 'A4' | 'Letter';
    version: string;
  };
  theme: {
    colors: {
      primary: string;
      secondary?: string;
      text: string;
      background: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    spacing: number; // Base multiplier (e.g., 4px)
  };
  // For Canvas mode, we might trust specific x/y. For Template, strict order.
  layout: {
    type: 'grid' | 'fixed';
    columns: number; // e.g., 12 or 24
  };
  sections: CVSection[];
}

export type SectionType = 
  | 'header' // New Header type
  | 'personal_info' 
  | 'summary' 
  | 'rich_outline'
  | 'experience_list' 
  | 'education_list' 
  | 'skill_list' 
  | 'project_list' 
  | 'award_list'
  | 'certificate_list'
  | 'custom_text'
  | 'custom_image';

export interface CVSection {
  id: string;
  type: SectionType;
  title?: string; // User-visible title (e.g., "Work History" instead of "experience_list")
  isVisible: boolean;
  
  // Layout Positioning (Block-based)
  containerId: string; // e.g., 'main-column' or 'sidebar-column'
  styles?: SectionStyles; // Renaming for clarity
  styleOverride?: SectionStyles; // User-specific overrides

  // The actual data payload. Discriminated union could be used here for stricter typing
  data: AnySectionData; 
  
}
  
 // Style definitions
 export interface SectionStyles {
   align?: 'left' | 'center' | 'right';
   backgroundColor?: string;
   textColor?: string;
   marginBottom?: number; // Spacing in px
   padding?: number; // Spacing in px
   [key: string]: string | number | boolean | undefined;
 }

// -- Specific Data Interfaces for standardized sections --

export interface HeaderData {
  fullName: string;
  title: string;
  avatarUrl?: string;
}

export interface PersonalInfoData {
  email: string;
  phone: string;
  address: string;
  dob?: string;
  socials?: { network: string; url: string }[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | 'Present';
  description: string; // HTML or Markdown
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
}

export interface SkillItem {
  id: string;
  name: string;
  level?: number; // 1-100
}

// -- Section Data Unions --

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string | 'Present';
  description: string;
  technologies: string; // "React, Node.js"
  link?: string;
  customer?: string;
  teamSize?: number;
}

export interface AwardItem {
  id: string;
  title: string;
  date: string;
  issuer: string;
  description: string;
}

export interface CertificateItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

// -- Section Data Unions --

export interface CertificateListSectionData {
  items: CertificateItem[];
}

export interface ExperienceListSectionData {
  items: ExperienceItem[];
}

export interface EducationListSectionData {
  items: EducationItem[];
}

export interface SkillListSectionData {
  items: SkillItem[];
}

export interface ProjectListSectionData {
  items: ProjectItem[];
}

export interface AwardListSectionData {
  items: AwardItem[];
}

export interface SummarySectionData {
  text: string;
}

export type RichOutlineNodeKind = 'heading' | 'bullet' | 'paragraph' | 'meta';

export interface RichOutlineNode {
  id: string;
  text: string;
  kind: RichOutlineNodeKind;
  children: RichOutlineNode[];
}

export interface RichOutlineSectionData {
  nodes: RichOutlineNode[];
}

export type AnySectionData = 
  | HeaderData
  | PersonalInfoData 
  | RichOutlineSectionData
  | ExperienceListSectionData 
  | EducationListSectionData 
  | SkillListSectionData
  | ProjectListSectionData
  | AwardListSectionData
  | CertificateListSectionData
  | SummarySectionData
  | Record<string, unknown>; // Fallback for custom sections
