"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, ScanLine, X } from "lucide-react";
import { OCRUploadZone } from "./OCRUploadZone";
import { OCRPipelineGuide } from "./OCRPipelineGuide";
import { OCRHelpDrawer } from "./OCRHelpDrawer";
import { OCRAnalysisPanel, type AnalysisSectionState } from "./OCRAnalysisPanel";
import { OCRFinalResultView } from "./OCRFinalResultView";
import { OriginalFilePreview } from "./OriginalFilePreview";
import {
  type OCRDraftData,
  type RawOCRBlock,
  hasMeaningfulDraftData,
  removeDuplicateBlocks,
  transformParsedCVToDraft,
  transformRawBlocksToSections,
} from "./ocr-types";
import type { CVSection } from "../../types";

interface OCRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sections: CVSection[]) => void | Promise<void>;
}

type ModalStep = "upload" | "workspace";
type PreviewKind = "image" | "pdf" | "docx" | "unknown";
type AnalysisStage = "pending" | "processing" | "done";

interface PaddleBlock {
  text: string;
  bbox: [[number, number], [number, number], [number, number], [number, number]];
  confidence: number;
  page: number;
  column?: "left" | "right" | "full_width";
  rect: { x: number; y: number; width: number; height: number };
}

interface DetectedSectionPayload {
  type: string;
  title: string;
  content: string;
  items: Array<Record<string, unknown>>;
  line_ids: string[];
  block_indices: number[];
}

interface OCRUploadResponse {
  success: boolean;
  page_count: number;
  total_blocks: number;
  pages: Array<{
    page: number;
    image_width: number;
    image_height: number;
    blocks: PaddleBlock[];
  }>;
  elapsed_seconds: number;
  warnings: string[];
}

interface UploadCVResponse extends OCRUploadResponse {
  document_type?: "cv" | "non_cv_document";
  content?: string;
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
  detected_sections: DetectedSectionPayload[];
  builder_sections: CVSection[];
  raw_text: string;
}

interface PreviewUploadResponse {
  success: boolean;
  file_type: "image" | "pdf" | "docx";
  preview_id: string;
  preview_url: string;
}

interface AnalysisSectionStateShape {
  key: "personal" | "skills" | "education" | "experience";
  label: string;
  detail: string;
  state: AnalysisStage;
}

const DEFAULT_ANALYSIS_SECTIONS: AnalysisSectionStateShape[] = [
  {
    key: "personal",
    label: "Thông tin cá nhân",
    detail: "Tên, liên hệ và phần tiêu đề hồ sơ",
    state: "pending",
  },
  {
    key: "skills",
    label: "Kỹ năng",
    detail: "Kỹ năng chính và công nghệ liên quan",
    state: "pending",
  },
  {
    key: "education",
    label: "Học vấn",
    detail: "Trường học, bằng cấp và mốc thời gian",
    state: "pending",
  },
  {
    key: "experience",
    label: "Kinh nghiệm",
    detail: "Quá trình làm việc và thành tựu",
    state: "pending",
  },
];

function setSectionState(
  sections: AnalysisSectionStateShape[],
  key: AnalysisSectionStateShape["key"],
  state: AnalysisStage,
  detail?: string,
): AnalysisSectionStateShape[] {
  return sections.map((section) =>
    section.key === key
      ? {
          ...section,
          state,
          detail: detail ?? section.detail,
        }
      : section,
  );
}

async function estimateFilePages(file: File): Promise<number> {
  const lowerName = file.name.toLowerCase();

  if (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName)
  ) {
    return 1;
  }

  if (
    /\.docx$/.test(lowerName) ||
    file.type.includes("wordprocessingml.document")
  ) {
    return 1;
  }

  if (file.type.includes("pdf") || /\.pdf$/.test(lowerName)) {
    const buffer = await file.arrayBuffer();
    const raw = new TextDecoder("latin1").decode(buffer);
    const matches = raw.match(/\/Type\s*\/Page\b/g);
    if (matches && matches.length > 0) {
      return Math.max(1, Math.min(50, matches.length));
    }
  }

  return 1;
}

async function callUploadCV(file: File): Promise<UploadCVResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/ai/upload-cv", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

async function callPreparePreview(file: File): Promise<PreviewUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/ai/prepare-preview", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

function inferPreviewKind(file: File): PreviewKind {
  const lowerName = file.name.toLowerCase();
  if (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName)
  ) {
    return "image";
  }
  if (file.type.includes("pdf") || /\.pdf$/.test(lowerName)) {
    return "pdf";
  }
  if (
    /\.docx$/.test(lowerName) ||
    file.type.includes("wordprocessingml.document")
  ) {
    return "docx";
  }
  return "unknown";
}

