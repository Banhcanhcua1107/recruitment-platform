"use client";

import React, { useState, useCallback, useRef } from "react";
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
  return blocks;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawBlocks, setRawBlocks] = useState<RawOCRBlock[]>([]);
  const [draftData, setDraftData] = useState<OCRDraftData | null>(null);
  const [backendSections, setBackendSections] = useState<CVSection[] | null>(null);
  const [layoutDebug, setLayoutDebug] = useState<LayoutDebugInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // ── Reset ──────────────────────────────────────────────
  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    setStep("upload");
    setSelectedFile(null);
    setRawBlocks([]);
    setDraftData(null);
    setBackendSections(null);
    setLayoutDebug(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // ── File selected → run OCR ─────────────────────────────
  const handleFileSelected = useCallback(async (file: File) => {
    const requestId = ++requestIdRef.current;
    setSelectedFile(file);
    setStep("scanning");
    setError(null);
    setDraftData(null);
    setBackendSections(null);

    try {
      const uploadResponse = await callUploadCV(file);

      if (!uploadResponse.success || uploadResponse.total_blocks === 0) {
        throw new Error(
          uploadResponse.total_blocks === 0
            ? "Không phát hiện văn bản nào trong tài liệu."
            : "Không thể phân tích tài liệu"
        );
      }

      const blocks = paddleBlocksToRaw(uploadResponse);
      const parsedDraft = transformParsedCVToDraft(uploadResponse.data);
      setRawBlocks(blocks);
      setBackendSections(uploadResponse.builder_sections || null);
      setLayoutDebug({
        documentMode: uploadResponse.layout?.profile?.document_mode,
        pageModes: (uploadResponse.layout?.profile?.pages || uploadResponse.layout?.pages || []).map((page) => ({
          page: page.page,
          mode: page.mode || page.layout_mode || "unknown",
          splitX: page.split_x,
        })),
      });
      setDraftData(hasMeaningfulDraftData(parsedDraft) ? parsedDraft : null);
      setStep("preview");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const rawMessage = err instanceof Error ? err.message : "Lỗi không xác định";
      const message =
        /failed to fetch|cors|network|err_failed/i.test(rawMessage)
          ? "Không thể kết nối tới AI service ở http://localhost:8000. Hãy kiểm tra backend đã chạy và đã reload route /upload-cv."
          : rawMessage;
      setError(message);
      setStep("upload");
    }
  }, []);

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
            onClick={step !== "scanning" ? handleClose : undefined}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-3xl max-h-[90vh] mx-4 overflow-y-auto"
          >
            {/* Close button */}
            {step !== "scanning" && (
              <>
                <div className="absolute top-4 left-4 z-20">
                  <OCRHelpDrawer buttonLabel="Help" />
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
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/40 shadow-2xl shadow-slate-900/20 p-8">

              {/* Title (upload step only) */}
              {step === "upload" && (
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
                {step === "upload" ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <OCRUploadZone onFileSelected={handleFileSelected} />
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
                ) : step === "scanning" && selectedFile ? (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <ScanningOverlay
                      fileName={selectedFile.name}
                      fileType={selectedFile.type}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* The workspace opens full-screen once OCR is complete */}
      {isOpen && step === "preview" && rawBlocks.length > 0 && selectedFile && (
        <OriginalLayoutWorkspace
          key="ocr-workspace"
          file={selectedFile}
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
