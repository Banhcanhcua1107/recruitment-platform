"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFPagePreviewProps {
  fileName: string;
  previewUrl: string;
}

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  return { ref, width };
}

export const PDFPagePreview = memo(function PDFPagePreview({
  fileName,
  previewUrl,
}: PDFPagePreviewProps) {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const { ref: pdfContainerRef, width: pdfContainerWidth } =
    useContainerWidth<HTMLDivElement>();

  useEffect(() => {
    setPdfError(null);
    setPdfTotalPages(0);
  }, [previewUrl]);

  const pageNumbers = useMemo(
    () => Array.from({ length: Math.max(0, pdfTotalPages) }, (_, index) => index + 1),
    [pdfTotalPages],
  );

  return (
    <div className="h-full min-h-0 bg-slate-100 p-3">
      <div
        ref={pdfContainerRef}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs font-medium text-slate-500">
          <span>Xem trước PDF</span>
          <span>
            {pdfError
              ? "Không thể dựng preview"
              : pdfTotalPages > 0
                ? `${pdfTotalPages} trang`
                : "Đang tải tài liệu"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-3">
          {pdfContainerWidth > 0 ? (
            <Document
              key={previewUrl}
              file={previewUrl}
              loading={
                <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500">
                  Đang tải preview PDF...
                </div>
              }
              error={
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Không thể mở preview PDF.
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    File vẫn sẽ được giữ ở panel bên trái và tiếp tục dùng cho OCR
                    khi bạn thử lại.
                  </p>
                </div>
              }
              onLoadSuccess={({ numPages }) => {
                setPdfError(null);
                setPdfTotalPages(numPages || 0);
              }}
              onLoadError={(error) => {
                console.error("PDF load failed:", error);
                setPdfError("Không thể tải preview PDF.");
              }}
            >
              <div className="mx-auto flex max-w-full flex-col gap-4">
                {(pageNumbers.length > 0 ? pageNumbers : [1]).map((pageNumber) => (
                  <div
                    key={`${previewUrl}-page-${pageNumber}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Trang {pageNumber}
                    </div>
                    <div className="flex justify-center bg-slate-100 p-3">
                      <Page
                        pageNumber={pageNumber}
                        width={Math.max(280, pdfContainerWidth - 40)}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={
                          <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
                            Đang render trang {pageNumber}...
                          </div>
                        }
                        onRenderError={(error) => {
                          console.error(`PDF render failed on page ${pageNumber}:`, error);
                          setPdfError(`Render PDF bị lỗi ở trang ${pageNumber}.`);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Document>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
              Đang chuẩn bị vùng preview PDF...
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
          {fileName}
        </div>

        {pdfError ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
            {pdfError}
          </div>
        ) : null}
      </div>
    </div>
  );
});
