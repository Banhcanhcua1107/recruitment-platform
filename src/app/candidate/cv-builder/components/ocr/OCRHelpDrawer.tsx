"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { OCRPipelineGuide } from "./OCRPipelineGuide";

interface OCRHelpDrawerProps {
  buttonClassName?: string;
  buttonLabel?: string;
}

export function OCRHelpDrawer({
  buttonClassName = "",
  buttonLabel = "OCR Guide",
}: OCRHelpDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 ${buttonClassName}`}
      >
        <CircleHelp size={16} />
        {buttonLabel}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-slate-900/40"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed right-0 top-0 z-[71] h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">OCR Help</h2>
                  <p className="text-xs text-slate-500">
                    Pipeline, caveats, and repo docs for CV Builder OCR
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <OCRPipelineGuide />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
