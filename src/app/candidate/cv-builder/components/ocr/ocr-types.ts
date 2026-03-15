"use client";

import { Path } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import type { CVSection } from "../../types";
import { buildRichOutlineNodesFromEntries } from "../../outline-utils";

export interface OCRExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  confidence: number;
}

export interface OCREducationItem {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  confidence: number;
}

export interface OCRProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string;
  confidence: number;
}

export interface OCRCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  confidence: number;
}

export interface OCRSkillItem {
  id: string;
  name: string;
  level: number;
}

export interface OCRDraftData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
  experiences: OCRExperienceItem[];
  educations: OCREducationItem[];
  skills: OCRSkillItem[];
  projects: OCRProjectItem[];
  certifications: OCRCertificationItem[];
}

export interface OCRBoundingBox {
  id: string;
  label: string;
  text: string;
  fieldPath: Path<OCRDraftData>;
  confidence: number;
  rect: { x: number; y: number; width: number; height: number };
}

export interface RawOCRBlock {
  id: string;
  text: string;
  page?: number;
  label?: string;
  confidence: number;
  column?: "left" | "right" | "full_width";
  rect: { x: number; y: number; width: number; height: number };
}

function normalizeBlockText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function blockArea(block: RawOCRBlock): number {
  return Math.max(0, block.rect.width) * Math.max(0, block.rect.height);
}

function blockIoU(left: RawOCRBlock, right: RawOCRBlock): number {
  const leftX1 = left.rect.x;
  const leftY1 = left.rect.y;
  const leftX2 = left.rect.x + left.rect.width;
  const leftY2 = left.rect.y + left.rect.height;

  const rightX1 = right.rect.x;
  const rightY1 = right.rect.y;
  const rightX2 = right.rect.x + right.rect.width;
  const rightY2 = right.rect.y + right.rect.height;

  const interX1 = Math.max(leftX1, rightX1);
  const interY1 = Math.max(leftY1, rightY1);
  const interX2 = Math.min(leftX2, rightX2);
  const interY2 = Math.min(leftY2, rightY2);
  if (interX2 <= interX1 || interY2 <= interY1) {
    return 0;
  }

  const intersection = (interX2 - interX1) * (interY2 - interY1);
  const union = blockArea(left) + blockArea(right) - intersection;
  return union > 0 ? intersection / union : 0;
}

function looksLikeHeadingText(text: string): boolean {
  const normalized = normalizeBlockText(text);
  if (!normalized || normalized.length > 80) return false;
  if (normalized.split(/\s+/).length > 8) return false;
  if (/[.!?]/.test(normalized)) return false;

  const compact = stripAccents(normalized).replace(/\s+/g, "").toUpperCase();
  if (/(HOCVAN|DUAN|PROJECTS?|KYNANG|SKILLS?|KINHNGHIEM|EXPERIENCE|LIENHE|CONTACT|CHUNGCHI|CERTIFICATE|CERTIFICATION|CERTIF)/i.test(compact)) {
    return true;
  }

  const letters = normalized.match(/[A-Za-zÀ-ỹ]/g) ?? [];
  const uppercase = normalized.match(/[A-ZÀ-Ỹ]/g) ?? [];
  return letters.length > 0 && uppercase.length / letters.length >= 0.65;
}

