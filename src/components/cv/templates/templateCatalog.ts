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

const PRO_TEMPLATE_IDS = new Set(["modern-blue", "elegant-sidebar"]);

export const TEMPORARILY_DISABLED_TEMPLATE_IDS = new Set([
  "professional-green",
  "minimal-gray",
  "modern-blue",
  "elegant-sidebar",
]);

function resolveTemplateBadge(templateId: string): TemplateBadge {
  return PRO_TEMPLATE_IDS.has(templateId) ? "PRO" : "Miễn phí";
}

function buildDefaultSections(input: {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  birth: string;
  summary: string;
  skills: string[];
  experience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    role: string;
    startDate: string;
    endDate: string;
    customer: string;
    teamSize: number;
    technologies: string;
    description: string;
  }>;
}): TemplateSectionDraft[] {
  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: input.fullName,
        title: input.title,
        avatarUrl: "",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: input.email,
        phone: input.phone,
        address: input.address,
        dob: input.birth,
      },
    },
    {
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      data: {
        text: input.summary,
      },
    },
    {
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      data: {
        items: input.skills.map((name, index) => ({
          id: `skill-${index + 1}`,
          name,
        })),
      },
    },
    {
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      data: {
        items: input.experience,
      },
    },
    {
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      data: {
        items: input.projects,
      },
    },
  ];
}

