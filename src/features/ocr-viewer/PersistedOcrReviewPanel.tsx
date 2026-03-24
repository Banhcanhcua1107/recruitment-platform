"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Minus, Plus } from "lucide-react";
import { DocumentPreview } from "@/features/ocr-viewer/components/DocumentPreview";
import { OcrProcessingState, type OcrProcessingStep } from "@/features/ocr-viewer/components/OcrProcessingState";
import { getReviewableBlocks, ParsedBlockList } from "@/features/ocr-viewer/components/ParsedBlockList";
import { fetchJsonlResult } from "@/features/ocr-viewer/services/paddleApi";
import type {
  DocumentPreviewSource,
  NormalizedOcrResult,
} from "@/features/ocr-viewer/types";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";
import type { CVArtifactKind, CVDocumentDetailResponse, CVDocumentStatus } from "@/types/cv-import";

interface PersistedOcrReviewPanelProps {
  detail: CVDocumentDetailResponse;
  fallbackContent?: ReactNode;
}

function hasBlocks(result: NormalizedOcrResult | null) {
  return Boolean(result?.pages.some((page) => page.blocks.length > 0));
}

function countBlocks(result: NormalizedOcrResult | null) {
  return result ? getReviewableBlocks(result.pages).length : 0;
}

function getReviewStatusText(status: CVDocumentStatus, pageCount: number) {
  const safePageCount = Math.max(1, pageCount);

  if (["uploaded", "queued", "normalizing", "rendering_preview", "retrying"].includes(status)) {
    return `Hệ thống đang chuẩn bị file và dựng preview để bắt đầu quét ${safePageCount} trang CV.`;
  }

  if (status === "ocr_running") {
    return `Đang quét OCR và khôi phục thứ tự đọc của ${safePageCount} trang.`;
  }

  if (status === "layout_running" || status === "vl_running") {
    return "Đang phân tích bố cục, nhận diện section và gom nội dung liên quan.";
  }

  if (status === "parsing_structured" || status === "persisting") {
    return "Đang dựng nội dung cuối cùng để bạn review ở cột bên phải.";
  }

  if (status === "partial_ready") {
    return "Đã có một phần kết quả OCR. Bạn có thể review những nội dung đã sẵn sàng.";
  }

  return null;
}

function buildReviewSteps(status: CVDocumentStatus): OcrProcessingStep[] {
  const isAfterPrepare = !["uploaded", "queued", "normalizing", "rendering_preview", "retrying"].includes(status);
  const isAfterOcr = ["layout_running", "vl_running", "parsing_structured", "persisting", "ready", "partial_ready"].includes(status);
  const isAfterLayout = ["parsing_structured", "persisting", "ready", "partial_ready"].includes(status);
  const isReady = ["ready", "partial_ready"].includes(status);

  return [
    {
      id: "prepare",
      label: "Chuẩn bị preview",
      detail: "Nhận file, dựng trang preview và kiểm tra cấu trúc tài liệu.",
      state: isAfterPrepare ? "done" : "processing",
    },
    {
      id: "ocr",
      label: "Quét OCR",
      detail: "Nhận diện chữ và khôi phục thứ tự đọc trên từng vùng nội dung.",
      state: status === "ocr_running" ? "processing" : isAfterOcr ? "done" : "pending",
    },
    {
      id: "layout",
      label: "Phân tích bố cục",
      detail: "Xác định section, heading và nhóm nội dung theo bố cục CV.",
      state:
        status === "layout_running" || status === "vl_running"
          ? "processing"
          : isAfterLayout
            ? "done"
            : "pending",
    },
    {
      id: "final",
      label: "Dựng nội dung review",
      detail: "Chuẩn bị phần nội dung OCR để hiển thị ở cột phải.",
      state:
        status === "parsing_structured" || status === "persisting"
          ? "processing"
          : isReady
            ? "done"
            : "pending",
    },
  ];
}

function inferPreviewKindFromUrl(url: string | null | undefined): DocumentPreviewSource["kind"] {
  if (!url) return "none";

  try {
    const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
    if (pathname.endsWith(".pdf")) return "pdf";
    if (/\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(pathname)) return "image";
  } catch {
    return "none";
  }

  return "none";
}

function getReadyArtifact(detail: CVDocumentDetailResponse, kind: CVArtifactKind) {
  return detail.artifacts.find(
    (artifact) => artifact.kind === kind && artifact.status === "ready" && artifact.download_url,
  );
}

