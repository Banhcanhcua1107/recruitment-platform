"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PdfPagePreview } from "@/features/ocr-viewer/components/PdfPagePreview";
import type {
  DocumentPreviewSource,
  NormalizedOcrPage,
  PreviewScaleMode,
} from "@/features/ocr-viewer/types";

type ReactPdfModule = typeof import("react-pdf");
type ReactPdfDocumentComponent = ReactPdfModule["Document"];
type ReactPdfPageComponent = ComponentType<Record<string, unknown>>;

interface PdfDocumentPreviewProps {
  pages: NormalizedOcrPage[];
  previewSource: DocumentPreviewSource;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  overlayVisible: boolean;
  scaleMode: PreviewScaleMode;
  zoom: number;
  frameWidth: number;
  viewportHeight: number;
  singlePage: boolean;
  onBoxHover: (blockId: string | null) => void;
  onBoxClick: (blockId: string) => void;
}

export function PdfDocumentPreview({
  pages,
  previewSource,
  activeBlockId,
  hoveredBlockId,
  overlayVisible,
  scaleMode,
  zoom,
  frameWidth,
  viewportHeight,
  singlePage,
  onBoxHover,
  onBoxClick,
}: PdfDocumentPreviewProps) {
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [reactPdfModule, setReactPdfModule] = useState<ReactPdfModule | null>(null);
  const boxRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const pagesToRender = useMemo(() => {
    if (pages.length > 0) return pages;

    if (pdfPageCount > 0) {
      return Array.from({ length: pdfPageCount }, (_, index) => ({
        pageIndex: index,
        originalWidth: 1,
        originalHeight: 1,
        blocks: [],
      }));
    }

    return [];
  }, [pages, pdfPageCount]);

  useEffect(() => {
    if (!activeBlockId) return;
    const element = boxRefs.current.get(activeBlockId);
    element?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [activeBlockId]);

  useEffect(() => {
    let cancelled = false;

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        if (!cancelled) {
          setReactPdfModule(module);
        }
      })
      .catch((error) => {
        console.error("react-pdf module load error", error);
        if (!cancelled) {
          setPdfError(
            error instanceof Error ? error.message : "Unable to initialize PDF preview.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPdfPageCount(0);
    setPdfError(null);
  }, [previewSource.url]);

  const registerBoxRef = (blockId: string, element: HTMLButtonElement | null) => {
    if (element) {
      boxRefs.current.set(blockId, element);
      return;
    }

    boxRefs.current.delete(blockId);
  };

  const DocumentComponent = reactPdfModule?.Document as ReactPdfDocumentComponent | undefined;
  const PageComponent = reactPdfModule?.Page as ReactPdfPageComponent | undefined;

  if (!DocumentComponent || !PageComponent) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {pdfError ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-rose-200 bg-rose-50 px-6 text-center text-sm text-rose-700">
            {pdfError}
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-slate-200 bg-white text-sm text-slate-500">
            Loading PDF preview...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DocumentComponent
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
        <div className={singlePage ? "h-full min-h-0 overflow-auto" : "min-h-0 overflow-y-auto pr-1"}>
          <div className={singlePage ? "flex min-h-full items-start justify-center pt-1" : "flex flex-col items-center gap-3 pb-1"}>
            {pagesToRender.map((page) => (
              <PdfPagePreview
                key={`pdf-page-${page.pageIndex}`}
                PageComponent={PageComponent}
                page={page}
                overlayVisible={overlayVisible}
                scaleMode={scaleMode}
                zoom={zoom}
                frameWidth={frameWidth}
                viewportHeight={viewportHeight}
                singlePage={singlePage}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onBoxHover={onBoxHover}
                onBoxClick={onBoxClick}
                registerBoxRef={registerBoxRef}
              />
            ))}
          </div>
        </div>
      </DocumentComponent>
    </div>
  );
}
