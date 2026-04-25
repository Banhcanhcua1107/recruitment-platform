import type { SectionType } from "@/app/candidate/cv-builder/types";
import { listTemplateRegistry } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/template-config";

export const TEMPLATE_FILTERS = [
  "Tất cả",
  "Chuyên nghiệp",
  "Tối giản",
  "Hiện đại",
  "ATS",
  "Sáng tạo",
] as const;

export type TemplateFilterOption = (typeof TEMPLATE_FILTERS)[number];
export type TemplateCategory = Exclude<TemplateFilterOption, "Tất cả">;
export type TemplateBadge = "Miễn phí" | "PRO";

export interface TemplateSectionDraft {
  type: SectionType;
  title?: string;
  isVisible: boolean;
  data: Record<string, unknown>;
}

export interface TemplateDefaultCVData {
  resumeTitle: string;
  sections: TemplateSectionDraft[];
}

export interface TemplateStyles {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: number;
}

export interface CVTemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  badge: TemplateBadge;
  isPro: boolean;
  thumbnail: string;
  previewImages: string[];
  description: string;
  tags: string[];
  defaultCVData: TemplateDefaultCVData;
  templateStyles: TemplateStyles;
}

const ENABLED_TEMPLATE_IDS = new Set([
  "teal-timeline",
  "teal-pro-two-column",
  "emerald-sidebar-reference",
  "modern-professional",
  "creative-sidebar",
  "minimal-elegant",
]);

function normalizeLabel(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function mapCategory(label: string): TemplateCategory {
  const normalized = normalizeLabel(label);

  if (normalized === "ats") {
    return "ATS";
  }

  if (normalized.includes("sang") && normalized.includes("tao")) {
    return "Sáng tạo";
  }

  if (normalized.includes("toi") && normalized.includes("gian")) {
    return "Tối giản";
  }

  if (normalized.includes("hien") && normalized.includes("dai")) {
    return "Hiện đại";
  }

  return "Chuyên nghiệp";
}

function resolveTemplateBadge(templateId: string): TemplateBadge {
  return templateId === "teal-pro-two-column" ? "PRO" : "Miễn phí";
}

function buildTealTimelineSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Trần Minh Khải",
        title: "Kỹ sư Fullstack Cấp cao",
        avatarUrl: "/avatars/default-avatar.png",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "khai.tran.dev@gmail.com",
        phone: "+84 903 456 218",
        address: "Quận 7, TP. Hồ Chí Minh",
        dob: "12/10/1995",
      },
    },
    {
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      data: {
        text:
          "Kỹ sư Fullstack với hơn 7 năm kinh nghiệm phát triển sản phẩm SaaS quy mô lớn.\n- Thiết kế kiến trúc module CV Builder dạng schema-driven với khả năng mở rộng linh hoạt.\n- Tối ưu hệ thống backend giảm khoảng 40% độ trễ p95 trên các API quan trọng.\n- Dẫn dắt nhóm liên chức năng để cải thiện chất lượng phát hành và độ tin cậy vận hành.",
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-1",
            company: "TalentFlow Technologies",
            position: "Kỹ sư Fullstack Cấp cao",
            startDate: "04/2022",
            endDate: "Hiện tại",
            description:
              "- Dẫn dắt triển khai các module cốt lõi cho nền tảng tuyển dụng.\n- Xây dựng pipeline preview CV chính xác theo template.\n- Mentoring kỹ sư mới và chuẩn hóa checklist code review.",
          },
          {
            id: "exp-2",
            company: "BlueOrbit SaaS",
            position: "Lập trình viên Fullstack",
            startDate: "08/2019",
            endDate: "03/2022",
            description:
              "- Phát triển lõi billing/subscription bằng Node.js và PostgreSQL.\n- Di trú frontend sang React + TypeScript, tăng tốc độ release từ tháng xuống tuần.",
          },
          {
            id: "exp-3",
            company: "Nexa Commerce",
            position: "Kỹ sư Frontend",
            startDate: "07/2017",
            endDate: "07/2019",
            description:
              "- Phát triển dashboard vận hành cho hệ thống thương mại điện tử.\n- Tối ưu bundle và critical rendering path, cải thiện rõ rệt điểm Lighthouse.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      data: {
        items: [
          {
            id: "proj-1",
            name: "TalentFlow Recruitment Platform",
            role: "Fullstack Developer",
            startDate: "2023-01",
            endDate: "Hiện tại",
            customer: "Sản phẩm nội bộ",
            teamSize: 9,
            technologies: "Next.js, TypeScript, Supabase, PostgreSQL, Redis",
            description:
              "Xây nền tảng tuyển dụng end-to-end gồm CV Builder, dashboard nhà tuyển dụng và hệ thống gợi ý ứng viên.",
          },
          {
            id: "proj-2",
            name: "Subscription Billing Core",
            role: "Backend Developer",
            startDate: "2021-02",
            endDate: "2021-12",
            customer: "BlueOrbit Enterprise",
            teamSize: 5,
            technologies: "Node.js, PostgreSQL, Redis, RabbitMQ",
            description:
              "Xây hệ thống tính cước theo usage với cơ chế retry callback và audit log phục vụ vận hành.",
          },
        ],
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: [
          { id: "skill-1", name: "TypeScript, JavaScript, React, Next.js" },
          { id: "skill-2", name: "Node.js, NestJS, thiết kế REST API" },
          { id: "skill-3", name: "PostgreSQL, Supabase, Redis" },
          { id: "skill-4", name: "Docker, CI/CD, giám sát hệ thống" },
          { id: "skill-5", name: "Testing với Vitest, Playwright" },
          { id: "skill-6", name: "Kỹ năng mentoring và phối hợp liên phòng ban" },
        ],
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-1",
            institution: "Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
            degree: "Kỹ sư Công nghệ Phần mềm",
            startDate: "2013",
            endDate: "2017",
          },
        ],
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-1",
            name: "AWS Certified Developer - Associate",
            issuer: "Amazon Web Services",
            date: "08/2023",
            url: "https://www.credly.com/",
          },
          {
            id: "cert-2",
            name: "Professional Scrum Master I",
            issuer: "Scrum.org",
            date: "03/2022",
            url: "https://www.scrum.org/",
          },
        ],
      },
    },
  ];
}

function buildTealTwoColumnSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Nguyễn Minh Quân",
        title: "Kỹ sư Fullstack",
        avatarUrl: "/avatars/default-avatar.png",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "minhquan.dev@gmail.com",
        phone: "+84 938 456 201",
        address: "Quận 3, TP. Hồ Chí Minh",
        dob: "12/08/1997",
      },
    },
    {
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      data: {
        text:
          "Kỹ sư Fullstack tập trung xây dựng sản phẩm tuyển dụng và hệ thống nội bộ cho doanh nghiệp.\n- Kinh nghiệm triển khai kiến trúc hai cột cho CV Builder với dữ liệu động.\n- Từng tối ưu API và truy vấn giúp cải thiện hiệu năng backend rõ rệt.\n- Ưu tiên code dễ bảo trì, kiểm thử tốt và bàn giao rõ ràng cho đội ngũ.",
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: [
          { id: "skill-vn-1", name: "Frontend: React, Next.js, TypeScript" },
          { id: "skill-vn-2", name: "Backend: Node.js, NestJS, WebSocket" },
          { id: "skill-vn-3", name: "Database: PostgreSQL, Supabase, Redis" },
          { id: "skill-vn-4", name: "Vận hành: Docker, CI/CD" },
          { id: "skill-vn-5", name: "Kỹ năng mềm: mentoring, giao tiếp" },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Ngôn ngữ",
      isVisible: true,
      data: {
        text: "- Tiếng Việt: Bản ngữ\n- Tiếng Anh: Làm việc chuyên nghiệp (IELTS 7.0)",
      },
    },
    {
      type: "award_list",
      title: "Giải thưởng",
      isVisible: true,
      data: {
        items: [
          {
            id: "award-vn-1",
            title: "Engineering Excellence Award",
            issuer: "TalentFlow",
            date: "2024",
            description: "Ghi nhận đóng góp cải tiến kiến trúc CV Builder và độ ổn định hệ thống.",
          },
        ],
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-vn-1",
            company: "TalentFlow Technologies",
            position: "Kỹ sư Fullstack",
            startDate: "03/2022",
            endDate: "Hiện tại",
            description:
              "- Phát triển CV Builder theo kiến trúc schema-driven với nhiều template động.\n- Tối ưu API tuyển dụng, giảm độ trễ phản hồi ở các endpoint trọng yếu.\n- Thiết lập quy trình kiểm thử hồi quy trước mỗi đợt phát hành.",
          },
          {
            id: "exp-vn-2",
            company: "BlueOrbit SaaS",
            position: "Lập trình viên Fullstack",
            startDate: "07/2019",
            endDate: "02/2022",
            description:
              "- Xây module thanh toán subscription và quản lý vòng đời gói dịch vụ.\n- Di trú frontend sang React + TypeScript, rút ngắn đáng kể chu kỳ release.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án nổi bật",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-vn-1",
            name: "TalentFlow Recruitment Platform",
            role: "Fullstack Developer",
            startDate: "2023-01",
            endDate: "Hiện tại",
            customer: "Sản phẩm nội bộ",
            teamSize: 8,
            technologies: "Next.js, TypeScript, Supabase, PostgreSQL, Redis",
            description:
              "Xây dựng nền tảng tuyển dụng end-to-end gồm CV Builder, dashboard HR và hệ thống gợi ý ứng viên.",
          },
          {
            id: "project-vn-2",
            name: "Subscription Billing Core",
            role: "Backend Developer",
            startDate: "2021-02",
            endDate: "2021-12",
            customer: "BlueOrbit Enterprise",
            teamSize: 5,
            technologies: "Node.js, PostgreSQL, Redis, RabbitMQ",
            description: "Xây lõi tính cước theo usage và đồng bộ callback thanh toán với cơ chế retry.",
          },
        ],
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-vn-1",
            institution: "Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
            degree: "Kỹ sư Công nghệ Phần mềm",
            startDate: "2015",
            endDate: "2019",
          },
        ],
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-vn-1",
            name: "AWS Certified Developer - Associate",
            issuer: "Amazon Web Services",
            date: "2023",
            url: "https://www.credly.com/",
          },
          {
            id: "cert-vn-2",
            name: "Professional Scrum Master I",
            issuer: "Scrum.org",
            date: "2022",
            url: "https://www.scrum.org/",
          },
        ],
      },
    },
  ];
}

function buildEmeraldSidebarSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Lê Chiến",
        title: "Lập trình viên",
        avatarUrl: "",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "hotro@tocpv.vn",
        phone: "(+024) 0800 1118",
        address: "Quận Đống Đa, Hà Nội",
        dob: "24/09/1997",
      },
    },
    {
      type: "summary",
      title: "Mục tiêu nghề nghiệp",
      isVisible: true,
      data: {
        text:
          "Với 6 năm kinh nghiệm, tôi tập trung xây dựng sản phẩm web vận hành ổn định và dễ mở rộng.",
        items: [
          { id: "obj-1", content: "Từng dẫn dắt nhóm 3-5 người trong các dự án số hóa nội bộ." },
          { id: "obj-2", content: "Mục tiêu 2 năm tới là trở thành Lead giỏi về hiệu năng và chất lượng." },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Mục tiêu ngắn hạn",
      isVisible: true,
      data: {
        text: "Đóng góp vào sản phẩm có hàng triệu người dùng và tối ưu trải nghiệm ứng viên trên mọi thiết bị.",
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: [
          { id: "skill-e-1", name: "Kỹ năng giao tiếp", level: 88 },
          { id: "skill-e-2", name: "Kỹ năng phản biện", level: 80 },
          { id: "skill-e-3", name: "Kỹ năng thuyết trình", level: 75 },
          { id: "skill-e-4", name: "React, Next.js, TypeScript" },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Sở thích",
      isVisible: true,
      data: {
        text: "- Đọc sách\n- Nấu ăn\n- Du lịch",
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-e-1",
            institution: "Đại học TopCV",
            degree: "Công nghệ thông tin",
            startDate: "2014",
            endDate: "2017",
          },
        ],
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-e-1",
            company: "Công ty TNHH MTV SVT",
            position: "Front End Developer",
            startDate: "2021",
            endDate: "2024",
            description:
              "- Quản lý và chuẩn hóa tiến trình trạng web từ thiết kế đến bảo trì.\n- Tối ưu khả năng tương thích trên nhiều trình duyệt và nền tảng.\n- Phối hợp team backend để nâng hiệu suất trang.",
          },
          {
            id: "exp-e-2",
            company: "Công ty CP công nghệ NDS",
            position: "Flutter Developer",
            startDate: "2019",
            endDate: "2021",
            description:
              "- Phát triển ứng dụng mobile trên iOS và Android.\n- Làm việc với team thiết kế để đảm bảo tính nhất quán UI/UX.\n- Chủ động cải tiến quy trình phát triển sprint.",
          },
          {
            id: "exp-e-3",
            company: "Công ty Cổ phần CV",
            position: "Web Developer",
            startDate: "2017",
            endDate: "2019",
            description:
              "- Xây dựng landing page và hệ thống quản trị nội dung.\n- Thực hiện tối ưu SEO kỹ thuật cho các website tuyển dụng.",
          },
        ],
      },
    },
    {
      type: "award_list",
      title: "Danh hiệu và giải thưởng",
      isVisible: true,
      data: {
        items: [
          {
            id: "award-e-1",
            title: "Nhân viên xuất sắc năm công ty NTD",
            issuer: "NTD",
            date: "2023",
            description: "Ghi nhận đóng góp nổi bật cho hiệu năng nền tảng tuyển dụng.",
          },
          {
            id: "award-e-2",
            title: "Nhân viên cống hiến của năm DEF",
            issuer: "DEF",
            date: "2020",
            description: "Được vinh danh nhờ cải thiện độ ổn định release toàn team.",
          },
        ],
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-e-1",
            name: "PHP, MySQL, JavaScript",
            issuer: "Nền tảng học trực tuyến",
            date: "2016",
          },
          {
            id: "cert-e-2",
            name: "Laravel, React, Linux, Redis",
            issuer: "Nền tảng học trực tuyến",
            date: "2018",
          },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Hoạt động",
      isVisible: true,
      data: {
        items: [
          {
            id: "activity-e-1",
            name: "Mentor Cộng đồng Frontend VN",
            role: "Mentor",
            startDate: "2022",
            endDate: "Hiện tại",
            description: "Hỗ trợ review CV và định hướng lộ trình frontend cho sinh viên mới ra trường.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án nổi bật",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-e-1",
            name: "TalentFlow Recruitment Platform",
            role: "Frontend Engineer",
            startDate: "2024-01",
            endDate: "Hiện tại",
            technologies: "Next.js, TypeScript, TailwindCSS, Supabase",
            description: "Tối ưu UI CV Builder và dashboard candidate, giảm đáng kể thời gian hoàn thiện hồ sơ.",
          },
        ],
      },
    },
  ];
}

function buildModernProfessionalSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Phạm Nhật Minh",
        title: "Senior Fullstack Engineer",
        avatarUrl: "/avatars/default-avatar.png",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "nhatminh.engineer@gmail.com",
        phone: "+84 978 012 365",
        address: "Quận Bình Thạnh, TP. Hồ Chí Minh",
        dob: "07/11/1994",
      },
    },
    {
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      data: {
        text:
          "Kỹ sư Fullstack hơn 8 năm kinh nghiệm triển khai sản phẩm SaaS và nền tảng dữ liệu tuyển dụng.",
        items: [
          { id: "summary-mp-1", content: "Dẫn dắt kiến trúc frontend cho CV Builder đa template với live preview." },
          { id: "summary-mp-2", content: "Tối ưu backend API, giảm mạnh độ trễ p95 trên các luồng ứng tuyển." },
          { id: "summary-mp-3", content: "Xây quy trình release và kiểm thử hồi quy ổn định cho đội kỹ thuật." },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Mục tiêu nghề nghiệp",
      isVisible: true,
      data: {
        text: "Trong 2 năm tới, tập trung phát triển năng lực Tech Lead để dẫn dắt đội sản phẩm đa chức năng.",
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-mp-1",
            company: "TalentFlow Technologies",
            position: "Senior Fullstack Engineer",
            startDate: "2022",
            endDate: "Hiện tại",
            description:
              "- Thiết kế kiến trúc schema-driven cho CV Builder và editor pipeline.\n- Chuẩn hóa API tuyển dụng cho candidate và recruiter workspace.\n- Mentoring kỹ sư mới và xây checklist quality gate trước release.",
          },
          {
            id: "exp-mp-2",
            company: "BlueOrbit SaaS",
            position: "Fullstack Developer",
            startDate: "2019",
            endDate: "2022",
            description:
              "- Xây hệ thống billing theo usage cho sản phẩm enterprise.\n- Tối ưu truy vấn PostgreSQL và cache Redis cho endpoint trọng yếu.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án nổi bật",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-mp-1",
            name: "TalentFlow Recruitment Platform",
            role: "Fullstack Engineer",
            startDate: "2023-01",
            endDate: "Hiện tại",
            customer: "Sản phẩm nội bộ",
            teamSize: 9,
            technologies: "Next.js, TypeScript, Supabase, PostgreSQL, Redis",
            description: "Phát triển nền tảng tuyển dụng end-to-end gồm CV Builder, ATS pipeline và recommendation.",
          },
        ],
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: [
          { id: "skill-mp-1", name: "React, Next.js, TypeScript" },
          { id: "skill-mp-2", name: "Node.js, NestJS, RESTful API" },
          { id: "skill-mp-3", name: "PostgreSQL, Supabase, Redis" },
          { id: "skill-mp-4", name: "Docker, CI/CD, quan sát hệ thống" },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Ngôn ngữ",
      isVisible: true,
      data: {
        text: "- Tiếng Việt: Bản ngữ\n- Tiếng Anh: Làm việc chuyên nghiệp (IELTS 7.5)",
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-mp-1",
            institution: "Đại học Bách khoa TP.HCM",
            degree: "Kỹ sư Khoa học Máy tính",
            startDate: "2012",
            endDate: "2017",
          },
        ],
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-mp-1",
            name: "AWS Certified Developer - Associate",
            issuer: "Amazon Web Services",
            date: "2023",
            url: "https://www.credly.com/",
          },
        ],
      },
    },
  ];
}

function buildCreativeSidebarSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Đỗ Hạ Vy",
        title: "Product UI Engineer",
        avatarUrl: "/avatars/default-avatar.png",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "havy.ui@gmail.com",
        phone: "+84 901 889 327",
        address: "Quận Hải Châu, Đà Nẵng",
        dob: "16/05/1998",
      },
    },
    {
      type: "summary",
      title: "Tuyên ngôn nghề nghiệp",
      isVisible: true,
      data: {
        text:
          "Kỹ sư UI tập trung vào trải nghiệm biểu mẫu, luồng CV và hệ thống thành phần dùng chung.",
        items: [
          { id: "summary-cs-1", content: "Tối ưu onboarding CV giúp tăng tỉ lệ hoàn thành hồ sơ trong lần đầu sử dụng." },
          { id: "summary-cs-2", content: "Thành thạo phối hợp sản phẩm - thiết kế - kỹ thuật trong mô hình agile." },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Mục tiêu nghề nghiệp",
      isVisible: true,
      data: {
        text: "Xây dựng design system có khả năng mở rộng, giảm trùng lặp UI và tăng tốc độ triển khai tính năng mới.",
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng cốt lõi",
      isVisible: true,
      data: {
        items: [
          { id: "skill-cs-1", name: "React, Next.js, TypeScript", level: 92 },
          { id: "skill-cs-2", name: "TailwindCSS, Framer Motion", level: 88 },
          { id: "skill-cs-3", name: "Accessibility & UX Writing", level: 80 },
          { id: "skill-cs-4", name: "Figma, Design Tokens", level: 84 },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Ngôn ngữ",
      isVisible: true,
      data: {
        text: "- Tiếng Việt: Bản ngữ\n- Tiếng Anh: C1",
      },
    },
    {
      type: "custom_text",
      title: "Hoạt động",
      isVisible: true,
      data: {
        items: [
          {
            id: "activity-cs-1",
            name: "Tech Mentor Frontend Community",
            role: "Mentor",
            startDate: "2023",
            endDate: "Hiện tại",
            description: "Hỗ trợ review portfolio và CV cho sinh viên công nghệ thông tin.",
          },
        ],
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-cs-1",
            company: "TalentFlow Technologies",
            position: "Product UI Engineer",
            startDate: "2022",
            endDate: "Hiện tại",
            description:
              "- Xây và chuẩn hóa bộ component cho candidate dashboard.\n- Thiết kế các template CV và bảo toàn tương thích export PDF.",
          },
          {
            id: "exp-cs-2",
            company: "Nexa Commerce",
            position: "Frontend Developer",
            startDate: "2020",
            endDate: "2022",
            description: "- Phát triển dashboard analytics và tối ưu trải nghiệm người dùng trên mobile.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-cs-1",
            name: "CV Builder Template Studio",
            role: "Frontend Engineer",
            startDate: "2024-01",
            endDate: "Hiện tại",
            technologies: "Next.js, TypeScript, TailwindCSS, Playwright",
            description: "Thiết kế luồng chọn template và tối ưu chất lượng preview giữa web và PDF export.",
          },
        ],
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-cs-1",
            institution: "Đại học CNTT và Truyền thông Việt - Hàn",
            degree: "Kỹ sư Công nghệ thông tin",
            startDate: "2016",
            endDate: "2020",
          },
        ],
      },
    },
    {
      type: "award_list",
      title: "Giải thưởng",
      isVisible: true,
      data: {
        items: [
          {
            id: "award-cs-1",
            title: "Best UX Improvement Initiative",
            issuer: "TalentFlow",
            date: "2024",
            description: "Đạt kết quả nổi bật trong cải tiến trải nghiệm hoàn thiện CV.",
          },
        ],
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-cs-1",
            name: "Google UX Design Professional Certificate",
            issuer: "Google",
            date: "2023",
            url: "https://www.coursera.org/",
          },
        ],
      },
    },
  ];
}

