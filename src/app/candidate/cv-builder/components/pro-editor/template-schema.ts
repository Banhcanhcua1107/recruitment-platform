import type { CVSection, SectionType } from "../../types";

export type EditorFieldKind = "text" | "textarea" | "email" | "tel" | "month";

export interface EditorFieldSchema {
  key: string;
  label: string;
  kind: EditorFieldKind;
  placeholder: string;
}

export interface SectionListSchema {
  itemLabel: string;
  fields: EditorFieldSchema[];
}

export interface CVSectionSchema {
  type: SectionType;
  label: string;
  previewTitle: string;
  description: string;
  icon: "user" | "id-card" | "text" | "briefcase" | "graduation" | "sparkles" | "folder" | "award" | "certificate" | "columns";
  allowMultiple: boolean;
  canAddFromModal: boolean;
  fields?: EditorFieldSchema[];
  list?: SectionListSchema;
  guideLines: string[];
  defaultData: Record<string, unknown>;
}

export interface CVEditorTemplateSchema {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  canvas: {
    paperBackground: string;
    paperText: string;
    pageShadow: string;
  };
  sectionOrder: SectionType[];
  sectionSchemas: Partial<Record<SectionType, CVSectionSchema>>;
}

const SECTION_SCHEMAS: Partial<Record<SectionType, CVSectionSchema>> = {
  header: {
    type: "header",
    label: "Phần đầu",
    previewTitle: "Phần đầu",
    description: "Thông tin nhận diện chính nằm ở đầu CV.",
    icon: "user",
    allowMultiple: false,
    canAddFromModal: false,
    fields: [
      { key: "fullName", label: "Họ tên", kind: "text", placeholder: "Nguyen Van A" },
      { key: "title", label: "Vị trí", kind: "text", placeholder: "Lập trình viên Fullstack" },
    ],
    guideLines: [
      "Dòng title nên nêu rõ vai trò và nhóm công nghệ chính.",
      "Tên hiển thị cần đồng nhất với hồ sơ LinkedIn.",
    ],
    defaultData: {
      fullName: "Nguyen Van A",
      title: "Fullstack Developer",
      avatarUrl: "",
    },
  },
  personal_info: {
    type: "personal_info",
    label: "Thông tin cá nhân",
    previewTitle: "Thông tin cá nhân",
    description: "Các trường liên hệ để nhà tuyển dụng phản hồi nhanh.",
    icon: "id-card",
    allowMultiple: false,
    canAddFromModal: false,
    fields: [
      { key: "phone", label: "Điện thoại", kind: "tel", placeholder: "+84 1234567890" },
      { key: "dob", label: "Ngày sinh", kind: "text", placeholder: "01/01/2000" },
      { key: "email", label: "Email", kind: "email", placeholder: "nguyenvana@gmail.com" },
      { key: "address", label: "Địa chỉ", kind: "text", placeholder: "Ha Noi, Viet Nam" },
    ],
    guideLines: [
      "Email nên dùng định dạng chuyên nghiệp, không dùng nickname.",
      "Số điện thoại cần là số đang dùng để recruiter gọi ngay.",
    ],
    defaultData: {
      phone: "+84 1234567890",
      dob: "01/01/2000",
      email: "nguyenvana@gmail.com",
      address: "Ha Noi, Viet Nam",
    },
  },
  summary: {
    type: "summary",
    label: "Tổng quan",
    previewTitle: "Tổng quan",
    description: "Tóm tắt giá trị cốt lõi trong 3-5 dòng.",
    icon: "text",
    allowMultiple: false,
    canAddFromModal: true,
    fields: [
      {
        key: "text",
        label: "Nội dung tổng quan",
        kind: "textarea",
        placeholder:
          "Lập trình viên Fullstack có kinh nghiệm xây dựng sản phẩm, tối ưu hiệu năng và nâng tỷ lệ chuyển đổi...",
      },
    ],
    guideLines: [
      "Mở đầu bằng số năm kinh nghiệm và chuyên môn chính.",
      "Nêu 1-2 thành tựu có số liệu để tăng độ tin cậy.",
      "Giữ đoạn tổng quan ngắn, đọc hết trong 20 giây.",
    ],
    defaultData: {
      text:
        "Fullstack Developer with over 2 years of experience building and maintaining web applications across frontend and backend systems. Strong foundation in HTML, CSS, JavaScript, ReactJS, PHP, and RESTful APIs, with practical experience in MySQL, NoSQL, Docker, Redis, and AWS services. Comfortable working in fast-paced environments, learning new technologies quickly, and collaborating to deliver scalable and maintainable solutions.",
    },
  },
  experience_list: {
    type: "experience_list",
    label: "Kinh nghiệm làm việc",
    previewTitle: "Kinh nghiệm làm việc",
    description: "Lịch sử công việc theo thứ tự gần nhất.",
    icon: "briefcase",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục kinh nghiệm",
      fields: [
        { key: "company", label: "Công ty", kind: "text", placeholder: "F8 TECHNOLOGY EDUCATION.,JSC" },
        { key: "position", label: "Vị trí", kind: "text", placeholder: "Lập trình viên Fullstack" },
        { key: "startDate", label: "Bắt đầu", kind: "month", placeholder: "2018-01" },
        { key: "endDate", label: "Kết thúc", kind: "text", placeholder: "Hiện tại" },
        {
          key: "description",
          label: "Thành tựu",
          kind: "textarea",
          placeholder:
            "Mô tả tác động bằng số liệu và phạm vi kỹ thuật cụ thể.",
        },
      ],
    },
    guideLines: [
      "Mỗi kinh nghiệm nên có kết quả định lượng rõ ràng.",
      "Mô tả tập trung vào impact thay vì mô tả nhiệm vụ chung chung.",
      "Sử dụng động từ chủ động: Led, Built, Improved, Optimized.",
    ],
    defaultData: {
      items: [
        {
          id: "exp-default-1",
          company: "F8 TECHNOLOGY EDUCATION.,JSC",
          position: "Fullstack Developer",
          startDate: "01/2018",
          endDate: "Present",
          description:
            "- Participated in outsourcing software projects for different business domains.\n- Developed frontend and backend features based on project requirements.\n- Designed coding structures and database schemas from project descriptions.\n- Worked on application maintenance, feature enhancement, and system optimization.",
        },
        {
          id: "exp-default-2",
          company: "AI&T JSC",
          position: "Fullstack Developer",
          startDate: "07/2015",
          endDate: "03/2018",
          description:
            "- Worked on outsourcing software projects.\n- Developed web application modules for both frontend and backend.\n- Created coding frameworks and database designs based on project requirements.",
        },
        {
          id: "exp-default-3",
          company: "FREELANCER",
          position: "Fullstack Developer",
          startDate: "01/2015",
          endDate: "07/2015",
          description:
            "- Developed web modules for client and personal projects.\n- Implemented frontend and backend features according to project needs.",
        },
      ],
    },
  },
  education_list: {
    type: "education_list",
    label: "Học vấn",
    previewTitle: "Học vấn",
    description: "Thông tin học vấn chính liên quan trực tiếp đến vị trí.",
    icon: "graduation",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục học vấn",
      fields: [
        { key: "institution", label: "Trường", kind: "text", placeholder: "VNUHCM - University of Information Technology" },
        { key: "degree", label: "Chương trình", kind: "text", placeholder: "Kỹ thuật phần mềm" },
        { key: "startDate", label: "Bắt đầu", kind: "month", placeholder: "2017-09" },
        { key: "endDate", label: "Kết thúc", kind: "month", placeholder: "2021-06" },
      ],
    },
    guideLines: [
      "Liệt kê theo mốc mới nhất.",
      "Có thể thêm khóa học ngắn hạn nếu liên quan vị trí ứng tuyển.",
    ],
    defaultData: {
      items: [
        {
          id: "edu-default-1",
          institution: "VNUHCM - University of Information Technology",
          degree: "Software Engineering",
          startDate: "2017-09",
          endDate: "2021-06",
        },
      ],
    },
  },
  skill_list: {
    type: "skill_list",
    label: "Kỹ năng",
    previewTitle: "Kỹ năng",
    description: "Danh sách kỹ năng cứng phục vụ trực tiếp công việc.",
    icon: "sparkles",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục kỹ năng",
      fields: [{ key: "name", label: "Kỹ năng", kind: "text", placeholder: "Frontend: React, Next.js, TypeScript, Tailwind CSS" }],
    },
    guideLines: [
      "Nhóm kỹ năng theo mảng thay vì liệt kê rời rạc.",
      "Ưu tiên kỹ năng có thể chứng minh qua dự án và portfolio.",
    ],
    defaultData: {
      items: [
        { id: "skill-default-1", name: "Frontend: HTML, CSS, JavaScript, ReactJS, React Native, DOM manipulation" },
        { id: "skill-default-2", name: "Backend: PHP, RESTful APIs, GraphQL, JSON API integration" },
        { id: "skill-default-3", name: "Database: MySQL, NoSQL, Redis" },
        { id: "skill-default-4", name: "DevOps: Docker, Kubernetes, Rancher, AWS services" },
        { id: "skill-default-5", name: "Tools: Git, SVN" },
        { id: "skill-default-6", name: "Other: Good understanding of ReactJS principles and workflows" },
        { id: "skill-default-7", name: "Other: Familiar with EcmaScript specifications" },
        { id: "skill-default-8", name: "Other: Experience with data structure libraries" },
        { id: "skill-default-9", name: "Other: Able to learn and apply new technologies quickly" },
        { id: "skill-default-10", name: "Other: Comfortable working on Linux, OSX, and Windows" },
      ],
    },
  },
  project_list: {
    type: "project_list",
    label: "Dự án",
    previewTitle: "Dự án",
    description: "Các dự án nổi bật thể hiện năng lực triển khai.",
    icon: "folder",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục dự án",
      fields: [
        { key: "name", label: "Tên dự án", kind: "text", placeholder: "CV Builder 2.0" },
        { key: "role", label: "Vai trò", kind: "text", placeholder: "Lập trình viên Fullstack" },
        { key: "startDate", label: "Bắt đầu", kind: "month", placeholder: "2024-04" },
        { key: "endDate", label: "Kết thúc", kind: "text", placeholder: "Hiện tại" },
        {
          key: "description",
          label: "Mô tả",
          kind: "textarea",
          placeholder:
            "Xây dựng luồng chỉnh sửa CV theo block, giúp tăng tỷ lệ hoàn thiện hồ sơ và giảm thao tác thừa.",
        },
      ],
    },
    guideLines: [
      "Mỗi dự án nên có bối cảnh, vai trò, kết quả rõ ràng.",
      "Nếu có link demo hoặc case study thì đưa vào phần mô tả.",
    ],
    defaultData: {
      items: [
        {
          id: "project-default-1",
          name: "MYCV.VN",
          role: "Developer",
          startDate: "06/2018",
          endDate: "Present",
          description: "Standard CV writing application with free PDF download support. Responsibilities: Developer, Solution architect.",
          technologies: "ReactJS, PHP (Laravel, Lumen), NodeJS, Apache Kafka, WebSocket, MongoDB, MariaDB, Redis, Docker, AWS EC2, AWS S3, Microservice architecture, Event-driven architecture, SSO, K8S",
          customer: "MyCV JSC",
          teamSize: 1,
        },
      ],
    },
  },
  award_list: {
    type: "award_list",
    label: "Giải thưởng",
    previewTitle: "Giải thưởng",
    description: "Giải thưởng và ghi nhận có tính liên quan nghề nghiệp.",
    icon: "award",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục giải thưởng",
      fields: [
        { key: "title", label: "Giải thưởng", kind: "text", placeholder: "Top Engineering Impact Q3 2024" },
        { key: "issuer", label: "Đơn vị trao", kind: "text", placeholder: "MyCV JSC" },
        { key: "date", label: "Thời gian", kind: "text", placeholder: "2024" },
        { key: "description", label: "Mô tả", kind: "textarea", placeholder: "Được ghi nhận nhờ tạo ra tác động kỹ thuật có số liệu rõ ràng." },
      ],
    },
    guideLines: [
      "Giữ lại các giải thưởng có liên quan trực tiếp vai trò ứng tuyển.",
    ],
    defaultData: {
      items: [],
    },
  },
  certificate_list: {
    type: "certificate_list",
    label: "Chứng chỉ",
    previewTitle: "Chứng chỉ",
    description: "Chứng chỉ chuyên môn có thể xác thực.",
    icon: "certificate",
    allowMultiple: false,
    canAddFromModal: true,
    list: {
      itemLabel: "Mục chứng chỉ",
      fields: [
        { key: "name", label: "Tên chứng chỉ", kind: "text", placeholder: "AWS Certified Cloud Practitioner" },
        { key: "issuer", label: "Đơn vị cấp", kind: "text", placeholder: "Amazon Web Services" },
        { key: "date", label: "Thời gian", kind: "text", placeholder: "2025" },
        { key: "url", label: "Liên kết xác minh", kind: "text", placeholder: "https://..." },
      ],
    },
    guideLines: [
      "Ưu tiên chứng chỉ còn hiệu lực và có link xác minh.",
    ],
    defaultData: {
      items: [],
    },
  },
  rich_outline: {
    type: "rich_outline",
    label: "Ghi chú cấu trúc",
    previewTitle: "Ghi chú cấu trúc",
    description: "Nội dung dạng outline nhiều cấp.",
    icon: "columns",
    allowMultiple: false,
    canAddFromModal: true,
    guideLines: ["Dùng mục này cho outline nhiều cấp nếu cần nhập nhanh từ OCR."],
    defaultData: {
      nodes: [],
    },
  },
};

