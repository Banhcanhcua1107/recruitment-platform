"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CircleAlert } from "lucide-react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DialogRequest, DialogTone } from "./app-dialog";

interface AppDialogSurfaceProps {
  activeDialog: DialogRequest;
  dismissible: boolean;
  promptInputRef: RefObject<HTMLInputElement | null>;
  promptValue: string;
  tone: DialogTone;
  onDismiss: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function AppDialogSurface({
  activeDialog,
  dismissible,
  promptInputRef,
  promptValue,
  tone,
  onDismiss,
  onPromptChange,
  onSubmit,
}: AppDialogSurfaceProps) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        key={activeDialog.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-210"
      >
        <motion.button
          type="button"
          aria-label="Dong hop thoai"
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          onClick={dismissible ? onDismiss : undefined}
        />

        <div className="relative z-211 flex min-h-full items-center justify-center p-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-description"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-full max-w-115 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                  tone === "danger"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-sky-200 bg-sky-50 text-sky-700",
                )}
              >
                {tone === "danger" ? (
                  <AlertTriangle size={20} aria-hidden="true" />
                ) : (
                  <CircleAlert size={20} aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <h2 id="app-dialog-title" className="text-lg font-black tracking-tight text-slate-900">
                  {activeDialog.options.title || "Thong bao"}
                </h2>
                <p id="app-dialog-description" className="text-sm leading-6 text-slate-600">
                  {activeDialog.options.description}
                </p>

                {activeDialog.kind === "prompt" ? (
                  <div className="space-y-2 pt-1">
                    {activeDialog.options.inputLabel ? (
                      <label
                        htmlFor="app-dialog-prompt-input"
                        className="text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {activeDialog.options.inputLabel}
                      </label>
                    ) : null}
                    <input
                      id="app-dialog-prompt-input"
                      ref={promptInputRef}
                      type="text"
                      value={promptValue}
                      onChange={(event) => onPromptChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onSubmit();
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={activeDialog.options.placeholder || "Nhap noi dung"}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {activeDialog.kind !== "alert" ? (
                <Button variant="outline" onClick={onDismiss}>
                  {activeDialog.options.cancelText || "Huy"}
                </Button>
              ) : null}

              <Button
                variant={tone === "danger" ? "destructive" : "default"}
                onClick={onSubmit}
              >
                {activeDialog.options.confirmText ||
                  (activeDialog.kind === "alert" ? "Da hieu" : "Xac nhan")}
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
