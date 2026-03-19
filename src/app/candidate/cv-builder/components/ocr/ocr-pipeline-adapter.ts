"use client";

import type { AnalysisSectionState } from "./OCRAnalysisPanel";
import {
  type OCRDraftData,
  type RawOCRBlock,
  hasMeaningfulDraftData,
  transformParsedCVToDraft,
} from "./ocr-types";
import { toLegacyCompatibleBlocks } from "@/features/cv-import/transforms/block-layout";
import type { CVSection } from "../../types";

export type LegacyDocumentType = "cv" | "non_cv_document";

export type PreviewKind = "image" | "pdf" | "docx" | "unknown";

export interface PaddleBlock {
  text: string;
  bbox: [[number, number], [number, number], [number, number], [number, number]];
  confidence: number;
  page: number;
  column?: "left" | "right" | "full_width";
  rect: { x: number; y: number; width: number; height: number };
}

export interface DetectedSectionPayload {
  type: string;
  title: string;
  content: string;
  items: Array<Record<string, unknown>>;
  line_ids: string[];
  block_indices: number[];
}

export interface UploadCVResponseData {
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
}

export interface UploadCVResponse {
  success: boolean;
  document_type?: LegacyDocumentType;
  document_confidence?: number;
  document_signals?: string[];
  content?: string;
  extraction_method: string;
  ocr_provider?: string;
  data: UploadCVResponseData;
  detected_sections: DetectedSectionPayload[];
  builder_sections: CVSection[];
  raw_text: string;
  pages: Array<{
    page: number;
    image_width: number;
    image_height: number;
    blocks: PaddleBlock[];
  }>;
  page_count: number;
  total_blocks: number;
  warnings: string[];
  meta?: Record<string, unknown>;
  debug?: Record<string, unknown>;
  raw_ocr?: Record<string, unknown>;
}

export interface AdaptedLegacyOCRResult {
  rawBlocks: RawOCRBlock[];
  draftData: OCRDraftData | null;
  backendSections: CVSection[] | null;
  detectedSections: DetectedSectionPayload[];
  documentType: LegacyDocumentType;
  documentContent: string;
  analysisSections: AnalysisSectionState[];
  meta: Record<string, unknown>;
  debug: Record<string, unknown>;
}

const NON_CV_ANALYSIS_SECTIONS: AnalysisSectionState[] = [
  {
    key: "personal",
    label: "Loại tài liệu",
    detail: "Đã xác định đây là tài liệu tổng quát, không chỉ riêng CV.",
    state: "done",
  },
  {
    key: "skills",
    label: "OCR extraction",
    detail: "Đã trích xuất toàn bộ nội dung văn bản.",
    state: "done",
  },
  {
    key: "education",
    label: "CV parsing",
    detail: "Giữ nội dung đầy đủ thay vì ép map sai sang schema CV.",
    state: "done",
  },
  {
    key: "experience",
    label: "Final content",
    detail: "Đã dựng nội dung cuối cùng để bạn rà soát và lưu.",
    state: "done",
  },
];

function resolveDocumentType(response: UploadCVResponse): LegacyDocumentType {
  const hasCvLikeSections = (response.detected_sections || []).some((section) =>
    [
      "career_objective",
      "work_experience",
      "projects",
      "skills",
      "education",
      "contact",
      "certifications",
      "activities",
      "interests",
    ].includes(section.type),
  );
  const hasCvLikeBuilderSections = (response.builder_sections || []).some((section) =>
    [
      "summary",
      "personal_info",
      "skill_list",
      "education_list",
      "experience_list",
      "project_list",
      "certificate_list",
      "rich_outline",
    ].includes(String(section.type || "")),
  );

  if (response.document_type === "non_cv_document" && (hasCvLikeSections || hasCvLikeBuilderSections)) {
    return "cv";
  }

  return response.document_type === "non_cv_document" ? "non_cv_document" : "cv";
}

function buildSectionLabelMap(detectedSections: DetectedSectionPayload[]) {
  const sectionLabelByBlockIndex = new Map<number, string>();
  for (const section of detectedSections || []) {
    const firstBlockIndex = section.block_indices?.[0];
    if (typeof firstBlockIndex === "number" && section.title) {
      sectionLabelByBlockIndex.set(firstBlockIndex, section.title);
    }
  }
  return sectionLabelByBlockIndex;
}

