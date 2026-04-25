"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ApplicationForm } from "@/components/jobs/ApplicationForm";

interface ApplicationModalProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}

export function ApplicationModal({
  jobId,
  jobTitle,
  companyName,
  onClose,
}: ApplicationModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-120 grid place-items-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Đóng cửa sổ ứng tuyển"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60"
      />

      <div className="relative z-121 flex h-[min(calc(100dvh-0.75rem),980px)] w-full max-w-170 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_-40px_rgba(15,23,42,0.42)] sm:h-auto sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                Ứng tuyển vị trí
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Hoàn tất hồ sơ ứng tuyển
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                Điền đủ thông tin liên hệ, giới thiệu bản thân và chọn CV bạn muốn gửi.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-950"
              aria-label="Đóng"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <ApplicationForm
            jobId={jobId}
            jobTitle={jobTitle}
            companyName={companyName}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
