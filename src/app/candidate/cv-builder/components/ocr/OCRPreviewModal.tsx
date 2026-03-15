"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanLine } from "lucide-react";
import { OCRUploadZone } from "./OCRUploadZone";
import { OCRPipelineGuide } from "./OCRPipelineGuide";
import { OCRHelpDrawer } from "./OCRHelpDrawer";
import { ScanningOverlay } from "./ScanningOverlay";
import { OriginalLayoutWorkspace } from "./OriginalLayoutWorkspace";
import {
  type OCRDraftData,
  type RawOCRBlock,
  hasMeaningfulDraftData,
  removeDuplicateBlocks,
  transformParsedCVToDraft,
  transformRawBlocksToSections,
} from "./ocr-types";
import type { CVSection } from "../../types";

// ── Props ────────────────────────────────────────────
interface OCRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sections: CVSection[]) => void;
}

type ModalStep = "upload" | "scanning" | "preview";

// ── PaddleOCR block shape returned by /ocr/upload ───────────

interface PaddleBlock {
  text: string;
  bbox: [[number, number], [number, number], [number, number], [number, number]];
  confidence: number;
  page: number;
  column?: "left" | "right" | "full_width";
  rect: { x: number; y: number; width: number; height: number };
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

// ── API call: POST /upload-cv ───────────────────────────

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
  detected_sections: Array<{
    type: string;
    title: string;
    content: string;
    items: Array<Record<string, unknown>>;
    line_ids: string[];
    block_indices: number[];
  }>;
  builder_sections: CVSection[];
  layout?: {
    profile?: {
      document_mode?: string;
      pages?: Array<{
        page: number;
        mode?: string;
        layout_mode?: string;
        split_x: number | null;
      }>;
    };
    pages?: Array<{
      page: number;
      mode?: string;
      layout_mode?: string;
      split_x: number | null;
    }>;
    columns?: {
      left?: Array<Record<string, unknown>>;
      right?: Array<Record<string, unknown>>;
      full_width?: Array<Record<string, unknown>>;
    };
  };
  raw_text: string;
}

interface LayoutDebugInfo {
  documentMode?: string;
  pageModes: Array<{
    page: number;
    mode: string;
    splitX: number | null;
  }>;
}

type AnalysisStage = "pending" | "processing" | "done";

interface AnalysisSectionState {
  key: "personal" | "skills" | "education" | "experience";
  label: string;
  detail: string;
  state: AnalysisStage;
}

const DEFAULT_ANALYSIS_SECTIONS: AnalysisSectionState[] = [
  {
    key: "personal",
    label: "Personal Information",
    detail: "Name, contact and profile header",
    state: "pending",
  },
  {
    key: "skills",
    label: "Skills",
    detail: "Core skills and technologies",
    state: "pending",
  },
  {
    key: "education",
    label: "Education",
    detail: "Schools, degrees and timelines",
    state: "pending",
  },
  {
    key: "experience",
    label: "Experience",
    detail: "Work history and achievements",
    state: "pending",
  },
];

function setSectionState(
  sections: AnalysisSectionState[],
  key: AnalysisSectionState["key"],
  state: AnalysisStage,
  detail?: string
): AnalysisSectionState[] {
  return sections.map((section) =>
    section.key === key
      ? {
          ...section,
          state,
          detail: detail ?? section.detail,
        }
      : section
  );
}

