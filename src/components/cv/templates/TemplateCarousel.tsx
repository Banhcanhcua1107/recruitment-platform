"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CVTemplateDefinition } from "./templateCatalog";

interface TemplateCarouselProps {
  templates: CVTemplateDefinition[];
  selectedTemplateId: string | null;
  creatingTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  onUseTemplate: (template: CVTemplateDefinition) => void;
}

export function TemplateCarousel({
  templates,
  selectedTemplateId,
  creatingTemplateId,
  onSelectTemplate,
  onUseTemplate,
}: TemplateCarouselProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const selectedIndex = useMemo(() => {
    if (!selectedTemplateId) {
      return 0;
    }

    const index = templates.findIndex((template) => template.id === selectedTemplateId);
    return index < 0 ? 0 : index;
  }, [selectedTemplateId, templates]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
    setCanScrollPrev(rail.scrollLeft > 4);
    setCanScrollNext(remaining > 4);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [templates.length, updateScrollState]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !selectedTemplateId) {
      return;
    }

    const activeItem = rail.querySelector<HTMLElement>(`[data-template-id="${selectedTemplateId}"]`);
    activeItem?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedTemplateId]);

  const scrollRail = (direction: "prev" | "next") => {
    if (!railRef.current) {
      return;
    }

    const shift = Math.max(260, Math.round(railRef.current.clientWidth * 0.8));

    railRef.current.scrollBy({
      left: direction === "next" ? shift : -shift,
      behavior: "smooth",
    });
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_70px_-50px_rgba(15,23,42,0.4)] sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Mẫu CV {selectedIndex + 1}/{templates.length}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollRail("prev")}
            disabled={!canScrollPrev}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Xem mẫu phía trước"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => scrollRail("next")}
            disabled={!canScrollNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Xem mẫu tiếp theo"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div ref={railRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId;
          const isCreating = creatingTemplateId === template.id;

          return (
            <article
              key={template.id}
              data-template-id={template.id}
              className={cn(
                "w-57 shrink-0 snap-center rounded-2xl border bg-white p-2 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.9)] transition-all",
                isSelected
                  ? "border-emerald-300 ring-2 ring-emerald-200/70"
                  : "border-slate-200 hover:border-slate-300",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectTemplate(template.id)}
                className="w-full text-left"
              >
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="h-42 w-full rounded-lg bg-white object-contain"
                  />
                  <span
                    className={cn(
                      "absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      template.badge === "PRO"
                        ? "bg-slate-900 text-white"
                        : "bg-white/95 text-slate-700",
                    )}
                  >
                    {template.badge}
                  </span>
                </div>
                <p className="mt-2.5 truncate text-sm font-semibold text-slate-900">{template.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{template.category}</p>
              </button>

              <button
                type="button"
                onClick={() => onUseTemplate(template)}
                disabled={creatingTemplateId !== null && creatingTemplateId !== template.id}
                className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={12} />
                {isCreating ? "Đang tạo..." : "Dùng mẫu này"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId;

          return (
            <button
              key={`dot-${template.id}`}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              aria-label={`Chọn mẫu ${template.name}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                isSelected ? "w-6 bg-emerald-500" : "w-2 bg-slate-300 hover:bg-slate-400",
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
