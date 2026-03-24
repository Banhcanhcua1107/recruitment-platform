"use client";

import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  DocumentPreviewSource,
  NormalizedOcrPage,
  PreviewScaleMode,
} from "@/features/ocr-viewer/types";
import { OcrOverlay } from "@/features/ocr-viewer/components/OcrOverlay";

interface PagePreviewProps {
  page: NormalizedOcrPage;
  previewSource: DocumentPreviewSource | null;
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
  mediaContent?: ReactNode;
  pageLabel?: string;
  dimensionLabel?: string;
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

export function PagePreview({
  page,
  previewSource,
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
  mediaContent,
  pageLabel,
  dimensionLabel,
}: PagePreviewProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const pageImageUrl = page.imageUrl || (previewSource?.kind === "image" ? previewSource.url ?? undefined : undefined);
  const effectiveOriginalWidth = Math.max(1, naturalSize?.width || page.originalWidth || 1);
  const effectiveOriginalHeight = Math.max(1, naturalSize?.height || page.originalHeight || 1);

  const contentWidth = Math.max(340, frameWidth - 8);
  const contentHeight = Math.max(singlePage ? 560 : 360, viewportHeight - 28);
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
  const renderedWidth = Math.max(180, Math.round(effectiveOriginalWidth * scale));
  const renderedHeight = Math.max(220, Math.round(effectiveOriginalHeight * scale));

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
          <span className="text-[12px] font-semibold text-slate-900">{pageLabel ?? page.pageIndex + 1}</span>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {dimensionLabel ?? `${Math.round(effectiveOriginalWidth)} x ${Math.round(effectiveOriginalHeight)}`}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 bg-slate-100/70 p-1", singlePage ? "overflow-auto" : "overflow-x-auto")}>
        <div className={cn("flex min-h-full justify-center", singlePage ? "items-start pt-1" : "items-center")}>
          <div className="relative shrink-0" style={{ width: renderedWidth, height: renderedHeight }}>
            {mediaContent ?? (
              <>
                {pageImageUrl ? (
                  // Preview images can be local blob URLs, so next/image is not a fit here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`OCR page ${page.pageIndex + 1}`}
                    src={pageImageUrl}
                    className="block rounded-[14px] object-contain shadow-[0_12px_30px_-22px_rgba(15,23,42,0.28)]"
                    style={{ width: renderedWidth, height: renderedHeight }}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      if (!page.originalWidth || !page.originalHeight || page.originalWidth <= 1 || page.originalHeight <= 1) {
                        setNaturalSize({
                          width: image.naturalWidth || 1,
                          height: image.naturalHeight || 1,
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-white text-sm text-slate-500">
                    Preview unavailable for this page.
                  </div>
                )}
              </>
            )}

            {overlayVisible ? (
              <OcrOverlay
                blocks={page.blocks}
                originalWidth={effectiveOriginalWidth}
                originalHeight={effectiveOriginalHeight}
                displayedWidth={renderedWidth}
                displayedHeight={renderedHeight}
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
