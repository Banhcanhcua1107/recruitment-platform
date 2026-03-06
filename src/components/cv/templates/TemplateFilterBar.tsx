"use client";

const TEMPLATE_FILTERS = [
  "Tất cả",
  "Đơn giản",
  "Chuyên nghiệp",
  "Hiện đại",
  "Ấn tượng",
  "Harvard",
  "ATS",
] as const;

export type TemplateFilter = (typeof TEMPLATE_FILTERS)[number];

interface TemplateFilterBarProps {
  activeCategory: TemplateFilter;
  onSelectCategory: (category: TemplateFilter) => void;
}

const baseButtonClass =
  "rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2";

export function TemplateFilterBar({
  activeCategory,
  onSelectCategory,
}: TemplateFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TEMPLATE_FILTERS.map((category) => {
        const isActive = activeCategory === category;

        if (isActive) {
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`${baseButtonClass} bg-emerald-500 text-white shadow-lg shadow-emerald-500/20`}
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
            className={`${baseButtonClass} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900`}
            aria-pressed="false"
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
