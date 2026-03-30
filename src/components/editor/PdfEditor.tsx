"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentEditorMetadata, DocumentEditorMode, SupportedFileType } from "@/types/editor";
import PdfEditabilityBanner from "@/components/editor/PdfEditabilityBanner";
import {
  analyzePdfEditability,
  buildStructuredEditorImportUrl,
  type PdfEditabilityAssessment,
} from "@/components/editor/pdfEditability";
import {
  applyPdfMode,
  disposePdfInstance,
  observeSelectedPdfImage,
  finalizePdfContentEdits,
  initializePdfViewerSession,
  isIgnorablePdfLifecycleError,
  installApryseNetworkGuards,
  installApryseUnhandledRejectionGuard,
  replaceSelectedPdfImage,
  type PdfSelectedImage,
  type PdfViewerContainerLike,
  type PdfViewerInstanceLike,
  resetPdfViewerContainer,
} from "@/components/editor/pdfEditorRuntime";

interface PdfEditorProps {
  metadata: DocumentEditorMetadata;
  onBack: () => void;
  onSave: (args: {
    file: Blob;
    fileName: string;
    fileType: SupportedFileType;
    baseVersionId: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export default function PdfEditor({ metadata, onBack, onSave, isSaving }: PdfEditorProps) {
  const router = useRouter();
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<DocumentEditorMode>("edit_all");
  const [selectedImage, setSelectedImage] = useState<PdfSelectedImage | null>(null);
  const [editabilityAssessment, setEditabilityAssessment] = useState<PdfEditabilityAssessment | null>(null);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewerInstanceRef = useRef<PdfViewerInstanceLike | null>(null);
  const initSequenceRef = useRef(0);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) {
      return;
    }

    const initToken = initSequenceRef.current + 1;
    initSequenceRef.current = initToken;
    let cancelled = false;
    let cleanupNetworkGuards: () => void = () => undefined;
    let cleanupUnhandledRejectionGuard: () => void = () => undefined;
    let cleanupSelectedImageObserver: () => void = () => undefined;

    const isCurrentInit = () => !cancelled && initSequenceRef.current === initToken;

    const init = async () => {
      setIsLoading(true);
      setError(null);
      setEditabilityAssessment(null);
      setImageActionError(null);
      setIsReplacingImage(false);
      setSelectedImage(null);

      cleanupNetworkGuards = installApryseNetworkGuards();
      cleanupUnhandledRejectionGuard = installApryseUnhandledRejectionGuard();
      try {
        const instance = await initializePdfViewerSession({
          container: container as unknown as PdfViewerContainerLike,
          webViewerOptions: {
            path: metadata.vendorConfig.pdf?.webviewerPath || "/webviewer",
            licenseKey: metadata.vendorConfig.pdf?.licenseKey,
            fullAPI: true,
            disableLogs: true,
          },
          importWebViewer: () => import("@pdftron/webviewer"),
          loadSourceBlob: () => fetchPdfSourceBlob(metadata.fileUrl),
          fileName: buildPdfFileName(metadata.documentId),
          isCurrent: isCurrentInit,
        });

        if (!instance || !isCurrentInit()) {
          return;
        }

        viewerInstanceRef.current = instance;
        cleanupSelectedImageObserver = observeSelectedPdfImage(instance, (nextSelectedImage) => {
          if (!isCurrentInit()) {
            return;
          }

          setSelectedImage(nextSelectedImage);
          if (nextSelectedImage) {
            setImageActionError(null);
          }
        });
        await applyPdfMode(instance, "edit_all");

        if (isCurrentInit()) {
          setIsLoading(false);
        }

        void analyzePdfEditability(instance)
          .then((assessment) => {
            if (!isCurrentInit()) {
              return;
            }

            setEditabilityAssessment(assessment);
          })
          .catch(() => {
            if (!isCurrentInit()) {
              return;
            }

            setEditabilityAssessment({
              level: "partially_editable",
              headline: "Direct editing may vary across this PDF.",
              message:
                "Some parts of the source file may edit normally while others stay locked, depending on how the original PDF was built. You can continue here or switch to the structured editor if needed.",
              metrics: {
                averageCharsPerSampledPage: 0,
                fragmentedTextPages: 0,
                pagesWithAnyText: 0,
                pagesWithMeaningfulText: 0,
                pagesWithTargetableText: 0,
                sampledPages: 0,
              },
            });
          });
      } catch (err) {
        if (!isCurrentInit() || isIgnorablePdfLifecycleError(err)) {
          return;
        }

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khoi tao PDF editor that bai.");
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (initSequenceRef.current === initToken) {
        initSequenceRef.current += 1;
      }
      cleanupSelectedImageObserver();
      cleanupNetworkGuards();
      cleanupUnhandledRejectionGuard();
      const currentInstance = viewerInstanceRef.current;
      viewerInstanceRef.current = null;
      if (currentInstance) {
        void disposePdfInstance(currentInstance).finally(() => {
          resetPdfViewerContainer(container as unknown as PdfViewerContainerLike);
        });
      } else {
        resetPdfViewerContainer(container as unknown as PdfViewerContainerLike);
      }
    };
  }, [metadata.documentId, metadata.fileUrl, metadata.vendorConfig.pdf?.licenseKey, metadata.vendorConfig.pdf?.webviewerPath]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (!instance) return;

    void applyPdfMode(instance, mode).catch((err) => {
      if (isIgnorablePdfLifecycleError(err)) {
        return;
      }

      setError(err instanceof Error ? err.message : "Khong the kich hoat PDF content editing.");
    });
  }, [mode]);

