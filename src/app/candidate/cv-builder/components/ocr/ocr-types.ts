"use client";

// ── Types for OCR Draft Data ──────────────────────────────────
// Flat structure for react-hook-form, maps to ParsedCV from FastAPI

import { v4 as uuidv4 } from "uuid";
import type { CVSection } from "../../types";

export interface OCRExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  confidence: number; // 0-1, how confident AI is about this data
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

import { Path } from "react-hook-form";

// ── Bounding Box Types ────────────────────────────────────────
export interface OCRBoundingBox {
  id: string;
  label: string;
  text: string;
  fieldPath: Path<OCRDraftData>;
  confidence: number;
  rect: { x: number; y: number; width: number; height: number };
}

// ── Raw Layout block types (for Native Editing) ───────────────
export interface RawOCRBlock {
  id: string;
  text: string;
  label?: string;
  confidence: number;
  rect: { x: number; y: number; width: number; height: number };
}

export interface OriginalLayoutFormState {
  blocks: RawOCRBlock[];
}

// ── ParsedCV response shape (mirrors FastAPI models.py) ───────
export interface ParsedCVResponse {
  success: boolean;
  extraction_method: string;
  data: {
    full_name: string | null;
    job_title?: string | null;
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

// ── Confidence scoring ────────────────────────────────────────
// Simple heuristic: field is high-confidence if non-empty & length > 2
function fieldConfidence(...values: (string | null | undefined)[]): number {
  const filled = values.filter((v) => v && v.trim().length > 2).length;
  return Math.min(1, filled / Math.max(1, values.length));
}

// ── Clean OCR Text ──────────────────────────────────────────────
// Loại bỏ khoảng trắng sai lệch do OCR (ví dụ: "Tư vấ n" -> "Tư vấn", "Ti ế ng" -> "Tiếng")
export function cleanOCRText(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text.normalize("NFC");
  
  // Dồn các ký tự bị tách lẻ do engine OCR: (chữ dài) + (1 khoảng trắng) + (1 ký tự đơn)
  cleaned = cleaned.replace(/([a-zA-ZÀ-ỹ]{2,})\s+([a-zA-ZÀ-ỹ])(?=[\s.,;:!?]|$)/g, '$1$2');
  
  // Hoặc ngược lại: (1 ký tự đơn) + (1 khoảng trắng) + (chữ dài) 
  cleaned = cleaned.replace(/(^|[\s.,;:!?])([a-zA-ZÀ-ỹ])\s+([a-zA-ZÀ-ỹ]{2,})/g, '$1$2$3');

  return cleaned.replace(/\s+/g, ' ').trim();
}

// ── Transform ParsedCV → OCRDraftData ─────────────────────────
export function transformParsedCVToDraft(
  parsed: ParsedCVResponse["data"]
): OCRDraftData {
  return {
    fullName: cleanOCRText(parsed.full_name),
    title: cleanOCRText(parsed.job_title),
    email: cleanOCRText(parsed.contact.email),
    phone: cleanOCRText(parsed.contact.phone),
    address: cleanOCRText(parsed.contact.address),
    summary: cleanOCRText(parsed.summary),
    experiences: parsed.experience.map((exp) => ({
      id: uuidv4(),
      company: cleanOCRText(exp.company),
      position: cleanOCRText(exp.title),
      startDate: cleanOCRText(exp.start_date),
      endDate: cleanOCRText(exp.end_date),
      description: cleanOCRText(exp.description),
      confidence: fieldConfidence(exp.company, exp.title, exp.description),
    })),
    educations: parsed.education.map((edu) => ({
      id: uuidv4(),
      institution: cleanOCRText(edu.institution),
      degree: cleanOCRText(edu.degree
        ? edu.field_of_study
          ? `${edu.degree} - ${edu.field_of_study}`
          : edu.degree
        : edu.field_of_study),
      startDate: cleanOCRText(edu.start_date),
      endDate: cleanOCRText(edu.end_date),
      confidence: fieldConfidence(edu.institution, edu.degree),
    })),
    skills: parsed.skills.map((skill) => ({
      id: uuidv4(),
      name: cleanOCRText(skill),
      level: 70, // default level
    })),
    projects: parsed.projects.map((proj) => ({
      id: uuidv4(),
      name: cleanOCRText(proj.name),
      description: cleanOCRText(proj.description),
      technologies: cleanOCRText(proj.technologies.join(", ")),
      confidence: fieldConfidence(proj.name, proj.description),
    })),
    certifications: parsed.certifications.map((cert) => ({
      id: uuidv4(),
      name: cleanOCRText(cert.name),
      issuer: cleanOCRText(cert.issuer),
      date: cleanOCRText(cert.date_obtained),
      confidence: fieldConfidence(cert.name, cert.issuer),
    })),
  };
}

// ── Transform OCRDraftData → CVSection[] ──────────────────────
// This maps the flat draft form data into the shape expected by useCVStore
export function transformDraftToSections(draft: OCRDraftData): CVSection[] {
  const sections: CVSection[] = [];

  // Header
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

  // Personal Info
  sections.push({
    id: uuidv4(),
    type: "personal_info",
    isVisible: true,
    containerId: "main-column",
    data: {
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
    },
  });

  // Summary
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

  // Experience
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

  // Education
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

  // Skills
  if (draft.skills.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "skill_list",
      title: "Kỹ năng",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.skills.map((s) => ({
          id: s.id,
          name: s.name,
          level: s.level,
        })),
      },
    });
  }

  // Projects
  if (draft.projects.length > 0) {
    sections.push({
      id: uuidv4(),
      type: "project_list",
      title: "Dự án",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: draft.projects.map((proj) => ({
          id: proj.id,
          name: proj.name,
          role: "",
          startDate: "",
          endDate: "",
          description: proj.description,
          technologies: proj.technologies,
        })),
      },
    });
  }

  // Certifications
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