export const PRO_EDITOR_TEMPLATE_SCHEMA: CVEditorTemplateSchema = {
  id: "professional-slate-v1",
  name: "Biên tập CV sáng",
  subtitle: "Giao diện sáng, rõ ràng, đồng bộ phong cách TalentFlow",
  accent: "#14b8a6",
  canvas: {
    paperBackground: "#fefefe",
    paperText: "#111827",
    pageShadow: "0 30px 80px -36px rgba(2,6,23,0.65)",
  },
  sectionOrder: [
    "header",
    "personal_info",
    "summary",
    "experience_list",
    "education_list",
    "skill_list",
    "project_list",
    "award_list",
    "certificate_list",
    "rich_outline",
    "custom_text",
    "custom_image",
  ],
  sectionSchemas: SECTION_SCHEMAS,
};

export function getSectionSchema(type: SectionType) {
  return PRO_EDITOR_TEMPLATE_SCHEMA.sectionSchemas[type];
}

export function getSectionDisplayName(section: CVSection) {
  const schema = getSectionSchema(section.type);
  if (section.title && section.title.trim().length > 0) {
    return section.title;
  }
  if (schema) {
    return schema.previewTitle;
  }
  return section.type;
}

export type ModalCatalogIcon =
  | "contact"
  | "summary"
  | "objective"
  | "experience"
  | "education"
  | "skills"
  | "language"
  | "project"
  | "certificate"
  | "award"
  | "activity"
  | "custom";

