"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PagePreview } from "@/features/ocr-viewer/components/PagePreview";
import type { DocumentPreviewSource, NormalizedOcrPage } from "@/features/ocr-viewer/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface DocumentPreviewProps {
  pages: NormalizedOcrPage[];
  previewSource: DocumentPreviewSource | null;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  overlayVisible: boolean;
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
  zoom,
  onBoxHover,
  onBoxClick,
}: DocumentPreviewProps) {
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const boxRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const pagesToRender = useMemo(() => {
    if (pages.length > 0) return pages;

    if (previewSource?.kind === "image") {
      return [{ pageIndex: 0, originalWidth: 1, originalHeight: 1, blocks: [] }];
    }

    if (previewSource?.kind === "pdf" && pdfPageCount > 0) {
      return Array.from({ length: pdfPageCount }, (_, index) => ({
        pageIndex: index,
        originalWidth: 1,
        originalHeight: 1,
        blocks: [],
      }));
    }

    return [];
  }, [pages, pdfPageCount, previewSource]);

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

  if (!previewSource || previewSource.kind === "none") {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-300 bg-white/80 px-6 text-center text-sm text-slate-500">
        Upload or load a document to start the preview.
      </div>
    );
  }

  if (previewSource.kind === "pdf" && previewSource.url) {
    return (
      <Document
        key={previewSource.url}
        file={previewSource.url}
        loading={
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-slate-200 bg-white text-sm text-slate-500">
            Loading PDF preview...
          </div>
        }
        error={
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-rose-200 bg-rose-50 px-6 text-center text-sm text-rose-700">
            {pdfError || "Unable to render PDF preview."}
          </div>
        }
        onLoadSuccess={({ numPages }) => {
          setPdfPageCount(numPages || 0);
          setPdfError(null);
        }}
        onLoadError={(error) => {
          console.error("react-pdf load error", error);
          setPdfError(error instanceof Error ? error.message : "Unable to load PDF preview.");
        }}
      >
        <div className="space-y-4">
          {pagesToRender.map((page) => (
            <PagePreview
              key={`pdf-page-${page.pageIndex}`}
              page={page}
              previewSource={previewSource}
              overlayVisible={overlayVisible}
              zoom={zoom}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              onBoxHover={onBoxHover}
              onBoxClick={onBoxClick}
              registerBoxRef={registerBoxRef}
            />
          ))}
        </div>
      </Document>
    );
  }

  return (
    <div className="space-y-4">
      {pagesToRender.map((page) => (
        <PagePreview
          key={`page-${page.pageIndex}`}
          page={page}
          previewSource={previewSource}
          overlayVisible={overlayVisible}
          zoom={zoom}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onBoxHover={onBoxHover}
          onBoxClick={onBoxClick}
          registerBoxRef={registerBoxRef}
        />
      ))}
    </div>
  );
}
