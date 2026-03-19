"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RefreshCcw, X } from "lucide-react";
import type { CVDocumentDetailResponse } from "@/types/cv-import";
import { fetchCVImport } from "@/features/cv-import/api/client";
import { ImportReviewClient } from "@/features/cv-import/components/ImportReviewClient";

interface ImportReviewOverlayModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function ImportReviewOverlayModal({
  documentId,
  onClose,
}: ImportReviewOverlayModalProps) {
  const isOpen = Boolean(documentId);
  const [detail, setDetail] = useState<CVDocumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchCVImport(documentId);
      setDetail(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu review.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) {
      setDetail(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    void loadDetail();
  }, [documentId, loadDetail]);

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
          aria-label="Đóng hộp xem lại CV"
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
            className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700 md:right-5 md:top-5"
            aria-label="Đóng modal review"
          >
            <X size={18} />
          </button>

          {isLoading ? (
            <div className="flex h-full items-center justify-center bg-white">
              <div className="text-center">
                <Loader2 size={28} className="mx-auto animate-spin text-blue-600" />
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  Đang tải hộp xem lại CV
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Dữ liệu pipeline sẽ được hiển thị ngay khi sẵn sàng.
                </p>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full items-center justify-center bg-white">
              <div className="max-w-md text-center">
                <p className="text-lg font-semibold text-slate-900">
                  Không thể mở bản xem lại
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{errorMessage}</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadDetail()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <RefreshCcw size={16} />
                    Tải lại
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Đóng
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
