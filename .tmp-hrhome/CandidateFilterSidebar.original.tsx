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
  { value: "all", label: "Tß║Ñt cß║ú" },
  { value: "0-1", label: "0-1 n─âm" },
  { value: "1-3", label: "1-3 n─âm" },
  { value: "3-5", label: "3-5 n─âm" },
  { value: "5+", label: "5+ n─âm" },
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
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Bß╗Ö lß╗ìc ß╗⌐ng vi├¬n</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {activeCount > 0
              ? `${activeCount} bß╗Ö lß╗ìc ─æang ├íp dß╗Ñng`
              : "Lß╗ìc theo kß╗╣ n─âng, kinh nghiß╗çm v├á mß╗⌐c sß║╡n s├áng"}
          </p>
        </div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-black uppercase tracking-[0.18em] text-primary transition hover:underline"
          >
            X├│a lß╗ìc
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <section className="space-y-2.5 border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Kß╗╣ n─âng</h4>
          <div className="flex flex-wrap gap-1.5">
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
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
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

        <section className="space-y-2.5 border-t border-slate-200/70 pt-4">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Kinh nghiß╗çm</h4>
          <div className="space-y-1.5">
            {EXPERIENCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="experience"
                  value={option.value}
                  checked={filters.experience === option.value}
                  onChange={() => onFiltersChange({ ...filters, experience: option.value })}
                  className="size-5 accent-primary"
                />
                <span className="text-sm font-semibold text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2.5 border-t border-slate-200/70 pt-4">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">─Éß╗ïa ─æiß╗âm</h4>
          <select
            value={filters.location}
            onChange={(event) => onFiltersChange({ ...filters, location: event.target.value })}
            aria-label="Chß╗ìn tß╗ënh th├ánh"
            title="Chß╗ìn tß╗ënh th├ánh"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Tß║Ñt cß║ú tß╗ënh/th├ánh</option>
            {allLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-2.5 border-t border-slate-200/70 pt-4">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Mß╗⌐c l╞░╞íng mong muß╗æn (triß╗çu)</h4>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{filters.minSalary}M</span>
              <span>{filters.maxSalary}M+</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minSalary}
              aria-label="Mß╗⌐c l╞░╞íng tß╗æi thiß╗âu"
              title="Mß╗⌐c l╞░╞íng tß╗æi thiß╗âu"
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
              aria-label="Mß╗⌐c l╞░╞íng tß╗æi ─æa"
              title="Mß╗⌐c l╞░╞íng tß╗æi ─æa"
              onChange={(event) => {
                const next = Number(event.target.value);
                onFiltersChange({
                  ...filters,
                  maxSalary: Math.max(next, filters.minSalary),
                });
              }}
              className="mt-1.5 w-full"
            />
          </div>
        </section>

        <section className="space-y-2.5 border-t border-slate-200/70 pt-4">
          <h4 className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Trß║íng th├íi</h4>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.availableNow}
              onChange={(event) =>
                onFiltersChange({ ...filters, availableNow: event.target.checked })
              }
              className="size-5 accent-primary"
            />
            <span className="text-sm font-semibold text-slate-700">Available ngay</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.openToWork}
              onChange={(event) =>
                onFiltersChange({ ...filters, openToWork: event.target.checked })
              }
              className="size-5 accent-primary"
            />
            <span className="text-sm font-semibold text-slate-700">Open to work</span>
          </label>
        </section>
      </div>
    </aside>
  );
}
