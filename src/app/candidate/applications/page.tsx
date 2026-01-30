"use client";
import React from "react";
import Link from "next/link";

export default function CandidateApplicationsPage() {
  // Dữ liệu mẫu đơn ứng tuyển
  const applications = [
    { id: 1, title: "Senior Frontend Developer", company: "TechCorp Solution", date: "24/10/2026", status: "New", type: "Full-time", location: "Remote", shortName: "TC" },
    { id: 2, title: "Product Manager", company: "Global Logistics", date: "20/10/2026", status: "Interview", type: "Full-time", location: "Hybrid", shortName: "GL" },
    { id: 3, title: "UI/UX Designer", company: "Design Alliance", date: "18/10/2026", status: "Viewed", type: "Contract", location: "Remote", shortName: "DA" },
    { id: 4, title: "Data Engineer", company: "Startup Hub", date: "15/10/2026", status: "Reject", type: "Full-time", location: "On-site", shortName: "SH" },
  ];

  return (
    <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 space-y-10">
      
      {/* 1. TIÊU ĐỀ TRANG */}
      <div className="space-y-2">
        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Quản lý Đơn ứng tuyển
        </h2>
        <p className="text-slate-500 text-lg font-bold">
          Theo dõi và cập nhật trạng thái các vị trí công việc bạn đã ứng tuyển.
        </p>
      </div>

      {/* 2. BỘ LỌC VÀ TÌM KIẾM */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton label="Tất cả" active />
          <FilterButton label="Mới" />
          <FilterButton label="Đã xem" />
          <FilterButton label="Phỏng vấn" />
          <FilterButton label="Từ chối" />
        </div>

        <div className="relative w-full lg:max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
          <input 
            type="text"
            placeholder="Tìm tên công việc, công ty..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-primary/10 focus:border-primary text-lg font-bold transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH (CARD CONTAINER) */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Tên việc làm</th>
                <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Công ty</th>
                <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Ngày nộp</th>
                <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">Trạng thái</th>
                <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {applications.map((app) => (
                <tr key={app.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                       <Link href={`/candidate/applications/${app.id}`} className="hover:underline decoration-primary">
                        <span className="text-slate-900 font-black text-[17px] group-hover:text-primary transition-colors leading-tight">
                            {app.title}
                        </span>
                        </Link>
                      <span className="text-slate-400 text-sm font-bold mt-1.5 uppercase tracking-wide">
                        {app.type} • {app.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="size-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                        <span className="text-sm font-black text-slate-500 uppercase">{app.shortName}</span>
                      </div>
                      <span className="text-slate-700 text-[16px] font-bold">
                        {app.company}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-bold text-base">{app.date}</td>
                  <td className="px-8 py-6">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link href={`/candidate/applications/${app.id}`}>
                      <button className="text-primary hover:text-primary-dark text-base font-black inline-flex items-center gap-1 group/btn">
                        Xem chi tiết 
                        <span className="material-symbols-outlined text-xl transition-transform group-hover/btn:translate-x-1">chevron_right</span>
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PHÂN TRANG (PAGINATION) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
        <p className="text-lg font-bold text-slate-400 italic">
          Đang hiển thị <span className="text-slate-900 font-black">4</span> trong số <span className="text-slate-900 font-black">24</span> đơn tuyển
        </p>
        <div className="flex items-center gap-2">
          <PaginationButton icon="chevron_left" />
          <PaginationButton label="1" active />
          <PaginationButton label="2" />
          <PaginationButton label="3" />
          <span className="px-2 text-slate-300 font-black">...</span>
          <PaginationButton icon="chevron_right" />
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (Tỉ lệ 125%) ---

function FilterButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button className={`px-6 py-2.5 rounded-full text-base font-black transition-all ${
      active 
      ? "bg-primary text-white shadow-lg shadow-primary/20" 
      : "bg-white border border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
    }`}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    New: { color: "text-green-600 bg-green-50 border-green-100", dot: "bg-green-500" },
    Interview: { color: "text-blue-600 bg-blue-50 border-blue-100", dot: "bg-blue-500" },
    Viewed: { color: "text-orange-600 bg-orange-50 border-orange-100", dot: "bg-orange-500" },
    Reject: { color: "text-red-600 bg-red-50 border-red-100", dot: "bg-red-500" },
  };
  const config = configs[status] || configs.New;

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${config.color}`}>
      <span className={`size-2 rounded-full mr-2 ${config.dot}`}></span>
      {status}
    </span>
  );
}

function PaginationButton({ label, icon, active = false }: { label?: string; icon?: string; active?: boolean }) {
  return (
    <button className={`size-12 flex items-center justify-center rounded-2xl border transition-all text-lg font-black ${
      active 
      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
      : "bg-white border-slate-200 text-slate-400 hover:border-primary hover:text-primary"
    }`}>
      {icon ? <span className="material-symbols-outlined font-bold">{icon}</span> : label}
    </button>
  );
}