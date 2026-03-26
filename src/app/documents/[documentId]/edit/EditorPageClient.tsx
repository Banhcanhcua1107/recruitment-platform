"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentEditorMetadata, SupportedFileType } from "@/types/editor";
import ImageEditor from "@/components/editor/ImageEditor";
import PdfEditor from "@/components/editor/PdfEditor";
import WordEditor from "@/components/editor/WordEditor";

interface EditorPageClientProps {
  documentId: string;
}

interface SaveArgs {
  file: Blob;
  fileName: string;
  fileType: SupportedFileType;
  baseVersionId: string;
}

export default function EditorPageClient({ documentId }: EditorPageClientProps) {
  const router = useRouter();
  const [metadata, setMetadata] = useState<DocumentEditorMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/editor-metadata`, {
          cache: "no-store",
          credentials: "same-origin",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Khong the tai metadata editor.");
        }

        if (!canceled) {
          setMetadata(payload as DocumentEditorMetadata);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Khong the mo editor.");
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [documentId]);

  const handleSave = useCallback(
    async ({ file, fileName, fileType, baseVersionId }: SaveArgs) => {
      setIsSaving(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.set("file", file, fileName);
        formData.set("fileType", fileType);
        formData.set("baseVersionId", baseVersionId);

        const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/editor-save`, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Khong the luu file chinh sua.");
        }

        setMetadata(payload.metadata as DocumentEditorMetadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Luu that bai.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [documentId],
  );

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  const content = useMemo(() => {
    if (!metadata) return null;

    const common = {
      metadata,
      onBack,
      onSave: handleSave,
      isSaving,
    };

    if (metadata.fileType === "image") {
      return <ImageEditor {...common} />;
    }

    if (metadata.fileType === "pdf") {
      return <PdfEditor {...common} />;
    }

    if (metadata.fileType === "word") {
      return <WordEditor {...common} />;
    }

    return null;
  }, [handleSave, isSaving, metadata, onBack]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Dang tai source editor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          Back
        </button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-sm font-medium text-slate-700">Loai file nay chua duoc ho tro.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          Back
        </button>
      </div>
    );
  }

  return content;
}
