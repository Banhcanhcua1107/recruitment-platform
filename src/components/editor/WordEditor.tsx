"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import type { DocumentEditorMetadata, SupportedFileType } from "@/types/editor";

interface WordEditorProps {
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

declare global {
  interface Window {
    DocsAPI?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      DocEditor: new (containerId: string, config: any) => any;
    };
  }
}

export default function WordEditor({ metadata, onBack, isSaving }: WordEditorProps) {
  const containerId = useMemo(() => `onlyoffice-editor-${metadata.documentId}`, [metadata.documentId]);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const instanceRef = useRef<any | null>(null);

  const scriptSrc = useMemo(() => {
    const base = metadata.vendorConfig.word?.docServerUrl;
    if (!base) return null;
    return `${base.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
  }, [metadata.vendorConfig.word?.docServerUrl]);

  useEffect(() => {
    if (!scriptReady) return;
    if (!window.DocsAPI) {
      setError("ONLYOFFICE DocsAPI chua san sang.");
      return;
    }

    try {
      const baseConfig = metadata.vendorConfig.word?.config || {};
      const config = {
        ...baseConfig,
        document: {
          ...(baseConfig as any).document,
          title: (baseConfig as any).document?.title || `Document ${metadata.documentId}`,
          url: metadata.fileUrl,
        },
        editorConfig: {
          ...(baseConfig as any).editorConfig,
          callbackUrl:
            (baseConfig as any).editorConfig?.callbackUrl ||
            `${window.location.origin}/api/onlyoffice/callback`,
        },
        events: {
          ...(baseConfig as any).events,
          onDocumentStateChange: (event: { data?: boolean }) => {
            setHasChanges(Boolean(event?.data));
          },
        },
      };

      instanceRef.current = new window.DocsAPI.DocEditor(containerId, config);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khoi tao Word editor that bai.");
    }

    return () => {
      // TODO: adjust to your project if destroy API is available.
      // instanceRef.current?.destroyEditor?.();
      instanceRef.current = null;
    };
  }, [containerId, metadata.documentId, metadata.fileUrl, metadata.vendorConfig.word?.config, scriptReady]);

  const triggerSave = () => {
    const instance = instanceRef.current;
    if (instance && typeof instance.save === "function") {
      instance.save();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {scriptSrc ? (
        <Script
          src={scriptSrc}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
          onError={() => setError("Khong the tai script ONLYOFFICE.")}
        />
      ) : null}

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700"
          >
            Back
          </button>
          <p className="text-sm font-medium text-slate-600">Word Editor</p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges ? <span className="text-xs text-amber-600">Unsaved changes</span> : null}
          <button
            type="button"
            onClick={triggerSave}
            disabled={isSaving || !!error}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden bg-slate-100">
        {error ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-4 text-center text-sm font-medium text-rose-600">
            {error}
          </div>
        ) : null}

        <div id={containerId} className="h-full w-full" />
      </main>
    </div>
  );
}
