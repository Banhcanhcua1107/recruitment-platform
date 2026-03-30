"use client";

import Link from "next/link";
import * as React from "react";

interface JobsFilterSidebarProps {
  activeFilterCount: number;
  employerCompanyName: string;
  onlyMyCompanyJobs: boolean;
  allLocations: string[];
  allLevels: string[];
  allTypes: string[];
  allIndustries: string[];
  selectedLocation: string;
  selectedLevels: string[];
  selectedTypes: string[];
  selectedIndustries: string[];
  salaryMin: string;
  salaryMax: string;
  hideUnknownSalary: boolean;
  onClearAll: () => void;
  onLocationChange: (value: string) => void;
  onToggleLevel: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleIndustry: (value: string) => void;
  onSalaryMinChange: (value: string) => void;
  onSalaryMaxChange: (value: string) => void;
  onHideUnknownSalaryChange: (value: boolean) => void;
  onOnlyMyCompanyJobsChange: (value: boolean) => void;
}

function SidebarBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-200/70 pt-6 first:border-t-0 first:pt-0">
      <h4 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function JobsFilterSidebar({
  activeFilterCount,
  employerCompanyName,
  onlyMyCompanyJobs,
  allLocations,
  allLevels,
  allTypes,
  allIndustries,
  selectedLocation,
  selectedLevels,
  selectedTypes,
  selectedIndustries,
  salaryMin,
  salaryMax,
  hideUnknownSalary,
  onClearAll,
  onLocationChange,
  onToggleLevel,
  onToggleType,
  onToggleIndustry,
  onSalaryMinChange,
  onSalaryMaxChange,
  onHideUnknownSalaryChange,
  onOnlyMyCompanyJobsChange,
}: JobsFilterSidebarProps) {
  const [showAllIndustries, setShowAllIndustries] = React.useState(false);
  const visibleIndustries = showAllIndustries
    ? allIndustries
    : allIndustries.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-slate-100/90 p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Bộ lọc</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {activeFilterCount > 0
                ? `${activeFilterCount} bộ lọc đang áp dụng`
                : "Thu hẹp kết quả theo nhu cầu của bạn"}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-black uppercase tracking-[0.18em] text-primary transition hover:underline"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="space-y-6">
          {employerCompanyName && (
            <SidebarBlock title="Chế độ test">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={onlyMyCompanyJobs}
                  onChange={(event) =>
                    onOnlyMyCompanyJobsChange(event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold leading-relaxed text-slate-600">
                  Chỉ hiện job test của công ty tôi
                  <span className="mt-1 block text-xs font-medium text-slate-400">
                    {employerCompanyName}
                  </span>
                </span>
              </label>
            </SidebarBlock>
          )}

          <SidebarBlock title="Địa điểm">
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(event) => onLocationChange(event.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Tất cả tỉnh thành</option>
                {allLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                expand_more
              </span>
            </div>
          </SidebarBlock>

          {allLevels.length > 0 && (
            <SidebarBlock title="Cấp bậc">
              <div className="space-y-3">
                {allLevels.map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(level)}
                      onChange={() => onToggleLevel(level)}
                      className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-600">
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </SidebarBlock>
          )}

          <SidebarBlock title="Mức lương (triệu VND)">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(event) => onSalaryMinChange(event.target.value)}
                  placeholder="Từ"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                />
                <input
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(event) => onSalaryMaxChange(event.target.value)}
                  placeholder="Đến"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={hideUnknownSalary}
                  onChange={(event) =>
                    onHideUnknownSalaryChange(event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium leading-relaxed text-slate-500">
                  Ẩn các tin có mức lương cạnh tranh / thỏa thuận
                </span>
              </label>
            </div>
          </SidebarBlock>

          {allTypes.length > 0 && (
            <SidebarBlock title="Loại hình">
              <div className="flex flex-wrap gap-2">
                {allTypes.map((type) => {
                  const selected = selectedTypes.includes(type);

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onToggleType(type)}
                      className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                        selected
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-white text-slate-600 hover:bg-blue-50 hover:text-primary"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </SidebarBlock>
          )}

          {allIndustries.length > 0 && (
            <SidebarBlock title="Ngành nghề">
              <div className="space-y-3">
                {visibleIndustries.map((industry) => (
                  <label
                    key={industry}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(industry)}
                      onChange={() => onToggleIndustry(industry)}
                      className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-600">
                      {industry}
                    </span>
                  </label>
                ))}
              </div>

              {allIndustries.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllIndustries((previous) => !previous)}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-primary transition hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showAllIndustries ? "expand_less" : "expand_more"}
                  </span>
                  {showAllIndustries
                    ? "Thu gọn"
                    : `Xem thêm ${allIndustries.length - 6} ngành`}
                </button>
              )}
            </SidebarBlock>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 to-primary p-6 text-white shadow-xl shadow-blue-500/20">
        <span
          className="material-symbols-outlined mb-4 inline-flex rounded-2xl bg-white/20 p-3 text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          description
        </span>
        <h4 className="text-lg font-black">Tạo CV chuyên nghiệp</h4>
        <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100">
          Nâng cao tỷ lệ trúng tuyển với mẫu CV chuẩn ATS và dữ liệu hồ sơ rõ
          ràng hơn cho hệ thống gợi ý.
        </p>
        <Link
          href="/candidate/cv-builder"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white text-sm font-black text-primary transition hover:bg-blue-50"
        >
          Thiết kế CV ngay
        </Link>
      </div>
    </div>
  );
}
