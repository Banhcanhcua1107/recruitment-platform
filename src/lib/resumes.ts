/**
 * CV Builder resume domain service.
 * This module is intentionally scoped to the CV Builder workflow and does not
 * define the canonical ATS/runtime contract used by public jobs, candidate ATS
 * profile, applications, or HR recruitment flows.
 */

import "server-only";

import { createClient } from "@/utils/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  category: string;
  is_premium: boolean;
  default_styling: Record<string, unknown>;
  structure_schema: BlockDef[];
  created_at: string;
  updated_at: string;
}

export interface ResumeRow {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  resume_data: ResumeBlock[];
  current_styling: Record<string, unknown>;
  is_public: boolean;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  template?: Pick<TemplateRow, "name" | "structure_schema" | "default_styling" | "thumbnail_url"> | null;
}

export interface BlockDef {
  block_id: string;
  block_type: "header" | "personal_info" | "rich_text" | "list" | "tag_list";
  label: string;
  is_required: boolean;
  icon: string;
  fields?: FieldDef[];
  item_fields?: FieldDef[];
}

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface ResumeBlock {
  block_id: string;
  is_visible: boolean;
  data: Record<string, unknown>;
}

export function mapSectionsToResumeBlocks(
  sections: Array<{
    type: string;
    isVisible: boolean;
    data: unknown;
  }>
): ResumeBlock[] {
  return sections.map((section) => ({
    block_id: section.type,
    is_visible: section.isVisible,
    data: (section.data ?? {}) as Record<string, unknown>,
  }));
}

// ─── Templates ────────────────────────────────────────────────────────────────

/** Lấy tất cả templates hệ thống */
export async function getTemplates(): Promise<TemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một template theo ID */
export async function getTemplateById(id: string): Promise<TemplateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

/** Lấy danh sách CV của user hiện tại */
export async function getMyResumes(): Promise<ResumeRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling, thumbnail_url)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một resume theo ID */
export async function getResumeById(id: string): Promise<ResumeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling, thumbnail_url)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

// ─── Sample data for known templates ───────────────────────────────────────
// Khi tạo CV mới từ template, ta pre-fill dữ liệu mẫu để user chỉ cần thay tên/mô tả
const F8_GREEN_SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  header: {
    fullName: "Nguyen Van A",
    title: "Fullstack Developer",
    avatarUrl: "/avatars/default-avatar.png",
  },
  personal_info: {
    email: "nguyenvana@gmail.com",
    phone: "+84 1234567890",
    address: "Ha Noi, Viet Nam",
    dob: "01/01/2000",
  },
  summary: {
    text: "Fullstack Developer with over 2 years of experience building and maintaining web applications across frontend and backend systems. Strong foundation in HTML, CSS, JavaScript, ReactJS, PHP, and RESTful APIs, with practical experience in MySQL, NoSQL, Docker, Redis, and AWS services. Comfortable working in fast-paced environments, learning new technologies quickly, and collaborating to deliver scalable and maintainable solutions.",
  },
  experience_list: {
    items: [
      {
        id: "exp-1",
        company: "F8 TECHNOLOGY EDUCATION.,JSC",
        position: "Fullstack Developer",
        startDate: "01/2018",
        endDate: "Present",
        description: "- Participated in outsourcing software projects for different business domains.\n- Developed frontend and backend features based on project requirements.\n- Designed coding structures and database schemas from project descriptions.\n- Worked on application maintenance, feature enhancement, and system optimization.",
      },
      {
        id: "exp-2",
        company: "AI&T JSC",
        position: "Fullstack Developer",
        startDate: "07/2015",
        endDate: "03/2018",
        description: "- Worked on outsourcing software projects.\n- Developed web application modules for both frontend and backend.\n- Created coding frameworks and database designs based on project requirements.",
      },
      {
        id: "exp-3",
        company: "FREELANCER",
        position: "Fullstack Developer",
        startDate: "01/2015",
        endDate: "07/2015",
        description: "- Developed web modules for client and personal projects.\n- Implemented frontend and backend features according to project needs.",
      },
    ],
  },
  skill_list: {
    items: [
      { id: "skill-1", name: "Frontend: HTML, CSS, JavaScript, ReactJS, React Native, DOM manipulation", level: 90 },
      { id: "skill-2", name: "Backend: PHP, RESTful APIs, GraphQL, JSON API integration", level: 88 },
      { id: "skill-3", name: "Database: MySQL, NoSQL, Redis", level: 82 },
      { id: "skill-4", name: "DevOps: Docker, Kubernetes, Rancher, AWS services", level: 80 },
      { id: "skill-5", name: "Tools: Git, SVN", level: 78 },
      { id: "skill-6", name: "Other: Good understanding of ReactJS principles and workflows", level: 76 },
      { id: "skill-7", name: "Other: Familiar with EcmaScript specifications", level: 74 },
      { id: "skill-8", name: "Other: Experience with data structure libraries", level: 72 },
      { id: "skill-9", name: "Other: Able to learn and apply new technologies quickly", level: 78 },
      { id: "skill-10", name: "Other: Comfortable working on Linux, OSX, and Windows", level: 75 },
    ],
  },
  project_list: {
    items: [
      {
        id: "proj-1",
        name: "MYCV.VN",
        role: "Developer",
        startDate: "06/2018",
        endDate: "Present",
        customer: "MyCV JSC",
        teamSize: 1,
        technologies: "ReactJS, PHP (Laravel, Lumen), NodeJS, Apache Kafka, WebSocket, MongoDB, MariaDB, Redis, Docker, AWS EC2, AWS S3, Microservice architecture, Event-driven architecture, SSO, K8S",
        description: "Standard CV writing application with free PDF download support. Responsibilities: Developer, Solution architect.",
      },
      {
        id: "proj-2",
        name: "BOTAYRA.FULLSTACK.EDU.VN",
        role: "Developer",
        startDate: "05/2020",
        endDate: "06/2020",
        customer: "MyCV JSC",
        teamSize: 1,
        technologies: "ReactJS, TensorFlow",
        description: "A machine learning based application that helps users avoid touching their face using webcam tracking. Responsibilities: Developer.",
      },
      {
        id: "proj-3",
        name: "FOODHUB.VN",
        role: "Fullstack Developer",
        startDate: "10/2017",
        endDate: "01/2018",
        customer: "O'Green Food",
        teamSize: 2,
        technologies: "React Native, PHP, CodeIgniter, MariaDB, Memcached",
        description: "Application for connecting organic food store chains. Responsibilities: Built frontend, Built backend.",
      },
      {
        id: "proj-4",
        name: "SIEU-DAO-CHICH GAME",
        role: "Developer",
        startDate: "09/2016",
        endDate: "12/2016",
        customer: "Personal project",
        teamSize: 1,
        technologies: "HTML, CSS, jQuery, PHP, Symfony, MariaDB, Memcached, Raspberry Pi 2, IP Camera, Sensors",
        description: "Remote control online game via computer using IoT. Responsibilities: Built frontend, Built backend, Built hardware integration.",
      },
    ],
  },
};