export function removeDuplicateBlocks(blocks: RawOCRBlock[]): RawOCRBlock[] {
  const uniqueBlocks: RawOCRBlock[] = [];

  const sortedBlocks = [...blocks].sort((left, right) => {
    const pageDiff = (left.page ?? 1) - (right.page ?? 1);
    if (pageDiff !== 0) return pageDiff;
    const topDiff = left.rect.y - right.rect.y;
    if (Math.abs(topDiff) > 0.001) return topDiff;
    const leftDiff = left.rect.x - right.rect.x;
    if (Math.abs(leftDiff) > 0.001) return leftDiff;
    return blockArea(right) - blockArea(left);
  });

  for (const block of sortedBlocks) {
    const normalizedText = normalizeBlockText(block.text);
    if (!normalizedText) continue;

    const duplicateIndex = uniqueBlocks.findIndex((existing) => {
      return (existing.page ?? 1) === (block.page ?? 1)
        && normalizeBlockText(existing.text) === normalizedText
        && blockIoU(existing, block) > 0.7;
    });

    if (duplicateIndex === -1) {
      uniqueBlocks.push(block);
      continue;
    }

    const existing = uniqueBlocks[duplicateIndex];
    const preferred = looksLikeHeadingText(normalizedText)
      ? (blockArea(existing) >= blockArea(block) ? existing : block)
      : (existing.confidence > block.confidence
          ? existing
          : block.confidence > existing.confidence
            ? block
            : blockArea(existing) >= blockArea(block)
              ? existing
              : block);

    uniqueBlocks[duplicateIndex] = preferred;
  }

  return uniqueBlocks.sort((left, right) => {
    const pageDiff = (left.page ?? 1) - (right.page ?? 1);
    if (pageDiff !== 0) return pageDiff;
    const topDiff = left.rect.y - right.rect.y;
    if (Math.abs(topDiff) > 0.001) return topDiff;
    return left.rect.x - right.rect.x;
  });
}

export interface OriginalLayoutFormState {
  blocks: RawOCRBlock[];
}

export interface ParsedCVResponse {
  success: boolean;
  extraction_method: string;
  data: {
    full_name: string | null;
    job_title?: string | null;
    profile?: {
      full_name: string | null;
      job_title?: string | null;
      career_objective?: string | null;
      summary?: string | null;
    };
    contact: {
      email: string | null;
      phone: string | null;
      linkedin: string | null;
      address: string | null;
    };
    summary: string | null;
    skills: string[];
    experience: Array<{
      company: string | null;
      title: string | null;
      start_date: string | null;
      end_date: string | null;
      description: string | null;
    }>;
    education: Array<{
      institution: string | null;
      degree: string | null;
      field_of_study: string | null;
      start_date: string | null;
      end_date: string | null;
      gpa: string | null;
    }>;
    projects: Array<{
      name: string | null;
      description: string | null;
      technologies: string[];
      url: string | null;
    }>;
    certifications: Array<{
      name: string | null;
      issuer: string | null;
      date_obtained: string | null;
    }>;
    languages: string[];
    raw_text: string;
  };
  page_count: number;
  warnings: string[];
}

function fieldConfidence(...values: (string | null | undefined)[]): number {
  const filled = values.filter((value) => value && value.trim().length > 2).length;
  return Math.min(1, filled / Math.max(1, values.length));
}

