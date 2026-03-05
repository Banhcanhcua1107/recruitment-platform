"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanLine } from "lucide-react";
import { OCRUploadZone } from "./OCRUploadZone";
import { ScanningOverlay } from "./ScanningOverlay";
import { OriginalLayoutWorkspace } from "./OriginalLayoutWorkspace";
import { type RawOCRBlock } from "./ocr-types";
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

// ── API call: POST /ocr/upload ───────────────────────────

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

async function callOCRUpload(file: File): Promise<OCRUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${AI_SERVICE_URL}/ocr/upload`, {
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
function paddleBlocksToRaw(response: OCRUploadResponse): RawOCRBlock[] {
  const blocks: RawOCRBlock[] = [];
  for (const page of response.pages) {
    for (const b of page.blocks) {
      blocks.push({
        id: `${b.page}-${b.bbox[0][0]}-${b.bbox[0][1]}-${b.bbox[2][0]}-${b.bbox[2][1]}`,
        text: b.text,
        label: undefined,
        confidence: b.confidence,
        rect: {
          x: b.rect.x,
          y: b.rect.y,
          width: b.rect.width,
          height: b.rect.height,
        },
      });
    }
  }
  return blocks;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OCR Preview Modal — Orchestrator
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function OCRPreviewModal({
  isOpen,
  onClose,
  onConfirm,
}: OCRPreviewModalProps) {
  const [step, setStep] = useState<ModalStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawBlocks, setRawBlocks] = useState<RawOCRBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Reset ──────────────────────────────────────────────
  const resetState = useCallback(() => {
    setStep("upload");
    setSelectedFile(null);
    setRawBlocks([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // ── File selected → run OCR ─────────────────────────────
  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file);
    setStep("scanning");
    setError(null);

    try {
      const response = await callOCRUpload(file);

      if (!response.success || response.total_blocks === 0) {
        throw new Error(
          response.total_blocks === 0
            ? "Không phát hiện văn bản nào trong tài liệu."
            : "Không thể phân tích tài liệu"
        );
      }

      const blocks = paddleBlocksToRaw(response);
      setRawBlocks(blocks);
      setStep("preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(message);
      setStep("upload");
    }
  }, []);

  // ── Confirm edited blocks → parent ────────────────────────
  const handleConfirm = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_editedBlocks: RawOCRBlock[]) => {
      // TODO: map RawOCRBlock[] → CVSection[] via your domain mapper
      const sections: CVSection[] = [];
      onConfirm(sections);
      resetState();
    },
    [onConfirm, resetState]
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
              <motion.button
                aria-label="Close OCR modal"
                onClick={handleClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 right-4 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:bg-slate-100 text-slate-500 transition-all"
              >
                <X size={16} />
              </motion.button>
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
                    EasyOCR sẽ tự động phát hiện và trích xuất toàn bộ văn bản từ CV của bạn
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
          onConfirm={handleConfirm}
          onCancel={handleCancelDraft}
        />
      )}
    </AnimatePresence>
  );
}
