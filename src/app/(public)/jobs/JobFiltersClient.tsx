"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { Job } from "@/types/job";
import { scheduleIdleTask } from "@/lib/client-idle";
import { createClient } from "@/utils/supabase/client";
import { JobsFilterSidebar } from "./components/JobsFilterSidebar";
import { JobsHero } from "./components/JobsHero";
import { JobsRecommendationSection } from "./components/JobsRecommendationSection";
import { JobsResultsSection } from "./components/JobsResultsSection";
import type {
  JobCardMatchMeta,
  JobsApiResponse,
  JobsQueryFilters,
  SortKey,
} from "./jobs-page.types";
import {
  parseSalary,
  SUGGESTION_CHIPS,
  uniqueIndustries,
  uniqueValues,
} from "./jobs-page.utils";
import { useRecommendedJobs } from "./useRecommendedJobs";

function toggleArr(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

function mergeAndSortValues(values: string[], selectedValues: string[]) {
  return [...new Set([...values, ...selectedValues])].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
}

function buildApiParams({
  q,
  location,
  levels,
  types,
  industries,
  company,
  sort,
  page,
  limit,
}: {
  q: string;
  location: string;
  levels: string[];
  types: string[];
  industries: string[];
  company: string;
  sort: "newest" | "az";
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (location) params.set("location", location);
  if (company) params.set("company", company);
  if (levels.length > 0) params.set("levels", levels.join(","));
  if (types.length > 0) params.set("types", types.join(","));
  if (industries.length > 0) params.set("industries", industries.join(","));

  params.set("sort", sort);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return params;
}

function buildUrlParams({
  q,
  location,
  levels,
  types,
  industries,
  company,
  sort,
  page,
}: {
  q: string;
  location: string;
  levels: string[];
  types: string[];
  industries: string[];
  company: string;
  sort: SortKey;
  page: number;
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (location) params.set("location", location);
  if (levels.length > 0) params.set("levels", levels.join(","));
  if (types.length > 0) params.set("types", types.join(","));
  if (industries.length > 0) params.set("industries", industries.join(","));
  if (company) params.set("company", company);
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  return params;
}

function filterBySalary(
  jobs: Job[],
  salaryMin: string,
  salaryMax: string,
  hideUnknownSalary: boolean,
) {
  const minSalary = salaryMin ? Number.parseFloat(salaryMin) : null;
  const maxSalary = salaryMax ? Number.parseFloat(salaryMax) : null;

  if (minSalary === null && maxSalary === null && !hideUnknownSalary) {
    return jobs;
  }

  return jobs.filter((job) => {
    const salary = parseSalary(job.salary);
    if (!salary) {
      return !hideUnknownSalary;
    }

    if (minSalary !== null && salary.max < minSalary) {
      return false;
    }

    if (maxSalary !== null && salary.min > maxSalary) {
      return false;
    }

    return true;
  });
}

function salarySortValue(job: Job) {
  const salary = parseSalary(job.salary);
  if (!salary) {
    return -1;
  }

  if (salary.max === Number.POSITIVE_INFINITY) {
    return salary.min;
  }

  return (salary.min + salary.max) / 2;
}

interface JobFiltersClientProps {
  initialItems: Job[];
  initialPage: number;
  initialLimit: number;
  initialTotal: number;
  initialTotalPages: number;
  initialFilters: JobsQueryFilters;
}

export default function JobFiltersClient({
  initialItems,
  initialPage,
  initialLimit,
  initialTotal,
  initialTotalPages,
  initialFilters,
}: JobFiltersClientProps) {
  const aiRecommendationsEnabled =
    process.env.NEXT_PUBLIC_ENABLE_CANDIDATE_JOBS_AI_LAYER !== "false";

  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = React.useState<Job[]>(initialItems);
  const [q, setQ] = React.useState(initialFilters.q);
  const [selectedLocation, setSelectedLocation] = React.useState(initialFilters.location);
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>(initialFilters.levels);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(initialFilters.types);
  const [selectedIndustries, setSelectedIndustries] = React.useState<string[]>(initialFilters.industries);
  const [salaryMin, setSalaryMin] = React.useState("");
  const [salaryMax, setSalaryMax] = React.useState("");
  const [hideUnknownSalary, setHideUnknownSalary] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>(initialFilters.sort);
  const [page, setPage] = React.useState(initialPage);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [serverTotal, setServerTotal] = React.useState(initialTotal);
  const [serverTotalPages, setServerTotalPages] = React.useState(initialTotalPages);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [employerCompanyName, setEmployerCompanyName] = React.useState("");
  const [onlyMyCompanyJobs, setOnlyMyCompanyJobs] = React.useState(false);
  const [debouncedQ, setDebouncedQ] = React.useState(initialFilters.q);

  const initialRequestKeyRef = React.useRef(
    buildApiParams({
      q: initialFilters.q,
      location: initialFilters.location,
      levels: initialFilters.levels,
      types: initialFilters.types,
      industries: initialFilters.industries,
      company: initialFilters.company,
      sort: initialFilters.sort === "az" ? "az" : "newest",
      page: initialPage,
      limit: initialLimit,
    }).toString(),
  );
  const hasHandledInitialFetch = React.useRef(false);

  const {
    status: recommendationStatus,
    data: recommendationData,
    error: recommendationError,
  } = useRecommendedJobs({ enabled: aiRecommendationsEnabled });

  const recommendationMap = React.useMemo(() => {
    if (!aiRecommendationsEnabled || recommendationStatus !== "ready" || !recommendationData) {
      return {} as Record<string, JobCardMatchMeta>;
    }

    return recommendationData.items.reduce<Record<string, JobCardMatchMeta>>((accumulator, item) => {
      const jobId = item.job.id || item.jobId;
      if (!jobId) {
        return accumulator;
      }

      accumulator[jobId] = {
        matchScore: item.matchScore,
        fitLevel: item.fitLevel,
        badge: item.fitLevel === "High" ? "Top match" : "Recommended",
        matchedSkills: item.matchedSkills,
      };

      return accumulator;
    }, {});
  }, [aiRecommendationsEnabled, recommendationData, recommendationStatus]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 280);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [q]);

  React.useEffect(() => {
    let mounted = true;
    const cancelIdleTask = scheduleIdleTask(() => {
      void loadEmployerCompany();
    }, 600);

    async function loadEmployerCompany() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data: employer } = await supabase
          .from("employers")
          .select("company_name")
          .eq("id", user.id)
          .maybeSingle();

        const nextCompany = String(employer?.company_name ?? "").trim();

        if (
          mounted &&
          nextCompany &&
          nextCompany.toLowerCase() !== "chưa cập nhật tên công ty"
        ) {
          setEmployerCompanyName(nextCompany);
        }
      } catch {
        // Ignore auth lookup failures on the public jobs page.
      }
    }

    return () => {
      mounted = false;
      cancelIdleTask();
    };
  }, []);

  const companyFilter = React.useMemo(() => {
    if (onlyMyCompanyJobs && employerCompanyName) {
      return employerCompanyName;
    }

    return initialFilters.company;
  }, [onlyMyCompanyJobs, employerCompanyName, initialFilters.company]);

  const apiSort = sort === "az" ? "az" : "newest";

  const apiQuery = React.useMemo(
    () =>
      buildApiParams({
        q: debouncedQ,
        location: selectedLocation,
        levels: selectedLevels,
        types: selectedTypes,
        industries: selectedIndustries,
        company: companyFilter,
        sort: apiSort,
        page,
        limit: initialLimit,
      }).toString(),
    [
      apiSort,
      companyFilter,
      debouncedQ,
      initialLimit,
      page,
      selectedIndustries,
      selectedLevels,
      selectedLocation,
      selectedTypes,
    ],
  );

  React.useEffect(() => {
    const params = buildUrlParams({
      q: debouncedQ,
      location: selectedLocation,
      levels: selectedLevels,
      types: selectedTypes,
      industries: selectedIndustries,
      company: companyFilter,
      sort,
      page,
    });

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    companyFilter,
    debouncedQ,
    page,
    pathname,
    router,
    selectedIndustries,
    selectedLevels,
    selectedLocation,
    selectedTypes,
    sort,
  ]);

  React.useEffect(() => {
    if (!hasHandledInitialFetch.current) {
      hasHandledInitialFetch.current = true;

      if (apiQuery === initialRequestKeyRef.current) {
        return;
      }
    }

    let active = true;
    const controller = new AbortController();

    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch(`/api/jobs?${apiQuery}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to fetch jobs");
        }

        const payload = (await response.json()) as JobsApiResponse;

        if (!active) {
          return;
        }

        setItems(Array.isArray(payload.items) ? payload.items : []);
        setServerTotal(Math.max(0, Number(payload.total ?? 0)));
        setServerTotalPages(Math.max(1, Number(payload.totalPages ?? 1)));
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Không thể tải danh sách việc làm";
        setFetchError(message);
        setItems([]);
        setServerTotal(0);
        setServerTotalPages(1);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchJobs();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiQuery]);

  const jobsAfterSalaryFilter = React.useMemo(
    () => filterBySalary(items, salaryMin, salaryMax, hideUnknownSalary),
    [items, salaryMin, salaryMax, hideUnknownSalary],
  );

  const visibleJobs = React.useMemo(() => {
    if (sort === "salary-high") {
      return [...jobsAfterSalaryFilter].sort(
        (left, right) => salarySortValue(right) - salarySortValue(left),
      );
    }

    if (sort === "salary-low") {
      return [...jobsAfterSalaryFilter].sort(
        (left, right) => salarySortValue(left) - salarySortValue(right),
      );
    }

    return jobsAfterSalaryFilter;
  }, [jobsAfterSalaryFilter, sort]);

  const hasSalaryFilter = Boolean(salaryMin || salaryMax || hideUnknownSalary);
  const filteredCount = hasSalaryFilter ? visibleJobs.length : serverTotal;
  const totalPages = hasSalaryFilter ? 1 : serverTotalPages;

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const allLocations = React.useMemo(() => {
    const values = uniqueValues(items, "location");
    return selectedLocation && !values.includes(selectedLocation)
      ? mergeAndSortValues(values, [selectedLocation])
      : values;
  }, [items, selectedLocation]);

  const allLevels = React.useMemo(
    () => mergeAndSortValues(uniqueValues(items, "level"), selectedLevels),
    [items, selectedLevels],
  );

  const allTypes = React.useMemo(
    () => mergeAndSortValues(uniqueValues(items, "employment_type"), selectedTypes),
    [items, selectedTypes],
  );

  const allIndustries = React.useMemo(
    () => mergeAndSortValues(uniqueIndustries(items), selectedIndustries),
    [items, selectedIndustries],
  );

  const handleQueryChange = React.useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const handleLocationChange = React.useCallback((value: string) => {
    setSelectedLocation(value);
    setPage(1);
  }, []);

  const handleToggleLevel = React.useCallback((value: string) => {
    setSelectedLevels((previous) => toggleArr(previous, value));
    setPage(1);
  }, []);

  const handleToggleType = React.useCallback((value: string) => {
    setSelectedTypes((previous) => toggleArr(previous, value));
    setPage(1);
  }, []);

  const handleToggleIndustry = React.useCallback((value: string) => {
    setSelectedIndustries((previous) => toggleArr(previous, value));
    setPage(1);
  }, []);

  const handleSalaryMinChange = React.useCallback((value: string) => {
    setSalaryMin(value);
    setPage(1);
  }, []);

  const handleSalaryMaxChange = React.useCallback((value: string) => {
    setSalaryMax(value);
    setPage(1);
  }, []);

  const handleHideUnknownSalaryChange = React.useCallback((value: boolean) => {
    setHideUnknownSalary(value);
    setPage(1);
  }, []);

  const handleSortChange = React.useCallback((value: SortKey) => {
    setSort(value);
    setPage(1);
  }, []);

  const handleOnlyMyCompanyJobsChange = React.useCallback((value: boolean) => {
    setOnlyMyCompanyJobs(value);
    setPage(1);
  }, []);

  const handleSuggestionClick = React.useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const activeFilterCount =
    (q ? 1 : 0) +
    (selectedLocation ? 1 : 0) +
    selectedLevels.length +
    selectedTypes.length +
    selectedIndustries.length +
    (salaryMin ? 1 : 0) +
    (salaryMax ? 1 : 0) +
    (hideUnknownSalary ? 1 : 0) +
    (onlyMyCompanyJobs ? 1 : 0);

  const clearAll = React.useCallback(() => {
    setQ("");
    setSelectedLocation("");
    setSelectedLevels([]);
    setSelectedTypes([]);
    setSelectedIndustries([]);
    setSalaryMin("");
    setSalaryMax("");
    setHideUnknownSalary(false);
    setOnlyMyCompanyJobs(false);
    setSort("newest");
    setPage(1);
  }, []);

  const activeChips = React.useMemo(
    () =>
      [
        q
          ? {
              label: `"${q}"`,
              onRemove: () => {
                setQ("");
                setPage(1);
              },
            }
          : null,
        selectedLocation
          ? {
              label: selectedLocation,
              onRemove: () => {
                setSelectedLocation("");
                setPage(1);
              },
            }
          : null,
        ...selectedLevels.map((level) => ({
          label: level,
          onRemove: () => {
            setSelectedLevels((previous) =>
              previous.filter((value) => value !== level),
            );
            setPage(1);
          },
        })),
        ...selectedTypes.map((type) => ({
          label: type,
          onRemove: () => {
            setSelectedTypes((previous) =>
              previous.filter((value) => value !== type),
            );
            setPage(1);
          },
        })),
        ...selectedIndustries.map((industry) => ({
          label: industry,
          onRemove: () => {
            setSelectedIndustries((previous) =>
              previous.filter((value) => value !== industry),
            );
            setPage(1);
          },
        })),
        salaryMin
          ? {
              label: `Từ ${salaryMin} Tr`,
              onRemove: () => {
                setSalaryMin("");
                setPage(1);
              },
            }
          : null,
        salaryMax
          ? {
              label: `Đến ${salaryMax} Tr`,
              onRemove: () => {
                setSalaryMax("");
                setPage(1);
              },
            }
          : null,
        hideUnknownSalary
          ? {
              label: "Ẩn lương thỏa thuận",
              onRemove: () => {
                setHideUnknownSalary(false);
                setPage(1);
              },
            }
          : null,
        onlyMyCompanyJobs && employerCompanyName
          ? {
              label: `Job test của ${employerCompanyName}`,
              onRemove: () => {
                setOnlyMyCompanyJobs(false);
                setPage(1);
              },
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; onRemove: () => void }>,
    [
      q,
      selectedLocation,
      selectedLevels,
      selectedTypes,
      selectedIndustries,
      salaryMin,
      salaryMax,
      hideUnknownSalary,
      onlyMyCompanyJobs,
      employerCompanyName,
    ],
  );

  const scrollToAllJobs = React.useCallback(() => {
    if (typeof document === "undefined") return;

    document
      .getElementById("all-jobs-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const sidebar = (
    <JobsFilterSidebar
      activeFilterCount={activeFilterCount}
      employerCompanyName={employerCompanyName}
      onlyMyCompanyJobs={onlyMyCompanyJobs}
      allLocations={allLocations}
      allLevels={allLevels}
      allTypes={allTypes}
      allIndustries={allIndustries}
      selectedLocation={selectedLocation}
      selectedLevels={selectedLevels}
      selectedTypes={selectedTypes}
      selectedIndustries={selectedIndustries}
      salaryMin={salaryMin}
      salaryMax={salaryMax}
      hideUnknownSalary={hideUnknownSalary}
      onClearAll={clearAll}
      onLocationChange={handleLocationChange}
      onToggleLevel={handleToggleLevel}
      onToggleType={handleToggleType}
      onToggleIndustry={handleToggleIndustry}
      onSalaryMinChange={handleSalaryMinChange}
      onSalaryMaxChange={handleSalaryMaxChange}
      onHideUnknownSalaryChange={handleHideUnknownSalaryChange}
      onOnlyMyCompanyJobsChange={handleOnlyMyCompanyJobsChange}
    />
  );

  return (
    <>
      <JobsHero
        q={q}
        selectedLocation={selectedLocation}
        allLocations={allLocations}
        suggestionChips={SUGGESTION_CHIPS}
        onQueryChange={handleQueryChange}
        onLocationChange={handleLocationChange}
        onSuggestionClick={handleSuggestionClick}
        onSearchClick={scrollToAllJobs}
      />

      <main className="mx-auto w-full max-w-368 space-y-10 px-6 pb-24 pt-8 md:px-8 xl:px-10">
        {aiRecommendationsEnabled ? (
          <div className="[content-visibility:auto] [contain-intrinsic-size:320px]">
            <JobsRecommendationSection
              status={recommendationStatus}
              data={recommendationData}
              error={recommendationError}
              onBrowseAll={scrollToAllJobs}
            />
          </div>
        ) : null}

        {employerCompanyName && (
          <div className="rounded-[28px] border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Chế độ test nhà tuyển dụng
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Lọc nhanh các tin public của{" "}
                  <span className="font-bold">{employerCompanyName}</span> mà không
                  làm thay đổi logic của danh sách việc làm bên dưới.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOnlyMyCompanyJobsChange(!onlyMyCompanyJobs)}
                className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-black transition ${
                  onlyMyCompanyJobs
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "border border-blue-200 bg-white text-primary hover:bg-blue-100"
                }`}
              >
                {onlyMyCompanyJobs
                  ? "Đang chỉ hiện job công ty tôi"
                  : "Chỉ hiện job công ty tôi"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start [content-visibility:auto] [contain-intrinsic-size:1400px]">
          <aside className="hidden w-full shrink-0 lg:block lg:w-72 xl:w-80">
            <div className="sticky top-24">{sidebar}</div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {isLoading && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-primary">
                Đang cập nhật danh sách việc làm...
              </div>
            )}

            {fetchError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                Không thể tải dữ liệu việc làm. Vui lòng thử lại sau.
              </div>
            )}

            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:shadow"
              >
                <SlidersHorizontal className="size-4.5" aria-hidden="true" />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <JobsResultsSection
              jobs={visibleJobs}
              filteredCount={filteredCount}
              sort={sort}
              activeChips={activeChips}
              page={page}
              totalPages={totalPages}
              recommendationMap={recommendationMap}
              onSortChange={handleSortChange}
              onClearAll={clearAll}
              onPageChange={setPage}
              onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
              onNextPage={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            />
          </div>
        </div>
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-85 max-w-[88vw] overflow-y-auto bg-white px-5 py-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Bộ lọc</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Điều chỉnh nhanh trước khi xem danh sách việc làm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
                aria-label="Đóng bộ lọc"
              >
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>

            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