export function cleanOCRText(text: string | null | undefined): string {
  if (!text) return "";

  let cleaned = text.normalize("NFC");

  cleaned = cleaned.replace(
    /([a-zA-ZÀ-ỹ]{2,})\s+([a-zA-ZÀ-ỹ])(?=[\s.,;:!?]|$)/g,
    "$1$2"
  );
  cleaned = cleaned.replace(
    /(^|[\s.,;:!?])([a-zA-ZÀ-ỹ])\s+([a-zA-ZÀ-ỹ]{2,})/g,
    "$1$2$3"
  );
  cleaned = cleaned.replace(
    /([A-Za-zĐđ]{2,})\s+([àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ])/g,
    "$1$2"
  );
  cleaned = cleaned.replace(/([a-zà-ỹ])([A-ZÀ-Ỹ])/g, "$1 $2");
  cleaned = cleaned.replace(/(?<=\w)\s+(?=@)/g, "");
  cleaned = cleaned.replace(/(?<=@)\s+(?=\w)/g, "");
  cleaned = cleaned.replace(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+)\.\s+([A-Z]{2,})/gi,
    "$1.$2"
  );

  cleaned = cleaned
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?![\s\n]|$)/g, "$1 ")
    .replace(/\s*-\s*/g, " - ");

  cleaned = cleaned
    .replace(/\bThong\s+tin\s+ca\s+nhan\b/gi, "Thông tin cá nhân")
    .replace(/\bDia\s+diem\b/gi, "Địa điểm")
    .replace(/\bDai\s+h[oọ]c\b/gi, "Đại học")
    .replace(/\bHung\s+Vur?ong\b/gi, "Hùng Vương")
    .replace(/TPH[8B]?\s*Chi\s*Minh/gi, "TP.HCM")
    .replace(/\bSinh\s+vien\s+nam\s+3\b/gi, "Sinh viên năm 3")
    .replace(/\bChuyen\s+nganh\b/gi, "Chuyên ngành")
    .replace(/\bNgon\s*ngu\b/gi, "Ngôn ngữ")
    .replace(/\bdoi\s*tac\b/gi, "đối tác")
    .replace(/\bxay\s*dung\b/gi, "xây dựng")
    .replace(/\bhien\s*tai\b/gi, "hiện tại")
    .replace(/\bCong\s+nghe\s+phan\s+me[mé]\w*\b/gi, "Công nghệ phần mềm")
    .replace(/\bthong\s+thao\b/gi, "thông thạo")
    .replace(/\bwebsit\b/gi, "website")
    .replace(/\bso\s+dung\b/gi, "sử dụng")
    .replace(/\bduroc\b/gi, "được")
    .replace(/\btrien\s+khai\b/gi, "triển khai")
    .replace(/\bTalwindc?SS\b/gi, "TailwindCSS")
    .replace(/\bJavaMal\b/g, "JavaMail")
    .replace(/\bVaitro\b/gi, "Vai trò")
    .replace(/\bReact\s+JS\b/g, "ReactJS")
    .replace(/\bNode\s+JS\b/g, "NodeJS")
    .replace(/\bTailwind\s+CSS\b/g, "TailwindCSS")
    .replace(/\bJava\s+Script\b/g, "JavaScript")
    .replace(/\bMy\s+SQL\b/g, "MySQL")
    .replace(/\/\/+/g, " / ");

  return cleaned.replace(/\s+/g, " ").trim();
}

export function transformParsedCVToDraft(
  parsed: ParsedCVResponse["data"]
): OCRDraftData {
  const profile = parsed.profile;

  const experiences = parsed.experience
    .map((exp) => ({
      id: uuidv4(),
      company: cleanOCRText(exp.company),
      position: cleanOCRText(exp.title),
      startDate: cleanOCRText(exp.start_date),
      endDate: cleanOCRText(exp.end_date),
      description: cleanOCRText(exp.description),
      confidence: fieldConfidence(exp.company, exp.title, exp.description),
    }))
    .filter((exp) =>
      [exp.company, exp.position, exp.startDate, exp.endDate, exp.description].some(
        (value) => value.trim().length > 0
      )
    );

  const educations = parsed.education
    .map((edu) => ({
      id: uuidv4(),
      institution: cleanOCRText(edu.institution),
      degree: cleanOCRText(
        edu.degree
          ? edu.field_of_study
            ? `${edu.degree} - ${edu.field_of_study}`
            : edu.degree
          : edu.field_of_study
      ),
      startDate: cleanOCRText(edu.start_date),
      endDate: cleanOCRText(edu.end_date),
      confidence: fieldConfidence(
        edu.institution,
        edu.degree,
        edu.field_of_study
      ),
    }))
    .filter((edu) =>
      [edu.institution, edu.degree, edu.startDate, edu.endDate].some(
        (value) => value.trim().length > 0
      )
    );

  const skills = parsed.skills
    .map((skill) => ({
      id: uuidv4(),
      name: cleanOCRText(skill),
      level: 70,
    }))
    .filter((skill) => skill.name.trim().length > 0);

  const projects = parsed.projects
    .map((project) => ({
      id: uuidv4(),
      name: cleanOCRText(project.name),
      description: cleanOCRText(project.description),
      technologies: cleanOCRText(project.technologies.join(", ")),
      confidence: fieldConfidence(project.name, project.description),
    }))
    .filter((project) =>
      [project.name, project.description, project.technologies].some(
        (value) => value.trim().length > 0
      )
    );

  const certifications = parsed.certifications
    .map((cert) => ({
      id: uuidv4(),
      name: cleanOCRText(cert.name),
      issuer: cleanOCRText(cert.issuer),
      date: cleanOCRText(cert.date_obtained),
      confidence: fieldConfidence(cert.name, cert.issuer, cert.date_obtained),
    }))
    .filter((cert) =>
      [cert.name, cert.issuer, cert.date].some((value) => value.trim().length > 0)
    );

  return {
    fullName: cleanOCRText(profile?.full_name ?? parsed.full_name),
    title: cleanOCRText(profile?.job_title ?? parsed.job_title),
    email: cleanOCRText(parsed.contact.email),
    phone: cleanOCRText(parsed.contact.phone),
    address: cleanOCRText(parsed.contact.address),
    summary: cleanOCRText(profile?.career_objective ?? profile?.summary ?? parsed.summary),
    experiences,
    educations,
    skills,
    projects,
    certifications,
  };
}

