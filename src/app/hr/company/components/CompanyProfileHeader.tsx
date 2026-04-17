"use client";

import { useEffect } from "react";
import { useCompanyProfileBuilder } from "../stores/companyProfileBuilderStore";

interface CompanyProfileHeaderProps {
  companyName?: string;
  onPreview?: () => void;
  isPreviewPending?: boolean;
}

export default function CompanyProfileHeader({
  companyName = "Cong ty",
  onPreview,
  isPreviewPending = false,
}: CompanyProfileHeaderProps) {
  const { isSaving, lastSaved, hasUnsavedChanges, error } = useCompanyProfileBuilder();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveStatus = (() => {
    if (error) {
      return {
        icon: "error",
        tone: "text-rose-600 bg-rose-50 border-rose-200",
        label: error,
      };
    }

    if (isSaving) {
      return {
        icon: "sync",
        tone: "text-amber-600 bg-amber-50 border-amber-200",
        label: "Dang luu thay doi...",
      };
    }

    if (lastSaved) {
      const time = lastSaved.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        icon: "cloud_done",
        tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
        label: `Da luu luc ${time}`,
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: "schedule",
        tone: "text-amber-600 bg-amber-50 border-amber-200",
        label: "Co thay doi chua luu",
      };
    }

    return {
      icon: "check_circle",
      tone: "text-slate-600 bg-slate-50 border-slate-200",
      label: "Tu dong luu dang bat",
    };
  })();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)] sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Quan ly ho so cong ty
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Ho so tuyen dung cua {companyName}
            </h1>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${saveStatus.tone}`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${isSaving ? "animate-spin" : ""}`}
            >
              {saveStatus.icon}
            </span>
            <span>{saveStatus.label}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {onPreview ? (
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPreviewPending ? "progress_activity" : "visibility"}
              </span>
              {isPreviewPending ? "Dang mo preview..." : "Xem preview"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
