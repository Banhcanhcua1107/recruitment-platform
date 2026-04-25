"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RefreshCcw, X } from "lucide-react";
import { fetchCVImport, isAPIClientError } from "@/features/cv-import/api/client";
import { ImportReviewClient } from "@/features/cv-import/components/ImportReviewClient";
import { shouldDeferReviewFetchError } from "@/features/cv-import/review/import-review-detail";
import type { CVDocumentDetailResponse } from "@/types/cv-import";

interface ImportReviewOverlayModalProps {
  documentId: string | null;
  initialDetail?: CVDocumentDetailResponse | null;
  onClose: () => void;
}

export function ImportReviewOverlayModal({
  documentId,
  initialDetail = null,
  onClose,
}: ImportReviewOverlayModalProps) {
  const isOpen = Boolean(documentId);
  const [detail, setDetail] = useState<CVDocumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detailRef = useRef<CVDocumentDetailResponse | null>(null);
  const seededDetail = useMemo(
    () => (documentId && initialDetail?.document.id === documentId ? initialDetail : null),
    [documentId, initialDetail],
  );

  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!documentId) return;

      const silent = options?.silent ?? false;
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await fetchCVImport(documentId);
        setDetail(response);
      } catch (error) {
        const currentDetail = detailRef.current ?? seededDetail;
        const status = isAPIClientError(error) ? error.status : undefined;
        if (shouldDeferReviewFetchError(status, currentDetail)) {
          setDetail(currentDetail);
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Khong the tai du lieu review.");
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [documentId, seededDetail],
  );

  useEffect(() => {
    if (!documentId) {
      setDetail(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setDetail(seededDetail);
    setErrorMessage(null);
    setIsLoading(!seededDetail);
    void loadDetail({ silent: Boolean(seededDetail) });
  }, [documentId, loadDetail, seededDetail]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`import-review-${documentId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4"
      >
        <motion.button
          type="button"
          aria-label="Dong hop xem lai CV"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="relative z-10 h-[94vh] w-[98vw] max-w-[1920px] overflow-hidden rounded-[36px] border border-slate-200/90 bg-white shadow-[0_34px_110px_-44px_rgba(15,23,42,0.42)]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700 md:right-5 md:top-5"
            aria-label="Dong modal review"
          >
            <X size={17} />
          </button>

          {isLoading ? (
            <div className="flex h-full items-center justify-center bg-white">
              <div className="text-center">
                <Loader2 size={24} className="mx-auto animate-spin text-blue-600" />
                <p className="mt-3 text-base font-semibold text-slate-900">Dang tai hop xem lai CV</p>
                <p className="mt-2 text-[13px] text-slate-500">
                  Du lieu pipeline se duoc hien thi ngay khi san sang.
                </p>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full items-center justify-center bg-white">
              <div className="max-w-md text-center">
                <p className="text-base font-semibold text-slate-900">Khong the mo ban xem lai</p>
                <p className="mt-2 text-[13px] leading-5 text-slate-500">{errorMessage}</p>
                <div className="mt-4 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void loadDetail()}
                    className="inline-flex h-9 items-center gap-2 rounded-[18px] bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <RefreshCcw size={16} />
                    Tai lai
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Dong
                  </button>
                </div>
              </div>
            </div>
          ) : detail ? (
            <ImportReviewClient documentId={documentId ?? detail.document.id} initialData={detail} />
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