export function hasMeaningfulDraftData(
  draft: OCRDraftData | null | undefined
): boolean {
  if (!draft) return false;

  const scalarScore = [
    draft.fullName &&
      draft.fullName.trim() &&
      draft.fullName.trim().toLowerCase() !== "bạn",
    draft.title && draft.title.trim(),
    draft.email && draft.email.trim(),
    draft.phone && draft.phone.trim(),
    draft.address && draft.address.trim(),
    draft.summary && draft.summary.trim().length > 20,
  ].filter(Boolean).length;

  const collectionScore =
    draft.experiences.length * 2 +
    draft.educations.length * 2 +
    draft.projects.length * 2 +
    draft.certifications.length +
    draft.skills.length;

  return scalarScore + collectionScore >= 5;
}

export function transformDraftToSections(draft: OCRDraftData): CVSection[] {
  const sections: CVSection[] = [];

  sections.push({
    id: uuidv4(),
    type: "header",
    isVisible: true,
    containerId: "main-column",
    data: {
      fullName: draft.fullName,
      title: draft.title,
    },
  });

  sections.push({
    id: uuidv4(),
    type: "personal_info",
    isVisible: true,
    containerId: "sidebar-column",
    data: {
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
    },
  });

  if (draft.summary) {
    sections.push({
      id: uuidv4(),
      type: "summary",
      title: "Tổng quan",
      isVisible: true,
      containerId: "main-column",
      data: { text: draft.summary },
    });
  }

  if (draft.experiences.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.experiences.map((exp) => ({
          id: exp.id,
          company: exp.company,
          position: exp.position,
          startDate: exp.startDate,
          endDate: exp.endDate,
          description: exp.description,
        })),
      },
    });
  }

  if (draft.educations.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "education_list",
      title: "Học vấn",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.educations.map((edu) => ({
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          startDate: edu.startDate,
          endDate: edu.endDate,
        })),
      },
    });
  }

  if (draft.skills.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      containerId: "sidebar-column",
      data: {
        items: draft.skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          level: skill.level,
        })),
      },
    });
  }

  if (draft.projects.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.projects.map((project) => ({
          id: project.id,
          name: project.name,
          role: "",
          startDate: "",
          endDate: "",
          description: project.description,
          technologies: project.technologies,
        })),
      },
    });
  }

  if (draft.certifications.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "certificate_list",
      title: "Chứng chỉ",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.certifications.map((cert) => ({
          id: cert.id,
          name: cert.name,
          issuer: cert.issuer,
          date: cert.date,
        })),
      },
    });
  }

  return sections;
}

type OCRSectionBucket =
  | "objective"
  | "skills"
  | "education"
  | "experience"
  | "projects"
  | "certifications"
  | "activities"
  | "interests"
  | "other";

