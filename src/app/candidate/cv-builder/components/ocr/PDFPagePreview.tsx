"use client";

import React, { memo, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type ReactPdfModule = typeof import("react-pdf");
type ReactPdfDocumentComponent = ReactPdfModule["Document"];
type ReactPdfPageComponent = ComponentType<Record<string, unknown>>;

const TRANSIENT_PDF_INIT_ERROR_PATTERN =
  /Object\.defineProperty called on non-object|Loading chunk|Cannot read properties of undefined/i;

function isTransientPdfInitError(message: string | null | undefined) {
  if (!message) return false;
  return TRANSIENT_PDF_INIT_ERROR_PATTERN.test(message);
}

function toPublicPdfError(message: string | null | undefined, fallback: string) {
  if (!message) return fallback;
  if (isTransientPdfInitError(message)) {
    return "Dang khoi tao preview PDF. Vui long doi trong giay lat.";
  }

  return fallback;
}

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
  const [reactPdfModule, setReactPdfModule] = useState<ReactPdfModule | null>(null);
  const [moduleLoadAttempt, setModuleLoadAttempt] = useState(0);
  const { ref: pdfContainerRef, width: pdfContainerWidth } =
    useContainerWidth<HTMLDivElement>();
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("react-pdf")
      .then((module) => {
        if (!module?.pdfjs?.GlobalWorkerOptions) {
          if (!cancelled) {
            setPdfError("Khong the khoi tao trinh xem PDF.");
          }
          return;
        }

        module.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        if (!cancelled) {
          setReactPdfModule(module);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const rawErrorMessage =
            error instanceof Error ? error.message : "Khong the tai trinh xem PDF.";

          if (isTransientPdfInitError(rawErrorMessage) && moduleLoadAttempt < 2) {
            retryTimerRef.current = window.setTimeout(() => {
              setModuleLoadAttempt((current) => current + 1);
            }, 250);
            return;
          }

          setPdfError(toPublicPdfError(rawErrorMessage, "Khong the tai trinh xem PDF."));
        }
      });

    return () => {
      cancelled = true;

      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [moduleLoadAttempt]);

  useEffect(() => {
    setPdfError(null);
    setPdfTotalPages(0);
    setModuleLoadAttempt(0);

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [previewUrl]);

  const pageNumbers = useMemo(
    () => Array.from({ length: Math.max(0, pdfTotalPages) }, (_, index) => index + 1),
    [pdfTotalPages],
  );
  const DocumentComponent = reactPdfModule?.Document as ReactPdfDocumentComponent | undefined;
  const PageComponent = reactPdfModule?.Page as ReactPdfPageComponent | undefined;

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
            DocumentComponent && PageComponent ? (
              <DocumentComponent
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
                onLoadSuccess={({ numPages }: { numPages?: number }) => {
                  setPdfError(null);
                  setPdfTotalPages(numPages || 0);
                }}
                onLoadError={(error) => {
                  setPdfError(
                    toPublicPdfError(
                      error instanceof Error ? error.message : "Không thể tải preview PDF.",
                      "Không thể tải preview PDF.",
                    ),
                  );
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
                        <PageComponent
                          pageNumber={pageNumber}
                          width={Math.max(280, pdfContainerWidth - 40)}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          loading={
                            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
                              Đang render trang {pageNumber}...
                            </div>
                          }
                          onRenderError={() => {
                            setPdfError(`Render PDF bị lỗi ở trang ${pageNumber}.`);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </DocumentComponent>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
                {pdfError ?? "Đang khởi tạo preview PDF..."}
              </div>
            )
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
