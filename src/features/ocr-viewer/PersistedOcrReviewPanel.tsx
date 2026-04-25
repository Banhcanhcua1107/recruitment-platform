"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { DocumentPreview } from "@/features/ocr-viewer/components/DocumentPreview";
import { OcrProcessingState, type OcrProcessingStep } from "@/features/ocr-viewer/components/OcrProcessingState";
import { PreviewScaleToolbar } from "@/features/ocr-viewer/components/PreviewScaleToolbar";
import { ParsedBlockList } from "@/features/ocr-viewer/components/ParsedBlockList";
import { normalizeParsedJsonRecord } from "@/features/cv-import/normalize-parsed-json";
import { getReviewableBlocks } from "@/features/ocr-viewer/components/ParsedBlockList";
import { fetchJsonlResult } from "@/features/ocr-viewer/services/paddleApi";
import type {
  DocumentPreviewSource,
  NormalizedOcrResult,
  PreviewScaleMode,
} from "@/features/ocr-viewer/types";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";
import type { CVArtifactKind, CVDocumentDetailResponse, CVDocumentStatus } from "@/types/cv-import";

interface PersistedOcrReviewPanelProps {
  detail: CVDocumentDetailResponse;
  fallbackContent?: ReactNode;
  headerActions?: ReactNode;
}

interface PreviewScaleState {
  contextKey: string;
  mode: PreviewScaleMode;
  zoom: number;
}

function hasBlocks(result: NormalizedOcrResult | null) {
  return Boolean(result?.pages.some((page) => page.blocks.length > 0));
}

function countBlocks(result: NormalizedOcrResult | null) {
  return result ? getReviewableBlocks(result.pages).length : 0;
}

function clampZoom(value: number) {
  return Math.max(0.55, Math.min(2.4, Number(value.toFixed(2))));
}

function getDefaultPreviewScale(pageCount: number): { mode: PreviewScaleMode; zoom: number } {
  if (pageCount <= 1) {
    return { mode: "fitWidth", zoom: 0.96 };
  }

  return { mode: "fitWidth", zoom: 0.88 };
}

function getScaleZoomForMode(mode: PreviewScaleMode, pageCount: number) {
  const singlePage = pageCount <= 1;

  if (mode === "fitPage") {
    return singlePage ? 1.08 : 0.92;
  }

  if (mode === "fitWidth") {
    return singlePage ? 0.96 : 0.88;
  }

  return singlePage ? 0.96 : 0.88;
}

function getReviewStatusText(status: CVDocumentStatus, pageCount: number) {
  const safePageCount = Math.max(1, pageCount);

  if (["queued", "normalizing", "rendering_preview", "retrying"].includes(status)) {
    return `He thong dang chuan bi file va dung preview de bat dau quet ${safePageCount} trang CV.`;
  }

  if (status === "ocr_running") {
    return `Dang quet OCR va khoi phuc thu tu doc cua ${safePageCount} trang.`;
  }

  if (status === "layout_running" || status === "vl_running") {
    return "Dang phan tich bo cuc, nhan dien section va gom noi dung lien quan.";
  }

  if (status === "parsing_structured" || status === "persisting") {
    return "Dang dung noi dung cuoi cung de ban review o cot ben phai.";
  }

  if (status === "partial_ready") {
    return "Da co mot phan ket qua OCR. Ban co the review nhung noi dung da san sang.";
  }

  return null;
}