function buildMinimalElegantSections(): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Trịnh Gia Hân",
        title: "Backend Engineer",
        avatarUrl: "",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "giahan.backend@gmail.com",
        phone: "+84 352 818 443",
        address: "Quận Ninh Kiều, Cần Thơ",
        dob: "03/03/1996",
      },
    },
    {
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      data: {
        text:
          "Kỹ sư backend chú trọng độ tin cậy hệ thống, chất lượng dữ liệu và khả năng mở rộng khi sản phẩm tăng tải.",
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: [
          {
            id: "exp-me-1",
            company: "TalentFlow Technologies",
            position: "Backend Engineer",
            startDate: "2021",
            endDate: "Hiện tại",
            description:
              "- Thiết kế API và luồng đồng bộ hồ sơ ứng viên.\n- Tối ưu SQL, cấu hình cache và giám sát metrics hệ thống.",
          },
          {
            id: "exp-me-2",
            company: "Delta Data Solutions",
            position: "Software Engineer",
            startDate: "2018",
            endDate: "2021",
            description: "- Xây dịch vụ xử lý dữ liệu hồ sơ và báo cáo vận hành cho doanh nghiệp tuyển dụng.",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-me-1",
            name: "Resume Import Pipeline",
            role: "Backend Engineer",
            startDate: "2024-02",
            endDate: "Hiện tại",
            technologies: "FastAPI, Redis, Celery, Supabase",
            description: "Xây pipeline OCR + parse CV để tạo dữ liệu editable và ổn định cho downstream services.",
          },
        ],
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: [
          { id: "skill-me-1", name: "Node.js, Python, FastAPI" },
          { id: "skill-me-2", name: "PostgreSQL, Redis, Queue processing" },
          { id: "skill-me-3", name: "System design và tối ưu hiệu năng" },
        ],
      },
    },
    {
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      data: {
        items: [
          {
            id: "edu-me-1",
            institution: "Đại học Cần Thơ",
            degree: "Kỹ sư Công nghệ thông tin",
            startDate: "2014",
            endDate: "2018",
          },
        ],
      },
    },
    {
      type: "custom_text",
      title: "Ngôn ngữ",
      isVisible: true,
      data: {
        text: "- Tiếng Việt: Bản ngữ\n- Tiếng Anh: B2",
      },
    },
    {
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      data: {
        items: [
          {
            id: "cert-me-1",
            name: "Google Cloud Associate Cloud Engineer",
            issuer: "Google Cloud",
            date: "2022",
            url: "https://www.credential.net/",
          },
        ],
      },
    },
  ];
}

