"use client";
import React from "react";
import CompanyCard from "@/components/companies/CompanyCard";

type Company = {
  slug: string;
  name: string;
  industry?: string;
  location?: string;
  size?: string;
  jobCount: number;
  logoUrl?: string | null;
};

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 flex flex-col items-center animate-pulse h-full">
      <div className="size-24 rounded-2xl bg-slate-100 mb-6" />
      <div className="h-5 w-3/4 bg-slate-100 rounded-lg mb-3" />
      <div className="h-4 w-1/2 bg-slate-50 rounded-lg mb-4" />
      <div className="flex gap-4 mb-6">
        <div className="h-3 w-20 bg-slate-50 rounded" />
        <div className="h-3 w-20 bg-slate-50 rounded" />
      </div>
      <div className="w-full mt-auto pt-5 border-t border-slate-100">
        <div className="h-12 w-full bg-slate-50 rounded-2xl" />
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const [keyword, setKeyword] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Company[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q: keyword,
        page: String(page),
        limit: "12",
        sort: "jobs_desc",
      });
      const res = await fetch(`/api/companies?${qs.toString()}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [keyword, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="bg-[#f6f7f8] min-h-screen">
      {/* HERO */}
      <section className="bg-white border-b border-slate-100 pt-16 pb-12 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="max-w-[1360px] mx-auto text-center relative z-10">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">
            Khám phá <span className="text-primary">công ty hàng đầu</span>
          </h1>
          <p className="text-slate-500 text-lg font-bold mb-10 max-w-xl mx-auto">
            Tìm hiểu về môi trường làm việc và cơ hội nghề nghiệp.
          </p>

          <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100">
            <div className="flex-1 flex items-center px-6 gap-4 bg-slate-50 rounded-2xl">
              <span className="material-symbols-outlined text-primary text-2xl">business</span>
              <input
                value={keyword}
                onChange={(e) => {
                  setPage(1);
                  setKeyword(e.target.value);
                }}
                className="w-full h-14 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400 outline-none"
                placeholder="Nhập tên công ty..."
              />
            </div>
            <button
              onClick={() => load()}
              className="h-14 px-10 bg-primary hover:bg-primary-hover text-white text-lg font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">search</span>
              Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-[1360px] mx-auto px-6 py-12">
        {/* toolbar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-base font-bold text-slate-500">
            Hiển thị <span className="text-slate-900 font-black">{total}</span> công ty
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">search_off</span>
            <p className="text-slate-600 font-black text-lg">Không tìm thấy công ty nào</p>
            <p className="text-slate-400 font-medium text-sm mt-1">Hãy thử từ khóa khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((c) => (
              <CompanyCard
                key={c.slug}
                slug={c.slug}
                name={c.name}
                industry={c.industry ?? "Chưa cập nhật"}
                location={c.location ?? "Chưa cập nhật"}
                size={c.size ?? "Chưa cập nhật"}
                jobCount={c.jobCount}
                logoUrl={c.logoUrl}
              />
            ))}
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
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
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
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
    </main>
  );
}
