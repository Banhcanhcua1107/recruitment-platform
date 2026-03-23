"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PaddleOcrWorkspace } from "@/features/ocr-viewer/PaddleOcrWorkspace";

interface PaddleOcrWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaddleOcrWorkspaceModal({ isOpen, onClose }: PaddleOcrWorkspaceModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="paddle-ocr-workspace"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-4"
      >
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          aria-label="Close OCR workspace"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 18 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="relative z-10 h-[94vh] w-[98vw] max-w-[1880px] overflow-hidden rounded-[34px] border border-slate-200/90 bg-white shadow-[0_36px_120px_-52px_rgba(15,23,42,0.52)]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close OCR workspace"
          >
            <X size={18} />
          </button>
          <PaddleOcrWorkspace className="h-full" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
