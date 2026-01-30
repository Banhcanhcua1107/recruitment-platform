"use client";
import React from "react";
import Link from "next/link";

export default function HRJobManagementPage() {
  // Dữ liệu mẫu danh sách tin tuyển dụng
  const jobs = [
    { id: "JB-2026-001", title: "Senior UI/UX Designer", location: "TP. Hồ Chí Minh", status: "Đang mở", statusColor: "text-blue-700 bg-blue-50 border-blue-100", date: "12/10/2026", candidates: 42, isOpen: true },
    { id: "JB-2026-002", title: "Backend Developer (Java)", location: "Hà Nội", status: "Đang mở", statusColor: "text-blue-700 bg-blue-50 border-blue-100", date: "10/10/2026", candidates: 15, isOpen: true },
    { id: "JB-2026-003", title: "Marketing Specialist", location: "Remote", status: "Đã đóng", statusColor: "text-slate-500 bg-slate-100 border-slate-200", date: "01/10/2026", candidates: 128, isOpen: false },
    { id: "JB-2026-004", title: "Product Manager", location: "TP. Hồ Chí Minh", status: "Đang mở", statusColor: "text-blue-700 bg-blue-50 border-blue-100", date: "28/09/2026", candidates: 8, isOpen: true },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-10 font-['Manrope'] text-slate-900">
      
      {/* 1. PAGE HEADING */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
            <Link href="/hr/dashboard" className="hover:text-primary transition-colors">Hệ thống</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary font-black">Quản lý tin tuyển dụng</span>
          </nav>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight">Danh sách Tin tuyển dụng</h1>
          <p className="text-slate-500 text-xl font-bold italic">Bạn đang có <span className="text-primary">24 tin đăng</span> trong hệ thống.</p>
        </div>
        
        <Link href="/hr/jobs/create">
          <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95">
            <span className="material-symbols-outlined font-bold">add_circle</span> 
            Đăng tin mới
          </button>
        </Link>
      </div>

      {/* 2. FILTERS BAR - bự 125% */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          {/* Search */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tìm kiếm</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold">search</span>
              <input 
                className="w-full pl-12 pr-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold placeholder:text-slate-400 transition-all" 
                placeholder="Tiêu đề công việc..." 
                type="text"
              />
            </div>
          </div>
          {/* Status Select */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
            <div className="relative">
              <select aria-label="Lọc theo trạng thái" className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary appearance-none font-bold text-lg text-slate-700 cursor-pointer transition-all">
                <option>Tất cả trạng thái</option>
                <option>Đang mở (Open)</option>
                <option>Đã đóng (Closed)</option>
              </select>
              <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>
          {/* Location Select */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Địa điểm</label>
            <div className="relative">
              <select aria-label="Lọc theo địa điểm" className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary appearance-none font-bold text-lg text-slate-700 cursor-pointer transition-all">
                <option>Tất cả địa điểm</option>
                <option>Hà Nội</option>
                <option>TP. Hồ Chí Minh</option>
                <option>Remote</option>
              </select>
              <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>
          {/* Sort Select */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sắp xếp</label>
            <div className="relative">
              <select aria-label="Sắp xếp kết quả" className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary appearance-none font-bold text-lg text-slate-700 cursor-pointer transition-all">
                <option>Mới nhất</option>
                <option>Cũ nhất</option>
                <option>Nhiều ứng viên nhất</option>
              </select>
              <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. JOBS TABLE AREA */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-black text-xs uppercase tracking-widest border-b border-slate-50">
                <th className="px-10 py-6">Tiêu đề công việc</th>
                <th className="px-10 py-6">Địa điểm</th>
                <th className="px-10 py-6 text-center">Trạng thái</th>
                <th className="px-10 py-6">Ngày đăng</th>
                <th className="px-10 py-6 text-center">Ứng viên</th>
                <th className="px-10 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {jobs.map((job, idx) => (
                <tr key={idx} className={`group hover:bg-slate-50 transition-all duration-300 ${!job.isOpen ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                  <td className="px-10 py-7">
                    <div className="flex flex-col">
                      <Link href={`/hr/jobs/${job.id}`}>
                        <span className="text-primary font-black text-xl lg:text-[19px] hover:underline cursor-pointer tracking-tight">
                          {job.title}
                        </span>
                      </Link>
                      <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">ID: {job.id}</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-slate-600 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-300 text-xl font-bold">location_on</span>
                      {job.location}
                    </div>
                  </td>
                  <td className="px-10 py-7 text-center">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${job.statusColor}`}>
                      <span className={`size-1.5 rounded-full mr-2 ${job.isOpen ? 'bg-primary' : 'bg-slate-400'}`}></span>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-10 py-7 text-slate-500 font-bold text-base">{job.date}</td>
                  <td className="px-10 py-7 text-center">
                    <span className="text-primary font-black text-2xl">{job.candidates}</span>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button className="p-3.5 rounded-xl text-slate-300 hover:text-primary hover:bg-white border border-transparent hover:border-slate-100 transition-all shadow-sm">
                      <span className="material-symbols-outlined text-2xl font-bold">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Phân trang */}
        <div className="px-10 py-8 border-t border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between gap-6">
           <span className="text-lg font-bold text-slate-400 italic">Hiển thị 1-4 trong <span className="text-slate-900 font-black">24</span> tin tuyển dụng</span>
           <div className="flex items-center gap-3">
              <button className="size-11 flex items-center justify-center rounded-xl border-2 border-slate-100 text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined font-bold">chevron_left</span></button>
              <button className="size-11 flex items-center justify-center rounded-xl bg-primary text-white font-black text-lg shadow-lg shadow-primary/20">1</button>
              <button className="size-11 flex items-center justify-center rounded-xl border-2 border-slate-100 font-bold text-lg hover:bg-white">2</button>
              <button className="size-11 flex items-center justify-center rounded-xl border-2 border-slate-100 font-bold text-lg hover:bg-white">3</button>
              <button className="size-11 flex items-center justify-center rounded-xl border-2 border-slate-100 text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined font-bold">chevron_right</span></button>
           </div>
        </div>
      </div>

    </main>
  );
}