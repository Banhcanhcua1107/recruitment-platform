// =============================================
// Profile Builder - TypeScript Types
// =============================================

// Section Types
export type SectionType =
  | 'personal_info'
  | 'summary'
  | 'skills'
  | 'languages'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'projects'
  | 'links'
  | 'career_goal';

// Section Metadata
export interface SectionMeta {
  id: SectionType;
  name: string;
  icon: string;
  description: string;
  category: 'basic' | 'skills' | 'experience' | 'other';
}

export const SECTION_DEFINITIONS: SectionMeta[] = [
  // Basic
  { id: 'personal_info', name: 'Thông tin cá nhân', icon: 'person', description: 'Họ tên, email, số điện thoại, địa chỉ', category: 'basic' },
  { id: 'summary', name: 'Giới thiệu bản thân', icon: 'article', description: 'Tóm tắt về bản thân và kinh nghiệm', category: 'basic' },
  { id: 'career_goal', name: 'Mục tiêu nghề nghiệp', icon: 'flag', description: 'Định hướng và mục tiêu sự nghiệp', category: 'basic' },
  
  // Skills
  { id: 'skills', name: 'Kỹ năng', icon: 'terminal', description: 'Kỹ năng chuyên môn và soft skills', category: 'skills' },
  { id: 'languages', name: 'Ngoại ngữ', icon: 'translate', description: 'Ngôn ngữ và trình độ', category: 'skills' },
  
  // Experience
  { id: 'experience', name: 'Kinh nghiệm làm việc', icon: 'work', description: 'Lịch sử công việc', category: 'experience' },
  { id: 'education', name: 'Học vấn', icon: 'school', description: 'Trường học và bằng cấp', category: 'experience' },
  { id: 'certifications', name: 'Chứng chỉ', icon: 'badge', description: 'Chứng chỉ và giấy phép', category: 'experience' },
  { id: 'projects', name: 'Dự án', icon: 'rocket_launch', description: 'Dự án cá nhân hoặc công việc', category: 'experience' },
  
  // Other
  { id: 'links', name: 'Liên kết', icon: 'link', description: 'LinkedIn, GitHub, Portfolio', category: 'other' },
];

// =============================================
// Content Types for each Section
// =============================================

export interface PersonalInfoContent {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other' | '';
  avatarUrl?: string;
}

export interface SummaryContent {
  content: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
}

export interface SkillsContent {
  skills: Skill[];
}

export interface Language {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'native';
  certification?: string;
}

export interface LanguagesContent {
  languages: Language[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string[];
}

export interface ExperienceContent {
  items: ExperienceItem[];
}

export interface EducationItem {
  id: string;
  school: string;
  major: string;
  degree: string;
  startYear: number;
  endYear?: number;
  gpa?: string;
}

export interface EducationContent {
  items: EducationItem[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  url?: string;
}

export interface CertificationsContent {
  items: CertificationItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectsContent {
  items: ProjectItem[];
}

export interface LinkItem {
  id: string;
  type: 'linkedin' | 'github' | 'portfolio' | 'other';
  url: string;
  label?: string;
}

export interface LinksContent {
  items: LinkItem[];
}

export interface CareerGoalContent {
  content: string;
}

// Union type for all content types
export type SectionContent =
  | PersonalInfoContent
  | SummaryContent
  | SkillsContent
  | LanguagesContent
  | ExperienceContent
  | EducationContent
  | CertificationsContent
  | ProjectsContent
  | LinksContent
  | CareerGoalContent;

// =============================================
// Section & Document Types
// =============================================

export interface Section<T extends SectionContent = SectionContent> {
  id: string;
  type: SectionType;
  order: number;
  isHidden: boolean;
  content: T;
}

export interface ProfileDocumentMeta {
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileDocument {
  meta: ProfileDocumentMeta;
  sections: Section[];
}

export interface CandidateProfile {
  id: string;
  userId: string;
  document: ProfileDocument;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Default Content Factories
// =============================================

export function getDefaultContent(type: SectionType): SectionContent {
  switch (type) {
    case 'personal_info':
      return {
        fullName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: '',
      } as PersonalInfoContent;
    
    case 'summary':
      return { content: '' } as SummaryContent;
    
    case 'skills':
      return { skills: [] } as SkillsContent;
    
    case 'languages':
      return { languages: [] } as LanguagesContent;
    
    case 'experience':
      return { items: [] } as ExperienceContent;
    
    case 'education':
      return { items: [] } as EducationContent;
    
    case 'certifications':
      return { items: [] } as CertificationsContent;
    
    case 'projects':
      return { items: [] } as ProjectsContent;
    
    case 'links':
      return { items: [] } as LinksContent;
    
    case 'career_goal':
      return { content: '' } as CareerGoalContent;
    
    default:
      return { content: '' } as CareerGoalContent;
  }
}

// =============================================
// Helper Functions
// =============================================

export function createEmptyDocument(): ProfileDocument {
  return {
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    sections: [],
  };
}

export function isSectionEmpty(section: Section): boolean {
  const { content, type } = section;
  
  switch (type) {
    case 'personal_info': {
      const c = content as PersonalInfoContent;
      return !c.fullName && !c.email && !c.phone && !c.address && !c.dateOfBirth && !c.gender && !c.avatarUrl;
    }
    case 'summary':
    case 'career_goal': {
      const c = content as SummaryContent;
      return !c.content?.trim();
    }
    case 'skills': {
      const c = content as SkillsContent;
      return c.skills.length === 0;
    }
    case 'languages': {
      const c = content as LanguagesContent;
      return c.languages.length === 0;
    }
    case 'experience':
    case 'education':
    case 'certifications':
    case 'projects':
    case 'links': {
      const c = content as { items: unknown[] };
      return c.items.length === 0;
    }
    default:
      return true;
  }
}

export function getSectionMeta(type: SectionType): SectionMeta | undefined {
  return SECTION_DEFINITIONS.find(s => s.id === type);
}
