"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { PagePreview } from "@/features/ocr-viewer/components/PagePreview";
import { useResizeScale } from "@/features/ocr-viewer/hooks/useResizeScale";
import type {
  DocumentPreviewSource,
  NormalizedOcrPage,
  PreviewScaleMode,
} from "@/features/ocr-viewer/types";

const PdfDocumentPreview = dynamic(
  () =>
    import("@/features/ocr-viewer/components/PdfDocumentPreview").then((module) => module.PdfDocumentPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-[13px] text-slate-500">
        Loading PDF preview...
      </div>
    ),
  },
);

interface DocumentPreviewProps {
  pages: NormalizedOcrPage[];
  previewSource: DocumentPreviewSource | null;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  overlayVisible: boolean;
  scaleMode: PreviewScaleMode;
  zoom: number;
  onBoxHover: (blockId: string | null) => void;
  onBoxClick: (blockId: string) => void;
}

export function DocumentPreview({
  pages,
  previewSource,
  activeBlockId,
  hoveredBlockId,
  overlayVisible,
  scaleMode,
  zoom,
  onBoxHover,
  onBoxClick,
}: DocumentPreviewProps) {
  const boxRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const { targetRef, displayedWidth, displayedHeight } = useResizeScale<HTMLDivElement>(1, 1);

  const pagesToRender = useMemo(() => {
    if (pages.length > 0) return pages;

    if (previewSource?.kind === "image") {
      return [{ pageIndex: 0, originalWidth: 1, originalHeight: 1, blocks: [] }];
    }

    return [];
  }, [pages, previewSource]);

  const pageCount = pagesToRender.length;
  const isSinglePage = pageCount <= 1;
  const frameWidth = useMemo(() => {
    const availableWidth = Math.max(0, displayedWidth - (isSinglePage ? 8 : 18));
    if (!availableWidth) return isSinglePage ? 760 : 760;
    return isSinglePage ? availableWidth : Math.min(availableWidth, 760);
  }, [displayedWidth, isSinglePage]);

  const viewportHeight = useMemo(() => {
    if (!displayedHeight) return 720;
    return Math.max(420, displayedHeight - (isSinglePage ? 4 : 12));
  }, [displayedHeight, isSinglePage]);

  useEffect(() => {
    if (!activeBlockId) return;
    const element = boxRefs.current.get(activeBlockId);
    element?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [activeBlockId]);

  const registerBoxRef = (blockId: string, element: HTMLButtonElement | null) => {
    if (element) {
      boxRefs.current.set(blockId, element);
      return;
    }

    boxRefs.current.delete(blockId);
  };

  const pdfFileUrl =
    previewSource?.kind === "pdf" && typeof previewSource.url === "string"
      ? previewSource.url.trim()
      : "";
  const hasPdfFile = pdfFileUrl.length > 0;

  if (!previewSource || previewSource.kind === "none") {
    return (
      <div
        ref={targetRef}
        className="flex h-full min-h-0 items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 text-center text-[13px] text-slate-500"
      >
        Upload or load a document to start the preview.
      </div>
    );
  }

  if (previewSource.kind === "pdf" && !hasPdfFile) {
    return (
      <div
        ref={targetRef}
        className="flex h-full min-h-0 items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 text-center text-[13px] text-slate-500"
      >
        PDF preview is unavailable because the file is missing.
      </div>
    );
  }

  return (
    <div ref={targetRef} className="flex h-full min-h-0 flex-col">
      {previewSource.kind === "pdf" && hasPdfFile ? (
        <PdfDocumentPreview
          pages={pages}
          previewSource={previewSource}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          overlayVisible={overlayVisible}
          scaleMode={scaleMode}
          zoom={zoom}
          frameWidth={frameWidth}
          viewportHeight={viewportHeight}
          singlePage={isSinglePage}
          onBoxHover={onBoxHover}
          onBoxClick={onBoxClick}
        />
      ) : (
        <div className={isSinglePage ? "min-h-0 flex-1 overflow-auto" : "min-h-0 flex-1 overflow-y-auto pr-1"}>
          <div className={isSinglePage ? "flex min-h-full items-start justify-center pt-1" : "flex flex-col items-center gap-3 pb-1"}>
            {pagesToRender.map((page) => (
              <PagePreview
                key={`page-${page.pageIndex}`}
                page={page}
                previewSource={previewSource}
                overlayVisible={overlayVisible}
                scaleMode={scaleMode}
                zoom={zoom}
                frameWidth={frameWidth}
                viewportHeight={viewportHeight}
                singlePage={isSinglePage}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onBoxHover={onBoxHover}
                onBoxClick={onBoxClick}
                registerBoxRef={registerBoxRef}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
