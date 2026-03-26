"use client";

import React, { useEffect, useRef, useState } from "react";
import type { DocumentEditorMetadata, DocumentEditorMode, SupportedFileType } from "@/types/editor";
import {
  applyPdfMode,
  disposePdfInstance,
  initializePdfViewerSession,
  isIgnorablePdfLifecycleError,
  installApryseNetworkGuards,
  installApryseUnhandledRejectionGuard,
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
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<DocumentEditorMode>("edit_all");
  const [isLoading, setIsLoading] = useState(true);
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
    let cleanupNetworkGuards = () => undefined;
    let cleanupUnhandledRejectionGuard = () => undefined;

    const isCurrentInit = () => !cancelled && initSequenceRef.current === initToken;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      cleanupNetworkGuards = installApryseNetworkGuards();
      cleanupUnhandledRejectionGuard = installApryseUnhandledRejectionGuard();
      try {
        const instance = await initializePdfViewerSession({
          container,
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
        applyPdfMode(instance, "edit_all");

        if (isCurrentInit()) {
          setIsLoading(false);
        }
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
      cleanupNetworkGuards();
      cleanupUnhandledRejectionGuard();
      const currentInstance = viewerInstanceRef.current;
      viewerInstanceRef.current = null;
      if (currentInstance) {
        void disposePdfInstance(currentInstance).finally(() => {
          resetPdfViewerContainer(container);
        });
      } else {
        resetPdfViewerContainer(container);
      }
    };
  }, [metadata.documentId, metadata.fileUrl, metadata.vendorConfig.pdf?.licenseKey, metadata.vendorConfig.pdf?.webviewerPath]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (!instance) return;

    applyPdfMode(instance, mode);
  }, [mode]);

  const savePdf = async () => {
    const instance = viewerInstanceRef.current;
    if (!instance) {
      throw new Error("PDF editor is not initialized.");
    }

    const documentViewer = instance.Core.documentViewer;
    const annotationManager = instance.Core.annotationManager;
    const doc = documentViewer.getDocument();

    if (!doc) {
      throw new Error("PDF document is not available.");
    }

    const xfdf = await annotationManager.exportAnnotations();
    const fileData = await doc.getFileData({ xfdfString: xfdf });
    const blob = new Blob([new Uint8Array(fileData)], { type: "application/pdf" });

    await onSave({
      file: blob,
      fileName: "edited.pdf",
      fileType: "pdf",
      baseVersionId: metadata.latestFileVersionId,
    });
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
            disabled={isSaving || isLoading || !!error}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
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

        <div ref={viewerRef} className="h-full w-full" />
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
