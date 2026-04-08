"use client";

import { ChevronDown, MapPin, Search } from "lucide-react";

interface JobsHeroProps {
  q: string;
  selectedLocation: string;
  allLocations: string[];
  suggestionChips: string[];
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSuggestionClick: (value: string) => void;
  onSearchClick: () => void;
}

export function JobsHero({
  q,
  selectedLocation,
  allLocations,
  suggestionChips,
  onQueryChange,
  onLocationChange,
  onSuggestionClick,
  onSearchClick,
}: JobsHeroProps) {
  return (
    <header className="bg-linear-to-b from-blue-50 to-[#f7f9fb] px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-368 text-center">
        <div className="rounded-[28px] bg-white p-2 shadow-[0_24px_80px_rgba(37,99,235,0.12)]">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
              <Search className="size-6 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={q}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Vị trí, kỹ năng hoặc từ khóa..."
                className="h-14 w-full border-none bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="hidden w-px bg-slate-200 md:block" />

            <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
              <MapPin className="size-6 text-slate-400" aria-hidden="true" />
              <select
                value={selectedLocation}
                onChange={(event) => onLocationChange(event.target.value)}
                aria-label="Chọn địa điểm"
                className="h-14 w-full cursor-pointer appearance-none border-none bg-transparent pr-8 text-base font-semibold text-slate-900 outline-none"
              >
                <option value="">Toàn quốc</option>
                {allLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 size-5 text-slate-400" aria-hidden="true" />
            </div>

            <button
              type="button"
              onClick={onSearchClick}
              className="rounded-[20px] bg-primary px-7 py-4 text-sm font-black text-white transition hover:bg-blue-700 md:px-10"
            >
              Tìm kiếm ngay
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm font-bold text-slate-500">Gợi ý:</span>
          {suggestionChips.map((chip) => {
            const isActive = q.trim().toLowerCase() === chip.toLowerCase();

            return (
              <button
                key={chip}
                type="button"
                onClick={() => onSuggestionClick(chip)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-primary"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