const OCR_SECTION_PATTERNS: Array<[OCRSectionBucket, RegExp]> = [
  ["objective", /MỤC TIÊU|OBJECTIVE|GIỚI THIỆU|VỀ BẢN THÂN/i],
  ["skills", /KỸ NĂNG|SKILLS|NĂNG LỰC/i],
  ["education", /HỌC VẤN|EDUCATION|TRÌNH ĐỘ/i],
  ["experience", /KINH NGHIỆM|EXPERIENCE|CÔNG TÁC/i],
  ["projects", /DỰ ÁN|PROJECTS|ĐỒ ÁN/i],
  ["certifications", /CHỨNG CHỈ|CERTIFIC|GIẤY CHỨNG NHẬN/i],
  ["activities", /HOẠT ĐỘNG|ACTIVITIES|NGOẠI KHÓA/i],
  ["interests", /SỞ THÍCH|INTERESTS|HOBBIES/i],
];

function detectOCRSectionHeader(text: string): OCRSectionBucket | null {
  const normalized = cleanOCRText(text).toUpperCase();
  for (const [bucket, pattern] of OCR_SECTION_PATTERNS) {
    if (pattern.test(normalized) && normalized.length <= 60) {
      return bucket;
    }
  }
  return null;
}

function isLikelyEmail(text: string): boolean {
  return /@/.test(text);
}

