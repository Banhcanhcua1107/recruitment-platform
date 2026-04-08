"use client";

import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import type { Job } from "@/types/job";
import type { JobCardMatchMeta, SortKey } from "../jobs-page.types";
import { SORT_OPTIONS } from "../jobs-page.utils";
import { UnifiedJobCard } from "./UnifiedJobCard";

interface ActiveChip {
  label: string;
  onRemove: () => void;
}

interface JobsResultsSectionProps {
  jobs: Job[];
  filteredCount: number;
  sort: SortKey;
  activeChips: ActiveChip[];
  page: number;
  totalPages: number;
  recommendationMap?: Record<string, JobCardMatchMeta>;
  onSortChange: (value: SortKey) => void;
  onClearAll: () => void;
  onPageChange: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function JobsResultsSection({
  jobs,
  filteredCount,
  sort,
  activeChips,
  page,
  totalPages,
  recommendationMap,
  onSortChange,
  onClearAll,
  onPageChange,
  onPreviousPage,
  onNextPage,
}: JobsResultsSectionProps) {
  const paginationItems = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (pageNumber) =>
        pageNumber === 1 ||
        pageNumber === totalPages ||
        Math.abs(pageNumber - page) <= 1,
    )
    .reduce<(number | "dots")[]>((items, pageNumber, index, source) => {
      if (index > 0 && pageNumber - (source[index - 1] as number) > 1) {
        items.push("dots");
      }
      items.push(pageNumber);
      return items;
    }, []);

  return (
    <section id="all-jobs-section" className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Tất cả việc làm
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
            Khám phá thêm cơ hội mới mà không bị ảnh hưởng bởi section đề xuất ở
            phía trên.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-slate-500">Sắp xếp theo:</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            aria-label="Sắp xếp danh sách việc làm"
            title="Sắp xếp danh sách việc làm"
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-primary outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Hiển thị <span className="font-black text-slate-900">{filteredCount}</span>{" "}
            việc làm phù hợp
          </p>
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="self-start text-xs font-black uppercase tracking-[0.18em] text-primary transition hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-primary"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="flex size-5 items-center justify-center rounded-full transition hover:bg-blue-100"
                  aria-label={`Xóa bộ lọc ${chip.label}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <SearchX className="size-8" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Không tìm thấy việc làm phù hợp
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Hãy thử thay đổi từ khóa hoặc xóa bớt bộ lọc để xem thêm cơ hội.
          </p>
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-50 px-5 text-sm font-black text-primary transition hover:bg-blue-100"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <UnifiedJobCard key={job.id} job={job} matchMeta={recommendationMap?.[job.id]} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={onPreviousPage}
            className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>

          {paginationItems.map((item, index) =>
            item === "dots" ? (
              <span key={`dots-${index}`} className="px-2 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`flex size-11 items-center justify-center rounded-2xl text-sm font-black transition ${
                  item === page
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary"
                }`}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={onNextPage}
            className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Trang sau"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
