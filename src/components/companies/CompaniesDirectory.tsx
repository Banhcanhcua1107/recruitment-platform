"use client";

import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import CompanyCard from "@/components/companies/CompanyCard";

type Company = {
  slug: string;
  name: string;
  industry?: string[] | string | null;
  location?: string | null;
  size?: string | null;
  jobCount: number;
  logoUrl?: string | null;
};

type CompaniesResponse = {
  items?: Company[];
  total?: number;
  totalPages?: number;
};

interface CompaniesDirectoryProps {
  initialItems: Company[];
  initialTotal: number;
  initialTotalPages: number;
}

const PAGE_LIMIT = 12;

function createCacheKey(keyword: string, page: number) {
  return `${keyword.trim().toLowerCase()}::${page}`;
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col items-center rounded-3xl border border-slate-100 bg-white p-8 animate-pulse">
      <div className="mb-6 size-24 rounded-2xl bg-slate-100" />
      <div className="mb-3 h-5 w-3/4 rounded-lg bg-slate-100" />
      <div className="mb-4 h-4 w-1/2 rounded-lg bg-slate-50" />
      <div className="mb-6 flex gap-4">
        <div className="h-3 w-20 rounded bg-slate-50" />
        <div className="h-3 w-20 rounded bg-slate-50" />
      </div>
      <div className="mt-auto w-full border-t border-slate-100 pt-5">
        <div className="h-12 w-full rounded-2xl bg-slate-50" />
      </div>
    </div>
  );
}

export function CompaniesDirectory({
  initialItems,
  initialTotal,
  initialTotalPages,
}: CompaniesDirectoryProps) {
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(
    new Map<string, CompaniesResponse>([
      [
        createCacheKey("", 1),
        {
          items: initialItems,
          total: initialTotal,
          totalPages: initialTotalPages,
        },
      ],
    ])
  );

  useEffect(() => {
    const cacheKey = createCacheKey(deferredKeyword, page);
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setItems(cached.items ?? []);
      setTotalPages(cached.totalPages ?? 1);
      setTotal(cached.total ?? 0);
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const qs = new URLSearchParams({
          q: deferredKeyword,
          page: String(page),
          limit: String(PAGE_LIMIT),
          sort: "jobs_desc",
        });

        const res = await fetch(`/api/companies?${qs.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Khong the tai danh sach cong ty");
        }

        const data = (await res.json()) as CompaniesResponse;

        if (isCancelled) {
          return;
        }

        cacheRef.current.set(cacheKey, data);
        setItems(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      } catch (error) {
        if ((error as Error).name === "AbortError" || isCancelled) {
          return;
        }

        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [deferredKeyword, page]);

  return (
    <main className="min-h-[100dvh] bg-[#f6f7f8]">
      <section className="relative overflow-hidden border-b border-slate-100 bg-white px-6 pb-12 pt-16">
        <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[700px] translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[1360px] text-center">
          <h1 className="mb-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            Khám phá <span className="text-primary">công ty hàng đầu</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg font-bold text-slate-500">
            Tìm hiểu về môi trường làm việc và cơ hội nghề nghiệp.
          </p>

          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] md:flex-row">
            <div className="flex flex-1 items-center gap-4 rounded-2xl bg-slate-50 px-6">
              <span className="material-symbols-outlined text-2xl text-primary">business</span>
              <input
                value={keyword}
                onChange={(event) => {
                  setPage(1);
                  setKeyword(event.target.value);
                }}
                className="h-14 w-full border-none bg-transparent text-lg font-bold outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder="Nhập tên công ty..."
              />
            </div>
            <button
              type="button"
              onClick={() => setKeyword((currentValue) => currentValue.trim())}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-10 text-lg font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-95 hover:bg-primary-hover"
            >
              <span className="material-symbols-outlined text-xl">search</span>
              Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-base font-bold text-slate-500">
            Hiển thị <span className="font-black text-slate-900">{total}</span> công ty
          </p>
          {loading && items.length > 0 ? (
            <span className="text-sm font-semibold text-slate-400">Đang cập nhật dữ liệu...</span>
          ) : null}
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white py-20 text-center">
            <span className="material-symbols-outlined mb-4 block text-5xl text-slate-200">
              search_off
            </span>
            <p className="text-lg font-black text-slate-600">Không tìm thấy công ty nào</p>
            <p className="mt-1 text-sm font-medium text-slate-400">Hãy thử từ khóa khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((company) => (
              <CompanyCard
                key={company.slug}
                slug={company.slug}
                name={company.name}
                industry={
                  Array.isArray(company.industry)
                    ? company.industry.join(", ")
                    : company.industry ?? "Chưa cập nhật"
                }
                location={company.location ?? "Chưa cập nhật"}
                size={company.size ?? "Chưa cập nhật"}
                jobCount={company.jobCount}
                logoUrl={company.logoUrl}
              />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-slate-100 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((currentPage) => {
                return (
                  currentPage === 1 ||
                  currentPage === totalPages ||
                  Math.abs(currentPage - page) <= 1
                );
              })
              .reduce<(number | "dots")[]>((accumulator, currentPage, index, array) => {
                if (index > 0 && currentPage - (array[index - 1] as number) > 1) {
                  accumulator.push("dots");
                }

                accumulator.push(currentPage);
                return accumulator;
              }, [])
              .map((value, index) =>
                value === "dots" ? (
                  <span key={`dots-${index}`} className="px-1 font-bold text-slate-400">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPage(value)}
                    className={`flex size-11 items-center justify-center rounded-xl text-sm font-black transition-all ${
                      page === value
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "border-2 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {value}
                  </button>
                )
              )}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-slate-100 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
