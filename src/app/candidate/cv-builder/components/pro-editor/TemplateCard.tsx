"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TemplateListItem {
  id: string;
  name: string;
  thumbnail: string;
  category?: string;
}

interface TemplateCardProps {
  template: TemplateListItem;
  isActive: boolean;
  onSelect: (templateId: string) => void;
}

export function TemplateCard({ template, isActive, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn(
        "group w-full rounded-2xl border bg-white p-3 text-left transition-all duration-200",
        isActive
          ? "border-sky-400 shadow-[0_18px_36px_-30px_rgba(2,132,199,0.65)]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-[0_18px_34px_-34px_rgba(15,23,42,0.5)]",
      )}
    >
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnail}
          alt={template.name}
          className="h-36 w-full bg-white object-contain"
        />
        {isActive ? (
          <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
            <Check size={13} />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">{template.name}</p>
        {template.category ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {template.category}
          </span>
        ) : null}
      </div>
    </button>
  );
}