function paddleBlocksToRaw(response: UploadCVResponse): RawOCRBlock[] {
  const blocks: Array<{
    id: string;
    page: number;
    text: string;
    confidence: number | null;
    bbox_px: { x: number; y: number; width: number; height: number };
    bbox_normalized: { x: number; y: number; width: number; height: number };
    type: string;
    sequence: number;
  }> = [];
  const sectionLabelByBlockIndex = buildSectionLabelMap(response.detected_sections || []);

  let globalBlockIndex = 0;
  for (const page of response.pages || []) {
    for (const block of page.blocks || []) {
      const rect = {
        x: block.rect.x,
        y: block.rect.y,
        width: block.rect.width,
        height: block.rect.height,
      };
      blocks.push({
        id: `${block.page}-${block.bbox[0][0]}-${block.bbox[0][1]}-${block.bbox[2][0]}-${block.bbox[2][1]}`,
        text: block.text,
        page: block.page,
        confidence: block.confidence,
        bbox_px: {
          x: block.bbox[0][0],
          y: block.bbox[0][1],
          width: Math.max(0, block.bbox[2][0] - block.bbox[0][0]),
          height: Math.max(0, block.bbox[2][1] - block.bbox[0][1]),
        },
        bbox_normalized: {
          x: rect.x / 100,
          y: rect.y / 100,
          width: rect.width / 100,
          height: rect.height / 100,
        },
        type: sectionLabelByBlockIndex.get(globalBlockIndex) ? "title" : "text",
        sequence: globalBlockIndex,
      });
      globalBlockIndex += 1;
    }
  }

  return toLegacyCompatibleBlocks(blocks).map((block) => ({
    id: block.id,
    text: block.text,
    page: block.page,
    label: sectionLabelByBlockIndex.get(block.meta.reading_order),
    confidence: block.confidence,
    column: block.column,
    rect: block.rect,
    meta: block.meta,
  }));
}

function buildCompletedAnalysisSections(
  response: UploadCVResponse,
  documentType: LegacyDocumentType,
): AnalysisSectionState[] {
  if (documentType === "non_cv_document") {
    return NON_CV_ANALYSIS_SECTIONS;
  }

  const email = response.data.contact.email;
  const phone = response.data.contact.phone;

  return [
    {
      key: "personal",
      label: "Thông tin cá nhân",
      detail:
        email || phone
          ? "Đã trích xuất thông tin liên hệ."
          : "Đã nhận diện phần tiêu đề hồ sơ.",
      state: "done",
    },
    {
      key: "skills",
      label: "Kỹ năng",
      detail: `Đã trích xuất ${response.data.skills?.length || 0} kỹ năng.`,
      state: "done",
    },
    {
      key: "education",
      label: "Học vấn",
      detail: `Đã trích xuất ${response.data.education?.length || 0} mục học vấn.`,
      state: "done",
    },
    {
      key: "experience",
      label: "Kinh nghiệm",
      detail: `Đã trích xuất ${response.data.experience?.length || 0} mục kinh nghiệm.`,
      state: "done",
    },
  ];
}

function buildMeta(response: UploadCVResponse, documentType: LegacyDocumentType) {
  return {
    pipeline_version: "v2-legacy-adapter",
    document_type: documentType,
    document_confidence: response.document_confidence ?? null,
    document_signals: response.document_signals ?? [],
    extraction_method: response.extraction_method,
    ocr_provider: response.ocr_provider ?? null,
    page_count: response.page_count,
    total_blocks: response.total_blocks,
    warnings: response.warnings ?? [],
    ...(response.meta ?? {}),
  };
}

function buildDebug(response: UploadCVResponse, rawBlocks: RawOCRBlock[]) {
  return {
    raw_ocr: response.raw_ocr ?? null,
    layout: response.debug?.layout ?? response.debug?.raw_layout ?? null,
    markdown_pages: response.debug?.markdown_pages ?? [],
    layout_blocks: response.debug?.layout_blocks ?? [],
    raw_block_count: rawBlocks.length,
    ...(response.debug ?? {}),
  };
}

export function adaptUploadCVResponseToLegacyState(
  response: UploadCVResponse,
): AdaptedLegacyOCRResult {
  const documentType = resolveDocumentType(response);
  const rawBlocks = response.total_blocks > 0 ? paddleBlocksToRaw(response) : [];
  const parsedDraft = transformParsedCVToDraft(response.data);
  const draftData = hasMeaningfulDraftData(parsedDraft) ? parsedDraft : null;
  const documentContent = response.content || response.raw_text || "";
  const analysisSections = buildCompletedAnalysisSections(response, documentType);

  return {
    rawBlocks,
    draftData,
    backendSections: response.builder_sections?.length ? response.builder_sections : null,
    detectedSections: response.detected_sections || [],
    documentType,
    documentContent,
    analysisSections,
    meta: buildMeta(response, documentType),
    debug: buildDebug(response, rawBlocks),
  };
}