// Alias: DB block_id cũ → frontend SectionType
// DB có thể dùng "experience" hoặc "experience_list", cả 2 đều cần map được
const BLOCK_ID_TO_SAMPLE_KEY: Record<string, string> = {
  contact: 'personal_info',
  experience: 'experience_list',
  education: 'education_list',
  skills: 'skill_list',
  awards: 'award_list',
  projects: 'project_list',
};

// Map template_id → sample data
const TEMPLATE_SAMPLE_DATA: Record<string, Record<string, Record<string, unknown>>> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": F8_GREEN_SAMPLE_DATA,
};

/** Tạo CV mới từ template */
export async function createResume(
  templateId: string,
  title: string = "CV của tôi"
): Promise<ResumeRow | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn cần đăng nhập để tạo CV");

  // Fetch template để lấy structure_schema và default_styling
  const template = await getTemplateById(templateId);
  if (!template) throw new Error("Template không tồn tại");

  // Lấy sample data nếu có (pre-fill dữ liệu mẫu cho template đã biết)
  const sampleData = TEMPLATE_SAMPLE_DATA[templateId];

  // Khởi tạo resume_data từ structure_schema (có sample data nếu template được hỗ trợ)
  const initialResumeData: ResumeBlock[] = template.structure_schema.map((block) => {
    // Tìm sample data: thử block_id gốc trước, rồi thử alias
    const sampleKey = BLOCK_ID_TO_SAMPLE_KEY[block.block_id] || block.block_id;
    const blockData = sampleData?.[block.block_id] ?? sampleData?.[sampleKey];
    return {
      block_id: block.block_id,
      is_visible: true,
      data: blockData
        ?? (block.block_type === "list" || block.block_type === "tag_list"
          ? { items: [] }
          : {}),
    };
  });

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      template_id: templateId,
      title,
      resume_data: initialResumeData,
      current_styling: template.default_styling,
    })
    .select("*, template:templates(name, structure_schema, default_styling)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Auto-save nội dung resume (debounced từ phía caller) */
export async function saveResume(
  id: string,
  updates: {
    title?: string;
    resume_data?: ResumeBlock[];
    current_styling?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Xóa resume */
export async function deleteResume(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Đổi tên resume */
export async function renameResume(id: string, title: string): Promise<void> {
  await saveResume(id, { title });
}

export async function createResumeFromSections(
  sections: Array<{
    type: string;
    isVisible: boolean;
    data: unknown;
  }>,
  options?: {
    title?: string;
    templateId?: string | null;
  }
): Promise<ResumeRow | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn cần đăng nhập để lưu CV");

  const templateId = options?.templateId ?? null;
  let currentStyling: Record<string, unknown> = {
    editorTemplateId: templateId,
  };

  if (templateId) {
    const template = await getTemplateById(templateId);
    currentStyling = {
      ...(template?.default_styling ?? {}),
      editorTemplateId: templateId,
    };
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      template_id: templateId || undefined,
      title: options?.title || "CV từ OCR",
      resume_data: mapSectionsToResumeBlocks(sections),
      current_styling: currentStyling,
    })
    .select("*, template:templates(name, structure_schema, default_styling, thumbnail_url)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

