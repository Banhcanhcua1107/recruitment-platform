"use client";

import React from "react";
import JobCard from "@/components/jobs/JobCard";
import FilterSidebar from "@/components/jobs/FilterSidebar";

type Job = {
  id: number;
  title: string;
  company_name: string;
  logo_url: string;
  salary: string;
  location: string;
  requirements: string[];
  posted_date: string;
};

export default function JobsPage() {
  // --- STATES CHO API ---
  const [q, setQ] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [company, setCompany] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10); // Mỗi trang 10 tin

  const [items, setItems] = React.useState<Job[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // --- HÀM LOAD DỮ LIỆU ---
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        location,
        company,
        page: String(page),
        limit: String(limit),
        sort: "newest",
      });

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();

      setItems(data.items ?? []);
      setTotalItems(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Tự động load khi bộ lọc hoặc trang thay đổi
  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, location, company, page]);

  return (
    <main className="flex-grow bg-[#f6f7f8]">
      {/* 1. HERO SEARCH SECTION - Giữ nguyên giao diện bự */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto text-center lg:text-left">
          <h1 className="text-slate-900 text-4xl lg:text-5xl font-black leading-tight mb-3 tracking-tight">
            Tìm kiếm công việc <span className="text-primary">mơ ước</span>
          </h1>
          <p className="text-slate-500 text-lg lg:text-xl font-bold mb-10">
            Khám phá hàng ngàn cơ hội nghề nghiệp và ứng tuyển ngay hôm nay.
          </p>

          {/* THANH TÌM KIẾM - Đã kết nối với State */}
          <div className="max-w-6xl flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100">
            {/* Input Chức danh */}
            <div className="flex-1 relative group flex items-center px-5 gap-4 bg-slate-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">search</span>
              <input
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400"
                placeholder="Chức danh, từ khóa..."
              />
            </div>
            {/* Input Địa điểm */}
            <div className="flex-1 relative group flex items-center px-5 gap-4 bg-slate-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">location_on</span>
              <input
                value={location}
                onChange={(e) => { setPage(1); setLocation(e.target.value); }}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400"
                placeholder="Tỉnh, thành phố..."
              />
            </div>
            {/* Input Công ty (Mục bạn yêu cầu đổi) */}
            <div className="flex-1 relative group flex items-center px-5 gap-4 bg-slate-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">business</span>
              <input
                value={company}
                onChange={(e) => { setPage(1); setCompany(e.target.value); }}
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400"
                placeholder="Tên công ty (vd: FPT, Techcombank...)"
              />
            </div>
            <button
              onClick={load}
              className="h-16 px-12 bg-primary hover:bg-primary-hover text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <span>Tìm việc</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <span className="text-base font-black text-slate-400 uppercase tracking-widest">Gợi ý:</span>
            {["Remote", "Marketing", "IT Software"].map((tag) => (
              <button
                key={tag}
                onClick={() => setQ(tag)}
                className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all text-base font-bold text-slate-700 shadow-sm"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-[1360px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-3">
          <FilterSidebar />
        </div>

        <section className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-lg font-bold text-slate-500">
              Hiển thị <span className="text-slate-900 font-black">{loading ? "..." : totalItems}</span> việc làm phù hợp
            </p>
            <div className="flex items-center gap-3 text-[17px] font-black text-primary border-b-2 border-primary">
              <label htmlFor="sort-job" className="text-slate-400 font-bold">Sắp xếp:</label>
                <select  id="sort-job" className="appearance-none bg-transparent border-none focus:ring-0 text-primary font-black py-0 cursor-pointer">
                <option>Mới nhất</option>
                <option>Lương cao nhất</option>
              </select>
            </div>
          </div>

          {/* RENDER DANH SÁCH TỪ API */}
          {loading ? (
            <div className="flex flex-col gap-6 py-10 items-center justify-center bg-white rounded-3xl border border-slate-100">
               <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
               <p className="text-slate-500 font-bold text-lg">Đang tải dữ liệu việc làm...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
               <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">search_off</span>
               <p className="text-slate-500 font-bold text-xl">Không tìm thấy việc làm phù hợp</p>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((job) => (
                <JobCard
                  key={job.id}
                  id={String(job.id)}
                  title={job.title}
                  company={job.company_name}
                  salary={job.salary}
                  location={job.location}
                  time={job.posted_date}
                  tags={job.requirements}
                  // Truyền thêm logo_url nếu Component JobCard có hỗ trợ
                />
              ))}
            </div>
          )}

          {/* 3. PHÂN TRANG DYNAMIC */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <nav className="flex items-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-12 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <div className="flex items-center px-6 h-12 rounded-xl bg-white border border-slate-100 font-black text-lg text-slate-700">
                  Trang {page} / {totalPages}
                </div>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="size-12 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </nav>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}