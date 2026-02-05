
"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCandidateApplications } from "@/hooks/useCandidateApplications";
import { Application, ApplicationStatus } from "@/types/dashboard";

export default function CandidateApplicationsPage() {
  const { applications, isLoading, error } = useCandidateApplications();
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & Search Logic
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      // Status Filter
      if (filter !== "All") {
        if (filter === "New" && app.status !== "pending") return false;
        if (filter === "Viewed" && app.status !== "viewed") return false;
        if (filter === "Interview" && app.status !== "interviewing") return false;
        if (filter === "Offer" && app.status !== "offered") return false;
        if (filter === "Reject" && app.status !== "rejected") return false;
      }
      
      // Search
      if (search) {
        const query = search.toLowerCase();
        return (
          app.job.title.toLowerCase().includes(query) ||
          app.job.company_name.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [applications, filter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 space-y-10">
      
      {/* 1. HEADER */}
      <div className="space-y-2">
        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Quản lý Đơn ứng tuyển
        </h2>
        <p className="text-slate-500 text-lg font-bold">
          Theo dõi và cập nhật trạng thái các vị trí công việc bạn đã ứng tuyển.
        </p>
      </div>

      {/* 2. FILTER & SEARCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {["All", "New", "Viewed", "Interview", "Offer", "Reject"].map((f) => (
             <FilterButton 
                key={f} 
                label={f === "All" ? "Tất cả" : f === "New" ? "Mới" : f} 
                active={filter === f} 
                onClick={() => { setFilter(f); setCurrentPage(1); }} 
             />
          ))}
        </div>

        <div className="relative w-full lg:max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
          <input 
            type="text"
            placeholder="Tìm tên công việc, công ty..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-primary/10 focus:border-primary text-lg font-bold transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* 3. TABLE */}
      {isLoading ? (
          <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-[32px] animate-pulse"></div>)}
          </div>
      ) : error ? (
          <div className="text-center p-10 text-red-500 font-bold">{error}</div>
      ) : (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden min-h-[400px]">
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
                {paginatedApps.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">inbox</span>
                                <p className="text-slate-400 font-bold text-lg">Không tìm thấy đơn ứng tuyển nào phù hợp.</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                    paginatedApps.map((app) => (
                    <tr key={app.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-8 py-6">
                        <div className="flex flex-col">
                            <Link href={`/jobs/${app.job.id}`} className="hover:underline decoration-primary">
                            <span className="text-slate-900 font-black text-[17px] group-hover:text-primary transition-colors leading-tight">
                                {app.job.title}
                            </span>
                            </Link>
                            <span className="text-slate-400 text-sm font-bold mt-1.5 uppercase tracking-wide">
                            {app.job.location || 'Remote'}
                            </span>
                        </div>
                        </td>
                        <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                            {app.job.logo_url && app.job.logo_url !== "https://via.placeholder.com/150" ? (
                                <img src={app.job.logo_url} alt={app.job.company_name} className="size-11 rounded-xl object-cover border border-slate-200" />
                            ) : (
                                <div className="size-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                                    <span className="text-sm font-black text-slate-500 uppercase">{app.job.company_name.charAt(0)}</span>
                                </div>
                            )}
                            <span className="text-slate-700 text-[16px] font-bold">
                            {app.job.company_name}
                            </span>
                        </div>
                        </td>
                        <td className="px-8 py-6 text-slate-500 font-bold text-base">
                            {new Date(app.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-8 py-6">
                        <StatusBadge status={app.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                        <Link href={`/candidate/applications/${app.id}`}>
                            <button className="text-primary hover:text-primary-dark text-base font-black inline-flex items-center gap-1 group/btn cursor-pointer">
                            Xem chi tiết 
                            <span className="material-symbols-outlined text-xl transition-transform group-hover/btn:translate-x-1">chevron_right</span>
                            </button>
                        </Link>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PAGINATION */}
      {filteredApps.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
            <p className="text-lg font-bold text-slate-400 italic">
            Đang hiển thị <span className="text-slate-900 font-black">{paginatedApps.length}</span> trong số <span className="text-slate-900 font-black">{filteredApps.length}</span> đơn tuyển
            </p>
            <div className="flex items-center gap-2">
                <PaginationButton 
                    icon="chevron_left" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                />
                {[...Array(totalPages)].map((_, i) => (
                    <PaginationButton 
                        key={i} 
                        label={(i + 1).toString()} 
                        active={currentPage === i + 1} 
                        onClick={() => setCurrentPage(i + 1)} 
                    />
                ))}
                <PaginationButton 
                    icon="chevron_right" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                />
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FilterButton({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
        onClick={onClick}
        className={`px-6 py-2.5 rounded-full text-base font-black transition-all cursor-pointer ${
            active 
            ? "bg-primary text-white shadow-lg shadow-primary/20" 
            : "bg-white border border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
        }`}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const configs: Record<string, { color: string; dot: string; label: string }> = {
    pending: { color: "text-green-600 bg-green-50 border-green-100", dot: "bg-green-500", label: "Mới" },
    viewed: { color: "text-blue-600 bg-blue-50 border-blue-100", dot: "bg-blue-500", label: "Đã xem" },
    interviewing: { color: "text-orange-600 bg-orange-50 border-orange-100", dot: "bg-orange-500", label: "Phỏng vấn" },
    offered: { color: "text-purple-600 bg-purple-50 border-purple-100", dot: "bg-purple-500", label: "Đề nghị" },
    rejected: { color: "text-red-600 bg-red-50 border-red-100", dot: "bg-red-500", label: "Từ chối" },
  };
  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${config.color}`}>
      <span className={`size-2 rounded-full mr-2 ${config.dot}`}></span>
      {config.label}
    </span>
  );
}

interface PaginationButtonProps {
    label?: string;
    icon?: string;
    active?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}

function PaginationButton({ label, icon, active = false, onClick, disabled }: PaginationButtonProps) {
  return (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`size-12 flex items-center justify-center rounded-2xl border transition-all text-lg font-black ${
            active 
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
            : "bg-white border-slate-200 text-slate-400 hover:border-primary hover:text-primary"
        } ${disabled ? "opacity-50 cursor-not-allowed hover:border-slate-200 hover:text-slate-400" : "cursor-pointer"}`}>
      {icon ? <span className="material-symbols-outlined font-bold">{icon}</span> : label}
    </button>
  );
}