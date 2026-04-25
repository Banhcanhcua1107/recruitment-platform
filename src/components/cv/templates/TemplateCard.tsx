"use client";

import { Eye, Loader2, Sparkles } from "lucide-react";
import type { CVTemplateDefinition } from "@/components/cv/templates/templateCatalog";
import { ResumeTemplateThumbnail } from "@/components/cv/templates/ResumeTemplateThumbnail";

interface TemplateCardProps {
  template: CVTemplateDefinition;
  onPreview: (template: CVTemplateDefinition) => void;
  onUseTemplate: (template: CVTemplateDefinition) => void;
  isCreating: boolean;
  disabled: boolean;
}

export function TemplateCard({
  template,
  onPreview,
  onUseTemplate,
  isCreating,
  disabled,
}: TemplateCardProps) {
  const leadTag = template.tags[0] ?? "Mẫu";
  const tagList = template.tags.length > 0 ? template.tags : [template.category];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-(--app-shadow-soft) transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.4)] focus-within:ring-2 focus-within:ring-sky-300/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-100">
      <div className="relative bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(226,232,240,0.7))] p-3">
        <ResumeTemplateThumbnail
          template={template}
          density="card"
          className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
        />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-md">
            {template.category}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              template.badge === "PRO"
                ? "bg-slate-900/90 text-white"
                : "bg-white/90 text-slate-700"
            }`}
          >
            {template.badge}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-black tracking-tight text-slate-900">{template.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>

        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{leadTag}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {tagList.map((tag) => (
            <span
              key={`${template.id}-${tag}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
          >
            <Eye size={15} />
            Xem trước
          </button>

          <button
            type="button"
            onClick={() => onUseTemplate(template)}
            disabled={disabled || isCreating}
            aria-label={isCreating ? "Đang tạo CV" : "Dùng mẫu này"}
            title={isCreating ? "Đang tạo CV" : "Dùng mẫu này"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          </button>
        </div>
      </div>
    </article>
  );
}
