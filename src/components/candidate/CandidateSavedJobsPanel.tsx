"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SavedJobItem = {
  savedAt: string;
  job: {
    id: string;
    title: string;
    company_name: string;
    logo_url?: string | null;
    salary?: string | null;
    location?: string | null;
    requirements: string[];
  };
};

type SavedJobsFilter = "all" | "salary";

export default function CandidateSavedJobsPanel({
  items,
}: {
  items: SavedJobItem[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SavedJobsFilter>("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "salary" && !item.job.salary) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      return (
        item.job.title.toLowerCase().includes(query) ||
        item.job.company_name.toLowerCase().includes(query) ||
        (item.job.location || "").toLowerCase().includes(query)
      );
    });
  }, [filter, items, search]);

  if (items.length === 0) {
    return (
      <section className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_18px_35px_-30px_rgba(15,23,42,0.2)] sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-[28px]">bookmark</span>
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-900">Chưa có việc làm đã lưu</h2>
          <p className="mt-3 text-base font-medium leading-7 text-slate-500">
            Khi bạn đánh dấu một tin tuyển dụng để xem lại sau, danh sách đó sẽ xuất hiện ở đây.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/jobs"
              className="rounded-full bg-primary px-5 py-3 text-sm font-black text-white transition-colors hover:bg-primary/90"
            >
              Tìm việc làm
            </Link>
            <Link
              href="/candidate/jobs/recommended"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
            >
              Xem việc phù hợp
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Danh sách đã lưu
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Tìm nhanh các vị trí bạn đã đánh dấu để quay lại sau.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex gap-2">
              {([
                { id: "all", label: "Tất cả" },
                { id: "salary", label: "Có lương" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    filter === item.id
                      ? "bg-primary text-white shadow-[0_14px_30px_-22px_rgba(37,99,235,0.58)]"
                      : "bg-white text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-65">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo vị trí, công ty, địa điểm"
                className="w-full rounded-[18px] border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_18px_35px_-30px_rgba(15,23,42,0.2)]">
          <p className="text-lg font-black text-slate-900">Không tìm thấy việc đã lưu phù hợp.</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Hãy thử đổi bộ lọc hoặc từ khóa để xem lại các tin đã lưu.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredItems.map((item) => (
            <article
              key={`${item.job.id}-${item.savedAt}`}
              className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-start gap-4">
                {item.job.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.job.logo_url}
                    alt={item.job.company_name}
                    className="size-14 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-500">
                    {item.job.company_name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                        {item.job.company_name}
                      </p>
                      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                        {item.job.title}
                      </h2>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                      {item.job.salary || "Thỏa thuận"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                      {item.job.location || "Remote"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                      Đã lưu {new Date(item.savedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {item.job.requirements.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.job.requirements.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/jobs/${item.job.id}`}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-primary/90"
                    >
                      Xem chi tiết
                    </Link>
                    <Link
                      href="/candidate/jobs/applied"
                      className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
                    >
                      Theo dõi đơn đã nộp
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
