"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  FileText,
  Loader2,
  RefreshCcw,
  ScanLine,
  Upload,
} from "lucide-react";

type AnalysisStage = "pending" | "processing" | "done";

interface AnalysisSectionState {
  key: "personal" | "skills" | "education" | "experience";
  label: string;
  detail: string;
  state: AnalysisStage;
}

interface ScanningOverlayProps {
  file: File;
  previewMimeType?: string | null;
  documentType?: "cv" | "non_cv_document";
  documentContent?: string;
  fileName: string;
  fileType: string;
  currentPage: number;
  totalPages: number;
  analysisComplete?: boolean;
  sectionStates?: AnalysisSectionState[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onUploadNew?: () => void;
}

function FilePreview({
  file,
  fileType,
  previewMimeType,
}: {
  file: File;
  fileType: string;
  previewMimeType?: string | null;
}) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  const lowerName = file.name.toLowerCase();
  const resolvedType = (fileType || previewMimeType || "").toLowerCase();
  const isPdf = resolvedType.includes("pdf") || lowerName.endsWith(".pdf");
  const isImage = resolvedType.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/.test(lowerName);
  const isDocx = resolvedType.includes("wordprocessingml.document") || lowerName.endsWith(".docx");

  useEffect(() => {
    // Use local object URL as primary preview source for reliability.
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let mounted = true;
    const container = docxContainerRef.current;

    async function renderDocxPreview() {
      if (!isDocx) {
        setDocxError(null);
        setDocxLoading(false);
        if (container) {
          container.innerHTML = "";
        }
        return;
      }

      if (!container) {
        return;
      }

      setDocxLoading(true);
      setDocxError(null);
      container.innerHTML = "";

      try {
        const { renderAsync } = await import("docx-preview");
        const buffer = await file.arrayBuffer();
        if (!mounted || !container) return;

        await renderAsync(buffer, container, container, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true,
        });

        if (!mounted || !container) return;
        const hasVisibleContent = (container.textContent || "").trim().length > 0 || container.querySelector("canvas, svg, table, p, h1, h2, h3, h4, h5, h6") !== null;
        if (!hasVisibleContent) {
          setDocxError("DOCX rendered but no visible content was produced. The document may be unsupported or empty.");
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : "Failed to render DOCX preview.";
        setDocxError(message);
      } finally {
        if (mounted) setDocxLoading(false);
      }
    }

    void renderDocxPreview();
    return () => {
      mounted = false;
      // Keep the rendered HTML during normal React re-renders to avoid blank flashes.
    };
  }, [file, isDocx]);

  if (isPdf) {
    if (!sourceUrl) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading PDF preview...
        </div>
      );
    }
    return (
      <iframe
        src={sourceUrl}
        title="Original CV preview"
        className="h-full w-full border-0"
      />
    );
  }

  if (isImage) {
    if (!sourceUrl) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading image preview...
        </div>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sourceUrl} alt="Original CV" className="h-full w-full object-contain bg-white" draggable={false} />;
  }

  if (isDocx) {
    return (
      <div className="h-full w-full overflow-auto bg-slate-100 p-4 md:p-6">
        {docxLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Rendering DOCX preview...</div>
        ) : docxError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{docxError}</div>
        ) : (
          <div className="mx-auto w-full max-w-212.5 rounded-xl bg-white p-10 shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
            <div
              ref={docxContainerRef}
              className="docx-preview-container min-h-120 text-base leading-7 text-slate-800"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-500">
      Unsupported preview format.
    </div>
  );
}

export function ScanningOverlay({
  file,
  previewMimeType,
  documentType = "cv",
  documentContent = "",
  fileName,
  fileType,
  currentPage,
  totalPages,
  analysisComplete = false,
  sectionStates = [],
  isLoading = true,
  error = null,
  onRetry,
  onUploadNew,
}: ScanningOverlayProps) {
  const hasError = !isLoading && Boolean(error);
  const progressPct = useMemo(() => {
    if (totalPages <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));
  }, [currentPage, totalPages]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="mx-auto flex h-full w-full flex-col gap-4"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          CV Analysis Workspace
        </h2>
      </div>

      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-10">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl shadow-slate-200/60 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} className="text-slate-500" />
              Original CV Preview
            </div>
            <p className="max-w-60 truncate text-xs text-slate-500">{fileName}</p>
          </div>
          <div className="min-h-0 flex-1 bg-white">
            <FilePreview
              file={file}
              fileType={fileType}
              previewMimeType={previewMimeType}
            />
          </div>
        </div>

        <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ScanLine size={16} className="text-blue-600" />
              AI Analysis Panel
            </h3>
            {isLoading ? <Loader2 size={16} className="animate-spin text-blue-600" /> : null}
          </div>

          <p className="mt-3 text-sm font-medium text-slate-700">
            {analysisComplete
              ? (documentType === "non_cv_document" ? "Document analysis complete." : "AI analysis complete.")
              : "AI is scanning and analyzing your CV..."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {analysisComplete
              ? `Scanned ${Math.max(1, totalPages)} page(s).`
              : `Scanning page ${Math.max(1, currentPage)} of ${Math.max(1, totalPages)}...`}
          </p>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "tween", duration: 0.35 }}
            />
          </div>

          <div className="mt-4 space-y-2">
            {sectionStates.map((section) => (
              <div key={section.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {section.state === "done" ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : section.state === "processing" ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <CircleDashed size={14} className="text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{section.label}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {section.state === "done" ? "Done" : section.state === "processing" ? "Scanning" : "Pending"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{section.detail}</p>
              </div>
            ))}
          </div>

          {analysisComplete && documentType === "non_cv_document" ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Extracted Document Content
              </p>
              <div className="max-h-72 overflow-y-auto rounded-lg bg-white p-3 text-xs leading-6 text-slate-700 shadow-sm">
                <pre className="whitespace-pre-wrap font-sans">{documentContent || "No extracted content available."}</pre>
              </div>
            </div>
          ) : null}

          {hasError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <AlertCircle size={16} />
                <span className="text-sm font-bold">Khong the xu ly CV</span>
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
                    Thu lai
                  </button>
                ) : null}
                {onUploadNew ? (
                  <button
                    type="button"
                    onClick={onUploadNew}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Upload size={14} />
                    Upload CV moi
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!analysisComplete && isLoading ? (
        <p className="text-center text-xs text-slate-500">
          The preview panel stays responsive while OCR scans each page and the AI parser builds structured sections.
        </p>
      ) : null}
    </motion.div>
  );
}
