"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job } from "@/types/job";
import { toSlug } from "@/lib/slug";
import type { SortKey } from "../jobs-page.types";
import { SORT_OPTIONS } from "../jobs-page.utils";

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
  onSortChange: (value: SortKey) => void;
  onClearAll: () => void;
  onPageChange: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function formatPostedLabel(postedDate: string) {
  const date = new Date(postedDate);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `Cập nhật ${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Cập nhật ${diffDays} ngày trước`;
  }

  return `Đăng ${new Intl.DateTimeFormat("vi-VN").format(date)}`;
}

function buildJobTags(job: Job) {
  return [...new Set([job.employment_type, job.level, ...(job.industry ?? [])].filter(Boolean))].slice(
    0,
    4,
  );
}

function JobResultItem({ job }: { job: Job }) {
  const router = useRouter();
  const jobHref = `/jobs/${job.id}`;
  const companySlug = toSlug(job.company_name?.trim() ?? "");
  const tags = buildJobTags(job);
  const postedLabel = job.posted_date
    ? formatPostedLabel(job.posted_date)
    : job.deadline
      ? `Hạn nộp ${job.deadline}`
      : "";
  const hasLogo =
    job.logo_url &&
    job.logo_url !== "https://via.placeholder.com/150" &&
    !job.logo_url.includes("placeholder");
  const initial = job.company_name?.charAt(0) ?? "?";

  const openJobDetail = () => {
    router.push(jobHref);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Xem chi tiết việc làm ${job.title}`}
      onClick={openJobDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openJobDetail();
        }
      }}
      className="cursor-pointer rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.logo_url}
              alt={job.company_name}
              className="size-12 object-contain"
            />
          ) : (
            <span className="text-lg font-black text-primary">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link
                href={jobHref}
                onClick={(event) => event.stopPropagation()}
                className="line-clamp-2 text-lg font-black leading-snug text-slate-900 transition hover:text-primary"
              >
                {job.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-500">
                {companySlug ? (
                  <Link
                    href={`/companies/${companySlug}`}
                    onClick={(event) => event.stopPropagation()}
                    className="transition hover:text-primary"
                  >
                    {job.company_name}
                  </Link>
                ) : (
                  <span>{job.company_name}</span>
                )}
                <span>•</span>
                <span>{job.location}</span>
              </div>
            </div>

            <span className="whitespace-nowrap rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-primary">
              {job.salary || "Thỏa thuận"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={`${job.id}-${tag}`}
                className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">location_on</span>
            {job.location}
          </span>
          {postedLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">schedule</span>
              {postedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={jobHref}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-primary/30 hover:text-primary"
          >
            Xem chi tiết
          </Link>
          <Link
            href={jobHref}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-white transition hover:bg-blue-700"
          >
            Ứng tuyển ngay
          </Link>
        </div>
      </div>
    </article>
  );
}

export function JobsResultsSection({
  jobs,
  filteredCount,
  sort,
  activeChips,
  page,
  totalPages,
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
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-3xl">search_off</span>
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
            <JobResultItem key={job.id} job={job} />
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
          >
            <span className="material-symbols-outlined">chevron_left</span>
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
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </section>
  );
}
