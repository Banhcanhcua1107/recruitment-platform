"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Page } from "react-pdf";
import { cn } from "@/lib/utils";
import type { NormalizedOcrPage, PreviewScaleMode } from "@/features/ocr-viewer/types";
import { OcrOverlay } from "@/features/ocr-viewer/components/OcrOverlay";

interface PdfPagePreviewProps {
  page: NormalizedOcrPage;
  overlayVisible: boolean;
  scaleMode: PreviewScaleMode;
  zoom: number;
  frameWidth: number;
  viewportHeight: number;
  singlePage: boolean;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onBoxHover: (blockId: string | null) => void;
  onBoxClick: (blockId: string) => void;
  registerBoxRef?: (blockId: string, element: HTMLButtonElement | null) => void;
}

function resolveScale({
  mode,
  zoom,
  availableWidth,
  availableHeight,
  originalWidth,
  originalHeight,
}: {
  mode: PreviewScaleMode;
  zoom: number;
  availableWidth: number;
  availableHeight: number;
  originalWidth: number;
  originalHeight: number;
}) {
  const widthScale = availableWidth > 0 ? availableWidth / originalWidth : 1;
  const heightScale = availableHeight > 0 ? availableHeight / originalHeight : 1;

  if (mode === "custom") {
    return Math.max(0.18, Math.min(3.2, zoom));
  }

  const baseScale = mode === "fitPage" ? Math.min(widthScale, heightScale) : widthScale;
  return Math.max(0.18, Math.min(3.2, baseScale * zoom));
}

export function PdfPagePreview({
  page,
  overlayVisible,
  scaleMode,
  zoom,
  frameWidth,
  viewportHeight,
  singlePage,
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
  const effectiveOriginalWidth = Math.max(1, pdfOriginalWidth || page.originalWidth || 1);
  const effectiveOriginalHeight = Math.max(1, pdfOriginalHeight || page.originalHeight || 1);
  const contentWidth = Math.max(340, frameWidth - 8);
  const contentHeight = Math.max(singlePage ? 560 : 360, viewportHeight - 28);
  const updateCanvasDisplaySize = useCallback(() => {
    const element = canvasRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setCanvasDisplaySize((current) => {
      const nextWidth = rect.width;
      const nextHeight = rect.height;
      if (Math.abs(current.width - nextWidth) < 0.5 && Math.abs(current.height - nextHeight) < 0.5) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const scale = useMemo(
    () =>
      resolveScale({
        mode: scaleMode,
        zoom,
        availableWidth: contentWidth,
        availableHeight: contentHeight,
        originalWidth: effectiveOriginalWidth,
        originalHeight: effectiveOriginalHeight,
      }),
    [contentHeight, contentWidth, effectiveOriginalHeight, effectiveOriginalWidth, scaleMode, zoom],
  );
  const renderedWidth = Math.max(200, Math.round(effectiveOriginalWidth * scale));

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    updateCanvasDisplaySize();

    const observer = new ResizeObserver(() => updateCanvasDisplaySize());
    observer.observe(element);
    window.addEventListener("resize", updateCanvasDisplaySize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCanvasDisplaySize);
    };
  }, [page.pageIndex, renderedWidth, updateCanvasDisplaySize]);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)]",
        singlePage ? "h-full max-h-full w-full" : "w-full",
      )}
      style={{ width: frameWidth }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/90 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page</span>
          <span className="text-[12px] font-semibold text-slate-900">{page.pageIndex + 1}</span>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {Math.round(effectiveOriginalWidth)} x {Math.round(effectiveOriginalHeight)}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 bg-slate-100/70 p-1", singlePage ? "overflow-auto" : "overflow-x-auto")}>
        <div className={cn("flex min-h-full justify-center", singlePage ? "items-start pt-1" : "items-center")}>
          <div className="relative shrink-0">
            <Page
              pageNumber={page.pageIndex + 1}
              width={renderedWidth}
              canvasRef={(element) => {
                canvasRef.current = element;
              }}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={
                <div className="flex min-h-[260px] w-[320px] items-center justify-center rounded-[18px] bg-white text-sm text-slate-500">
                  Rendering page {page.pageIndex + 1}...
                </div>
              }
              onRenderSuccess={(pdfPage) => {
                setPdfOriginalWidth(pdfPage.originalWidth || page.originalWidth);
                setPdfOriginalHeight(pdfPage.originalHeight || page.originalHeight);
                updateCanvasDisplaySize();
              }}
            />

            {overlayVisible ? (
              <OcrOverlay
                blocks={page.blocks}
                originalWidth={effectiveOriginalWidth}
                originalHeight={effectiveOriginalHeight}
                displayedWidth={canvasDisplaySize.width || renderedWidth}
                displayedHeight={canvasDisplaySize.height || Math.round(effectiveOriginalHeight * scale)}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onBoxHover={onBoxHover}
                onBoxClick={onBoxClick}
                registerBoxRef={registerBoxRef}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
