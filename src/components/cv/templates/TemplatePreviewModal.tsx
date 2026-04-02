"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import type { CVTemplateDefinition } from "@/components/cv/templates/templateCatalog";

interface TemplatePreviewModalProps {
  template: CVTemplateDefinition | null;
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onUseTemplate: (template: CVTemplateDefinition) => void;
}

export function TemplatePreviewModal({
  template,
  open,
  creating,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const images = useMemo(() => template?.previewImages ?? [], [template]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (images.length <= 1) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, onClose, open]);

  if (!open || !template) {
    return null;
  }

  const activeImage = images[activeIndex] ?? template.thumbnail;
  const canNavigate = images.length > 1;

  const handlePrev = () => {
    if (!canNavigate) {
      return;
    }
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!canNavigate) {
      return;
    }
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem trước mẫu ${template.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900 text-white shadow-[0_36px_140px_-54px_rgba(15,23,42,0.95)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
              Xem trước mẫu
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-2xl font-black tracking-tight">{template.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  template.badge === "PRO"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/90 text-slate-800"
                }`}
              >
                {template.badge}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{template.description}</p>
            {images.length > 0 ? (
              <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                {activeIndex + 1}/{images.length} ảnh xem trước
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/15 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            aria-label="Đóng xem trước"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_19rem] sm:px-8 sm:py-7">
          <div className="space-y-4">
            <div className="relative rounded-2xl border border-white/10 bg-slate-800/70 p-3">
              {canNavigate ? (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-900/70 text-white transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                    aria-label="Xem ảnh trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-900/70 text-white transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                    aria-label="Xem ảnh tiếp theo"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={`${template.name} preview ${activeIndex + 1}`}
                className="mx-auto h-auto max-h-[72vh] w-full rounded-xl bg-white object-contain"
              />
            </div>

            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {images.map((imageUrl, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${template.id}-preview-${index}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`overflow-hidden rounded-xl border transition ${
                        isActive
                          ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.4)]"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`${template.name} thumbnail ${index + 1}`}
                        className="h-24 w-full bg-white object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 rounded-2xl border border-white/10 bg-slate-800/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
              Nhãn mẫu
            </p>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={`${template.id}-${tag}`}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Mẫu này đã có dữ liệu mặc định để bạn chỉnh nhanh và xuất CV ngay.
            </div>

            <button
              type="button"
              onClick={() => onUseTemplate(template)}
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {creating ? "Đang khởi tạo CV..." : "Dùng mẫu này"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
