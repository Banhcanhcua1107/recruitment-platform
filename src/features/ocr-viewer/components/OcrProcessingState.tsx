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
    <div className="mx-auto flex h-full w-full flex-col justify-center px-1.5 py-3 md:px-2">
      <div className="min-h-[460px] rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.32)] md:p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-cyan-50 text-cyan-700">
            <ScanSearch size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700">
              Dang phan tich CV
            </p>
            <h3 className="mt-1 text-[19px] font-semibold leading-7 text-slate-900">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{description}</p>
          </div>
        </div>

        {statusText ? (
          <div className="mt-4 rounded-[18px] border border-cyan-100 bg-cyan-50/70 px-3.5 py-2.5 text-[13px] text-cyan-900">
            {statusText}
          </div>
        ) : null}

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-4 space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "rounded-[18px] border px-3.5 py-3",
                step.state === "done" && "border-emerald-100 bg-emerald-50/60",
                step.state === "processing" && "border-cyan-100 bg-cyan-50/70",
                step.state === "pending" && "border-slate-200 bg-slate-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {step.state === "done" ? (
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  ) : step.state === "processing" ? (
                    <Loader2 size={15} className="shrink-0 animate-spin text-cyan-600" />
                  ) : (
                    <CircleDashed size={15} className="shrink-0 text-slate-400" />
                  )}
                  <p className="truncate text-[13px] font-medium text-slate-800">{step.label}</p>
                </div>

                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {step.state === "done" ? "Xong" : step.state === "processing" ? "Dang chay" : "Cho"}
                </span>
              </div>

              <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
