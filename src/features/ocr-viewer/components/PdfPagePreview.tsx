"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "react-pdf";
import type { NormalizedOcrPage } from "@/features/ocr-viewer/types";
import { OcrOverlay } from "@/features/ocr-viewer/components/OcrOverlay";

interface PdfPagePreviewProps {
  page: NormalizedOcrPage;
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

export function PdfPagePreview({
  page,
  overlayVisible,
  zoom,
  activeBlockId,
  hoveredBlockId,
  onBoxHover,
  onBoxClick,
  registerBoxRef,
}: PdfPagePreviewProps) {
  const [pdfOriginalWidth, setPdfOriginalWidth] = useState(page.originalWidth);
  const [pdfOriginalHeight, setPdfOriginalHeight] = useState(page.originalHeight);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: surfaceRef, width: availableWidth } = useElementWidth<HTMLDivElement>();
  const effectiveOriginalWidth = pdfOriginalWidth || page.originalWidth || 1;
  const effectiveOriginalHeight = pdfOriginalHeight || page.originalHeight || 1;
  const renderedPdfWidth = useMemo(() => {
    if (!availableWidth) return undefined;
    return Math.max(260, Math.floor(availableWidth * zoom * 0.9));
  }, [availableWidth, zoom]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setCanvasDisplaySize({ width: rect.width, height: rect.height });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [renderedPdfWidth]);

  return (
    <section className="rounded-[20px] border border-slate-200/90 bg-white p-2.5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.22)]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page</p>
          <h3 className="mt-1 text-[13px] font-semibold text-slate-900">{page.pageIndex + 1}</h3>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
          {Math.round(effectiveOriginalWidth)} × {Math.round(effectiveOriginalHeight)}
        </div>
      </div>

      <div ref={surfaceRef} className="overflow-x-auto rounded-[16px] border border-slate-200 bg-slate-100/70 p-2">
        <div className="relative mx-auto inline-block">
          <Page
            pageNumber={page.pageIndex + 1}
            width={renderedPdfWidth}
            canvasRef={canvasRef}
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

          {overlayVisible ? (
            <OcrOverlay
              blocks={page.blocks}
              originalWidth={effectiveOriginalWidth}
              originalHeight={effectiveOriginalHeight}
              displayedWidth={canvasDisplaySize.width}
              displayedHeight={canvasDisplaySize.height}
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
