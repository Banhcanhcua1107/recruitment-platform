"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "react-pdf";
import type { DocumentPreviewSource, NormalizedOcrPage } from "@/features/ocr-viewer/types";
import { OcrOverlay } from "@/features/ocr-viewer/components/OcrOverlay";
import { useResizeScale } from "@/features/ocr-viewer/hooks/useResizeScale";

interface PagePreviewProps {
  page: NormalizedOcrPage;
  previewSource: DocumentPreviewSource | null;
  overlayVisible: boolean;
  zoom: number;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onBoxHover: (blockId: string | null) => void;
  onBoxClick: (blockId: string) => void;
  registerBoxRef?: (blockId: string, element: HTMLButtonElement | null) => void;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(element.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, width };
}

export function PagePreview({
  page,
  previewSource,
  overlayVisible,
  zoom,
  activeBlockId,
  hoveredBlockId,
  onBoxHover,
  onBoxClick,
  registerBoxRef,
}: PagePreviewProps) {
  const [pdfOriginalWidth, setPdfOriginalWidth] = useState(page.originalWidth);
  const [pdfOriginalHeight, setPdfOriginalHeight] = useState(page.originalHeight);
  const { ref: surfaceRef, width: availableWidth } = useElementWidth<HTMLDivElement>();
  const effectiveOriginalWidth = pdfOriginalWidth || page.originalWidth || 1;
  const effectiveOriginalHeight = pdfOriginalHeight || page.originalHeight || 1;
  const pageImageUrl = page.imageUrl || (previewSource?.kind === "image" ? previewSource.url ?? undefined : undefined);
  const imageScale = useResizeScale<HTMLImageElement>(page.originalWidth || 1, page.originalHeight || 1);
  const canvasScale = useResizeScale<HTMLCanvasElement>(effectiveOriginalWidth, effectiveOriginalHeight);
  const renderedPdfWidth = useMemo(() => {
    if (!availableWidth) return undefined;
    return Math.max(280, Math.floor(availableWidth * zoom));
  }, [availableWidth, zoom]);

  const isImagePage = Boolean(pageImageUrl);
  const isPdfPage = !isImagePage && previewSource?.kind === "pdf";
  const displayedWidth = isImagePage ? imageScale.displayedWidth : canvasScale.displayedWidth;
  const displayedHeight = isImagePage ? imageScale.displayedHeight : canvasScale.displayedHeight;

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{page.pageIndex + 1}</h3>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
          {Math.round(page.originalWidth)} × {Math.round(page.originalHeight)}
        </div>
      </div>

      <div ref={surfaceRef} className="overflow-x-auto rounded-[22px] border border-slate-200 bg-slate-100/70 p-3">
        <div className="relative mx-auto inline-block">
          {isImagePage ? (
            <img
              ref={imageScale.targetRef}
              alt={`OCR page ${page.pageIndex + 1}`}
              src={pageImageUrl}
              className="block h-auto max-w-full rounded-[18px] shadow-sm"
              style={{
                width: page.originalWidth > 0 ? Math.max(240, Math.floor(page.originalWidth * zoom)) : undefined,
              }}
            />
          ) : isPdfPage ? (
            <Page
              pageNumber={page.pageIndex + 1}
              width={renderedPdfWidth}
              canvasRef={canvasScale.targetRef}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={
                <div className="flex min-h-[280px] w-[320px] items-center justify-center rounded-[18px] bg-white text-sm text-slate-500">
                  Rendering page {page.pageIndex + 1}...
                </div>
              }
              onRenderSuccess={(pdfPage) => {
                setPdfOriginalWidth(pdfPage.originalWidth || page.originalWidth);
                setPdfOriginalHeight(pdfPage.originalHeight || page.originalHeight);
              }}
            />
          ) : (
            <div className="flex min-h-[280px] w-[320px] items-center justify-center rounded-[18px] bg-white text-sm text-slate-500">
              Preview unavailable for this page.
            </div>
          )}

          {overlayVisible ? (
            <OcrOverlay
              blocks={page.blocks}
              originalWidth={effectiveOriginalWidth}
              originalHeight={effectiveOriginalHeight}
              displayedWidth={displayedWidth}
              displayedHeight={displayedHeight}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              onBoxHover={onBoxHover}
              onBoxClick={onBoxClick}
              registerBoxRef={registerBoxRef}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
