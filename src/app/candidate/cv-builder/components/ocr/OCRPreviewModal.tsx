"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, ScanLine, X } from "lucide-react";
import { uploadCVImport } from "@/features/cv-import/api/client";
import { OCRUploadZone } from "./OCRUploadZone";
import { OCRPipelineGuide } from "./OCRPipelineGuide";
import { OCRHelpDrawer } from "./OCRHelpDrawer";
import { OCRAnalysisPanel, type AnalysisSectionState } from "./OCRAnalysisPanel";
import { OCRFinalResultView } from "./OCRFinalResultView";
import { OriginalFilePreview } from "./OriginalFilePreview";
import {
  type OCRDraftData,
  type RawOCRBlock,
  transformRawBlocksToSections,
} from "./ocr-types";
import {
  adaptUploadCVResponseToLegacyState,
  type DetectedSectionPayload,
  type PreviewKind,
  type UploadCVResponse,
} from "./ocr-pipeline-adapter";
import { useStablePreviewSource } from "./use-stable-preview-source";
import { normalizeCvSections } from "../../section-normalization";
import type { CVSection } from "../../types";

interface OCRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sections: CVSection[]) => void | Promise<void>;
}

type ModalStep = "upload" | "workspace";
type AnalysisStage = "pending" | "processing" | "done";

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

interface OCRPipelineState {
  isUploading: boolean;
  ocrLoading: boolean;
  error: string | null;
  estimatedPages: number;
  scanningPage: number;
  analysisComplete: boolean;
  analysisSections: AnalysisSectionStateShape[];
}

