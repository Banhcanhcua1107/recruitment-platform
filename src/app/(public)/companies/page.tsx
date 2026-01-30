"use client";
import React from "react";
import CompanyCard from "@/components/companies/CompanyCard";

type Company = {
  name: string;
  industry?: string;
  location?: string;
  size?: string;
  jobCount: number;
  logoUrl?: string;
};

export default function CompaniesPage() {
  const [keyword, setKeyword] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Company[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  async function load() {
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
      setItems(data.items);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, page]);

  return (
    <main className="bg-[#f6f7f8] min-h-screen">
      {/* HERO */}
      <section className="bg-white border-b border-slate-100 pt-16 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto text-center">
          {/* ... */}
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100">
            <div className="flex-1 flex items-center px-6 gap-4 bg-slate-50 rounded-2xl">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">business</span>
              <input
                value={keyword}
                onChange={(e) => {
                  setPage(1);
                  setKeyword(e.target.value);
                }}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400"
                placeholder="Nhập tên công ty..."
              />
            </div>
            <button
              onClick={() => load()}
              className="h-16 px-12 bg-primary hover:bg-primary-hover text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-[1360px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full text-center text-slate-400 font-bold">Đang tải...</div>
          ) : (
            items.map((c) => (
              <CompanyCard
                key={c.name}
                name={c.name}
                industry={c.industry ?? "Chưa cập nhật"}
                location={c.location ?? "Chưa cập nhật"}
                size={c.size ?? "Chưa cập nhật"}
                jobCount={c.jobCount}
                // nếu CompanyCard có support logo:
                // logoUrl={c.logoUrl}
              />
            ))
          )}
        </div>

        {/* pagination */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Trước
          </button>
          <div className="font-bold text-slate-500">{page} / {totalPages}</div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </section>
    </main>
  );
}