export function PersistedOcrReviewPanel({ detail, fallbackContent }: PersistedOcrReviewPanelProps) {
  const mountedRef = useRef(true);
  const normalizedFromParsed = useMemo(
    () => normalizeOcrResult({ parsed_json: detail.parsed_json, pages: detail.pages }),
    [detail.pages, detail.parsed_json],
  );
  const [artifactResult, setArtifactResult] = useState<NormalizedOcrResult | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [zoom, setZoom] = useState(0.82);

  const normalizedResult = hasBlocks(normalizedFromParsed)
    ? normalizedFromParsed
    : artifactResult ?? normalizedFromParsed;
  const pageCount = normalizedResult.pages.length;
  const blockCount = countBlocks(normalizedResult);
  const hasReviewContent = blockCount > 0;
  const hasRenderedPages = detail.pages.some((page) => Boolean(page.background_url));
  const previewFallbackUrl =
    getReadyArtifact(detail, "preview_pdf")?.download_url ?? getReadyArtifact(detail, "original_file")?.download_url;
  const previewSource = useMemo<DocumentPreviewSource>(() => {
    if (hasRenderedPages) {
      return { kind: "page-images" };
    }

    const kind = inferPreviewKindFromUrl(previewFallbackUrl);
    if (kind === "pdf" || kind === "image") {
      return { kind, url: previewFallbackUrl };
    }

    return { kind: "none" };
  }, [hasRenderedPages, previewFallbackUrl]);

  const artifactCandidates = useMemo(
    () =>
      detail.artifacts.filter(
        (artifact) =>
          artifact.status === "ready" &&
          Boolean(artifact.download_url) &&
          ["normalized_json", "layout_raw", "ocr_raw"].includes(artifact.kind),
      ),
    [detail.artifacts],
  );
  const isDocumentProcessing = !hasReviewContent && ["uploaded", "queued", "normalizing", "rendering_preview", "ocr_running", "layout_running", "vl_running", "parsing_structured", "persisting", "retrying"].includes(detail.document.status);
  const processingSteps = useMemo(() => buildReviewSteps(detail.document.status), [detail.document.status]);
  const processingStatusText = useMemo(
    () => getReviewStatusText(detail.document.status, detail.pages.length || pageCount || 1),
    [detail.document.status, detail.pages.length, pageCount],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasBlocks(normalizedFromParsed) || !artifactCandidates.length) return;

    let cancelled = false;

    const loadFromArtifacts = async () => {
      setArtifactLoading(true);
      setArtifactError(null);

      for (const artifact of artifactCandidates) {
        if (cancelled || !artifact.download_url) return;

        try {
          const raw = await fetchJsonlResult(artifact.download_url);
          if (cancelled || !mountedRef.current) return;

          let normalized = normalizeOcrResult(raw);
          if (!hasBlocks(normalized) && raw && typeof raw === "object" && !Array.isArray(raw)) {
            normalized = normalizeOcrResult({ parsed_json: raw, pages: detail.pages });
          }

          if (hasBlocks(normalized)) {
            setArtifactResult(normalized);
            setArtifactLoading(false);
            return;
          }
        } catch (error) {
          if (cancelled || !mountedRef.current) return;
          setArtifactError(error instanceof Error ? error.message : `Unable to load ${artifact.kind}.`);
        }
      }

      if (!cancelled && mountedRef.current) {
        setArtifactLoading(false);
      }
    };

    void loadFromArtifacts();

    return () => {
      cancelled = true;
    };
  }, [artifactCandidates, detail.pages, normalizedFromParsed]);

  if (previewSource.kind === "none" && !pageCount && fallbackContent) {
    return <>{fallbackContent}</>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_-44px_rgba(15,23,42,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 px-3.5 py-3 md:px-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">OCR Review</p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-900">Trái là tài liệu, phải là nội dung cần review</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
            {pageCount} page(s)
          </span>
          {blockCount > 0 ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
              {blockCount} block hữu ích
            </span>
          ) : null}
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
            <span className="min-w-12 text-center text-[11px] font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
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

      {(artifactLoading || artifactError) && !hasBlocks(normalizedResult) ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-slate-500 md:px-4">
          {artifactLoading ? <Loader2 size={15} className="animate-spin text-blue-600" /> : null}
          <span>{artifactError || "Đang tải nội dung OCR..."}</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2.5 p-2.5 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)] xl:p-3">
        <div className="min-h-0 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50/80 p-2 md:p-2.5">
          <DocumentPreview
            pages={normalizedResult.pages}
            previewSource={previewSource}
            activeBlockId={activeBlockId}
            hoveredBlockId={hoveredBlockId}
            overlayVisible={overlayVisible}
            zoom={zoom}
            onBoxHover={setHoveredBlockId}
            onBoxClick={setActiveBlockId}
          />
        </div>

        <div className="min-h-0 overflow-y-auto rounded-[22px] border border-slate-200 bg-slate-50/70 px-2 py-2 md:px-2.5">
          {isDocumentProcessing || (artifactLoading && !hasReviewContent) ? (
            <OcrProcessingState
              title="CV đang được quét và phân tích"
              description="Sau khi hệ thống hoàn tất OCR và gom nội dung, cột phải sẽ tự chuyển sang phần nội dung CV để bạn review."
              statusText={processingStatusText ?? (artifactLoading ? "Đang đọc dữ liệu OCR đã lưu..." : null)}
              steps={processingSteps}
            />
          ) : (
            <ParsedBlockList
              pages={normalizedResult.pages}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              onHover={setHoveredBlockId}
              onClick={setActiveBlockId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
