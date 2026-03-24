"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { PagePreview } from "@/features/ocr-viewer/components/PagePreview";
import type { DocumentPreviewSource, NormalizedOcrPage } from "@/features/ocr-viewer/types";

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
  const boxRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const pagesToRender = useMemo(() => {
    if (pages.length > 0) return pages;

    if (previewSource?.kind === "image") {
      return [{ pageIndex: 0, originalWidth: 1, originalHeight: 1, blocks: [] }];
    }

    return [];
  }, [pages, previewSource]);

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
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 text-center text-[13px] text-slate-500">
        Upload or load a document to start the preview.
      </div>
    );
  }

  if (previewSource.kind === "pdf" && previewSource.url) {
    return (
      <PdfDocumentPreview
        pages={pages}
        previewSource={previewSource}
        activeBlockId={activeBlockId}
        hoveredBlockId={hoveredBlockId}
        overlayVisible={overlayVisible}
        zoom={zoom}
        onBoxHover={onBoxHover}
        onBoxClick={onBoxClick}
      />
    );
  }

  return (
    <div className="space-y-3">
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