function buildReviewSteps(status: CVDocumentStatus): OcrProcessingStep[] {
  const isAfterPrepare = !["queued", "normalizing", "rendering_preview", "retrying"].includes(status);
  const isAfterOcr = ["layout_running", "vl_running", "parsing_structured", "persisting", "ready", "partial_ready"].includes(status);
  const isAfterLayout = ["parsing_structured", "persisting", "ready", "partial_ready"].includes(status);
  const isReady = ["ready", "partial_ready"].includes(status);

  return [
    {
      id: "prepare",
      label: "Chuan bi preview",
      detail: "Nhan file, dung trang preview va kiem tra cau truc tai lieu.",
      state: isAfterPrepare ? "done" : "processing",
    },
    {
      id: "ocr",
      label: "Quet OCR",
      detail: "Nhan dien chu va khoi phuc thu tu doc tren tung vung noi dung.",
      state: status === "ocr_running" ? "processing" : isAfterOcr ? "done" : "pending",
    },
    {
      id: "layout",
      label: "Phan tich bo cuc",
      detail: "Xac dinh section, heading va nhom noi dung theo bo cuc CV.",
      state:
        status === "layout_running" || status === "vl_running"
          ? "processing"
          : isAfterLayout
            ? "done"
            : "pending",
    },
    {
      id: "final",
      label: "Dung noi dung review",
      detail: "Chuan bi phan noi dung OCR de hien thi o cot phai.",
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

function hasMeaningfulParsedJson(parsedJson: Record<string, unknown>) {
  return Object.values(parsedJson).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return value !== null && value !== "";
  });
}

export function PersistedOcrReviewPanel({
  detail,
  fallbackContent,
  headerActions,
}: PersistedOcrReviewPanelProps) {
  const mountedRef = useRef(true);
  const normalizedParsedJson = useMemo(() => normalizeParsedJsonRecord(detail.parsed_json), [detail.parsed_json]);
  const normalizedFromParsed = useMemo(
    () => normalizeOcrResult({ parsed_json: normalizedParsedJson, pages: detail.pages }),
    [detail.pages, normalizedParsedJson],
  );
  const [artifactResult, setArtifactResult] = useState<NormalizedOcrResult | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [scalePreference, setScalePreference] = useState<PreviewScaleState | null>(null);

  const normalizedResult = hasBlocks(normalizedFromParsed)
    ? normalizedFromParsed
    : artifactResult ?? normalizedFromParsed;
  const pageCount = normalizedResult.pages.length;
  const blockCount = countBlocks(normalizedResult);
  const hasReviewContent = blockCount > 0;
  const hasParsedJsonContent = useMemo(() => hasMeaningfulParsedJson(normalizedParsedJson), [normalizedParsedJson]);
  const parsedJsonText = useMemo(() => JSON.stringify(normalizedParsedJson, null, 2), [normalizedParsedJson]);
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
          ["normalized_json", "mapped_sections", "layout_raw", "ocr_raw"].includes(artifact.kind),
      ),
    [detail.artifacts],
  );

  const isDocumentProcessing =
    !hasReviewContent &&
    [
      "queued",
      "normalizing",
      "rendering_preview",
      "ocr_running",
      "layout_running",
      "vl_running",
      "parsing_structured",
      "persisting",
      "retrying",
    ].includes(detail.document.status);
  const isAwaitingAnalysis = detail.document.status === "uploaded" && !hasReviewContent;

  const processingSteps = useMemo(() => buildReviewSteps(detail.document.status), [detail.document.status]);
  const processingStatusText = useMemo(
    () => getReviewStatusText(detail.document.status, detail.pages.length || pageCount || 1),
    [detail.document.status, detail.pages.length, pageCount],
  );

  const scaleContextKey = `${detail.document.id}:${previewSource.kind}:${pageCount}`;
  const defaultScale = useMemo<PreviewScaleState>(() => {
    const defaults = getDefaultPreviewScale(pageCount);
    return {
      contextKey: scaleContextKey,
      mode: defaults.mode,
      zoom: defaults.zoom,
    };
  }, [pageCount, scaleContextKey]);
  const resolvedScale = scalePreference?.contextKey === scaleContextKey ? scalePreference : defaultScale;
  const scaleMode = resolvedScale.mode;
  const zoom = resolvedScale.zoom;

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_26px_60px_-42px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 md:px-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Layout review
          </span>
          {isDocumentProcessing ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
              Dang OCR
            </span>
          ) : hasReviewContent ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
              San sang review
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pr-10 md:gap-3 md:pr-12">
          {headerActions}
          <PreviewScaleToolbar
            pageCount={pageCount}
            overlayVisible={overlayVisible}
            scaleMode={scaleMode}
            zoom={zoom}
            onToggleOverlay={() => setOverlayVisible((current) => !current)}
            onSetScaleMode={(mode) => {
              setScalePreference({
                contextKey: scaleContextKey,
                mode,
                zoom: getScaleZoomForMode(mode, pageCount),
              });
            }}
            onZoomOut={() =>
              setScalePreference({
                contextKey: scaleContextKey,
                mode: scaleMode,
                zoom: clampZoom(zoom - 0.08),
              })
            }
            onZoomIn={() =>
              setScalePreference({
                contextKey: scaleContextKey,
                mode: scaleMode,
                zoom: clampZoom(zoom + 0.08),
              })
            }
          />
        </div>
      </div>

      {artifactLoading && !hasBlocks(normalizedResult) ? (
        <div className="flex items-center gap-2 px-3.5 py-2 text-[12px] text-slate-500 md:px-4">
          <Loader2 size={15} className="animate-spin text-blue-600" />
          <span>Dang tai noi dung OCR...</span>
        </div>
      ) : null}

      {artifactError && !hasBlocks(normalizedResult) ? (
        <div className="px-3.5 py-2 md:px-4">
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {artifactError}
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2.5 overflow-hidden p-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.28fr)]">
        <div className="min-h-0 overflow-y-auto rounded-[22px] border border-slate-200 bg-[#f8fbff] px-3 py-2 md:px-3.5">
          {isDocumentProcessing || (artifactLoading && !hasReviewContent) ? (
            <OcrProcessingState
              title="CV dang duoc quet va phan tich"
              description="Sau khi OCR hoan tat, panel nay se hien thi toan bo parsed JSON de ban doi chieu va chinh sua."
              statusText={processingStatusText ?? (artifactLoading ? "Dang doc du lieu OCR da luu..." : null)}
              steps={processingSteps}
            />
          ) : isAwaitingAnalysis ? (
            <div className="flex h-full min-h-55 items-center justify-center">
              <div className="max-w-105 rounded-[18px] border border-slate-200 bg-white px-4 py-5 text-center shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)]">
                <p className="text-sm font-semibold text-slate-900">CV da duoc upload thanh cong</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  Bam <span className="font-semibold text-slate-900">Trich xuat JSON</span> de bat dau OCR. Khi hoan tat,
                  panel nay se hien thi day du noi dung parsed JSON.
                </p>
              </div>
            </div>
          ) : hasParsedJsonContent ? (
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.26)]">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Parsed JSON</p>
              </div>
              <pre className="max-h-[calc(100vh-300px)] overflow-auto px-4 py-3 text-[12px] leading-5 text-slate-700">
                {parsedJsonText}
              </pre>
            </div>
          ) : hasReviewContent ? (
            <ParsedBlockList
              pages={normalizedResult.pages}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              onHover={setHoveredBlockId}
              onClick={setActiveBlockId}
            />
          ) : (
            <div className="flex h-full min-h-55 items-center justify-center text-center text-[13px] text-slate-500">
              Chua co noi dung parsed JSON de hien thi.
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/90 p-1.5 md:p-2">
          <DocumentPreview
            pages={normalizedResult.pages}
            previewSource={previewSource}
            activeBlockId={activeBlockId}
            hoveredBlockId={hoveredBlockId}
            overlayVisible={overlayVisible}
            scaleMode={scaleMode}
            zoom={zoom}
            onBoxHover={setHoveredBlockId}
            onBoxClick={setActiveBlockId}
          />
        </div>
      </div>
    </div>
  );
}
