import type { Metadata } from "next";
import { searchPublicJobs } from "@/lib/jobs";
import JobFiltersClient from "./JobFiltersClient";
import type { JobsQueryFilters, SortKey } from "./jobs-page.types";

export const metadata: Metadata = {
  title: "Việc làm | TalentFlow",
  description:
    "Khám phá hàng ngàn cơ hội nghề nghiệp hấp dẫn. Tìm kiếm và ứng tuyển ngay hôm nay.",
};

export const revalidate = 60;

const PAGE_LIMIT = 10;
const SORT_VALUES = new Set<SortKey>([
  "newest",
  "az",
  "salary-high",
  "salary-low",
]);

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    location?: string;
    levels?: string;
    types?: string;
    industries?: string;
    company?: string;
    sort?: string;
    page?: string;
  }>;
}

function parseCsvParam(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSort(value: string | undefined): SortKey {
  if (!value) {
    return "newest";
  }

  return SORT_VALUES.has(value as SortKey) ? (value as SortKey) : "newest";
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;

  const initialFilters: JobsQueryFilters = {
    q: String(params.q ?? "").trim(),
    location: String(params.location ?? "").trim(),
    levels: parseCsvParam(params.levels),
    types: parseCsvParam(params.types),
    industries: parseCsvParam(params.industries),
    company: String(params.company ?? "").trim(),
    sort: parseSort(params.sort),
  };

  const initialPage = Math.max(1, Number(params.page ?? "1"));
  const initialResult = await searchPublicJobs({
    q: initialFilters.q,
    location: initialFilters.location,
    company: initialFilters.company,
    levels: initialFilters.levels,
    types: initialFilters.types,
    industries: initialFilters.industries,
    sort: initialFilters.sort,
    page: initialPage,
    limit: PAGE_LIMIT,
  });

  return (
    <main className="grow bg-[#f6f7f8]">
      <header className="bg-linear-to-b from-blue-50 to-[#f7f9fb] px-6 pt-24 pb-10 md:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-368 text-center">
          <h1 className="mb-6 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
            Tìm kiếm công việc mơ ước
          </h1>
          <p className="mx-auto max-w-3xl text-base font-medium leading-relaxed text-slate-500 md:text-lg">
            Khám phá hàng ngàn cơ hội nghề nghiệp được kết nối trực tiếp với kỹ năng,
            kinh nghiệm và mục tiêu nghề nghiệp của bạn.
          </p>
        </div>
      </header>

      <JobFiltersClient
        initialItems={initialResult.items}
        initialPage={initialResult.page}
        initialLimit={initialResult.limit}
        initialTotal={initialResult.total}
        initialTotalPages={initialResult.totalPages}
        initialFilters={initialFilters}
      />
    </main>
  );
}
