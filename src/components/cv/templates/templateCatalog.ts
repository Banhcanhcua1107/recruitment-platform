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

const ENABLED_TEMPLATE_IDS = new Set(["teal-timeline", "teal-pro-two-column"]);

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

function resolveTemplateDefaultSections(templateId: string) {
  if (templateId === "teal-pro-two-column") {
    return buildTealTwoColumnSections();
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
