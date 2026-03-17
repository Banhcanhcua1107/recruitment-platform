"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  RefreshCcw,
  ScanLine,
  Upload,
} from "lucide-react";

export type AnalysisStage = "pending" | "processing" | "done";

export interface AnalysisSectionState {
  key: "personal" | "skills" | "education" | "experience";
  label: string;
  detail: string;
  state: AnalysisStage;
}

interface OCRAnalysisPanelProps {
  currentPage: number;
  totalPages: number;
  analysisComplete?: boolean;
  sectionStates?: AnalysisSectionState[];
  isLoading?: boolean;
  error?: string | null;
  documentType?: "cv" | "non_cv_document";
  documentContent?: string;
  onRetry?: () => void;
  onUploadNew?: () => void;
}

const STAGE_LABELS = {
  uploading: "Chuẩn bị file",
  ocr: "OCR và khôi phục thứ tự đọc",
  parsing: "Phân tích bố cục và gom section",
  final: "Dựng nội dung cuối cùng",
};

export function OCRAnalysisPanel({
  currentPage,
  totalPages,
  analysisComplete = false,
  sectionStates = [],
  isLoading = true,
  error = null,
  documentType = "cv",
  documentContent = "",
  onRetry,
  onUploadNew,
}: OCRAnalysisPanelProps) {
  const hasError = !isLoading && Boolean(error);

  const progressPct = useMemo(() => {
    if (hasError) return 100;
    if (analysisComplete) return 100;

    const pageRatio =
      totalPages > 0 ? Math.min(1, Math.max(0, currentPage / totalPages)) : 0;
    const weighted = 0.12 + pageRatio * 0.7;
    return Math.round(Math.min(95, Math.max(8, weighted * 100)));
  }, [analysisComplete, currentPage, hasError, totalPages]);

  const stageStates = useMemo(() => {
    const anyProcessing = sectionStates.some(
      (section) => section.state === "processing",
    );
    const anyDone = sectionStates.some((section) => section.state === "done");

    return [
      {
        key: "uploading",
        label: STAGE_LABELS.uploading,
        state:
          anyProcessing || anyDone || analysisComplete ? "done" : "processing",
        detail: "Đã nhận file từ trình duyệt và đưa vào pipeline OCR.",
      },
      {
        key: "ocr",
        label: STAGE_LABELS.ocr,
        state: analysisComplete || anyDone
          ? "done"
          : isLoading
            ? "processing"
            : "pending",
        detail: analysisComplete
          ? `Đã OCR ${Math.max(1, totalPages)} trang`
          : `Đang OCR trang ${Math.max(1, currentPage)}/${Math.max(1, totalPages)}`,
      },
      {
        key: "parsing",
        label: STAGE_LABELS.parsing,
        state: analysisComplete
          ? "done"
          : anyProcessing || anyDone
            ? "processing"
            : "pending",
        detail: analysisComplete
          ? documentType === "non_cv_document"
            ? "Đã giữ nội dung theo dạng tài liệu tổng quát."
            : "Đã gom section theo cấu trúc CV."
          : "Đang phân tích heading, cột và nhóm nội dung liên quan...",
      },
      {
        key: "final",
        label: STAGE_LABELS.final,
        state: analysisComplete ? "done" : "pending",
        detail: analysisComplete
          ? "Nội dung cuối cùng đã sẵn sàng để bạn xem và lưu."
          : "Sẽ dựng bản kết quả cuối cùng sau khi OCR/parsing hoàn tất.",
      },
    ] as const;
  }, [analysisComplete, currentPage, documentType, isLoading, sectionStates, totalPages]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-slate-50">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600">
            <ScanLine size={11} className="text-white" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Bảng phân tích AI
          </h3>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">
            Live
          </span>
        </div>
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-blue-600" />
        ) : null}
      </div>

      <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-8 pt-16">
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              {analysisComplete
                ? documentType === "non_cv_document"
                  ? "Đã hoàn tất phân tích tài liệu."
                  : "Đã hoàn tất phân tích CV."
                : "AI đang quét OCR, phân tích bố cục và dựng nội dung cuối cùng..."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {analysisComplete
                ? `Đã xử lý ${Math.max(1, totalPages)} trang.`
                : `Trang ${Math.max(1, currentPage)}/${Math.max(1, totalPages)} đang được xử lý.`}
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "tween", duration: 0.35 }}
              />
            </div>

            <div className="mt-3 grid gap-2">
              {stageStates.map((stage) => (
                <div
                  key={stage.key}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {stage.state === "done" ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : stage.state === "processing" ? (
                        <Loader2 size={14} className="animate-spin text-blue-600" />
                      ) : (
                        <CircleDashed size={14} className="text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {stage.state === "done"
                        ? "Hoàn tất"
                        : stage.state === "processing"
                          ? "Đang xử lý"
                          : "Chờ xử lý"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{stage.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Các phần nội dung đang nhận diện
            </p>
            <div className="mt-3 space-y-2">
              {sectionStates.map((section) => (
                <div
                  key={section.key}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {section.state === "done" ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : section.state === "processing" ? (
                        <Loader2 size={14} className="animate-spin text-blue-600" />
                      ) : (
                        <CircleDashed size={14} className="text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {section.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {section.state === "done"
                        ? "Hoàn tất"
                        : section.state === "processing"
                          ? "Đang xử lý"
                          : "Chờ xử lý"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {section.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {analysisComplete && documentType === "non_cv_document" ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nội dung tài liệu đã trích xuất
              </p>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                <pre className="font-sans whitespace-pre-wrap">
                  {documentContent || "Chưa có nội dung được trích xuất."}
                </pre>
              </div>
            </div>
          ) : null}

          {hasError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <AlertCircle size={16} />
                <span className="text-sm font-bold">
                  Không thể xử lý tài liệu
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-red-500">{error}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <RefreshCcw size={14} />
                    Thử lại
                  </button>
                ) : null}
                {onUploadNew ? (
                  <button
                    type="button"
                    onClick={onUploadNew}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Upload size={14} />
                    Chọn file khác
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!hasError && isLoading ? (
            <p className="mt-4 text-center text-xs text-slate-500">
              Hệ thống đang ưu tiên lấy đủ nội dung của toàn bộ trang trước khi
              dựng bản kết quả cuối cùng.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