function paddleBlocksToRaw(response: UploadCVResponse): RawOCRBlock[] {
  const blocks: RawOCRBlock[] = [];
  const sectionLabelByBlockIndex = new Map<number, string>();

  for (const section of response.detected_sections || []) {
    const firstBlockIndex = section.block_indices?.[0];
    if (typeof firstBlockIndex === "number" && section.title) {
      sectionLabelByBlockIndex.set(firstBlockIndex, section.title);
    }
  }

  let globalBlockIndex = 0;
  for (const page of response.pages) {
    for (const block of page.blocks) {
      blocks.push({
        id: `${block.page}-${block.bbox[0][0]}-${block.bbox[0][1]}-${block.bbox[2][0]}-${block.bbox[2][1]}`,
        text: block.text,
        page: block.page,
        label: sectionLabelByBlockIndex.get(globalBlockIndex),
        confidence: block.confidence,
        column: block.column,
        rect: {
          x: block.rect.x,
          y: block.rect.y,
          width: block.rect.width,
          height: block.rect.height,
        },
      });
      globalBlockIndex += 1;
    }
  }

  return removeDuplicateBlocks(blocks);
}

function buildFallbackSectionsFromContent(content: string): CVSection[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const nodes = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `raw-${index}`,
      text: line,
      kind: "paragraph" as const,
      children: [],
    }));

  return [
    {
      id: "ocr-fallback-content",
      type: "rich_outline",
      title: "Nội dung trích xuất",
      isVisible: true,
      containerId: "main-column",
      data: { nodes },
    },
  ];
}

