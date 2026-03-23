"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  FileUp,
  Link2,
  Loader2,
  Minus,
  Play,
  Plus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "@/features/ocr-viewer/components/DocumentPreview";
import { ParsedBlockList } from "@/features/ocr-viewer/components/ParsedBlockList";
import { useAsyncParse } from "@/features/ocr-viewer/hooks/useAsyncParse";
import { PaddleApiError, parseSync } from "@/features/ocr-viewer/services/paddleApi";
import type {
  AsyncParseStatus,
  DocumentPreviewSource,
  NormalizedOcrResult,
  OcrLogEntry,
  ParseMode,
} from "@/features/ocr-viewer/types";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";

type AsyncInputMode = "local" | "url";

interface PaddleOcrWorkspaceProps {
  className?: string;
}

function createLog(level: OcrLogEntry["level"], message: string): OcrLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    createdAt: new Date().toISOString(),
  };
}

function inferPreviewKindFromFile(file: File): DocumentPreviewSource["kind"] {
  const lowerName = file.name.toLowerCase();
  if (file.type.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(lowerName)) return "image";
  return "none";
}

function inferPreviewKindFromUrl(url: string): DocumentPreviewSource["kind"] {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
    if (pathname.endsWith(".pdf")) return "pdf";
    if (/\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(pathname)) return "image";
  } catch {
    return "none";
  }

  return "none";
}

function countBlocks(result: NormalizedOcrResult | null) {
  return result?.pages.reduce((sum, page) => sum + page.blocks.length, 0) ?? 0;
}

