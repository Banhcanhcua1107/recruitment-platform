"use client";

import * as React from "react";
import type { Job } from "@/types/job";
import { createClient } from "@/utils/supabase/client";
import { JobsFilterSidebar } from "./components/JobsFilterSidebar";
import { JobsHero } from "./components/JobsHero";
import { JobsRecommendationSection } from "./components/JobsRecommendationSection";
import { JobsResultsSection } from "./components/JobsResultsSection";
import type { SortKey } from "./jobs-page.types";
import {
  filterJobs,
  PAGE_SIZE,
  paginateJobs,
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

export default function JobFiltersClient({ jobs }: { jobs: Job[] }) {
  const allLocations = React.useMemo(() => uniqueValues(jobs, "location"), [jobs]);
  const allLevels = React.useMemo(() => uniqueValues(jobs, "level"), [jobs]);
  const allTypes = React.useMemo(() => uniqueValues(jobs, "employment_type"), [jobs]);
  const allIndustries = React.useMemo(() => uniqueIndustries(jobs), [jobs]);

  const [q, setQ] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState("");
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = React.useState<string[]>([]);
  const [salaryMin, setSalaryMin] = React.useState("");
  const [salaryMax, setSalaryMax] = React.useState("");
  const [hideUnknownSalary, setHideUnknownSalary] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [page, setPage] = React.useState(1);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [employerCompanyName, setEmployerCompanyName] = React.useState("");
  const [onlyMyCompanyJobs, setOnlyMyCompanyJobs] = React.useState(false);

  const {
    status: recommendationStatus,
    data: recommendationData,
    error: recommendationError,
    isAnalyzing,
    isAuthenticated,
    analyzeRecommendations,
  } = useRecommendedJobs();

  React.useEffect(() => {
    let mounted = true;

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

    void loadEmployerCompany();

    return () => {
      mounted = false;
    };
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

  const filtered = React.useMemo(
    () =>
      filterJobs(jobs, {
        q,
        selectedLocation,
        selectedLevels,
        selectedTypes,
        selectedIndustries,
        salaryMin,
        salaryMax,
        hideUnknownSalary,
        sort,
        onlyMyCompanyJobs,
        employerCompanyName,
      }),
    [
      jobs,
      q,
      selectedLocation,
      selectedLevels,
      selectedTypes,
      selectedIndustries,
      salaryMin,
      salaryMax,
      hideUnknownSalary,
      sort,
      onlyMyCompanyJobs,
      employerCompanyName,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = React.useMemo(
    () => paginateJobs(filtered, page, PAGE_SIZE),
    [filtered, page],
  );

  React.useEffect(() => {
    setPage(1);
  }, [
    q,
    selectedLocation,
    selectedLevels,
    selectedTypes,
    selectedIndustries,
    salaryMin,
    salaryMax,
    hideUnknownSalary,
    sort,
    onlyMyCompanyJobs,
  ]);

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
  }, []);

  const activeChips = React.useMemo(
    () =>
      [
        q ? { label: `"${q}"`, onRemove: () => setQ("") } : null,
        selectedLocation
          ? {
              label: selectedLocation,
              onRemove: () => setSelectedLocation(""),
            }
          : null,
        ...selectedLevels.map((level) => ({
          label: level,
          onRemove: () =>
            setSelectedLevels((previous) =>
              previous.filter((value) => value !== level),
            ),
        })),
        ...selectedTypes.map((type) => ({
          label: type,
          onRemove: () =>
            setSelectedTypes((previous) =>
              previous.filter((value) => value !== type),
            ),
        })),
        ...selectedIndustries.map((industry) => ({
          label: industry,
          onRemove: () =>
            setSelectedIndustries((previous) =>
              previous.filter((value) => value !== industry),
            ),
        })),
        salaryMin
          ? { label: `Từ ${salaryMin} Tr`, onRemove: () => setSalaryMin("") }
          : null,
        salaryMax
          ? { label: `Đến ${salaryMax} Tr`, onRemove: () => setSalaryMax("") }
          : null,
        hideUnknownSalary
          ? {
              label: "Ẩn lương thỏa thuận",
              onRemove: () => setHideUnknownSalary(false),
            }
          : null,
        onlyMyCompanyJobs && employerCompanyName
          ? {
              label: `Job test của ${employerCompanyName}`,
              onRemove: () => setOnlyMyCompanyJobs(false),
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
      onLocationChange={setSelectedLocation}
      onToggleLevel={(value) =>
        setSelectedLevels((previous) => toggleArr(previous, value))
      }
      onToggleType={(value) =>
        setSelectedTypes((previous) => toggleArr(previous, value))
      }
      onToggleIndustry={(value) =>
        setSelectedIndustries((previous) => toggleArr(previous, value))
      }
      onSalaryMinChange={setSalaryMin}
      onSalaryMaxChange={setSalaryMax}
      onHideUnknownSalaryChange={setHideUnknownSalary}
      onOnlyMyCompanyJobsChange={setOnlyMyCompanyJobs}
    />
  );

  return (
    <>
      <JobsHero
        q={q}
        selectedLocation={selectedLocation}
        allLocations={allLocations}
        suggestionChips={SUGGESTION_CHIPS}
        onQueryChange={setQ}
        onLocationChange={setSelectedLocation}
        onSuggestionClick={setQ}
        onSearchClick={scrollToAllJobs}
      />

      <main className="mx-auto w-full max-w-310 space-y-10 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <JobsRecommendationSection
          status={recommendationStatus}
          data={recommendationData}
          error={recommendationError}
          isAnalyzing={isAnalyzing}
          isAuthenticated={isAuthenticated}
          onAnalyze={analyzeRecommendations}
          onBrowseAll={scrollToAllJobs}
        />

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
                onClick={() => setOnlyMyCompanyJobs((previous) => !previous)}
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

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="hidden w-full shrink-0 lg:block lg:w-80">
            <div className="sticky top-24">{sidebar}</div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:shadow"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <JobsResultsSection
              jobs={paged}
              filteredCount={filtered.length}
              sort={sort}
              activeChips={activeChips}
              page={page}
              totalPages={totalPages}
              onSortChange={setSort}
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
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