interface OCRParsedState {
  rawBlocks: RawOCRBlock[];
  draftData: OCRDraftData | null;
  backendSections: CVSection[] | null;
  detectedSections: DetectedSectionPayload[];
  documentType: "cv" | "non_cv_document";
  documentContent: string;
  meta: Record<string, unknown>;
  debug: Record<string, unknown>;
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

const INITIAL_PIPELINE_STATE: OCRPipelineState = {
  isUploading: false,
  ocrLoading: false,
  error: null,
  estimatedPages: 1,
  scanningPage: 1,
  analysisComplete: false,
  analysisSections: DEFAULT_ANALYSIS_SECTIONS,
};

const INITIAL_PARSED_STATE: OCRParsedState = {
  rawBlocks: [],
  draftData: null,
  backendSections: null,
  detectedSections: [],
  documentType: "cv",
  documentContent: "",
  meta: {},
  debug: {},
};

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
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const { previewSource, applyLocalPreview, applyPreparedPreview, setPreviewError, resetPreviewSource } =
    useStablePreviewSource();
  const [pipelineState, setPipelineState] = useState<OCRPipelineState>(INITIAL_PIPELINE_STATE);
  const [parsedState, setParsedState] = useState<OCRParsedState>(INITIAL_PARSED_STATE);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isPromotingImport, setIsPromotingImport] = useState(false);
  const requestIdRef = useRef(0);

  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    setStep("upload");
    setFile(null);
    resetPreviewSource();
    setPipelineState(INITIAL_PIPELINE_STATE);
    setParsedState(INITIAL_PARSED_STATE);
    setIsSavingResult(false);
    setIsPromotingImport(false);
  }, [resetPreviewSource]);

  const { url: previewUrl, kind: previewKind, error: previewError } = previewSource;
  const {
    isUploading,
    ocrLoading,
    error,
    estimatedPages,
    scanningPage,
    analysisComplete,
    analysisSections,
  } = pipelineState;
  const {
    rawBlocks,
    draftData,
    backendSections,
    detectedSections,
    documentType,
    documentContent,
  } = parsedState;

  useEffect(() => {
    if (!ocrLoading) return;

    const interval = window.setInterval(() => {
      setPipelineState((current) => ({
        ...current,
        scanningPage:
          current.scanningPage >= current.estimatedPages
            ? current.estimatedPages
            : current.scanningPage + 1,
      }));
    }, 1200);

    return () => window.clearInterval(interval);
  }, [estimatedPages, ocrLoading]);

  useEffect(() => {
    if (!ocrLoading) return;

    setPipelineState((current) => ({
      ...current,
      analysisSections: setSectionState(
        current.analysisSections,
        "personal",
        "processing",
        "Đang nhận diện hồ sơ và thông tin liên hệ...",
      ),
    }));

    const timeoutId = window.setTimeout(() => {
      setPipelineState((current) => {
        const afterPersonal = setSectionState(
          current.analysisSections,
          "personal",
          "done",
          "Đã nhận diện thông tin cá nhân",
        );
        return {
          ...current,
          analysisSections: setSectionState(
            afterPersonal,
            "skills",
            "processing",
            "Đang trích xuất kỹ năng và từ khóa...",
          ),
        };
      });
    }, 1500);

    const timeoutId2 = window.setTimeout(() => {
      setPipelineState((current) => {
        const afterSkills = setSectionState(
          current.analysisSections,
          "skills",
          "done",
          "Đã gom nhóm kỹ năng",
        );
        return {
          ...current,
          analysisSections: setSectionState(
            afterSkills,
            "education",
            "processing",
            "Đang phân tích học vấn và mốc thời gian...",
          ),
        };
      });
    }, 2900);

    const timeoutId3 = window.setTimeout(() => {
      setPipelineState((current) => {
        const afterEducation = setSectionState(
          current.analysisSections,
          "education",
          "done",
          "Đã phân tích phần học vấn",
        );
        return {
          ...current,
          analysisSections: setSectionState(
            afterEducation,
            "experience",
            "processing",
            "Đang chuẩn hóa kinh nghiệm làm việc...",
          ),
        };
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

    setFile(nextFile);
    setStep("workspace");
    applyLocalPreview(nextFile, inferredPreviewKind);
    setPreviewError(null);
    setPipelineState({
      ...INITIAL_PIPELINE_STATE,
      isUploading: true,
      ocrLoading: true,
      analysisSections: DEFAULT_ANALYSIS_SECTIONS,
    });
    setParsedState(INITIAL_PARSED_STATE);

    void (async () => {
      try {
        const prepared = await callPreparePreview(nextFile);
        if (requestIdRef.current !== requestId) return;
        applyPreparedPreview({
          kind: prepared.file_type === "image" ? "image" : "pdf",
          url: `/api/ai/preview/${prepared.preview_id}`,
        });
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
      setPipelineState((current) => ({
        ...current,
        estimatedPages: pageEstimate,
      }));
    } catch {
      setPipelineState((current) => ({
        ...current,
        estimatedPages: 1,
      }));
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

      const adaptedResult = adaptUploadCVResponseToLegacyState(uploadResponse);
      setParsedState({
        rawBlocks: adaptedResult.rawBlocks,
        draftData: adaptedResult.draftData,
        backendSections: adaptedResult.backendSections,
        detectedSections: adaptedResult.detectedSections,
        documentType: adaptedResult.documentType,
        documentContent: adaptedResult.documentContent,
        meta: adaptedResult.meta,
        debug: adaptedResult.debug,
      });

      const resolvedPageCount = Math.max(1, uploadResponse.page_count || 1);
      setPipelineState((current) => ({
        ...current,
        isUploading: false,
        ocrLoading: false,
        error: null,
        estimatedPages: resolvedPageCount,
        scanningPage: resolvedPageCount,
        analysisComplete: true,
        analysisSections: adaptedResult.analysisSections,
      }));
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const rawMessage =
        err instanceof Error ? err.message : "Lỗi không xác định";
      const message = /failed to fetch|cors|network|err_failed/i.test(rawMessage)
        ? "Khong the ket noi toi AI service. Hay kiem tra backend da chay va route /upload-cv da san sang."
        : rawMessage;
      setPipelineState((current) => ({
        ...current,
        isUploading: false,
        ocrLoading: false,
        error: message,
      }));
    }
  }, [applyLocalPreview, applyPreparedPreview, setPreviewError]);

  const handleRetry = useCallback(() => {
    if (!file || ocrLoading) return;
    void handleFileSelected(file);
  }, [file, handleFileSelected, ocrLoading]);

  const handleUploadNew = useCallback(() => {
    resetState();
  }, [resetState]);

  const resolvedSections = useMemo(
    () =>
      normalizeCvSections(
        backendSections && backendSections.length > 0
        ? backendSections
        : rawBlocks.length > 0
          ? transformRawBlocksToSections(rawBlocks, draftData)
          : buildFallbackSectionsFromContent(documentContent),
      ),
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

  const handleCreatePersistentImport = useCallback(async () => {
    if (!file || isPromotingImport) return;
    try {
      setIsPromotingImport(true);
      const response = await uploadCVImport(file, { startProcessing: true });
      resetState();
      onClose();
      router.replace(`/candidate/cv-builder?importReview=${response.document.id}`, {
        scroll: false,
      });
    } catch (promotionError) {
      console.error("Không thể chuyển sang import persisted:", promotionError);
      alert("Không thể đưa file sang quy trình import mới. Vui lòng thử lại.");
    } finally {
      setIsPromotingImport(false);
    }
  }, [file, isPromotingImport, onClose, resetState, router]);

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
          className="relative z-10 flex w-[94vw] max-w-425 flex-col overflow-hidden rounded-3xl border border-slate-200/40 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
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
                  <span className="max-w-55 truncate text-[11px] font-medium text-slate-500">
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
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-medium text-slate-500">
                          Bạn có thể lưu nhanh vào builder cũ, hoặc đưa cùng file sang hộp xem lại import mới.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleCreatePersistentImport()}
                          disabled={isPromotingImport}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPromotingImport ? "Đang chuyển..." : "Mở hộp xem lại import mới"}
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1">
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
                    </div>
                  </div>
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
