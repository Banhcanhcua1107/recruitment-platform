/**
 * CV Builder API Layer
 * All Supabase CRUD operations for templates and resumes
 */

import { createClient } from "@/utils/supabase/client";

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
  created_at: string;
  updated_at: string;
  // joined
  template?: Pick<TemplateRow, "name" | "structure_schema" | "default_styling"> | null;
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

// ─── Templates ────────────────────────────────────────────────────────────────

/** Lấy tất cả templates hệ thống */
export async function getTemplates(): Promise<TemplateRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một template theo ID */
export async function getTemplateById(id: string): Promise<TemplateRow | null> {
  const supabase = createClient();
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lấy một resume theo ID */
export async function getResumeById(id: string): Promise<ResumeRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*, template:templates(name, structure_schema, default_styling)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

// ─── Sample data for known templates ───────────────────────────────────────
// Khi tạo CV mới từ template, ta pre-fill dữ liệu mẫu để user chỉ cần thay tên/mô tả
const F8_GREEN_SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  header: {
    fullName: "Nguyễn Văn A",
    title: "Lập trình viên Fullstack",
    avatarUrl: "/avatars/default-avatar.png",
  },
  personal_info: {
    email: "nguyenvana@gmail.com",
    phone: "+84 1234567890",
    address: "Hà Nội, Việt Nam",
    dob: "01/01/2000",
  },
  summary: {
    text: "- Hơn 2 năm kinh nghiệm lập trình với kỹ năng giao tiếp tốt và khả năng học hỏi nhanh\n- Thế mạnh: Phát triển Front-end và Back-end ứng dụng web\n- Thành thạo HTML, CSS, JavaScript\n- Nắm vững JavaScript, bao gồm thao tác DOM và mô hình đối tượng JavaScript\n- Hiểu sâu về React.js và các nguyên tắc cốt lõi\n- Có kinh nghiệm với các luồng công việc React.js phổ biến (như Flux hoặc Redux)\n- Quen thuộc với các đặc tả mới của EcmaScript\n- Có kinh nghiệm với các thư viện cấu trúc dữ liệu\n- Quen thuộc với RESTful APIs\n- Kinh nghiệm mạnh về: PHP, JavaScript (ReactJS, React-native), MySQL, NoSQL, GraphQL, Redis, JSON, API, Docker, Kubernetes, Rancher, dịch vụ AWS\n- Sử dụng thành thạo các công cụ quản lý mã nguồn: SVN, GIT\n- Thành thạo hệ điều hành: Linux (Ubuntu, OSX), Windows\n- Khả năng học hỏi và áp dụng công nghệ mới nhanh chóng\n- Địa điểm làm việc hiện tại: Hà Nội, Việt Nam",
  },
  experience_list: {
    items: [
      { id: "exp-1", company: "CÔNG TY CỔ PHẦN GIÁO DỤC CÔNG NGHỆ F8", position: "Lập trình viên Fullstack", startDate: "01/2018", endDate: "Hiện tại", description: "- Lập trình các dự án outsourcing\n- Xây dựng khung mã nguồn và thiết kế cơ sở dữ liệu dựa trên mô tả dự án" },
      { id: "exp-2", company: "CÔNG TY CỔ PHẦN AI&T", position: "Lập trình viên Fullstack", startDate: "07/2015", endDate: "03/2018", description: "- Lập trình các dự án outsourcing\n- Xây dựng khung mã nguồn và thiết kế cơ sở dữ liệu dựa trên mô tả dự án" },
      { id: "exp-3", company: "LÀM VIỆC TỰ DO", position: "Lập trình viên Fullstack", startDate: "01/2015", endDate: "07/2015", description: "- Phát triển module web cho các dự án được giao." },
    ],
  },
  education_list: {
    items: [
      { id: "edu-1", institution: "Cao đẳng FPT Polytechnic", degree: "Chuyên ngành - Lập trình Web, Di động", startDate: "10/2011", endDate: "09/2014" },
    ],
  },
  skill_list: {
    items: [
      { id: "skill-1", name: "HTML, CSS, JavaScript (ReactJS, React-Native, Lit)", level: 95 },
      { id: "skill-2", name: "PHP (Laravel, Symfony, Codeigniter, Yii)", level: 90 },
      { id: "skill-3", name: "Node (ExpressJS)", level: 85 },
      { id: "skill-4", name: "RESTful API, GraphQL", level: 85 },
      { id: "skill-5", name: "MySQL, PostgreSQL, NoSQL (MongoDB)", level: 80 },
      { id: "skill-6", name: "Server (Apache, Nginx, Redis, Memcached, Queue, Log, Cronjob...), Rancher, K8S, Docker", level: 80 },
      { id: "skill-7", name: "AWS (Load balancing, EC2, ECS, Router 53, RDS, S3)", level: 75 },
      { id: "skill-8", name: "Ruby (Ruby on Rails)", level: 60 },
      { id: "skill-9", name: "SVN, Git", level: 85 },
      { id: "skill-10", name: "Python (Selenium kiểm thử tự động, crawler)", level: 60 },
      { id: "skill-11", name: "Elasticsearch", level: 60 },
      { id: "skill-12", name: "Tensorflow", level: 40 },
    ],
  },
  award_list: {
    items: [
      { id: "aw-1", title: "Cuộc thi Sáng tạo Poly 2016", date: "06/2016", issuer: "Cuộc thi Sáng tạo Poly 2016", description: 'Giải nhất trong 2 cuộc thi "Sáng tạo POLY & FE Bắc - Trung - Nam". Giải Nhất.' },
      { id: "aw-2", title: "Cuộc thi Sáng tạo FE 2016", date: "08/2016", issuer: "Cuộc thi Sáng tạo FE 2016", description: "Cuộc thi sáng tạo FE" },
      { id: "aw-3", title: "Nhân viên xuất sắc AI&T JSC", date: "02/2016", issuer: "AI&T JSC", description: "Giải thưởng Nhân viên xuất sắc" },
    ],
  },
  project_list: {
    items: [
      { id: "proj-1", name: "FULLSTACK.EDU.VN", role: "Chủ sản phẩm, BA, Lập trình viên, Tester, Biên tập video", startDate: "01/2019", endDate: "Hiện tại", customer: "CÔNG TY CỔ PHẦN GIÁO DỤC CÔNG NGHỆ F8", teamSize: 1, technologies: "Frontend: ReactJS\nBackend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3\nKiến trúc: Microservice - Event driven (triển khai với K8S), Websocket, SSO", description: "Học lập trình trực tuyến (https://f8.edu.vn)" },
      { id: "proj-2", name: "MYCV.VN", role: "Lập trình viên", startDate: "06/2018", endDate: "Hiện tại", customer: "Công ty MyCV.", teamSize: 1, technologies: "Frontend: ReactJS\nBackend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3\nKiến trúc: Microservice - Event driven (triển khai với K8S), Websocket, SSO", description: "Ứng dụng viết CV chuẩn, luôn hỗ trợ tải PDF miễn phí (https://mycv.vn)" },
      { id: "proj-3", name: "BOTAYRA.FULLSTACK.EDU.VN", role: "Lập trình viên", startDate: "05/2020", endDate: "06/2020", customer: "Công ty MyCV.", teamSize: 1, technologies: "Frontend: ReactJS, Tensorflow", description: "Công cụ giúp bạn tránh chạm tay lên mặt sử dụng webcam và machine learning" },
      { id: "proj-4", name: "FOODHUB.VN", role: "Lập trình viên Fullstack", startDate: "10/2017", endDate: "01/2018", customer: "O'Green Food", teamSize: 2, technologies: "Frontend: Web + App (React-Native)\nBackend: PHP - Codeigniter, MariaDB, Memcached", description: "Ứng dụng kết nối chuỗi cửa hàng thực phẩm sạch (https://www.foodhub.vn/)" },
      { id: "proj-5", name: "GAME SIÊU ĐẠO CHÍCH", role: "Lập trình viên", startDate: "09/2016", endDate: "12/2016", customer: "Dự án cá nhân", teamSize: 1, technologies: "Frontend: HTML, CSS, Jquery\nBackend: PHP - Symfony, MariaDB, Memcached\nKhác: Raspberry Pi 2, 6 camera IP & các cảm biến, thiết bị phần cứng khác", description: "Game điều khiển từ xa trực tuyến qua máy tính sử dụng IoT" },
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
  const supabase = createClient();
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
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Xóa resume */
export async function deleteResume(id: string): Promise<void> {
  const supabase = createClient();
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
