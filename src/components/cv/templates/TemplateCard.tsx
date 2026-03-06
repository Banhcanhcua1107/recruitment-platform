"use client";

import Link from "next/link";

export interface GalleryTemplate {
  id: string;
  name: string;
  preview: string;
  categories: string[];
  colors: string[];
  description: string;
  accent: string;
}

interface TemplateCardProps {
  template: GalleryTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link
      href={`/candidate/cv-builder?template=${template.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(241,245,249,0.95)_50%,_rgba(226,232,240,0.9))] p-4 sm:p-5">
        <div className="absolute inset-x-8 bottom-4 h-8 rounded-full bg-slate-900/10 blur-xl transition-all duration-300 group-hover:bg-slate-900/15" />
        <div className="relative mx-auto h-full max-w-[82%] overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_24px_50px_-28px_rgba(15,23,42,0.4)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[0.4deg]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.preview}
            alt={template.name}
            className="h-full w-full object-contain object-top bg-white"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-full items-center justify-center px-6">
            <div className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white shadow-xl">
              Sử dụng mẫu này
            </div>
          </div>
        </div>

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-700 backdrop-blur-md">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: template.accent }}
            aria-hidden="true"
          />
          TalentFlow
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black tracking-tight text-slate-900">
            {template.name}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {template.description}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {template.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2" aria-label="Bảng màu template">
            {template.colors.map((color) => (
              <span
                key={`${template.id}-${color}`}
                className="size-4 rounded-full border border-slate-200 shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          <span className="text-sm font-bold text-emerald-700 transition-transform duration-200 group-hover:translate-x-1">
            Bắt đầu
          </span>
        </div>
      </div>
    </Link>
  );
}
