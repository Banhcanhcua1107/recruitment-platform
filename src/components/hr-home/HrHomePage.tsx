"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CandidateCard, { type HrCandidateItem } from "./CandidateCard";
import CandidateFilterSidebar, {
  type CandidateExperienceFilter,
  type CandidateFilters,
} from "./CandidateFilterSidebar";

interface HrCandidatesApiResponse {
  items: HrCandidateItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const INITIAL_FILTERS: CandidateFilters = {
  keyword: "",
  location: "",
  experience: "all",
  skills: [],
  minSalary: 0,
  maxSalary: 100,
  availableNow: false,
  openToWork: false,
  sort: "latest",
};

const QUICK_SKILLS = ["React", "Node.js", "Java", "UI/UX", "Python", "Next.js"];

function mapExperienceRange(value: CandidateExperienceFilter) {
  switch (value) {
    case "0-1":
      return "0-1";
    case "1-3":
      return "1-3";
    case "3-5":
      return "3-5";
    case "5+":
      return "5+";
    default:
      return "";
  }
}

function buildQuery(filters: CandidateFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.keyword.trim()) {
    params.set("keyword", filters.keyword.trim());
  }

  if (filters.location) {
    params.set("location", filters.location);
  }

  if (filters.skills.length > 0) {
    params.set("skills", filters.skills.join(","));
  }

  const experience = mapExperienceRange(filters.experience);
  if (experience) {
    params.set("experience", experience);
  }

  if (filters.availableNow) {
    params.set("availableNow", "true");
  }

  if (filters.openToWork) {
    params.set("openToWork", "true");
  }

  params.set("minSalary", String(filters.minSalary));
  params.set("maxSalary", String(filters.maxSalary));
  params.set("sort", filters.sort);
  params.set("page", String(page));
  params.set("pageSize", "12");

  return params;
}

export default function HrHomePage() {
  const [filters, setFilters] = useState<CandidateFilters>(INITIAL_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<CandidateFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HrCandidatesApiResponse>({
    items: [],
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let active = true;

    async function fetchCandidates() {
      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(submittedFilters, page);
        const response = await fetch(`/api/candidates/public?${query.toString()}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as HrCandidatesApiResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Không thể tải danh sách ứng viên.");
        }

        if (!active) {
          return;
        }

        setResult({
          items: Array.isArray(payload.items) ? payload.items : [],
          page: Number(payload.page || page),
          pageSize: Number(payload.pageSize || 12),
          total: Number(payload.total || 0),
          totalPages: Math.max(1, Number(payload.totalPages || 1)),
        });
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Không thể tải danh sách ứng viên."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchCandidates();

    return () => {
      active = false;
    };
  }, [submittedFilters, page]);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    result.items.forEach((candidate) => {
      if (candidate.location) {
        set.add(candidate.location);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [result.items]);

  const skillOptions = useMemo(() => {
    const set = new Set<string>(QUICK_SKILLS);
    result.items.forEach((candidate) => {
      candidate.skills.forEach((skill) => {
        if (skill.trim()) {
          set.add(skill.trim());
        }
      });
    });

    return Array.from(set).slice(0, 18);
  }, [result.items]);

  const recommendations: HrCandidateItem[] = [];

  return (
    <>
      <header className="bg-linear-to-b from-blue-50 to-[#f7f9fb] px-4 pt-24 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-330 text-center">
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
            Tìm kiếm ứng viên phù hợp
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-base font-medium leading-relaxed text-slate-500 md:text-lg">
            Duyệt kho hồ sơ public theo kỹ năng, kinh nghiệm và mức độ sẵn sàng để kết nối đúng người nhanh hơn.
          </p>

          <form
            className="rounded-[28px] bg-white p-2 shadow-[0_24px_80px_rgba(37,99,235,0.12)]"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSubmittedFilters(filters);
            }}
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
                <span className="material-symbols-outlined text-2xl text-slate-400">search</span>
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, keyword: event.target.value }))
                  }
                  placeholder="Tìm ứng viên theo kỹ năng, vị trí..."
                  className="h-14 w-full border-none bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="hidden w-px bg-slate-200 md:block" />

              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
                <span className="material-symbols-outlined text-2xl text-slate-400">location_on</span>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder="Địa điểm"
                  className="h-14 w-full border-none bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="hidden w-px bg-slate-200 md:block" />

              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
                <span className="material-symbols-outlined text-2xl text-slate-400">work_history</span>
                <select
                  value={filters.experience}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      experience: event.target.value as CandidateExperienceFilter,
                    }))
                  }
                  aria-label="Lọc theo kinh nghiệm"
                  title="Lọc theo kinh nghiệm"
                  className="h-14 w-full border-none bg-transparent text-base font-semibold text-slate-900 outline-none"
                >
                  <option value="all">Kinh nghiệm bất kỳ</option>
                  <option value="0-1">0-1 năm</option>
                  <option value="1-3">1-3 năm</option>
                  <option value="3-5">3-5 năm</option>
                  <option value="5+">5+ năm</option>
                </select>
              </div>

              <button
                type="submit"
                className="rounded-[20px] bg-primary px-8 py-4 text-sm font-black text-white transition hover:bg-blue-700 md:px-10"
              >
                Tìm ứng viên
              </button>
            </div>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-330 space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Đề xuất cho bạn</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Ứng viên phù hợp theo nhu cầu tuyển dụng</h2>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
              <p className="text-base font-semibold text-slate-700">Chưa có gợi ý phù hợp</p>
              <p className="mt-2 text-sm text-slate-500">Hãy phân tích JD hoặc tạo job mới để hệ thống đề xuất ứng viên chuẩn hơn.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  Phân tích JD
                </button>
                <Link
                  href="/hr/jobs/create"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Tạo job
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-80">
            <div className="sticky top-24">
              <CandidateFilterSidebar
                filters={filters}
                allLocations={allLocations}
                skillOptions={skillOptions}
                onFiltersChange={setFilters}
                onClear={() => {
                  setFilters(INITIAL_FILTERS);
                  setPage(1);
                  setSubmittedFilters(INITIAL_FILTERS);
                }}
              />
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-5">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Hiển thị <span className="font-black text-slate-900">{result.total}</span> ứng viên public
              </p>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500">Sắp xếp:</span>
                <select
                  value={filters.sort}
                  onChange={(event) => {
                    const sort = event.target.value as CandidateFilters["sort"];
                    const next = { ...filters, sort };
                    setFilters(next);
                    setPage(1);
                    setSubmittedFilters(next);
                  }}
                  aria-label="Sắp xếp danh sách ứng viên"
                  title="Sắp xếp danh sách ứng viên"
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-primary outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="latest">Mới nhất</option>
                  <option value="best_match">Phù hợp nhất</option>
                </select>
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-[28px] bg-slate-100" />
                ))}
              </div>
            ) : result.items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <p className="text-xl font-black text-slate-900">Không có ứng viên phù hợp</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Hãy thử nới lỏng bộ lọc hoặc thay đổi từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {result.items.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            )}

            {result.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`flex size-11 items-center justify-center rounded-2xl text-sm font-black transition ${
                      item === page
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    {item}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
                  className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
