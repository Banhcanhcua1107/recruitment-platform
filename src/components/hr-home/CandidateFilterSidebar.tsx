export type CandidateExperienceFilter = "all" | "0-1" | "1-3" | "3-5" | "5+";

export interface CandidateFilters {
  keyword: string;
  location: string;
  experience: CandidateExperienceFilter;
  skills: string[];
  minSalary: number;
  maxSalary: number;
  availableNow: boolean;
  openToWork: boolean;
  sort: "latest" | "best_match";
}

interface CandidateFilterSidebarProps {
  filters: CandidateFilters;
  allLocations: string[];
  skillOptions: string[];
  onFiltersChange: (next: CandidateFilters) => void;
  onClear: () => void;
}

const EXPERIENCE_OPTIONS: Array<{ value: CandidateExperienceFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "0-1", label: "0-1 năm" },
  { value: "1-3", label: "1-3 năm" },
  { value: "3-5", label: "3-5 năm" },
  { value: "5+", label: "5+ năm" },
];

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function CandidateFilterSidebar({
  filters,
  allLocations,
  skillOptions,
  onFiltersChange,
  onClear,
}: CandidateFilterSidebarProps) {
  const activeCount =
    (filters.keyword.trim() ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.experience !== "all" ? 1 : 0) +
    filters.skills.length +
    (filters.minSalary > 0 ? 1 : 0) +
    (filters.maxSalary < 100 ? 1 : 0) +
    (filters.availableNow ? 1 : 0) +
    (filters.openToWork ? 1 : 0);

  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Bộ lọc ứng viên</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {activeCount > 0
              ? `${activeCount} bộ lọc đang áp dụng`
              : "Lọc theo kỹ năng, kinh nghiệm và mức sẵn sàng"}
          </p>
        </div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-black uppercase tracking-[0.18em] text-primary transition hover:underline"
          >
            Xóa lọc
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        <section className="space-y-3 border-t border-slate-200/70 pt-6 first:border-t-0 first:pt-0">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Kỹ năng</h4>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((skill) => {
              const selected = filters.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      skills: toggleArrayValue(filters.skills, skill),
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200/70 pt-6">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Kinh nghiệm</h4>
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="experience"
                  value={option.value}
                  checked={filters.experience === option.value}
                  onChange={() => onFiltersChange({ ...filters, experience: option.value })}
                  className="size-4 border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-slate-600">{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200/70 pt-6">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Địa điểm</h4>
          <select
            value={filters.location}
            onChange={(event) => onFiltersChange({ ...filters, location: event.target.value })}
            aria-label="Chọn tỉnh thành"
            title="Chọn tỉnh thành"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Tất cả tỉnh/thành</option>
            {allLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3 border-t border-slate-200/70 pt-6">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Mức lương mong muốn (triệu)</h4>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{filters.minSalary}M</span>
              <span>{filters.maxSalary}M+</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minSalary}
              aria-label="Mức lương tối thiểu"
              title="Mức lương tối thiểu"
              onChange={(event) => {
                const next = Number(event.target.value);
                onFiltersChange({
                  ...filters,
                  minSalary: Math.min(next, filters.maxSalary),
                });
              }}
              className="w-full"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.maxSalary}
              aria-label="Mức lương tối đa"
              title="Mức lương tối đa"
              onChange={(event) => {
                const next = Number(event.target.value);
                onFiltersChange({
                  ...filters,
                  maxSalary: Math.max(next, filters.minSalary),
                });
              }}
              className="mt-2 w-full"
            />
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200/70 pt-6">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Trạng thái</h4>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={filters.availableNow}
              onChange={(event) =>
                onFiltersChange({ ...filters, availableNow: event.target.checked })
              }
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-slate-600">Available ngay</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={filters.openToWork}
              onChange={(event) =>
                onFiltersChange({ ...filters, openToWork: event.target.checked })
              }
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-slate-600">Open to work</span>
          </label>
        </section>
      </div>
    </aside>
  );
}