export interface ModalSectionCatalogItem {
  id: string;
  type: SectionType;
  label: string;
  description: string;
  icon: ModalCatalogIcon;
  allowMultiple: boolean;
  presetTitle?: string;
  presetData?: Record<string, unknown>;
}

export interface ModalSectionCatalogState extends ModalSectionCatalogItem {
  existingCount: number;
  isDisabled: boolean;
}

const MODAL_SECTION_CATALOG: ModalSectionCatalogItem[] = [
  {
    id: "contact",
    type: "personal_info",
    label: "Thông tin liên hệ",
    description: "Email, số điện thoại, địa chỉ",
    icon: "contact",
    allowMultiple: false,
    presetData: {
      phone: "+84 1234567890",
      dob: "01/01/2000",
      email: "nguyenvana@gmail.com",
      address: "Ha Noi, Viet Nam",
    },
  },
  {
    id: "summary",
    type: "summary",
    label: "Tổng quan",
    description: "Giới thiệu nhanh về thế mạnh",
    icon: "summary",
    allowMultiple: false,
    presetTitle: "Tổng quan",
    presetData: {
      text: "Fullstack Developer with over 2 years of experience building and maintaining web applications across frontend and backend systems. Strong foundation in HTML, CSS, JavaScript, ReactJS, PHP, and RESTful APIs, with practical experience in MySQL, NoSQL, Docker, Redis, and AWS services. Comfortable working in fast-paced environments, learning new technologies quickly, and collaborating to deliver scalable and maintainable solutions.",
    },
  },
  {
    id: "objective",
    type: "custom_text",
    label: "Mục tiêu nghề nghiệp",
    description: "Định hướng vị trí ứng tuyển",
    icon: "objective",
    allowMultiple: false,
    presetTitle: "Mục tiêu nghề nghiệp",
    presetData: {
      text: "Trong 1-2 năm tới, mục tiêu là phát triển lên Senior Fullstack Developer, phụ trách end-to-end các module sản phẩm cốt lõi và nâng năng lực về kiến trúc hệ thống scalable.",
    },
  },
  {
    id: "experience",
    type: "experience_list",
    label: "Kinh nghiệm làm việc",
    description: "Lịch sử công việc gần nhất",
    icon: "experience",
    allowMultiple: false,
    presetTitle: "Kinh nghiệm làm việc",
    presetData: {
      items: [
        {
          id: "exp-default-modal-1",
          company: "F8 TECHNOLOGY EDUCATION.,JSC",
          position: "Fullstack Developer",
          startDate: "01/2018",
          endDate: "Present",
          description: "- Participated in outsourcing software projects for different business domains.\n- Developed frontend and backend features based on project requirements.\n- Designed coding structures and database schemas from project descriptions.\n- Worked on application maintenance, feature enhancement, and system optimization.",
        },
        {
          id: "exp-default-modal-2",
          company: "AI&T JSC",
          position: "Fullstack Developer",
          startDate: "07/2015",
          endDate: "03/2018",
          description: "- Worked on outsourcing software projects.\n- Developed web application modules for both frontend and backend.\n- Created coding frameworks and database designs based on project requirements.",
        },
        {
          id: "exp-default-modal-3",
          company: "FREELANCER",
          position: "Fullstack Developer",
          startDate: "01/2015",
          endDate: "07/2015",
          description: "- Developed web modules for client and personal projects.\n- Implemented frontend and backend features according to project needs.",
        },
      ],
    },
  },
  {
    id: "education",
    type: "education_list",
    label: "Trình độ học vấn",
    description: "Trường, chương trình, thời gian",
    icon: "education",
    allowMultiple: false,
    presetTitle: "Trình độ học vấn",
    presetData: {
      items: [
        {
          id: "edu-default-modal-1",
          institution: "Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
          degree: "Kỹ sư phần mềm",
          startDate: "2017-09",
          endDate: "2021-06",
        },
      ],
    },
  },
  {
    id: "skills",
    type: "skill_list",
    label: "Kiến thức & Kỹ năng",
    description: "Năng lực chuyên môn cốt lõi",
    icon: "skills",
    allowMultiple: false,
    presetTitle: "Kiến thức & Kỹ năng",
    presetData: {
      items: [
        { id: "skill-default-modal-1", name: "Frontend: HTML, CSS, JavaScript, ReactJS, React Native, DOM manipulation", level: 90 },
        { id: "skill-default-modal-2", name: "Backend: PHP, RESTful APIs, GraphQL, JSON API integration", level: 88 },
        { id: "skill-default-modal-3", name: "Database: MySQL, NoSQL, Redis", level: 82 },
        { id: "skill-default-modal-4", name: "DevOps: Docker, Kubernetes, Rancher, AWS services", level: 80 },
        { id: "skill-default-modal-5", name: "Tools: Git, SVN", level: 78 },
      ],
    },
  },
  {
    id: "language",
    type: "custom_text",
    label: "Ngôn ngữ",
    description: "Ngoại ngữ và mức độ thành thạo",
    icon: "language",
    allowMultiple: false,
    presetTitle: "Ngôn ngữ",
    presetData: {
      text: "Tiếng Việt - Bản ngữ\nTiếng Anh - Professional Working Proficiency (đọc tài liệu, viết technical docs, họp với team đa quốc gia)",
    },
  },
  {
    id: "project",
    type: "project_list",
    label: "Dự án đã làm",
    description: "Các dự án nổi bật đã tham gia",
    icon: "project",
    allowMultiple: false,
    presetTitle: "Dự án đã làm",
    presetData: {
      items: [
        {
          id: "project-default-modal-1",
          name: "MYCV.VN",
          role: "Developer",
          startDate: "06/2018",
          endDate: "Present",
          description: "Standard CV writing application with free PDF download support. Responsibilities: Developer, Solution architect.",
          technologies: "ReactJS, PHP (Laravel, Lumen), NodeJS, Apache Kafka, WebSocket, MongoDB, MariaDB, Redis, Docker, AWS EC2, AWS S3, Microservice architecture, Event-driven architecture, SSO, K8S",
          customer: "MyCV JSC",
          teamSize: 1,
        },
        {
          id: "project-default-modal-2",
          name: "BOTAYRA.FULLSTACK.EDU.VN",
          role: "Developer",
          startDate: "05/2020",
          endDate: "06/2020",
          description: "A machine learning based application that helps users avoid touching their face using webcam tracking. Responsibilities: Developer.",
          technologies: "ReactJS, TensorFlow",
          customer: "MyCV JSC",
          teamSize: 1,
        },
        {
          id: "project-default-modal-3",
          name: "FOODHUB.VN",
          role: "Fullstack Developer",
          startDate: "10/2017",
          endDate: "01/2018",
          description: "Application for connecting organic food store chains. Responsibilities: Built frontend, Built backend.",
          technologies: "React Native, PHP, CodeIgniter, MariaDB, Memcached",
          customer: "O'Green Food",
          teamSize: 2,
        },
        {
          id: "project-default-modal-4",
          name: "SIEU-DAO-CHICH GAME",
          role: "Developer",
          startDate: "09/2016",
          endDate: "12/2016",
          description: "Remote control online game via computer using IoT. Responsibilities: Built frontend, Built backend, Built hardware integration.",
          technologies: "HTML, CSS, jQuery, PHP, Symfony, MariaDB, Memcached, Raspberry Pi 2, IP Camera, Sensors",
          customer: "Personal project",
          teamSize: 1,
        },
      ],
    },
  },
  {
    id: "certificate",
    type: "certificate_list",
    label: "Chứng chỉ",
    description: "Chứng chỉ chuyên môn",
    icon: "certificate",
    allowMultiple: false,
    presetTitle: "Chứng chỉ",
    presetData: {
      items: [
        {
          id: "certificate-default-modal-1",
          name: "AWS Certified Cloud Practitioner",
          issuer: "Amazon Web Services",
          date: "2024",
          url: "",
        },
      ],
    },
  },
  {
    id: "award",
    type: "award_list",
    label: "Giải thưởng",
    description: "Thành tích nổi bật",
    icon: "award",
    allowMultiple: false,
    presetTitle: "Giải thưởng",
    presetData: {
      items: [
        {
          id: "award-default-modal-1",
          title: "Top Engineering Impact Q3",
          date: "2024",
          issuer: "MyCV JSC",
          description: "Được vinh danh cho đóng góp tối ưu CV Builder với tác động trực tiếp đến conversion.",
        },
      ],
    },
  },
  {
    id: "activity",
    type: "custom_text",
    label: "Hoạt động",
    description: "Hoạt động cộng đồng / CLB",
    icon: "activity",
    allowMultiple: false,
    presetTitle: "Hoạt động",
    presetData: {
      text: "Mentor cộng đồng Dev trẻ (2024 - nay): hỗ trợ review CV và lộ trình học cho sinh viên CNTT.\nDiễn giả workshop nội bộ: chia sẻ kinh nghiệm tối ưu API và query performance.",
    },
  },
  {
    id: "custom",
    type: "custom_text",
    label: "Tùy chỉnh",
    description: "Thêm section theo nhu cầu",
    icon: "custom",
    allowMultiple: true,
    presetTitle: "Tùy chỉnh",
    presetData: {
      text: "",
    },
  },
];

function normalizeTitle(value?: string) {
  return (value || "").trim().toLowerCase();
}

export function getModalSectionCatalog(currentSections: CVSection[]): ModalSectionCatalogState[] {
  return MODAL_SECTION_CATALOG.map((catalogItem) => {
    const existingCount = currentSections.filter((section) => {
      if (section.type !== catalogItem.type) {
        return false;
      }

      if (catalogItem.type !== "custom_text" || !catalogItem.presetTitle) {
        return true;
      }

      return normalizeTitle(section.title) === normalizeTitle(catalogItem.presetTitle);
    }).length;

    return {
      ...catalogItem,
      existingCount,
      isDisabled: !catalogItem.allowMultiple && existingCount > 0,
    };
  });
}
