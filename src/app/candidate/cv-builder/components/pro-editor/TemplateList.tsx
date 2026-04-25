"use client";

import { LayoutTemplate } from "lucide-react";
import { TemplateCard, type TemplateListItem } from "./TemplateCard";

interface TemplateListProps {
  templates: TemplateListItem[];
  activeTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateList({ templates, activeTemplateId, onSelectTemplate }: TemplateListProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-40px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          <LayoutTemplate size={13} />
          Template CV
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-3 sm:px-5">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isActive={template.id === activeTemplateId}
            onSelect={onSelectTemplate}
          />
        ))}
      </div>
    </aside>
  );
}
