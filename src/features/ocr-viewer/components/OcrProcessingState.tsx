"use client";

import { CheckCircle2, CircleDashed, Loader2, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type OcrProcessingStepState = "pending" | "processing" | "done";

export interface OcrProcessingStep {
  id: string;
  label: string;
  detail: string;
  state: OcrProcessingStepState;
}

interface OcrProcessingStateProps {
  title: string;
  description: string;
  statusText?: string | null;
  steps: OcrProcessingStep[];
}

function getProgressPercent(steps: OcrProcessingStep[]) {
  if (!steps.length) return 12;

  const total = steps.reduce((sum, step) => {
    if (step.state === "done") return sum + 1;
    if (step.state === "processing") return sum + 0.55;
    return sum;
  }, 0);

  return Math.max(10, Math.min(96, Math.round((total / steps.length) * 100)));
}

export function OcrProcessingState({
  title,
  description,
  statusText,
  steps,
}: OcrProcessingStateProps) {
  const progressPercent = getProgressPercent(steps);

  return (
    <div className="mx-auto flex h-full w-full max-w-[500px] flex-col justify-center px-2.5 py-3">
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] bg-cyan-50 text-cyan-700">
            <ScanSearch size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Đang phân tích CV</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
          </div>
        </div>

        {statusText ? (
          <div className="mt-3 rounded-[18px] border border-cyan-100 bg-cyan-50/70 px-3 py-2.5 text-[13px] text-cyan-900">
            {statusText}
          </div>
        ) : null}

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-3 space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "rounded-[18px] border px-3 py-2.5",
                step.state === "done" && "border-emerald-100 bg-emerald-50/60",
                step.state === "processing" && "border-cyan-100 bg-cyan-50/70",
                step.state === "pending" && "border-slate-200 bg-slate-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {step.state === "done" ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  ) : step.state === "processing" ? (
                    <Loader2 size={14} className="shrink-0 animate-spin text-cyan-600" />
                  ) : (
                    <CircleDashed size={14} className="shrink-0 text-slate-400" />
                  )}
                  <p className="truncate text-[13px] font-medium text-slate-800">{step.label}</p>
                </div>

                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {step.state === "done" ? "Xong" : step.state === "processing" ? "Đang chạy" : "Chờ"}
                </span>
              </div>

              <p className="mt-1 text-[12px] leading-5 text-slate-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