function resolveTemplateDefaultSections(templateId: string) {
  if (templateId === "teal-pro-two-column") {
    return buildTealTwoColumnSections();
  }

  if (templateId === "emerald-sidebar-reference") {
    return buildEmeraldSidebarSections();
  }

  if (templateId === "modern-professional") {
    return buildModernProfessionalSections();
  }

  if (templateId === "creative-sidebar") {
    return buildCreativeSidebarSections();
  }

  if (templateId === "minimal-elegant") {
    return buildMinimalElegantSections();
  }

  return buildTealTimelineSections();
}

const ALL_CV_TEMPLATE_LIBRARY: CVTemplateDefinition[] = listTemplateRegistry()
  .filter((item) => ENABLED_TEMPLATE_IDS.has(item.id))
  .map((item) => {
    const badge = resolveTemplateBadge(item.id);

    return {
      id: item.id,
      name: item.metadata.displayName,
      category: mapCategory(item.metadata.category),
      badge,
      isPro: badge === "PRO",
      thumbnail: item.preview.thumbnail,
      previewImages: item.preview.images,
      description: item.metadata.shortDescription,
      tags: item.metadata.tags,
      defaultCVData: {
        resumeTitle: `CV ${item.metadata.displayName}`,
        sections: resolveTemplateDefaultSections(item.id),
      },
      templateStyles: {
        colors: {
          ...item.metadata.themePreset.colors,
        },
        fonts: {
          ...item.metadata.themePreset.fonts,
        },
        spacing: item.metadata.themePreset.spacing,
      },
    };
  });

export const CV_TEMPLATE_LIBRARY: CVTemplateDefinition[] = ALL_CV_TEMPLATE_LIBRARY;

export const CV_TEMPLATE_LIBRARY_UI: CVTemplateDefinition[] = ALL_CV_TEMPLATE_LIBRARY;

function cloneTemplateSectionData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildTemplatePreviewSections(template: CVTemplateDefinition) {
  return template.defaultCVData.sections.map((section, index) => ({
    id: `${template.id}-${section.type}-${index + 1}`,
    type: section.type,
    title: section.title,
    isVisible: section.isVisible,
    containerId: "main-column",
    data: cloneTemplateSectionData(section.data),
  }));
}