function isLikelyPhone(text: string): boolean {
  const digits = text.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

function isLikelyLink(text: string): boolean {
  return /linkedin|github|facebook|https?:\/\/|www\./i.test(text);
}

function isLikelyAddress(text: string): boolean {
  return /đường|street|quận|district|tp\.?|hồ chí minh|hà nội|address|phường|ward/i.test(
    text
  );
}

function formatBucketLines(
  entries: Array<{ text: string; x: number }>
): string {
  if (!entries.length) return "";

  const minX = Math.min(...entries.map((entry) => entry.x));
  const indentCandidates = entries
    .map((entry) => entry.x - minX)
    .filter((offset) => offset > 1.2)
    .sort((a, b) => a - b);
  const indentStep = Math.max(2.4, Math.min(indentCandidates[0] ?? 4.5, 8));

  return entries
    .map((entry) => {
      const cleaned = cleanOCRText(entry.text);
      const offset = Math.max(0, entry.x - minX);
      const level = Math.max(0, Math.min(4, Math.round(offset / indentStep)));
      return `${"  ".repeat(level)}${cleaned}`;
    })
    .join("\n")
    .trim();
}

function sortRawBlocksByLayout(blocks: RawOCRBlock[]): RawOCRBlock[] {
  const columnRank = (block: RawOCRBlock): number => {
    if (block.column === "full_width") return block.rect.y < 20 ? 0 : 3;
    if (block.column === "left") return 1;
    if (block.column === "right") return 2;
    return 1;
  };

  return [...blocks].sort((a, b) => {
    const rankDiff = columnRank(a) - columnRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.rect.y - b.rect.y || a.rect.x - b.rect.x;
  });
}

function extractSkillItems(
  entries: Array<{ text: string; x: number }>
): OCRDraftData["skills"] {
  const skills: OCRDraftData["skills"] = [];
  for (const entry of entries) {
    const cleaned = cleanOCRText(entry.text).replace(/^[•\-*]+\s*/, "").trim();
    if (!cleaned) continue;
    const chunks = cleaned.split(/[,/|]+/).map((chunk) => chunk.trim()).filter(Boolean);
    for (const chunk of chunks.length > 1 ? chunks : [cleaned]) {
      if (chunk.length < 2) continue;
      skills.push({ id: uuidv4(), name: chunk, level: 70 });
    }
  }

  return skills.filter(
    (skill, index, source) =>
      source.findIndex(
        (candidate) => candidate.name.toLowerCase() === skill.name.toLowerCase()
      ) === index
  );
}

export function transformRawBlocksToSections(
  blocks: RawOCRBlock[],
  draft?: OCRDraftData | null
): CVSection[] {
  const orderedBlocks = sortRawBlocksByLayout(blocks);

  const buckets: Record<OCRSectionBucket, Array<{ text: string; x: number }>> = {
    objective: [],
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    activities: [],
    interests: [],
    other: [],
  };

  const contact = {
    email: draft?.email || "",
    phone: draft?.phone || "",
    address: draft?.address || "",
    socials: [] as { network: string; url: string }[],
  };

  let inferredName = draft?.fullName || "";
  let inferredTitle = draft?.title || "";
  let currentBucket: OCRSectionBucket | null = null;

  for (const block of orderedBlocks) {
    const text = cleanOCRText(block.text);
    if (!text) continue;

    const headerBucket = detectOCRSectionHeader(text);
    if (headerBucket) {
      currentBucket = headerBucket;
      continue;
    }

    if (!inferredName && block.rect.y < 20 && block.rect.width > 20 && text.length < 60) {
      inferredName = text;
      continue;
    }

    if (!inferredTitle && block.rect.y < 24 && text.length < 60) {
      inferredTitle = text;
      continue;
    }

    if (!contact.email && isLikelyEmail(text)) {
      contact.email = text;
      continue;
    }

    if (!contact.phone && isLikelyPhone(text)) {
      contact.phone = text;
      continue;
    }

    if (isLikelyLink(text)) {
      contact.socials.push({
        network: text.includes("linkedin")
          ? "LinkedIn"
          : text.includes("github")
            ? "GitHub"
            : "Link",
        url: text,
      });
      continue;
    }

    if (!contact.address && isLikelyAddress(text)) {
      contact.address = text;
      continue;
    }

    (currentBucket ? buckets[currentBucket] : buckets.other).push({
      text,
      x: block.rect.x,
    });
  }

  const objectiveText = formatBucketLines(buckets.objective);
  const derivedDraft: OCRDraftData = {
    fullName: inferredName || draft?.fullName || "",
    title: inferredTitle || draft?.title || "",
    email: contact.email || draft?.email || "",
    phone: contact.phone || draft?.phone || "",
    address: contact.address || draft?.address || "",
    summary: objectiveText || draft?.summary || "",
    experiences: draft?.experiences ?? [],
    educations: draft?.educations ?? [],
    skills: buckets.skills.length > 0 ? extractSkillItems(buckets.skills) : (draft?.skills ?? []),
    projects: draft?.projects ?? [],
    certifications: draft?.certifications ?? [],
  };

  const sections: CVSection[] = hasMeaningfulDraftData(derivedDraft)
    ? transformDraftToSections(derivedDraft)
    : [
        {
          id: uuidv4(),
          type: "header",
          isVisible: true,
          containerId: "main-column",
          data: {
            fullName: inferredName,
            title: inferredTitle,
          },
        },
        {
          id: uuidv4(),
          type: "personal_info",
          isVisible: true,
          containerId: "main-column",
          data: {
            email: contact.email,
            phone: contact.phone,
            address: contact.address,
            socials: contact.socials,
          },
        },
      ];

  if (!hasMeaningfulDraftData(derivedDraft) && objectiveText) {
    sections.push({
      id: uuidv4(),
      type: "summary",
      title: "Mục tiêu nghề nghiệp",
      isVisible: true,
      containerId: "main-column",
      data: { text: objectiveText },
    });
  }

  const _deprecatedCustomSectionMap: Array<[OCRSectionBucket, string]> = [
    ["skills", "Kỹ năng"],
    ["education", "Học vấn"],
    ["experience", "Kinh nghiệm làm việc"],
    ["projects", "Dự án"],
    ["certifications", "Chứng chỉ"],
    ["activities", "Hoạt động"],
    ["interests", "Sở thích"],
    ["other", "Nội dung khác"],
  ];

  const customSectionMap: Array<[OCRSectionBucket, string]> = [
    ["activities", "Hoạt động"],
    ["interests", "Sở thích"],
    ["other", "Nội dung khác"],
  ];

  for (const [bucket, title] of customSectionMap) {
    const nodes = buildRichOutlineNodesFromEntries(
      buckets[bucket].map((entry) => ({
        text: cleanOCRText(entry.text),
        x: entry.x,
      }))
    );
    if (!nodes.length) continue;

    sections.push({
      id: uuidv4(),
      type: "rich_outline",
      title,
      isVisible: true,
      containerId: "main-column",
      data: { nodes },
    });
  }

  return sections;
}

export function generateMockBoundingBoxes(draft: OCRDraftData): OCRBoundingBox[] {
  const boxes: OCRBoundingBox[] = [];
  let currentY = 5;

  const addBox = (
    label: string,
    text: string,
    fieldPath: Path<OCRDraftData>,
    width: number,
    height: number,
    confidence = 0.9
  ) => {
    if (!text) return;

    boxes.push({
      id: uuidv4(),
      label,
      text,
      fieldPath,
      confidence,
      rect: { x: 10, y: currentY, width, height },
    });

    currentY += height + 2;
  };

  addBox("Họ và tên", draft.fullName, "fullName", 50, 4);
  addBox("Vị trí", draft.title, "title", 40, 3);
  addBox("Email", draft.email, "email", 30, 3);
  addBox("Số điện thoại", draft.phone, "phone", 30, 3);
  addBox("Địa chỉ", draft.address, "address", 60, 3);
  addBox("Giới thiệu", draft.summary, "summary", 80, 8);

  draft.experiences.forEach((exp, index) => {
    addBox(
      `Vị trí (${index + 1})`,
      exp.position,
      `experiences.${index}.position`,
      50,
      3,
      exp.confidence
    );
    addBox(
      `Công ty (${index + 1})`,
      exp.company,
      `experiences.${index}.company`,
      60,
      3,
      exp.confidence
    );
    addBox(
      `Mô tả (${index + 1})`,
      exp.description,
      `experiences.${index}.description`,
      80,
      6,
      exp.confidence
    );
  });

  draft.educations.forEach((edu, index) => {
    addBox(
      `Trường (${index + 1})`,
      edu.institution,
      `educations.${index}.institution`,
      60,
      3,
      edu.confidence
    );
    addBox(
      `Ngành (${index + 1})`,
      edu.degree,
      `educations.${index}.degree`,
      50,
      3,
      edu.confidence
    );
  });

  return boxes;
}

export function generateMockOCRBlocks(draft: OCRDraftData): RawOCRBlock[] {
  const blocks: RawOCRBlock[] = [];

  const addBlock = (
    label: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    confidence = 0.9
  ) => {
    if (!text) return;

    blocks.push({
      id: uuidv4(),
      text,
      label,
      confidence,
      rect: { x, y, width, height },
    });
  };

  addBlock("fullName", draft.fullName, 30, 5, 40, 5);
  addBlock("title", draft.title, 40, 11, 20, 3);

  let leftY = 20;
  addBlock("address", draft.address, 5, leftY, 25, 3);
  leftY += 4;
  addBlock("phone", draft.phone, 5, leftY, 25, 3);
  leftY += 4;
  addBlock("email", draft.email, 5, leftY, 25, 3);
  leftY += 8;

  addBlock("summary", draft.summary, 5, leftY, 25, 10);
  leftY += 12;

  draft.skills.forEach((skill) => {
    addBlock("skill", skill.name, 5, leftY, 25, 2);
    leftY += 3;
  });

  let rightY = 20;
  draft.experiences.forEach((exp) => {
    addBlock("position", exp.position, 35, rightY, 60, 3, exp.confidence);
    rightY += 3.5;
    addBlock("company", exp.company, 35, rightY, 60, 2.5, exp.confidence);
    rightY += 3.5;
    addBlock(
      "date",
      `${exp.startDate} - ${exp.endDate}`,
      35,
      rightY,
      60,
      2.5,
      exp.confidence
    );
    rightY += 3.5;
    addBlock(
      "description",
      exp.description,
      35,
      rightY,
      60,
      10,
      exp.confidence
    );
    rightY += 12;
  });

  draft.educations.forEach((edu) => {
    addBlock(
      "institution",
      edu.institution,
      35,
      rightY,
      60,
      3,
      edu.confidence
    );
    rightY += 3.5;
    addBlock("degree", edu.degree, 35, rightY, 60, 2.5, edu.confidence);
    rightY += 3.5;
    addBlock(
      "date",
      `${edu.startDate} - ${edu.endDate}`,
      35,
      rightY,
      60,
      2.5,
      edu.confidence
    );
    rightY += 5;
  });

  return blocks.map((block) => ({ ...block, text: cleanOCRText(block.text) }));
}