async function estimateFilePages(file: File): Promise<number> {
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName)) {
    return 1;
  }

  if (/\.docx$/.test(lowerName) || file.type.includes("wordprocessingml.document")) {
    // DOCX has no trivial page count in-browser; use a stable estimate for progress UI.
    const text = await file.text().catch(() => "");
    const paragraphGuess = Math.max(1, Math.floor(text.length / 1500));
    return Math.min(12, paragraphGuess);
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

  const res = await fetch(`/api/ai/upload-cv`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Convert PaddleOCR response blocks to the RawOCRBlock format
 * used by OriginalLayoutWorkspace.
 *
 * `rect` values from the backend are already 0–100 normalised.
 */
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
    for (const b of page.blocks) {
      blocks.push({
        id: `${b.page}-${b.bbox[0][0]}-${b.bbox[0][1]}-${b.bbox[2][0]}-${b.bbox[2][1]}`,
        text: b.text,
        page: b.page,
        label: sectionLabelByBlockIndex.get(globalBlockIndex),
        confidence: b.confidence,
        column: b.column,
        rect: {
          x: b.rect.x,
          y: b.rect.y,
          width: b.rect.width,
          height: b.rect.height,
        },
      });
      globalBlockIndex += 1;
    }
  }
  return removeDuplicateBlocks(blocks);
}