  const handleReplaceImageSelection = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    const instance = viewerInstanceRef.current;
    if (!instance) {
      setImageActionError("PDF editor is not initialized.");
      event.target.value = "";
      return;
    }

    setIsReplacingImage(true);
    setImageActionError(null);

    try {
      await replaceSelectedPdfImage(instance, nextFile);
    } catch (replaceError) {
      setImageActionError(
        replaceError instanceof Error
          ? replaceError.message
          : "Khong the thay the hinh anh da chon.",
      );
    } finally {
      setIsReplacingImage(false);
      event.target.value = "";
    }
  }, []);

  const handleOpenStructuredEditor = useCallback(() => {
    router.push(buildStructuredEditorImportUrl(metadata.documentId));
  }, [metadata.documentId, router]);

  const savePdf = async () => {
    const instance = viewerInstanceRef.current;
    if (!instance) {
      throw new Error("PDF editor is not initialized.");
    }

    const documentViewer = instance.Core?.documentViewer;
    const annotationManager = instance.Core?.annotationManager;
    const doc = documentViewer?.getDocument?.();

    if (!documentViewer || !annotationManager?.exportAnnotations || !doc?.getFileData) {
      throw new Error("PDF document is not available.");
    }

    const activeMode = mode;
    let saveError: unknown = null;

    finalizePdfContentEdits(instance);

    try {
      const xfdf = await annotationManager.exportAnnotations();
      const fileData = await doc.getFileData({
        flags: instance.Core?.SaveOptions?.LINEARIZED,
        xfdfString: xfdf,
      });
      const blob = new Blob([normalizePdfFileData(fileData)], { type: "application/pdf" });

      await onSave({
        file: blob,
        fileName: doc.getFilename?.() ?? buildPdfFileName(metadata.documentId),
        fileType: "pdf",
        baseVersionId: metadata.latestFileVersionId,
      });
    } catch (err) {
      saveError = err;
      throw err;
    } finally {
      if (viewerInstanceRef.current === instance) {
        try {
          await applyPdfMode(instance, activeMode);
        } catch (restoreError) {
          if (!saveError) {
            throw restoreError;
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700"
          >
            Back
          </button>
          <p className="text-sm font-medium text-slate-600">PDF Editor</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("edit_all")}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${mode === "edit_all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            Edit All
          </button>
          <button
            type="button"
            onClick={() => setMode("edit_text")}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${mode === "edit_text" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            Edit Text
          </button>
          <button
            type="button"
            onClick={() => setMode("edit_image")}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${mode === "edit_image" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            Edit Image
          </button>
          <button
            type="button"
            onClick={() => void savePdf()}
            disabled={isSaving || isLoading || !!error || isReplacingImage}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <PdfEditabilityBanner
          assessment={editabilityAssessment}
          onOpenStructuredEditor={handleOpenStructuredEditor}
        />

        <div className="relative flex-1 overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white text-sm text-slate-500">
              Dang khoi tao PDF editor...
            </div>
          ) : null}

          {error ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white px-4 text-center text-sm font-medium text-rose-600">
              {error}
            </div>
          ) : null}

          {mode === "edit_image" ? (
            <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex max-w-[320px] flex-col items-end gap-2">
              <div className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Image Editing
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedImage
                    ? "Image selected. Replace it with a new avatar or profile photo."
                    : "Select an image inside the PDF to replace it."}
                </p>
                {imageActionError ? (
                  <p className="mt-2 text-xs font-medium text-rose-600">{imageActionError}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => replaceImageInputRef.current?.click()}
                    disabled={!selectedImage || isReplacingImage || isLoading || !!error}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    {isReplacingImage ? "Replacing..." : "Replace image"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={viewerRef} className="h-full w-full" />
          <input
            ref={replaceImageInputRef}
            title="Replace selected image"
            aria-label="Replace selected image"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleReplaceImageSelection}
          />
        </div>
      </main>
    </div>
  );
}

async function fetchPdfSourceBlob(fileUrl: string) {
  const response = await fetch(fileUrl, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error("Khong the tai file PDF goc.");
  }

  return response.blob();
}

function buildPdfFileName(documentId: DocumentEditorMetadata["documentId"]) {
  return `document-${documentId}.pdf`;
}

function normalizePdfFileData(fileData: ArrayBufferLike) {
  return new Uint8Array(fileData).slice().buffer;
}
