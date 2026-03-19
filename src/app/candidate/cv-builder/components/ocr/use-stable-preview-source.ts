"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewKind } from "./ocr-pipeline-adapter";

export interface PreviewSourceState {
  url: string | null;
  kind: PreviewKind;
  error: string | null;
}

const INITIAL_PREVIEW_SOURCE: PreviewSourceState = {
  url: null,
  kind: "unknown",
  error: null,
};

function isSamePreviewSource(left: PreviewSourceState, right: PreviewSourceState) {
  return left.url === right.url && left.kind === right.kind && left.error === right.error;
}

export function useStablePreviewSource() {
  const [previewSource, setPreviewSource] = useState<PreviewSourceState>(INITIAL_PREVIEW_SOURCE);
  const localObjectUrlRef = useRef<string | null>(null);

  const updatePreviewSource = useCallback((nextState: PreviewSourceState) => {
    setPreviewSource((current) => (isSamePreviewSource(current, nextState) ? current : nextState));
  }, []);

  const applyLocalPreview = useCallback((file: File, kind: PreviewKind) => {
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }

    if (kind === "image" || kind === "pdf") {
      const objectUrl = URL.createObjectURL(file);
      localObjectUrlRef.current = objectUrl;
      updatePreviewSource({
        url: objectUrl,
        kind,
        error: null,
      });
      return;
    }

    updatePreviewSource({
      url: null,
      kind,
      error: null,
    });
  }, [updatePreviewSource]);

  const applyPreparedPreview = useCallback(
    (payload: { url: string; kind: PreviewKind }) => {
      updatePreviewSource({
        url: payload.url,
        kind: payload.kind,
        error: null,
      });
    },
    [updatePreviewSource],
  );

  const setPreviewError = useCallback(
    (error: string | null) => {
      setPreviewSource((current) => {
        const nextState = {
          ...current,
          error,
        };
        return isSamePreviewSource(current, nextState) ? current : nextState;
      });
    },
    [],
  );

  const resetPreviewSource = useCallback(() => {
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    updatePreviewSource(INITIAL_PREVIEW_SOURCE);
  }, [updatePreviewSource]);

  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
      }
    };
  }, []);

  return {
    previewSource,
    applyLocalPreview,
    applyPreparedPreview,
    setPreviewError,
    resetPreviewSource,
  };
}