function getStatusTone(status: AsyncParseStatus, syncLoading: boolean, error: string | null) {
  if (error) return "text-rose-700";
  if (syncLoading || ["submitting", "pending", "running"].includes(status)) return "text-blue-700";
  if (status === "done") return "text-emerald-700";
  if (status === "failed") return "text-rose-700";
  if (status === "cancelled") return "text-amber-700";
  return "text-slate-500";
}

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function PaddleOcrWorkspace({ className }: PaddleOcrWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
  const asyncProgressKeyRef = useRef<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseMode, setParseMode] = useState<ParseMode>("sync");
  const [asyncInputMode, setAsyncInputMode] = useState<AsyncInputMode>("local");
  const [fileUrl, setFileUrl] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerResult, setViewerResult] = useState<NormalizedOcrResult | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [logs, setLogs] = useState<OcrLogEntry[]>([
    createLog("info", "Workspace is ready. Upload a PDF/image or paste a file URL for async parsing."),
  ]);
  const { startJob, cancelJob, status, progress, result: asyncResult, error: asyncError } = useAsyncParse();
  const safeProgress = useMemo(
    () =>
      progress ?? {
        jobId: null,
        status: "idle",
        totalPages: null,
        extractedPages: null,
        message: null,
        jsonUrl: null,
      },
    [progress],
  );

  const appendLog = useCallback((level: OcrLogEntry["level"], message: string) => {
    setLogs((current) => [createLog(level, message), ...current].slice(0, 40));
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    appendLog("info", `Selected file: ${selectedFile.name}`);
  }, [appendLog, selectedFile]);

  useEffect(() => {
    if (!asyncResult) return;
    setViewerResult(asyncResult);
    setError(null);
    appendLog(
      "success",
      `Async parse completed with ${asyncResult.pages.length} page(s) and ${countBlocks(asyncResult)} block(s).`,
    );
  }, [appendLog, asyncResult]);

  useEffect(() => {
    if (!asyncError) return;
    setError(asyncError);
    appendLog("error", asyncError);
  }, [appendLog, asyncError]);

  useEffect(() => {
    const nextKey = JSON.stringify({
      status,
      jobId: safeProgress.jobId,
      extractedPages: safeProgress.extractedPages,
      totalPages: safeProgress.totalPages,
      message: safeProgress.message,
    });

    if (!safeProgress.jobId && status === "idle") {
      asyncProgressKeyRef.current = "";
      return;
    }

    if (asyncProgressKeyRef.current === nextKey) return;
    asyncProgressKeyRef.current = nextKey;

    if (status === "submitting") {
      appendLog("info", "Submitting async OCR job...");
      return;
    }

    if (status === "pending" || status === "running") {
      const parts = [
        safeProgress.jobId ? `Job ${safeProgress.jobId}` : null,
        safeProgress.status || status,
        safeProgress.extractedPages != null && safeProgress.totalPages != null
          ? `${safeProgress.extractedPages}/${safeProgress.totalPages} page(s)`
          : null,
        safeProgress.message,
      ].filter(Boolean);

      appendLog("info", parts.join(" • "));
      return;
    }

    if (status === "cancelled") {
      appendLog("info", "Async OCR polling stopped.");
    }
  }, [appendLog, safeProgress, status]);

  useEffect(() => {
    setActiveBlockId((current) => {
      if (!current) return current;
      const hasActive = viewerResult?.pages.some((page) => page.blocks.some((block) => block.id === current));
      return hasActive ? current : null;
    });
    setHoveredBlockId((current) => {
      if (!current) return current;
      const hasHovered = viewerResult?.pages.some((page) => page.blocks.some((block) => block.id === current));
      return hasHovered ? current : null;
    });
  }, [viewerResult]);

  useEffect(() => {
    return () => {
      syncAbortRef.current?.abort();
    };
  }, []);

  const previewSource = useMemo<DocumentPreviewSource | null>(() => {
    if (parseMode === "async" && asyncInputMode === "url" && fileUrl.trim()) {
      const kind = inferPreviewKindFromUrl(fileUrl.trim());
      if (kind === "none") return { kind: "none" };
      return {
        kind,
        url: fileUrl.trim(),
      };
    }

    if (selectedFile) {
      const kind = inferPreviewKindFromFile(selectedFile);
      if (kind === "none") return { kind: "none" };
      return {
        kind,
        url: URL.createObjectURL(selectedFile),
      };
    }

    return { kind: "none" };
  }, [asyncInputMode, fileUrl, parseMode, selectedFile]);

  useEffect(() => {
    return () => {
      if (previewSource?.url?.startsWith("blob:") && selectedFile) {
        URL.revokeObjectURL(previewSource.url);
      }
    };
  }, [previewSource, selectedFile]);

  const flattenedBlockCount = useMemo(() => countBlocks(viewerResult), [viewerResult]);
  const canRunSync = Boolean(selectedFile) && !syncLoading;
  const canRunAsync = Boolean(
    (asyncInputMode === "local" && selectedFile) || (asyncInputMode === "url" && fileUrl.trim()),
  );
  const isBusy = syncLoading || ["submitting", "pending", "running"].includes(status);
  const statusTone = getStatusTone(status, syncLoading, error);
  const warnings = viewerResult?.warnings ?? [];

  const handleFileSelected = useCallback((file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setViewerResult(null);
    setActiveBlockId(null);
    setHoveredBlockId(null);
    setError(null);
    cancelJob();
    syncAbortRef.current?.abort();
  }, [cancelJob]);

  const handleRunSync = useCallback(async () => {
    if (!selectedFile) {
      setError("Select a PDF or image before running sync parse.");
      return;
    }

    cancelJob();
    syncAbortRef.current?.abort();
    const controller = new AbortController();
    syncAbortRef.current = controller;

    setSyncLoading(true);
    setError(null);
    setViewerResult(null);
    setActiveBlockId(null);
    setHoveredBlockId(null);
    appendLog("info", "Calling sync layout parsing endpoint...");

    try {
      const raw = await parseSync(selectedFile, controller.signal);
      const normalized = normalizeOcrResult(raw);
      setViewerResult(normalized);
      appendLog(
        "success",
        `Sync parse completed with ${normalized.pages.length} page(s) and ${countBlocks(normalized)} block(s).`,
      );
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        appendLog("info", "Sync parse cancelled.");
        return;
      }

      const message =
        caughtError instanceof PaddleApiError || caughtError instanceof Error
          ? caughtError.message
          : "Sync parse failed.";
      setError(message);
      appendLog("error", message);
    } finally {
      if (syncAbortRef.current === controller) {
        syncAbortRef.current = null;
      }
      setSyncLoading(false);
    }
  }, [appendLog, cancelJob, selectedFile]);

  const handleRunAsync = useCallback(async () => {
    const source = asyncInputMode === "local" ? selectedFile : fileUrl.trim();
    if (!source) {
      setError(asyncInputMode === "local" ? "Select a file before starting async parse." : "Paste a file URL first.");
      return;
    }

    syncAbortRef.current?.abort();
    setError(null);
    setViewerResult(null);
    setActiveBlockId(null);
    setHoveredBlockId(null);
    await startJob(source);
  }, [asyncInputMode, fileUrl, selectedFile, startJob]);

  const handleCancel = useCallback(() => {
    syncAbortRef.current?.abort();
    cancelJob();
  }, [cancelJob]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-[#f4f8fb]", className)}>
      <div className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
                PaddleOCR Viewer
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">OCR document workspace</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Upload a PDF/image, run sync or async parsing, and inspect mapped OCR blocks with accurate overlay scaling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOverlayVisible((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {overlayVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                {overlayVisible ? "Hide overlay" : "Show overlay"}
              </button>

              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Zoom out"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(2.2, Number((current + 0.1).toFixed(2))))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Zoom in"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[auto_auto_minmax(280px,1fr)_auto]">
            <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(["sync", "async"] as ParseMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setParseMode(mode);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-[14px] px-4 py-2 text-sm font-medium transition-colors",
                    parseMode === mode ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white",
                  )}
                >
                  {mode === "sync" ? "Sync Parse" : "Async Parse"}
                </button>
              ))}
            </div>

            {parseMode === "async" ? (
              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {(["local", "url"] as AsyncInputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAsyncInputMode(mode);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-[14px] px-4 py-2 text-sm font-medium transition-colors",
                      asyncInputMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/70",
                    )}
                  >
                    {mode === "local" ? "Local File" : "File URL"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="hidden xl:block" />
            )}

            <div className="flex flex-col gap-3 md:flex-row">
              {parseMode === "async" && asyncInputMode === "url" ? (
                <label className="flex h-11 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600 shadow-sm">
                  <Link2 size={16} className="text-slate-400" />
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(event) => setFileUrl(event.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="h-full w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <FileUp size={16} />
                  {selectedFile ? selectedFile.name : "Choose PDF or image"}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
                className="hidden"
                onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={parseMode === "sync" ? () => void handleRunSync() : () => void handleRunAsync()}
                disabled={parseMode === "sync" ? !canRunSync : !canRunAsync || isBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {parseMode === "sync" ? "Run sync" : "Run async"}
              </button>

              {isBusy ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Square size={14} />
                  Stop
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] xl:p-5">
        <section className="flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Document Preview</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {viewerResult?.pages.length ? `${viewerResult.pages.length} page(s)` : "Preview"}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                {flattenedBlockCount} block(s)
              </span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusTone)}>
                {error
                  ? "Error"
                  : syncLoading
                    ? "Running sync parse"
                    : status === "done"
                      ? "Async parse done"
                      : status === "pending" || status === "running" || status === "submitting"
                        ? `Async ${safeProgress.status || status}`
                        : "Idle"}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-5">
            <DocumentPreview
              pages={viewerResult?.pages ?? []}
              previewSource={previewSource}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              overlayVisible={overlayVisible}
              zoom={zoom}
              onBoxHover={setHoveredBlockId}
              onBoxClick={setActiveBlockId}
            />
          </div>
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-rows-[minmax(0,1fr)_auto]">
          <div className="flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.35)]">
            <div className="border-b border-slate-200 px-4 py-4 md:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Parsed Blocks</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Hover or click to sync both panels</h3>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
              <ParsedBlockList
                pages={viewerResult?.pages ?? []}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={setHoveredBlockId}
                onClick={setActiveBlockId}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.35)] md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Parse Status</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Status and logs</h3>
              </div>
              {safeProgress.totalPages != null || safeProgress.extractedPages != null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  {safeProgress.extractedPages ?? 0}/{safeProgress.totalPages ?? "?"} page(s)
                </span>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Normalization Notes</p>
                <ul className="mt-2 space-y-2 text-sm text-amber-800">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    entry.level === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                    entry.level === "error" && "border-rose-200 bg-rose-50 text-rose-800",
                    entry.level === "info" && "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span>{entry.level}</span>
                    <span>{formatLogTime(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 leading-6">{entry.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
