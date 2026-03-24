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
import { OcrProcessingState } from "@/features/ocr-viewer/components/OcrProcessingState";
import { getReviewableBlocks, ParsedBlockList } from "@/features/ocr-viewer/components/ParsedBlockList";
import { useAsyncParse } from "@/features/ocr-viewer/hooks/useAsyncParse";
import { PaddleApiError, parseSync } from "@/features/ocr-viewer/services/paddleApi";
import type {
  AsyncParseProgress,
  AsyncParseStatus,
  DocumentPreviewSource,
  NormalizedOcrResult,
  ParseMode,
} from "@/features/ocr-viewer/types";
import type { OcrProcessingStep } from "@/features/ocr-viewer/components/OcrProcessingState";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";

type AsyncInputMode = "local" | "url";

interface PaddleOcrWorkspaceProps {
  className?: string;
}

interface StatusNotice {
  tone: "info" | "error" | "warning";
  text: string;
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
  return result ? getReviewableBlocks(result.pages).length : 0;
}

function buildStatusNotice(
  syncLoading: boolean,
  status: AsyncParseStatus,
  progress: AsyncParseProgress | null,
  error: string | null,
): StatusNotice | null {
  if (error) {
    return {
      tone: "error",
      text: error,
    };
  }

  if (syncLoading) {
    return {
      tone: "info",
      text: "Đang chạy Sync Parse...",
    };
  }

  if (status === "submitting") {
    return {
      tone: "info",
      text: "Đang gửi job Async Parse...",
    };
  }

  if (status === "pending" || status === "running") {
    const parts = [
      progress?.status ? `Trạng thái: ${progress.status}` : null,
      progress?.extractedPages != null && progress?.totalPages != null
        ? `${progress.extractedPages}/${progress.totalPages} trang`
        : null,
      progress?.message ?? null,
    ].filter(Boolean);

    return {
      tone: "info",
      text: parts.join(" • ") || "Đang xử lý Async Parse...",
    };
  }

  if (status === "cancelled") {
    return {
      tone: "warning",
      text: "Đã dừng Async Parse.",
    };
  }

  return null;
}