// ----------------------------------------------------------------
// OCR Preview Modal — Orchestrator
// ----------------------------------------------------------------
export function OCRPreviewModal({
  isOpen,
  onClose,
  onConfirm,
}: OCRPreviewModalProps) {
  const [step, setStep] = useState<ModalStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [rawBlocks, setRawBlocks] = useState<RawOCRBlock[]>([]);
  const [draftData, setDraftData] = useState<OCRDraftData | null>(null);
  const [backendSections, setBackendSections] = useState<CVSection[] | null>(null);
  const [layoutDebug, setLayoutDebug] = useState<LayoutDebugInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [estimatedPages, setEstimatedPages] = useState(1);
  const [scanningPage, setScanningPage] = useState(1);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisSections, setAnalysisSections] = useState<AnalysisSectionState[]>(DEFAULT_ANALYSIS_SECTIONS);
  const [documentType, setDocumentType] = useState<"cv" | "non_cv_document">("cv");
  const [documentContent, setDocumentContent] = useState("");
  const requestIdRef = useRef(0);

  const showUploadStep = !file;
  const showScanningStep = Boolean(file) && step === "scanning";
  const showPreviewStep = step === "preview" && rawBlocks.length > 0 && Boolean(file);

  // ── Reset ──────────────────────────────────────────────
  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    setStep("upload");
    setFile(null);
    setIsUploading(false);
    setOcrLoading(false);
    setRawBlocks([]);
    setDraftData(null);
    setBackendSections(null);
    setLayoutDebug(null);
    setError(null);
    setPreviewMimeType(null);
    setEstimatedPages(1);
    setScanningPage(1);
    setAnalysisComplete(false);
    setAnalysisSections(DEFAULT_ANALYSIS_SECTIONS);
    setDocumentType("cv");
    setDocumentContent("");
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

    let timeoutId = 0;
    setAnalysisSections((current) => setSectionState(current, "personal", "processing", "Detecting profile and contacts..."));

    timeoutId = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterPersonal = setSectionState(current, "personal", "done", "Personal information detected");
        return setSectionState(afterPersonal, "skills", "processing", "Extracting skill keywords...");
      });
    }, 1500);

    const timeoutId2 = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterSkills = setSectionState(current, "skills", "done", "Skills clustered");
        return setSectionState(afterSkills, "education", "processing", "Parsing education timeline...");
      });
    }, 2900);

    const timeoutId3 = window.setTimeout(() => {
      setAnalysisSections((current) => {
        const afterEducation = setSectionState(current, "education", "done", "Education section parsed");
        return setSectionState(afterEducation, "experience", "processing", "Normalizing work experiences...");
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

  // ── File selected → run OCR ─────────────────────────────
  const handleFileSelected = useCallback(async (nextFile: File) => {
    const requestId = ++requestIdRef.current;
    setFile(nextFile);
    setIsUploading(true);
    setOcrLoading(true);
    setStep("scanning");
    setError(null);
    setRawBlocks([]);
    setDraftData(null);
    setBackendSections(null);
    setLayoutDebug(null);
    setPreviewMimeType(null);
    setAnalysisSections(DEFAULT_ANALYSIS_SECTIONS);
    setAnalysisComplete(false);
    setScanningPage(1);
    setDocumentType("cv");
    setDocumentContent("");

    const lowerName = nextFile.name.toLowerCase();
    const isDocxFile = nextFile.type.includes("wordprocessingml.document") || lowerName.endsWith(".docx");

    if (isDocxFile) {
      setPreviewMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } else if ((nextFile.type || "").startsWith("image/")) {
      setPreviewMimeType(nextFile.type || "image/png");
    } else {
      setPreviewMimeType("application/pdf");
    }

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

      const hasExtractedContent = Boolean((uploadResponse.content || uploadResponse.raw_text || "").trim());
      if (!uploadResponse.success || (!hasExtractedContent && uploadResponse.total_blocks === 0)) {
        throw new Error(
          uploadResponse.total_blocks === 0
            ? "Không phát hiện văn bản nào trong tài liệu."
            : "Không thể phân tích tài liệu"
        );
      }

      const blocks = uploadResponse.total_blocks > 0 ? paddleBlocksToRaw(uploadResponse) : [];
      const parsedDraft = transformParsedCVToDraft(uploadResponse.data);
      const resolvedDocumentType = uploadResponse.document_type === "non_cv_document" ? "non_cv_document" : "cv";
      setDocumentType(resolvedDocumentType);
      setDocumentContent(uploadResponse.content || uploadResponse.raw_text || "");
      setRawBlocks(blocks);
      setBackendSections(uploadResponse.builder_sections || null);
      const resolvedPageCount = Math.max(1, uploadResponse.page_count || 1);
      setEstimatedPages(resolvedPageCount);
      setScanningPage(resolvedPageCount);
      setLayoutDebug({
        documentMode: uploadResponse.layout?.profile?.document_mode,
        pageModes: (uploadResponse.layout?.profile?.pages || uploadResponse.layout?.pages || []).map((page) => ({
          page: page.page,
          mode: page.mode || page.layout_mode || "unknown",
          splitX: page.split_x,
        })),
      });
      if (resolvedDocumentType === "non_cv_document") {
        setAnalysisSections([
          {
            key: "personal",
            label: "Document Type",
            detail: "Detected as non-CV document",
            state: "done",
          },
          {
            key: "skills",
            label: "OCR Extraction",
            detail: "Extracted full document text",
            state: "done",
          },
          {
            key: "education",
            label: "CV Parsing",
            detail: "Skipped to avoid incorrect CV mapping",
            state: "done",
          },
          {
            key: "experience",
            label: "Structured Output",
            detail: "Showing generic document content",
            state: "done",
          },
        ]);
      } else {
        setAnalysisSections((current) =>
          current.map((section) => {
            if (section.key === "personal") {
              const hasContact = Boolean(uploadResponse.data.contact.email || uploadResponse.data.contact.phone);
              return { ...section, state: "done", detail: hasContact ? "Contact information parsed" : "Profile extracted" };
            }
            if (section.key === "skills") {
              const count = uploadResponse.data.skills?.length || 0;
              return { ...section, state: "done", detail: `${count} skill${count === 1 ? "" : "s"} extracted` };
            }
            if (section.key === "education") {
              const count = uploadResponse.data.education?.length || 0;
              return { ...section, state: "done", detail: `${count} education entr${count === 1 ? "y" : "ies"}` };
            }
            const count = uploadResponse.data.experience?.length || 0;
            return { ...section, state: "done", detail: `${count} experience entr${count === 1 ? "y" : "ies"}` };
          })
        );
      }
      setAnalysisComplete(true);
      setDraftData(hasMeaningfulDraftData(parsedDraft) ? parsedDraft : null);
      setIsUploading(false);
      setOcrLoading(false);
      if (resolvedDocumentType === "cv" && blocks.length > 0) {
        window.setTimeout(() => {
          if (requestIdRef.current !== requestId) return;
          setStep("preview");
        }, 500);
      } else {
        setStep("scanning");
      }
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const rawMessage = err instanceof Error ? err.message : "Lỗi không xác định";
      const message =
        /failed to fetch|cors|network|err_failed/i.test(rawMessage)
          ? "Không thể kết nối tới AI service ở http://localhost:8000. Hãy kiểm tra backend đã chạy và đã reload route /upload-cv."
          : rawMessage;
      setIsUploading(false);
      setOcrLoading(false);
      setError(message);
      setStep("scanning");
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (!file || ocrLoading) return;
    void handleFileSelected(file);
  }, [file, handleFileSelected, ocrLoading]);

  const handleUploadNew = useCallback(() => {
    resetState();
  }, [resetState]);

  // ── Confirm edited blocks → parent ────────────────────────
  const handleConfirm = useCallback(
    (editedBlocks: RawOCRBlock[]) => {
      const sections: CVSection[] =
        backendSections && backendSections.length > 0
          ? backendSections
          : transformRawBlocksToSections(editedBlocks, draftData);

      onConfirm(sections);
      resetState();
    },
    [backendSections, draftData, onConfirm, resetState]
  );

  const handleCancelDraft = useCallback(() => resetState(), [resetState]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ocr-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={!ocrLoading ? handleClose : undefined}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative z-10 mx-4 ${
              showScanningStep
                ? "w-[95vw] max-w-400 h-[90vh] max-h-[90vh] overflow-hidden"
                : "w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            }`}
          >
            {/* Close button */}
            {!ocrLoading && (
              <>
                <div className="absolute top-4 left-4 z-20">
                  <OCRHelpDrawer buttonLabel="Trợ giúp" />
                </div>
                <motion.button
                  aria-label="Close OCR modal"
                  onClick={handleClose}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-4 right-4 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:bg-slate-100 text-slate-500 transition-all"
                >
                  <X size={16} />
                </motion.button>
              </>
            )}

            {/* Content Card */}
            <div
              className={`bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/40 shadow-2xl shadow-slate-900/20 ${
                showScanningStep ? "h-full overflow-hidden p-5" : "p-8"
              }`}
            >

              {/* Title (upload step only) */}
              {showUploadStep && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mb-3">
                    <ScanLine size={24} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Upload CV để quét bằng AI
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Pipeline OCR theo hướng PP-OCR sẽ phát hiện vùng chữ, nhận dạng nội dung và dựng CV draft để bạn hiệu chỉnh
                  </p>
                </motion.div>
              )}

              {/* Step content */}
              <AnimatePresence mode="wait">
                {showUploadStep ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <OCRUploadZone onFileSelected={handleFileSelected} disabled={isUploading || ocrLoading} />
                    <OCRPipelineGuide />

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-center"
                      >
                        <p className="text-xs text-red-600 font-medium">{error}</p>
                        <p className="text-[10px] text-red-400 mt-1">
                          Vui lòng thử lại hoặc sử dụng file khác
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : showScanningStep && file ? (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                  >
                    <ScanningOverlay
                      fileName={file.name}
                      fileType={file.type}
                      file={file}
                      previewMimeType={previewMimeType}
                      isLoading={ocrLoading}
                      currentPage={scanningPage}
                      totalPages={estimatedPages}
                      analysisComplete={analysisComplete}
                      documentType={documentType}
                      documentContent={documentContent}
                      sectionStates={analysisSections}
                      error={error}
                      onRetry={error ? handleRetry : undefined}
                      onUploadNew={error ? handleUploadNew : undefined}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* The workspace opens full-screen once OCR is complete */}
      {isOpen && showPreviewStep && file && (
        <OriginalLayoutWorkspace
          key="ocr-workspace"
          file={file}
          initialBlocks={rawBlocks}
          parsedDraft={draftData}
          layoutDebug={layoutDebug}
          onConfirm={handleConfirm}
          onCancel={handleCancelDraft}
        />
      )}
    </AnimatePresence>
  );
}