function buildSharedSampleSections(): TemplateSectionDraft[] {
  return buildDefaultSections({
    fullName: "Nguyen Van A",
    title: "Fullstack Developer",
    email: "nguyenvana@gmail.com",
    phone: "+84 1234567890",
    address: "Ha Noi, Viet Nam",
    birth: "01/01/2000",
    summary:
      "Fullstack Developer with over 2 years of experience building and maintaining web applications across frontend and backend systems. Strong foundation in HTML, CSS, JavaScript, ReactJS, PHP, and RESTful APIs, with practical experience in MySQL, NoSQL, Docker, Redis, and AWS services. Comfortable working in fast-paced environments, learning new technologies quickly, and collaborating to deliver scalable and maintainable solutions.",
    skills: [
      "Frontend: HTML, CSS, JavaScript, ReactJS, React Native, DOM manipulation",
      "Backend: PHP, RESTful APIs, GraphQL, JSON API integration",
      "Database: MySQL, NoSQL, Redis",
      "DevOps: Docker, Kubernetes, Rancher, AWS services",
      "Tools: Git, SVN",
      "Other: Good understanding of ReactJS principles and workflows",
      "Other: Familiar with EcmaScript specifications",
      "Other: Experience with data structure libraries",
      "Other: Able to learn and apply new technologies quickly",
      "Other: Comfortable working on Linux, OSX, and Windows",
    ],
    experience: [
      {
        id: "exp-1",
        company: "F8 TECHNOLOGY EDUCATION.,JSC",
        position: "Fullstack Developer",
        startDate: "01/2018",
        endDate: "Present",
        description:
          "- Participated in outsourcing software projects for different business domains.\n- Developed frontend and backend features based on project requirements.\n- Designed coding structures and database schemas from project descriptions.\n- Worked on application maintenance, feature enhancement, and system optimization.",
      },
      {
        id: "exp-2",
        company: "AI&T JSC",
        position: "Fullstack Developer",
        startDate: "07/2015",
        endDate: "03/2018",
        description:
          "- Worked on outsourcing software projects.\n- Developed web application modules for both frontend and backend.\n- Created coding frameworks and database designs based on project requirements.",
      },
      {
        id: "exp-3",
        company: "FREELANCER",
        position: "Fullstack Developer",
        startDate: "01/2015",
        endDate: "07/2015",
        description:
          "- Developed web modules for client and personal projects.\n- Implemented frontend and backend features according to project needs.",
      },
    ],
    projects: [
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
  });
}

function buildTealTimelinePageOneSections(): TemplateSectionDraft[] {
  const overviewItems = [
    {
      id: "ov1",
      content: "La mot nguoi coi mo, thich ung nhanh voi moi truong moi, khong ngai kho khan.",
    },
    {
      id: "ov2",
      content: "Strengths: Front-end technology and Back-end web application development.",
    },
    {
      id: "ov3",
      content: "Over 2 years of experience in programming with good communication and quick learning skills.",
    },
    {
      id: "ov4",
      content: "Proficiency in HTML, CSS, JavaScript and practical ReactJS workflows.",
    },
    {
      id: "ov5",
      content: "Strong proficiency in JavaScript, including DOM manipulation and the JavaScript object model.",
    },
    {
      id: "ov6",
      content: "Thorough understanding of React.js and its core principles.",
    },
    {
      id: "ov7",
      content: "Familiarity with newer specifications of EcmaScript and data structure libraries.",
    },
    {
      id: "ov8",
      content: "Familiarity with RESTful APIs and JSON API integration.",
    },
    {
      id: "ov9",
      content: "Strong experience in PHP, JavaScript (ReactJS, React-native), MySQL, NoSQL, GraphQL, Redis.",
    },
    {
      id: "ov10",
      content: "Proficient use of source code management tools: SVN, Git.",
    },
    {
      id: "ov11",
      content: "Proficiency in operating systems: Linux (Ubuntu, OSX), Windows.",
    },
    {
      id: "ov12",
      content: "Ability to learn and apply new technologies quickly.",
    },
    {
      id: "ov13",
      content: "Current working location: Ha Noi, Viet Nam.",
    },
  ];

  return [
    {
      type: "header",
      isVisible: true,
      data: {
        fullName: "Nguyen Van A",
        title: "Fullstack developer",
        avatarUrl: "",
      },
    },
    {
      type: "personal_info",
      isVisible: true,
      data: {
        email: "nguyenvana@gmail.com",
        phone: "+84 1234567890",
        address: "Ha Noi, Viet Nam",
        dob: "01/01/2000",
      },
    },
    {
      type: "summary",
      title: "Overview",
      isVisible: true,
      data: {
        title: "Overview",
        text: overviewItems.map((item) => item.content).join("\n"),
        items: overviewItems,
      },
    },
    {
      type: "custom_text",
      title: "Hoat dong",
      isVisible: true,
      data: {
        items: [
          {
            id: "act1",
            startDate: "06/2016",
            endDate: "",
            name: "Ngay hoi hien mau cuu nguoi 2016",
            role: "Tinh nguyen vien",
            description: "Tinh nguyen vien",
          },
        ],
      },
    },
    {
      type: "experience_list",
      title: "Work experience",
      isVisible: true,
      data: {
        title: "Work experience",
        items: [
          {
            id: "we1",
            startDate: "01/2018",
            endDate: "Present",
            company: "FB TECHNOLOGY EDUCATION., JSC",
            position: "Full-stack Developer",
            description:
              "- Programme outsourcing projects.\n- Create coding frames and design database based on project descriptions.",
          },
          {
            id: "we2",
            startDate: "07/2015",
            endDate: "03/2018",
            company: "AI&T JSC",
            position: "Full-stack Developer",
            description:
              "- Programme outsourcing projects.\n- Create coding frames and design database based on project descriptions.",
          },
          {
            id: "we3",
            startDate: "01/2015",
            endDate: "07/2015",
            company: "FREELANCER",
            position: "Full-stack Developer",
            description: "- Develop web module on given projects.",
          },
        ],
      },
    },
    {
      type: "skill_list",
      title: "Skills",
      isVisible: true,
      data: {
        items: [
          {
            id: "skill-main-1",
            name: "HTML, CSS, JavaScript (ReactJS, React-Native, Lib)",
            group: "main",
            level: 90,
          },
          {
            id: "skill-main-2",
            name: "PHP (Laravel, Symfony, CodeIgniter, Yii)",
            group: "main",
            level: 88,
          },
          {
            id: "skill-main-3",
            name: "Node (ExpressJS)",
            group: "main",
            level: 84,
          },
          {
            id: "skill-main-4",
            name: "RESTful API, GraphQL",
            group: "main",
            level: 82,
          },
          {
            id: "skill-main-5",
            name: "MySQL, PostgreSQL, NoSQL (MongoDB)",
            group: "main",
            level: 81,
          },
          {
            id: "skill-main-6",
            name: "Server (Apache, Nginx, Redis, Memcached, Queue, Log, Cronjob...), Rancher, K8S, Docker",
            group: "main",
            level: 79,
          },
          {
            id: "skill-main-7",
            name: "AWS (Load balancing, EC2, ECS, Router 53, RDS, S3)",
            group: "main",
            level: 78,
          },
          {
            id: "skill-other-1",
            name: "Ruby (Ruby on Rails)",
            group: "other",
            level: 74,
          },
          {
            id: "skill-other-2",
            name: "SVN, GIT",
            group: "other",
            level: 76,
          },
          {
            id: "skill-other-3",
            name: "Python (selenium automation test, crawler)",
            group: "other",
            level: 73,
          },
          {
            id: "skill-other-4",
            name: "Elasticsearch",
            group: "other",
            level: 70,
          },
          {
            id: "skill-other-5",
            name: "Tensorflow",
            group: "other",
            level: 69,
          },
        ],
      },
    },
    {
      type: "award_list",
      title: "Awards",
      isVisible: true,
      data: {
        items: [
          {
            id: "award-0",
            title: '1st place in 2 "North - South - Central POLY & FE Creabtion" contests',
            date: "",
            issuer: "",
            description: "",
          },
          {
            id: "award-1",
            title: "Poly Creative Competition 2016",
            date: "06/2016",
            issuer: "",
            description: "Poly creation contest: https://goo.gl/BVP5kE",
          },
          {
            id: "award-2",
            title: "FE Creative Competition 2016",
            date: "08/2016",
            issuer: "",
            description: "FE creation contest: https://goo.gl/86ULiw",
          },
          {
            id: "award-3",
            title: "AI&T JSC Employee Award",
            date: "02/2016",
            issuer: "",
            description: "",
          },
        ],
      },
    },
    {
      type: "project_list",
      title: "Projects",
      isVisible: true,
      data: {
        items: [
          {
            id: "project-f8-1",
            name: "FULLSTACK.EDU.VN",
            role: "Product Owner, BA, Developer, Tester, Video Editor",
            startDate: "01/2019",
            endDate: "Present",
            customer: "F8 TECHNOLOGY EDUCATION.,JSC",
            teamSize: 6,
            description: "Learn programming online (https://f8.edu.vn)",
            responsibilities:
              "- Developer\n- Solution architect\n- Frontend: ReactJS\n- Backend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3\n- Architecture: Microservice - Event driven (deploy with K8S), Websocket, SSO",
            technologies:
              "- Frontend: ReactJS\n- Backend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, MongoDB, MariaDB\n- Infra: Redis, Docker, AWS EC2, AWS S3, K8S",
          },
        ],
      },
    },
  ];
}

function resolveTemplateDefaultSections(templateId: string) {
  if (templateId === "teal-timeline") {
    return buildTealTimelinePageOneSections();
  }

  return buildSharedSampleSections();
}

const ALL_CV_TEMPLATE_LIBRARY: CVTemplateDefinition[] = listTemplateRegistry().map((item) => ({
  id: item.id,
  name: item.metadata.displayName,
  category: mapCategory(item.metadata.category),
  badge: resolveTemplateBadge(item.id),
  isPro: resolveTemplateBadge(item.id) === "PRO",
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
}));

export const CV_TEMPLATE_LIBRARY: CVTemplateDefinition[] = ALL_CV_TEMPLATE_LIBRARY;

export const CV_TEMPLATE_LIBRARY_UI: CVTemplateDefinition[] = ALL_CV_TEMPLATE_LIBRARY.filter(
  (template) => !TEMPORARILY_DISABLED_TEMPLATE_IDS.has(template.id),
);
