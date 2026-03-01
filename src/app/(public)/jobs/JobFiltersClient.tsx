"use client";

import React from "react";
import Link from "next/link";
import type { Job } from "@/types/job";

// ────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────
function normalize(s: string) {
  return s.toLowerCase().trim();
}

/** Parse Vietnamese salary string -> [min, max] in millions, or null */
function parseSalary(s: string): { min: number; max: number } | null {
  if (!s) return null;
  if (/cạnh tranh|thỏa thuận|thương lượng/i.test(s)) return null;

  const nums = [...s.matchAll(/([\d]+[,.]?[\d]*)/g)].map((m) =>
    parseFloat(m[1].replace(",", "."))
  );

  if (nums.length === 0) return null;
  if (nums.length === 1) {
    if (/trên/i.test(s)) return { min: nums[0], max: Infinity };
    if (/dưới/i.test(s)) return { min: 0, max: nums[0] };
    return { min: nums[0], max: nums[0] };
  }
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function uniqueValues(jobs: Job[], key: keyof Job): string[] {
  const set = new Set<string>();
  for (const j of jobs) {
    const v = j[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}

function uniqueIndustries(jobs: Job[]): string[] {
  const set = new Set<string>();
  for (const j of jobs) {
    for (const ind of j.industry ?? []) {
      if (ind) set.add(ind);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}

type SortKey = "newest" | "az" | "salary-high" | "salary-low";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "az", label: "A \u2192 Z" },
  { value: "salary-high", label: "Lương cao \u2192 thấp" },
  { value: "salary-low", label: "Lương thấp \u2192 cao" },
];

const SUGGESTION_CHIPS = ["Remote", "Marketing", "IT Software", "Ngân hàng", "Kế toán", "Bán hàng"];

const PAGE_SIZE = 12;

// ────────────────────────────────────────────────
//  MAIN COMPONENT
// ────────────────────────────────────────────────
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

  const activeFilterCount =
    (q ? 1 : 0) +
    (selectedLocation ? 1 : 0) +
    selectedLevels.length +
    selectedTypes.length +
    selectedIndustries.length +
    (salaryMin ? 1 : 0) +
    (salaryMax ? 1 : 0) +
    (hideUnknownSalary ? 1 : 0);

  function clearAll() {
    setQ("");
    setSelectedLocation("");
    setSelectedLevels([]);
    setSelectedTypes([]);
    setSelectedIndustries([]);
    setSalaryMin("");
    setSalaryMax("");
    setHideUnknownSalary(false);
    setSort("newest");
  }

  function toggleArr(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  // Filtered + sorted
  const filtered = React.useMemo(() => {
    let list = [...jobs];

    if (q) {
      const n = normalize(q);
      list = list.filter(
        (j) =>
          normalize(j.title).includes(n) ||
          normalize(j.company_name).includes(n) ||
          normalize(j.location).includes(n) ||
          (j.industry ?? []).some((ind) => normalize(ind).includes(n))
      );
    }

    if (selectedLocation) {
      list = list.filter((j) => j.location === selectedLocation);
    }

    if (selectedLevels.length > 0) {
      list = list.filter((j) => j.level && selectedLevels.includes(j.level));
    }

    if (selectedTypes.length > 0) {
      list = list.filter((j) => j.employment_type && selectedTypes.includes(j.employment_type));
    }

    if (selectedIndustries.length > 0) {
      list = list.filter((j) =>
        (j.industry ?? []).some((ind) => selectedIndustries.includes(ind))
      );
    }

    const sMin = salaryMin ? parseFloat(salaryMin) : null;
    const sMax = salaryMax ? parseFloat(salaryMax) : null;
    if (sMin !== null || sMax !== null || hideUnknownSalary) {
      list = list.filter((j) => {
        const parsed = parseSalary(j.salary);
        if (!parsed) return !hideUnknownSalary;
        if (sMin !== null && parsed.max < sMin) return false;
        if (sMax !== null && parsed.min > sMax) return false;
        return true;
      });
    }

    if (sort === "az") {
      list.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (sort === "salary-high" || sort === "salary-low") {
      list.sort((a, b) => {
        const pa = parseSalary(a.salary);
        const pb = parseSalary(b.salary);
        const va = pa ? (pa.max === Infinity ? pa.min : (pa.min + pa.max) / 2) : -1;
        const vb = pb ? (pb.max === Infinity ? pb.min : (pb.min + pb.max) / 2) : -1;
        return sort === "salary-high" ? vb - va : va - vb;
      });
    }

    return list;
  }, [jobs, q, selectedLocation, selectedLevels, selectedTypes, selectedIndustries, salaryMin, salaryMax, hideUnknownSalary, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [q, selectedLocation, selectedLevels, selectedTypes, selectedIndustries, salaryMin, salaryMax, hideUnknownSalary, sort]);

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (q) activeChips.push({ label: `"${q}"`, onRemove: () => setQ("") });
  if (selectedLocation) activeChips.push({ label: selectedLocation, onRemove: () => setSelectedLocation("") });
  for (const l of selectedLevels) activeChips.push({ label: l, onRemove: () => setSelectedLevels((p) => p.filter((v) => v !== l)) });
  for (const t of selectedTypes) activeChips.push({ label: t, onRemove: () => setSelectedTypes((p) => p.filter((v) => v !== t)) });
  for (const ind of selectedIndustries) activeChips.push({ label: ind, onRemove: () => setSelectedIndustries((p) => p.filter((v) => v !== ind)) });
  if (salaryMin) activeChips.push({ label: `Từ ${salaryMin} Tr`, onRemove: () => setSalaryMin("") });
  if (salaryMax) activeChips.push({ label: `Đến ${salaryMax} Tr`, onRemove: () => setSalaryMax("") });
  if (hideUnknownSalary) activeChips.push({ label: "Ẩn lương thỏa thuận", onRemove: () => setHideUnknownSalary(false) });

  // ────────────────────────────────────────────
  //  SIDEBAR CONTENT (shared desktop + drawer)
  // ────────────────────────────────────────────
  const sidebarContent = (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">tune</span>
          Bộ lọc
        </h3>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-sm font-bold text-primary hover:underline">
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Keyword */}
      <FilterSection title="Từ khóa" icon="search">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 text-sm font-bold placeholder:text-slate-400 transition-all"
            placeholder="Chức danh, công ty, địa điểm..."
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </FilterSection>

      {/* Quick chips */}
      <FilterSection title="Gợi ý nhanh" icon="local_fire_department">
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setQ(chip)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all ${
                normalize(q) === normalize(chip)
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection title="Địa điểm" icon="location_on">
        <select
          aria-label="Chọn địa điểm"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 text-sm font-bold text-slate-700 transition-all cursor-pointer"
        >
          <option value="">Tất cả địa điểm</option>
          {allLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </FilterSection>

      {/* Level */}
      {allLevels.length > 0 && (
        <FilterSection title="Cấp bậc" icon="badge">
          <div className="space-y-2.5">
            {allLevels.map((lvl) => (
              <label key={lvl} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(lvl)}
                  onChange={() => setSelectedLevels((p) => toggleArr(p, lvl))}
                  className="size-4.5 rounded-md border-slate-300 text-primary focus:ring-primary/30 transition-all"
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">{lvl}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Employment type */}
      {allTypes.length > 0 && (
        <FilterSection title="Hình thức" icon="work">
          <div className="space-y-2.5">
            {allTypes.map((t) => (
              <label key={t} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t)}
                  onChange={() => setSelectedTypes((p) => toggleArr(p, t))}
                  className="size-4.5 rounded-md border-slate-300 text-primary focus:ring-primary/30 transition-all"
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">{t}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Industry */}
      {allIndustries.length > 0 && (
        <IndustryFilter
          industries={allIndustries}
          selected={selectedIndustries}
          onToggle={(ind) => setSelectedIndustries((p) => toggleArr(p, ind))}
        />
      )}

      {/* Salary range */}
      <FilterSection title="Mức lương (triệu VND)" icon="payments">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 text-sm font-bold text-center placeholder:text-slate-400 transition-all"
            placeholder="Từ"
          />
          <span className="text-slate-400 font-bold">&ndash;</span>
          <input
            type="number"
            min={0}
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 text-sm font-bold text-center placeholder:text-slate-400 transition-all"
            placeholder="Đến"
          />
        </div>
        <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={hideUnknownSalary}
            onChange={(e) => setHideUnknownSalary(e.target.checked)}
            className="size-4.5 rounded-md border-slate-300 text-primary focus:ring-primary/30 transition-all"
          />
          <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors">
            Ẩn &quot;Lương cạnh tranh / thỏa thuận&quot;
          </span>
        </label>
      </FilterSection>

      {/* Sort */}
      <FilterSection title="Sắp xếp" icon="sort">
        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 text-sm font-bold text-slate-700 transition-all cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterSection>

      {/* Promo Banner */}
      <div className="rounded-2xl bg-linear-to-br from-primary to-indigo-800 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-4 -right-4 opacity-10">
          <span className="material-symbols-outlined text-[100px]">description</span>
        </div>
        <h4 className="font-black text-lg mb-2 relative z-10">Tạo CV Chuyên nghiệp</h4>
        <p className="text-sm text-blue-100 mb-4 relative z-10 leading-relaxed">
          Tăng 80% cơ hội được gọi phỏng vấn với mẫu CV chuẩn.
        </p>
        <Link
          href="/candidate/cv-builder"
          className="block w-full py-3 bg-white text-primary font-black text-sm rounded-xl hover:bg-blue-50 transition-all shadow-lg relative z-10 text-center"
        >
          Tạo CV Ngay
        </Link>
      </div>
    </div>
  );

  // ────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────
  return (
    <>
      {/* HERO */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 text-center lg:text-left relative z-10">
          <h1 className="text-slate-900 text-4xl lg:text-5xl font-black leading-tight mb-4 tracking-tight">
            Tìm kiếm công việc <span className="text-primary relative inline-block">
              mơ ước
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="transparent" />
              </svg>
            </span>
          </h1>
          <p className="text-slate-500 text-lg lg:text-xl font-bold mb-10 max-w-2xl">
            Khám phá hàng ngàn cơ hội nghề nghiệp tốt nhất và ứng tuyển ngay hôm nay.
          </p>

          {/* hero search bar */}
          <div className="w-full max-w-5xl flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
            <div className="flex-1 relative flex items-center px-6 gap-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-primary text-2xl font-bold">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400 outline-none"
                placeholder="Chức danh, từ khóa, công ty..."
              />
            </div>
            <div className="flex-1 relative flex items-center px-6 gap-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-primary text-2xl font-bold">location_on</span>
              <select
                aria-label="Chọn địa điểm"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold text-slate-700 cursor-pointer outline-none appearance-none"
              >
                <option value="">Tất cả địa điểm</option>
                {allLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-slate-400 absolute right-6 pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* chips */}
          <div className="mt-8 flex flex-wrap gap-x-3 gap-y-3 justify-center lg:justify-start">
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest hidden lg:block lg:self-center">Gợi ý:</span>
            {SUGGESTION_CHIPS.map((tag) => (
              <button
                key={tag}
                onClick={() => setQ(tag)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  normalize(q) === normalize(tag)
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "bg-slate-50 border border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN AREA */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-10">
        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-sm shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="size-5 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-8">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
              {sidebarContent}
            </div>
          </aside>

          {/* JOB LIST */}
          <section className="flex-1 min-w-0">
            {/* toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-base font-bold text-slate-500">
                Hiển thị{" "}
                <span className="text-slate-900 font-black">{filtered.length}</span> việc làm phù hợp
              </p>
              <div className="flex items-center gap-3">
                <label htmlFor="sort-main" className="text-sm text-slate-400 font-bold">
                  Sắp xếp:
                </label>
                <select
                  id="sort-main"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-black text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary/30 cursor-pointer transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* active filter chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {activeChips.map((chip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-black"
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      className="size-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAll}
                  className="text-xs font-bold text-slate-400 hover:text-primary underline ml-1"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* list */}
            {paged.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[28px] border border-slate-100 shadow-sm">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                </div>
                <p className="text-slate-600 font-black text-lg">Không tìm thấy việc làm phù hợp</p>
                <p className="text-slate-400 font-medium text-sm mt-1 mb-6">Hãy thử thay đổi từ khóa hoặc xóa bớt bộ lọc.</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="px-6 py-2.5 bg-primary/10 text-primary font-black text-sm hover:bg-primary/20 transition-colors rounded-xl">
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paged.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-11 rounded-xl border-2 border-slate-100 flex items-center justify-center hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "dots")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("dots");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "dots" ? (
                      <span key={`d${i}`} className="text-slate-400 font-bold px-1">&hellip;</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`size-11 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                          page === p
                            ? "bg-primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5"
                            : "border-2 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="size-11 rounded-xl border-2 border-slate-100 flex items-center justify-center hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[320px] max-w-[85vw] bg-white shadow-2xl overflow-y-auto animate-slide-in-left">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Bộ lọc
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="size-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">{sidebarContent}</div>
          </div>
        </div>
      )}

      {/* slide-in animation */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

// ────────────────────────────────────────────────
//  SUB-COMPONENTS
// ────────────────────────────────────────────────

function FilterSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 border-t border-slate-100 first:border-t-0 first:pt-0">
      <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
        <span className="material-symbols-outlined text-base">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function IndustryFilter({ industries, selected, onToggle }: { industries: string[]; selected: string[]; onToggle: (ind: string) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? industries : industries.slice(0, 5);

  return (
    <FilterSection title="Ngành nghề" icon="category">
      <div className="space-y-2.5">
        {visible.map((ind) => (
          <label key={ind} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(ind)}
              onChange={() => onToggle(ind)}
              className="size-4.5 rounded-md border-slate-300 text-primary focus:ring-primary/30 transition-all"
            />
            <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors line-clamp-1">{ind}</span>
          </label>
        ))}
      </div>
      {industries.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 text-xs font-black text-primary hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">{expanded ? "expand_less" : "expand_more"}</span>
          {expanded ? "Thu gọn" : `Xem thêm ${industries.length - 5} ngành`}
        </button>
      )}
    </FilterSection>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col h-full bg-white rounded-[20px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
    >
      <div className="h-40 bg-slate-100 overflow-hidden relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={job.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="flex-1 p-5 flex flex-col relative">
        <div className="absolute -top-10 right-5 size-14 rounded-2xl border-4 border-white bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={job.logo_url} alt="" className="w-full h-full object-contain p-1" />
        </div>

        <div className="pr-16 mb-3">
          <h3 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {job.title}
          </h3>
          <p className="text-sm font-bold text-slate-500 mt-1 line-clamp-1">{job.company_name}</p>
        </div>

        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary font-black text-sm rounded-lg border border-primary/10">
            {job.salary}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 truncate max-w-full">
              <span className="material-symbols-outlined text-base">location_on</span>
              <span className="truncate">{job.location}</span>
            </span>
            {job.deadline && (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 truncate max-w-full">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span className="truncate">{job.deadline}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {job.employment_type && (
              <span className="px-2.5 py-1 rounded-md bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border border-slate-100">
                {job.employment_type}
              </span>
            )}
            {job.level && (
              <span className="px-2.5 py-1 rounded-md bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border border-slate-100">
                {job.level}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