export function PaddleOcrWorkspace({ className }: PaddleOcrWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
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
  const [zoom, setZoom] = useState(0.82);
  const { startJob, cancelJob, status, progress, result: asyncResult, error: asyncError } = useAsyncParse();

  const safeProgress = useMemo<AsyncParseProgress | null>(() => {
    return progress ?? null;
  }, [progress]);

  useEffect(() => {
    if (!asyncResult) return;
    setViewerResult(asyncResult);
    setError(null);
  }, [asyncResult]);

  useEffect(() => {
    if (!asyncError) return;
    setError(asyncError);
  }, [asyncError]);

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

  const reviewableBlockCount = useMemo(() => countBlocks(viewerResult), [viewerResult]);
  const canRunSync = Boolean(selectedFile) && !syncLoading;
  const canRunAsync = Boolean(
    (asyncInputMode === "local" && selectedFile) || (asyncInputMode === "url" && fileUrl.trim()),
  );
  const isBusy = syncLoading || ["submitting", "pending", "running"].includes(status);
  const statusNotice = useMemo(
    () => buildStatusNotice(syncLoading, status, safeProgress, error),
    [error, safeProgress, status, syncLoading],
  );
  const showTopStatusNotice = Boolean(statusNotice && (statusNotice.tone !== "info" || reviewableBlockCount > 0));
  const processingSteps = useMemo<OcrProcessingStep[]>(
    () => [
      {
        id: "prepare",
        label: "Chuẩn bị file",
        detail: selectedFile ? `Đã nhận file ${selectedFile.name} và dựng preview tài liệu.` : "Chờ chọn file để bắt đầu.",
        state: selectedFile ? "done" : "pending",
      },
      {
        id: "ocr",
        label: "Quét OCR",
        detail:
          parseMode === "sync"
            ? "Đang nhận diện chữ trực tiếp từ file bạn vừa tải lên."
            : "Đang gửi job và quét OCR từ pipeline bất đồng bộ.",
        state:
          syncLoading || status === "submitting" || status === "pending" || status === "running"
            ? "processing"
            : viewerResult
              ? "done"
              : "pending",
      },
      {
        id: "layout",
        label: "Phân tích bố cục",
        detail: "Hệ thống đang gom section, heading và thứ tự đọc của CV.",
        state:
          viewerResult
            ? "done"
            : syncLoading || status === "pending" || status === "running"
              ? "processing"
              : "pending",
      },
      {
        id: "final",
        label: "Hiển thị nội dung review",
        detail: "Khi hoàn tất, cột phải sẽ chuyển sang nội dung OCR để bạn review.",
        state: viewerResult ? "done" : "pending",
      },
    ],
    [parseMode, selectedFile, status, syncLoading, viewerResult],
  );

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (!file) return;

      setSelectedFile(file);
      setViewerResult(null);
      setActiveBlockId(null);
      setHoveredBlockId(null);
      setError(null);
      cancelJob();
      syncAbortRef.current?.abort();
    },
    [cancelJob],
  );

  const handleRunSync = useCallback(async () => {
    if (!selectedFile) {
      setError("Hãy chọn PDF hoặc ảnh trước khi chạy Sync Parse.");
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

    try {
      const raw = await parseSync(selectedFile, controller.signal);
      const normalized = normalizeOcrResult(raw);
      setViewerResult(normalized);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      const message =
        caughtError instanceof PaddleApiError || caughtError instanceof Error
          ? caughtError.message
          : "Sync Parse thất bại.";
      setError(message);
    } finally {
      if (syncAbortRef.current === controller) {
        syncAbortRef.current = null;
      }
      setSyncLoading(false);
    }
  }, [cancelJob, selectedFile]);

  const handleRunAsync = useCallback(async () => {
    const source = asyncInputMode === "local" ? selectedFile : fileUrl.trim();
    if (!source) {
      setError(
        asyncInputMode === "local"
          ? "Hãy chọn file trước khi chạy Async Parse."
          : "Hãy nhập URL tài liệu trước khi chạy Async Parse.",
      );
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
      <div className="border-b border-slate-200 bg-white/95 px-3.5 py-3 backdrop-blur md:px-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">PaddleOCR Viewer</p>
              <h2 className="mt-1 text-[15px] font-semibold text-slate-900">Workspace OCR tối giản</h2>
              <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">
                Bên trái là preview tài liệu, bên phải chỉ giữ lại nội dung OCR hữu ích để review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOverlayVisible((current) => !current)}
                className="inline-flex h-8 items-center gap-1.5 rounded-[18px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {overlayVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                {overlayVisible ? "Ẩn overlay" : "Hiện overlay"}
              </button>

              <div className="inline-flex items-center rounded-[18px] border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.08).toFixed(2))))}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Zoom out"
                >
                  <Minus size={13} />
                </button>
                <span className="min-w-12 text-center text-[11px] font-semibold text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(2, Number((current + 0.08).toFixed(2))))}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Zoom in"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 xl:grid-cols-[auto_auto_minmax(280px,1fr)_auto]">
            <div className="inline-flex items-center rounded-[18px] border border-slate-200 bg-slate-50 p-1">
              {(["sync", "async"] as ParseMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setParseMode(mode);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-[14px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                    parseMode === mode ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white",
                  )}
                >
                  {mode === "sync" ? "Sync Parse" : "Async Parse"}
                </button>
              ))}
            </div>

            {parseMode === "async" ? (
              <div className="inline-flex items-center rounded-[18px] border border-slate-200 bg-slate-50 p-1">
                {(["local", "url"] as AsyncInputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAsyncInputMode(mode);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-[14px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                      asyncInputMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/70",
                    )}
                  >
                    {mode === "local" ? "File local" : "URL file"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="hidden xl:block" />
            )}

            <div className="flex flex-col gap-2.5 md:flex-row">
              {parseMode === "async" && asyncInputMode === "url" ? (
                <label className="flex h-10 flex-1 items-center gap-2.5 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] text-slate-600 shadow-sm">
                  <Link2 size={16} className="text-slate-400" />
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(event) => setFileUrl(event.target.value)}
                    aria-label="Document URL"
                    placeholder="https://example.com/document.pdf"
                    className="h-full w-full border-0 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <FileUp size={16} />
                  {selectedFile ? selectedFile.name : "Chọn PDF hoặc ảnh"}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
                className="hidden"
                aria-label="Upload PDF or image"
                onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={parseMode === "sync" ? () => void handleRunSync() : () => void handleRunAsync()}
                disabled={parseMode === "sync" ? !canRunSync : !canRunAsync || isBusy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] bg-slate-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {parseMode === "sync" ? "Chạy sync" : "Chạy async"}
              </button>

              {isBusy ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Square size={14} />
                  Dừng
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showTopStatusNotice && statusNotice ? (
        <div className="px-3.5 pt-3 md:px-4">
          <div
            className={cn(
              "rounded-[18px] border px-3.5 py-2.5 text-[13px]",
              statusNotice.tone === "info" && "border-sky-200 bg-sky-50 text-sky-800",
              statusNotice.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
              statusNotice.tone === "error" && "border-rose-200 bg-rose-50 text-rose-800",
            )}
          >
            {statusNotice.text}
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2.5 p-2.5 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)] xl:p-3">
        <section className="flex min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 px-3.5 py-3 md:px-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tài liệu gốc</p>
              <h3 className="mt-1 text-[15px] font-semibold text-slate-900">
                {viewerResult?.pages.length ? `${viewerResult.pages.length} trang` : "Preview"}
              </h3>
            </div>

            {reviewableBlockCount > 0 ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
                {reviewableBlockCount} block hữu ích
              </span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-2.5 py-2.5 md:px-3">
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

        <section className="flex min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-200 px-3.5 py-3 md:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Nội dung OCR</p>
            <h3 className="mt-1 text-[15px] font-semibold text-slate-900">Quét xong sẽ hiện nội dung CV ở đây</h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-2.5 py-2.5 md:px-3">
            {isBusy && reviewableBlockCount === 0 ? (
              <OcrProcessingState
                title="CV đang được quét và phân tích"
                description="Khi hệ thống xử lý xong, cột phải sẽ tự chuyển sang phần nội dung OCR để bạn review."
                statusText={statusNotice?.text ?? null}
                steps={processingSteps}
              />
            ) : (
              <ParsedBlockList
                pages={viewerResult?.pages ?? []}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={setHoveredBlockId}
                onClick={setActiveBlockId}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
