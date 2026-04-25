"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CandidateCard, { type HrCandidateItem } from "./CandidateCard";
import CandidateJobsDrawer from "./CandidateJobsDrawer";
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
  activeJobCount: number;
  relevanceThreshold: number;
  matchingMode: "strict" | "relaxed" | "broad";
  contextWarning: string | null;
}

const INITIAL_FILTERS: CandidateFilters = {
  keyword: "",
  location: "",
  experience: "all",
  skills: [],
  minSalary: 0,
  maxSalary: 100,
  minMatchScore: 0,
  sort: "best_match",
};

const QUICK_SKILLS = ["React", "Node.js", "Java", "UI/UX", "Python", "Next.js"];
const HR_CANDIDATE_SEARCH_CACHE_TTL_MS = 15_000;
const HR_HOME_CONTAINER_CLASS = "mx-auto w-full max-w-368";

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

  params.set("minSalary", String(filters.minSalary));
  params.set("maxSalary", String(filters.maxSalary));
  params.set("minMatch", String(filters.minMatchScore));
  params.set("sort", filters.sort);
  params.set("page", String(page));
  params.set("pageSize", "12");

  return params;
}

function getMatchingModeLabel(mode: HrCandidatesApiResponse["matchingMode"]) {
  switch (mode) {
    case "relaxed":
      return "Ghép mở rộng";
    case "broad":
      return "Ghép tổng quan";
    default:
      return "Ghép chuẩn";
  }
}

export default function HrHomePage() {
  const [filters, setFilters] = useState<CandidateFilters>(INITIAL_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<CandidateFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobsDrawerCandidate, setJobsDrawerCandidate] = useState<HrCandidateItem | null>(null);
  const [result, setResult] = useState<HrCandidatesApiResponse>({
    items: [],
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    activeJobCount: 0,
    relevanceThreshold: 0.5,
    matchingMode: "strict",
    contextWarning: null,
  });
  const responseCacheRef = useRef<Map<string, { expiresAt: number; data: HrCandidatesApiResponse }>>(
    new Map()
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchCandidates() {
      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(submittedFilters, page);
        const queryKey = query.toString();
        const now = Date.now();
        const cached = responseCacheRef.current.get(queryKey);

        if (cached && cached.expiresAt > now) {
          if (active) {
            setResult(cached.data);
            setLoading(false);
          }
          return;
        }

        const response = await fetch(`/api/candidates/public?${query.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as HrCandidatesApiResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Không thể tải danh sách ứng viên phù hợp.");
        }

        if (!active) {
          return;
        }

        const nextResult = {
          items: Array.isArray(payload.items) ? payload.items : [],
          page: Number(payload.page || page),
          pageSize: Number(payload.pageSize || 12),
          total: Number(payload.total || 0),
          totalPages: Math.max(1, Number(payload.totalPages || 1)),
          activeJobCount: Math.max(0, Number(payload.activeJobCount || 0)),
          relevanceThreshold: Number(payload.relevanceThreshold || 0.5),
          matchingMode:
            payload.matchingMode === "relaxed" || payload.matchingMode === "broad"
              ? payload.matchingMode
              : "strict",
          contextWarning: payload.contextWarning || null,
        } satisfies HrCandidatesApiResponse;

        responseCacheRef.current.set(queryKey, {
          expiresAt: now + HR_CANDIDATE_SEARCH_CACHE_TTL_MS,
          data: nextResult,
        });

        for (const [key, value] of responseCacheRef.current.entries()) {
          if (value.expiresAt <= now) {
            responseCacheRef.current.delete(key);
          }
        }

        while (responseCacheRef.current.size > 25) {
          const firstKey = responseCacheRef.current.keys().next().value;
          if (!firstKey) {
            break;
          }
          responseCacheRef.current.delete(firstKey);
        }

        setResult(nextResult);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Không thể tải danh sách ứng viên phù hợp."
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
      controller.abort();
    };
  }, [submittedFilters, page]);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    result.items.forEach((candidate) => {
      if (candidate.location) {
        set.add(candidate.location);
      }
    });

    if (filters.location) {
      set.add(filters.location);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [result.items, filters.location]);

  const skillOptions = useMemo(() => {
    const set = new Set<string>([...QUICK_SKILLS, ...filters.skills]);
    result.items.forEach((candidate) => {
      candidate.skills.forEach((skill) => {
        if (skill.trim()) {
          set.add(skill.trim());
        }
      });
    });

    return Array.from(set).slice(0, 18);
  }, [result.items, filters.skills]);

  return (
    <>
      <header className="bg-linear-to-b from-blue-50 to-[#f7f9fb] px-4 pt-24 pb-14 sm:px-6 lg:px-8">
        <div className={`${HR_HOME_CONTAINER_CLASS} text-center`}>
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

      <main className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className={`${HR_HOME_CONTAINER_CLASS} space-y-8`}>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Tổng quan đề xuất</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Ứng viên phù hợp theo nhu cầu tuyển dụng
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Ứng viên phù hợp</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{loading ? "..." : result.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Job đang mở</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{loading ? "..." : result.activeJobCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Ngưỡng ghép hiện tại</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {Math.round(result.relevanceThreshold * 100)}%
                </p>
                <p className="text-[11px] font-semibold text-slate-500">{getMatchingModeLabel(result.matchingMode)}</p>
              </div>
            </div>

            {result.contextWarning ? (
              <p className="mt-3 text-sm font-medium text-slate-600">{result.contextWarning}</p>
            ) : null}
          </section>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="w-full">
              <div className="sticky top-24">
                <CandidateFilterSidebar
                  filters={filters}
                  allLocations={allLocations}
                  skillOptions={skillOptions}
                  onFiltersChange={(next) => {
                    setFilters(next);
                    setSubmittedFilters(next);
                    setPage(1);
                  }}
                  onClear={() => {
                    setFilters(INITIAL_FILTERS);
                    setPage(1);
                    setSubmittedFilters(INITIAL_FILTERS);
                  }}
                />
              </div>
            </aside>

            <section className="min-w-0 space-y-5">
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Hiển thị <span className="font-black text-slate-900">{result.total}</span> ứng viên phù hợp
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
                    <option value="best_match">Phù hợp nhất</option>
                    <option value="latest">Mới cập nhật</option>
                  </select>
                </div>
              </div>

              {error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-46 animate-pulse rounded-3xl bg-slate-100" />
                  ))}
                </div>
              ) : result.items.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <p className="text-xl font-black text-slate-900">Không có ứng viên phù hợp</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {result.activeJobCount === 0
                      ? "Hiện chưa có job đang mở. Bạn có thể tạo job mới hoặc nới bộ lọc để hệ thống mở rộng ghép ứng viên."
                      : "Hãy thử nới lỏng bộ lọc hoặc thay đổi từ khóa tìm kiếm."}
                  </p>
                  {result.activeJobCount === 0 ? (
                    <div className="mt-5">
                      <Link
                        href="/hr/jobs/create"
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-white transition hover:bg-blue-700"
                      >
                        Tạo job
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid items-start gap-3 md:grid-cols-2">
                  {result.items.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onOpenJobsDrawer={setJobsDrawerCandidate}
                    />
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
        </div>
      </main>

      <CandidateJobsDrawer
        candidate={jobsDrawerCandidate}
        onClose={() => setJobsDrawerCandidate(null)}
      />
    </>
  );
}