// ── Helper to Generate Mock Bounding Boxes ─────────────────────
// Vì backend hiện tại (Qwen-VL endpoint) chưa trả về tọa độ bounding box,
// hàm này sẽ tạo mock bounding boxes dựa trên dữ liệu để trình diễn UI.
export function generateMockBoundingBoxes(draft: OCRDraftData): OCRBoundingBox[] {
  const boxes: OCRBoundingBox[] = [];
  let currentY = 5; // Bắt đầu từ 5% top

  const addBox = (label: string, text: string, fieldPath: Path<OCRDraftData>, width: number, height: number, confidence: number = 0.9) => {
    if (!text) return;
    boxes.push({
      id: uuidv4(),
      label,
      text,
      fieldPath,
      confidence,
      rect: { x: 10, y: currentY, width, height }
    });
    currentY += height + 2; // margin 2%
  };

  addBox("Họ và tên", draft.fullName, "fullName", 50, 4);
  addBox("Vị trí", draft.title, "title", 40, 3);
  addBox("Email", draft.email, "email", 30, 3);
  addBox("Số điện thoại", draft.phone, "phone", 30, 3);
  addBox("Địa chỉ", draft.address, "address", 60, 3);
  addBox("Giới thiệu", draft.summary, "summary", 80, 8);

  draft.experiences.forEach((exp, i) => {
    addBox(`Vị trí (${i+1})`, exp.position, `experiences.${i}.position`, 50, 3, exp.confidence);
    addBox(`Công ty (${i+1})`, exp.company, `experiences.${i}.company`, 60, 3, exp.confidence);
    addBox(`Mô tả (${i+1})`, exp.description, `experiences.${i}.description`, 80, 6, exp.confidence);
  });

  draft.educations.forEach((edu, i) => {
    addBox(`Trường (${i+1})`, edu.institution, `educations.${i}.institution`, 60, 3, edu.confidence);
    addBox(`Ngành (${i+1})`, edu.degree, `educations.${i}.degree`, 50, 3, edu.confidence);
  });

  return boxes;
}

// ── Generate Mock Raw Blocks for Original Layout Editor ────────
// Tạo layout dạng 2 cột để mô phỏng một CV gốc
export function generateMockOCRBlocks(draft: OCRDraftData): RawOCRBlock[] {
  const blocks: RawOCRBlock[] = [];
  
  const addBlock = (label: string, text: string, x: number, y: number, w: number, h: number, conf: number = 0.9) => {
    if (!text) return;
    blocks.push({
      id: uuidv4(),
      text,
      label,
      confidence: conf,
      rect: { x, y, width: w, height: h }
    });
  };

  // Header (Top center)
  addBlock("fullName", draft.fullName, 30, 5, 40, 5);
  addBlock("title", draft.title, 40, 11, 20, 3);
  
  // Left Column (Contact, Skills)
  let leftY = 20;
  addBlock("address", draft.address, 5, leftY, 25, 3); leftY += 4;
  addBlock("phone", draft.phone, 5, leftY, 25, 3); leftY += 4;
  addBlock("email", draft.email, 5, leftY, 25, 3); leftY += 8;

  addBlock("Summary", draft.summary, 5, leftY, 25, 10); leftY += 12;

  draft.skills.forEach(s => {
    addBlock("skill", s.name, 5, leftY, 25, 2);
    leftY += 3;
  });

  // Right Column (Experience, Education)
  let rightY = 20;
  draft.experiences.forEach(exp => {
    addBlock("position", exp.position, 35, rightY, 60, 3, exp.confidence); rightY += 3.5;
    addBlock("company", exp.company, 35, rightY, 60, 2.5, exp.confidence); rightY += 3.5;
    addBlock("date", `${exp.startDate} - ${exp.endDate}`, 35, rightY, 60, 2.5, exp.confidence); rightY += 3.5;
    addBlock("description", exp.description, 35, rightY, 60, 10, exp.confidence); rightY += 12;
  });

  draft.educations.forEach(edu => {
    addBlock("institution", edu.institution, 35, rightY, 60, 3, edu.confidence); rightY += 3.5;
    addBlock("degree", edu.degree, 35, rightY, 60, 2.5, edu.confidence); rightY += 3.5;
    addBlock("date", `${edu.startDate} - ${edu.endDate}`, 35, rightY, 60, 2.5, edu.confidence); rightY += 5;
  });

  // Chạy qua dọn text một lần nữa do mockup kết nối nối chuỗi
  return blocks.map(b => ({ ...b, text: cleanOCRText(b.text) }));
}