export function OCRPreviewModal({
  isOpen,
  onClose,
  onConfirm,
}: OCRPreviewModalProps) {
  const [step, setStep] = useState<ModalStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("unknown");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [rawBlocks, setRawBlocks] = useState<RawOCRBlock[]>([]);
  const [draftData, setDraftData] = useState<OCRDraftData | null>(null);
  const [backendSections, setBackendSections] = useState<CVSection[] | null>(null);
  const [detectedSections, setDetectedSections] = useState<DetectedSectionPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estimatedPages, setEstimatedPages] = useState(1);
  const [scanningPage, setScanningPage] = useState(1);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisSections, setAnalysisSections] =
    useState<AnalysisSectionStateShape[]>(DEFAULT_ANALYSIS_SECTIONS);
  const [documentType, setDocumentType] =
    useState<"cv" | "non_cv_document">("cv");
  const [documentContent, setDocumentContent] = useState("");
  const requestIdRef = useRef(0);
  const localObjectUrlRef = useRef<string | null>(null);

  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    setStep("upload");
    setFile(null);
    setPreviewUrl(null);
    setPreviewKind("unknown");
    setPreviewError(null);
    setIsUploading(false);
    setOcrLoading(false);
    setIsSavingResult(false);
    setRawBlocks([]);
    setDraftData(null);
    setBackendSections(null);
    setDetectedSections([]);
    setError(null);
    setEstimatedPages(1);
    setScanningPage(1);
    setAnalysisComplete(false);
    setAnalysisSections(DEFAULT_ANALYSIS_SECTIONS);
    setDocumentType("cv");
    setDocumentContent("");
  }, []);

  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!ocrLoading) return;

    const interval = window.setInterval(() => {
      setScanningPage((current) => {
        if (current >= estimatedPages) return estimatedPages;
        return current + 1;
      });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [estimatedPages, ocrLoading]);

  useEffect(() => {
    if (!ocrLoading) return;

    setAnalysisSections((current) =>
      setSectionState(
        current,
        "personal",
        "processing",
        "Đang nhận diện hồ sơ và thông tin liên hệ...",
      ),
    );

    const timeoutId = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterPersonal = setSectionState(
          current,
          "personal",
          "done",
          "Đã nhận diện thông tin cá nhân",
        );
        return setSectionState(
          afterPersonal,
          "skills",
          "processing",
          "Đang trích xuất kỹ năng và từ khóa...",
        );
      });
    }, 1500);

    const timeoutId2 = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterSkills = setSectionState(
          current,
          "skills",
          "done",
          "Đã gom nhóm kỹ năng",
        );
        return setSectionState(
          afterSkills,
          "education",
          "processing",
          "Đang phân tích học vấn và mốc thời gian...",
        );
      });
    }, 2900);

    const timeoutId3 = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterEducation = setSectionState(
          current,
          "education",
          "done",
          "Đã phân tích phần học vấn",
        );
        return setSectionState(
          afterEducation,
          "experience",
          "processing",
          "Đang chuẩn hóa kinh nghiệm làm việc...",
        );
      });
    }, 4300);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
      window.clearTimeout(timeoutId3);
    };
  }, [ocrLoading]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFileSelected = useCallback(async (nextFile: File) => {
    const requestId = ++requestIdRef.current;
    const inferredPreviewKind = inferPreviewKind(nextFile);

    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }

    setFile(nextFile);
    setStep("workspace");
    setPreviewKind(inferredPreviewKind);
    setPreviewError(null);
    setError(null);
    setIsUploading(true);
    setOcrLoading(true);
    setRawBlocks([]);
    setDraftData(null);
    setBackendSections(null);
    setDetectedSections([]);
    setAnalysisSections(DEFAULT_ANALYSIS_SECTIONS);
    setAnalysisComplete(false);
    setScanningPage(1);
    setDocumentType("cv");
    setDocumentContent("");

    if (inferredPreviewKind === "image" || inferredPreviewKind === "pdf") {
      const objectUrl = URL.createObjectURL(nextFile);
      localObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }

    void (async () => {
      try {
        const prepared = await callPreparePreview(nextFile);
        if (requestIdRef.current !== requestId) return;
        setPreviewKind(prepared.file_type === "image" ? "image" : "pdf");
        setPreviewUrl(`/api/ai/preview/${prepared.preview_id}`);
      } catch (previewErr) {
        if (requestIdRef.current !== requestId) return;
        console.warn("Preview preparation failed:", previewErr);
        setPreviewError(
          inferredPreviewKind === "docx"
            ? "Không thể chuyển Word sang PDF trên backend. Hãy kiểm tra LibreOffice (`soffice --headless`) hoặc biến `SOFFICE_PATH`."
            : "Không thể dựng preview tối ưu từ backend, đang dùng preview cục bộ.",
        );
      }
    })();

    try {
      const pageEstimate = await estimateFilePages(nextFile);
      if (requestIdRef.current !== requestId) return;
      setEstimatedPages(pageEstimate);
    } catch {
      setEstimatedPages(1);
    }

    try {
      const uploadResponse = await callUploadCV(nextFile);
      if (requestIdRef.current !== requestId) return;

      const hasExtractedContent = Boolean(
        (uploadResponse.content || uploadResponse.raw_text || "").trim(),
      );

      if (
        !uploadResponse.success ||
        (!hasExtractedContent && uploadResponse.total_blocks === 0)
      ) {
        throw new Error(
          uploadResponse.total_blocks === 0
            ? "Không phát hiện văn bản nào trong tài liệu."
            : "Không thể phân tích tài liệu.",
        );
      }

      const blocks =
        uploadResponse.total_blocks > 0 ? paddleBlocksToRaw(uploadResponse) : [];
      const parsedDraft = transformParsedCVToDraft(uploadResponse.data);
      const hasCvLikeSections = (uploadResponse.detected_sections || []).some(
        (section) =>
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
      const hasCvLikeBuilderSections = (
        uploadResponse.builder_sections || []
      ).some((section) =>
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

      const resolvedDocumentType =
        uploadResponse.document_type === "non_cv_document" &&
        (hasCvLikeSections || hasCvLikeBuilderSections)
          ? "cv"
          : uploadResponse.document_type === "non_cv_document"
            ? "non_cv_document"
            : "cv";

      setDocumentType(resolvedDocumentType);
      setDocumentContent(uploadResponse.content || uploadResponse.raw_text || "");
      setRawBlocks(blocks);
      setBackendSections(uploadResponse.builder_sections || null);
      setDetectedSections(uploadResponse.detected_sections || []);

      const resolvedPageCount = Math.max(1, uploadResponse.page_count || 1);
      setEstimatedPages(resolvedPageCount);
      setScanningPage(resolvedPageCount);

      if (resolvedDocumentType === "non_cv_document") {
        setAnalysisSections([
          {
            key: "personal",
            label: "Loại tài liệu",
            detail:
              "Đã xác định đây là tài liệu tổng quát, không chỉ riêng CV.",
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
        ]);
      } else {
        setAnalysisSections((current) =>
          current.map((section) => {
            if (section.key === "personal") {
              const hasContact = Boolean(
                uploadResponse.data.contact.email ||
                  uploadResponse.data.contact.phone,
              );
              return {
                ...section,
                state: "done",
                detail: hasContact
                  ? "Đã trích xuất thông tin liên hệ."
                  : "Đã nhận diện phần tiêu đề hồ sơ.",
              };
            }
            if (section.key === "skills") {
              return {
                ...section,
                state: "done",
                detail: `Đã trích xuất ${uploadResponse.data.skills?.length || 0} kỹ năng.`,
              };
            }
            if (section.key === "education") {
              return {
                ...section,
                state: "done",
                detail: `Đã trích xuất ${uploadResponse.data.education?.length || 0} mục học vấn.`,
              };
            }
            return {
              ...section,
              state: "done",
              detail: `Đã trích xuất ${uploadResponse.data.experience?.length || 0} mục kinh nghiệm.`,
            };
          }),
        );
      }

      setDraftData(hasMeaningfulDraftData(parsedDraft) ? parsedDraft : null);
      setAnalysisComplete(true);
      setIsUploading(false);
      setOcrLoading(false);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const rawMessage =
        err instanceof Error ? err.message : "Lỗi không xác định";
      const message = /failed to fetch|cors|network|err_failed/i.test(rawMessage)
        ? "Không thể kết nối tới AI service ở http://localhost:8000. Hãy kiểm tra backend đã chạy và đã reload route /upload-cv."
        : rawMessage;
      setIsUploading(false);
      setOcrLoading(false);
      setError(message);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (!file || ocrLoading) return;
    void handleFileSelected(file);
  }, [file, handleFileSelected, ocrLoading]);

  const handleUploadNew = useCallback(() => {
    resetState();
  }, [resetState]);

  const resolvedSections = useMemo(
    () =>
      backendSections && backendSections.length > 0
        ? backendSections
        : rawBlocks.length > 0
          ? transformRawBlocksToSections(rawBlocks, draftData)
          : buildFallbackSectionsFromContent(documentContent),
    [backendSections, documentContent, draftData, rawBlocks],
  );

  const handleSave = useCallback(async () => {
    if (!resolvedSections.length || isSavingResult) return;
    try {
      setIsSavingResult(true);
      await onConfirm(resolvedSections);
      resetState();
      onClose();
    } finally {
      setIsSavingResult(false);
    }
  }, [isSavingResult, onClose, onConfirm, resetState, resolvedSections]);

  const showWorkspace = step === "workspace" && file;
  const showFinalResult =
    showWorkspace && !ocrLoading && !error && analysisComplete;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="ocr-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={!ocrLoading && !isSavingResult ? handleClose : undefined}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-10 flex w-[94vw] max-w-[1700px] flex-col overflow-hidden rounded-3xl border border-slate-200/40 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
          style={{ height: "90vh" }}
        >
          {!ocrLoading && !isSavingResult && (
            <>
              <div className="absolute left-4 top-4 z-20">
                <OCRHelpDrawer buttonLabel="Trợ giúp" />
              </div>
              <motion.button
                aria-label="Đóng OCR modal"
                onClick={handleClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition-all hover:bg-slate-100"
              >
                <X size={16} />
              </motion.button>
            </>
          )}

          {step === "upload" ? (
            <div className="max-h-[90vh] overflow-y-auto p-8">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 text-center"
              >
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                  <ScanLine size={24} className="text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Tải CV lên để quét bằng AI
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Hệ thống sẽ hiển thị CV gốc ở bên trái, còn bên phải lần lượt
                  chạy OCR, parsing và dựng kết quả cuối cùng để bạn lưu vào web.
                </p>
              </motion.div>

              <OCRUploadZone
                onFileSelected={handleFileSelected}
                disabled={isUploading || ocrLoading}
              />
              <OCRPipelineGuide />

              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center"
                >
                  <p className="text-xs font-medium text-red-600">{error}</p>
                  <p className="mt-1 text-[10px] text-red-400">
                    Vui lòng thử lại hoặc sử dụng file khác.
                  </p>
                </motion.div>
              ) : null}
            </div>
          ) : showWorkspace ? (
            <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[48%_52%]">
              <div className="relative min-h-0 overflow-hidden border-b border-slate-200 bg-slate-100 lg:border-b-0 lg:border-r">
                <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-900">
                      <FileText size={11} className="text-white" />
                    </div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                      CV gốc
                    </h3>
                  </div>
                  <span className="max-w-[220px] truncate text-[11px] font-medium text-slate-500">
                    {file.name}
                  </span>
                </div>

                <div className="h-full min-h-0 pt-16">
                  <OriginalFilePreview
                    file={file}
                    previewUrl={previewUrl}
                    previewKind={previewKind}
                    previewError={previewError}
                  />
                </div>

                {previewError ? (
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 shadow-sm">
                    {previewError}
                  </div>
                ) : null}
              </div>

              <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
                {showFinalResult ? (
                  <OCRFinalResultView
                    fileName={file.name}
                    sections={resolvedSections}
                    detectedSections={detectedSections}
                    documentType={documentType}
                    documentContent={documentContent}
                    onSave={handleSave}
                    onSkip={handleClose}
                    isSaving={isSavingResult}
                  />
                ) : (
                  <OCRAnalysisPanel
                    currentPage={scanningPage}
                    totalPages={estimatedPages}
                    analysisComplete={false}
                    sectionStates={analysisSections as AnalysisSectionState[]}
                    isLoading={!error && ocrLoading}
                    error={error}
                    documentType={documentType}
                    documentContent={documentContent}
                    onRetry={error ? handleRetry : undefined}
                    onUploadNew={error ? handleUploadNew : undefined}
                  />
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
