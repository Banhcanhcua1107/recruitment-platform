"use client";

import { Search } from "lucide-react";
import {
  TEMPLATE_FILTERS,
  type TemplateFilterOption,
} from "./templateCatalog";

interface TemplateFilterBarProps {
  activeCategory: TemplateFilterOption;
  onSelectCategory: (category: TemplateFilterOption) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  resultCount: number;
}

const baseButtonClass =
  "rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2";

export function TemplateFilterBar({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchQueryChange,
  resultCount,
}: TemplateFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {TEMPLATE_FILTERS.map((category) => {
          const isActive = activeCategory === category;

          if (isActive) {
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className={`${baseButtonClass} bg-emerald-500 text-white shadow-lg shadow-emerald-500/25`}
                aria-pressed="true"
              >
                {category}
              </button>
            );
          }

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`${baseButtonClass} border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900`}
              aria-pressed="false"
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Tìm kiếm theo tên template"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            aria-label="Tìm kiếm template"
          />
        </label>

        <p className="text-sm font-semibold text-slate-500">
          {resultCount} mẫu khả dụng
        </p>
      </div>
    </div>
  );
}
