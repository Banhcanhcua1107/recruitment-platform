"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "@/features/ocr-viewer/components/DocumentPreview";
import { ParsedBlockList } from "@/features/ocr-viewer/components/ParsedBlockList";
import { fetchJsonlResult } from "@/features/ocr-viewer/services/paddleApi";
import type {
  DocumentPreviewSource,
  NormalizedOcrResult,
  OcrLogEntry,
} from "@/features/ocr-viewer/types";
import { normalizeOcrResult } from "@/features/ocr-viewer/utils/ocrNormalize";
import type { CVArtifactKind, CVDocumentDetailResponse } from "@/types/cv-import";

interface PersistedOcrReviewPanelProps {
  detail: CVDocumentDetailResponse;
  fallbackContent?: ReactNode;
}

function createLog(level: OcrLogEntry["level"], message: string): OcrLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    createdAt: new Date().toISOString(),
  };
}

function hasBlocks(result: NormalizedOcrResult | null) {
  return Boolean(result?.pages.some((page) => page.blocks.length > 0));
}

function countBlocks(result: NormalizedOcrResult | null) {
  return result?.pages.reduce((sum, page) => sum + page.blocks.length, 0) ?? 0;
}

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
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
  return detail.artifacts.find((artifact) => artifact.kind === kind && artifact.status === "ready" && artifact.download_url);
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
  const [zoom, setZoom] = useState(1);
  const [logs, setLogs] = useState<OcrLogEntry[]>(() =>
    hasBlocks(normalizedFromParsed)
      ? [createLog("success", `Loaded ${countBlocks(normalizedFromParsed)} block(s) from persisted parsed_json.`)]
      : [],
  );

  const appendLog = useCallback((level: OcrLogEntry["level"], message: string) => {
    setLogs((current) => [createLog(level, message), ...current].slice(0, 24));
  }, []);

  const normalizedResult = hasBlocks(normalizedFromParsed)
    ? normalizedFromParsed
    : artifactResult ?? normalizedFromParsed;
  const warnings = normalizedResult.warnings ?? [];
  const pageCount = normalizedResult.pages.length;
  const blockCount = countBlocks(normalizedResult);
  const effectiveArtifactLoading = artifactLoading && !hasBlocks(normalizedFromParsed);
  const effectiveArtifactError = hasBlocks(normalizedFromParsed) ? null : artifactError;
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasBlocks(normalizedFromParsed)) return;

    if (!artifactCandidates.length) return;

    let cancelled = false;

    const loadFromArtifacts = async () => {
      setArtifactLoading(true);
      setArtifactError(null);

      for (const artifact of artifactCandidates) {
        if (cancelled || !artifact.download_url) return;
        appendLog("info", `Loading fallback artifact: ${artifact.kind}`);

        try {
          const raw = await fetchJsonlResult(artifact.download_url);
          if (cancelled || !mountedRef.current) return;

          let normalized = normalizeOcrResult(raw);
          if (!hasBlocks(normalized) && raw && typeof raw === "object" && !Array.isArray(raw)) {
            normalized = normalizeOcrResult({ parsed_json: raw, pages: detail.pages });
          }

          if (hasBlocks(normalized)) {
            setArtifactResult(normalized);
            appendLog("success", `Recovered ${countBlocks(normalized)} block(s) from ${artifact.kind}.`);
            setArtifactLoading(false);
            return;
          }
        } catch (error) {
          if (cancelled || !mountedRef.current) return;
          const message = error instanceof Error ? error.message : `Unable to load ${artifact.kind}.`;
          setArtifactError(message);
          appendLog("error", `${artifact.kind}: ${message}`);
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
  }, [appendLog, artifactCandidates, detail.pages, normalizedFromParsed]);

  if (previewSource.kind === "none" && !pageCount && fallbackContent) {
    return <>{fallbackContent}</>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">OCR Review</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Persisted overlay viewer</h2>
          <p className="mt-1 text-sm text-slate-500">
            Layout blocks stay linked to the original preview, including multi-page mapping and overlay scaling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
            {pageCount} page(s)
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
            {blockCount} block(s)
          </span>
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
            <span className="min-w-16 text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
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

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:p-5">
        <div className="min-h-0 overflow-auto rounded-[28px] border border-slate-200 bg-slate-50/80 p-3 md:p-4">
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

        <div className="grid min-h-0 gap-4 xl:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 overflow-y-auto rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.32)] md:px-5">
            <ParsedBlockList
              pages={normalizedResult.pages}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              onHover={setHoveredBlockId}
              onClick={setActiveBlockId}
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.32)] md:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Review Notes</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">Status log</h3>
              </div>
              {effectiveArtifactLoading ? <Loader2 size={18} className="animate-spin text-blue-600" /> : null}
            </div>

            {effectiveArtifactError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {effectiveArtifactError}
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
              {logs.length > 0 ? (
                logs.map((entry) => (
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
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No additional review logs yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
