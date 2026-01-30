"use client";
import React from "react";
import Link from "next/link";

export default function HRDashboard() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-12">
      
      {/* 1. HERO SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            <span>Hệ thống</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary">Dashboard</span>
          </nav>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Tổng quan Tuyển dụng</h1>
          <p className="text-slate-500 text-xl font-bold mt-2">Chào buổi sáng! Hệ thống ghi nhận <span className="text-primary">15 ứng viên mới</span> hôm nay.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Link dẫn đến trang tạo tin tuyển dụng */}
          <Link href="/hr/jobs/create">
            <button className="flex items-center gap-2 px-6 py-4 bg-primary/10 text-primary rounded-2xl font-black text-lg hover:bg-primary/20 transition-all">
              <span className="material-symbols-outlined">add_circle</span> Tạo tin mới
            </button>
          </Link>

          {/* Link dẫn đến trang danh sách ứng viên tổng quát */}
          <Link href="/hr/candidates">
            <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
              <span className="material-symbols-outlined">group</span> Xem ứng viên
            </button>
          </Link>
        </div>
      </div>

      {/* 2. STATS GRID - 3 Cột bự */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <HRStatCard label="Tin đang tuyển" value="24" trend="+2.5%" icon="assignment" color="text-blue-600" bg="bg-blue-50" />
        <HRStatCard label="Tổng ứng viên" value="1,250" trend="+12%" icon="group_add" color="text-indigo-600" bg="bg-indigo-50" />
        <HRStatCard label="Ứng viên hôm nay" value="15" trend="+5%" icon="fiber_new" color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* 3. CHARTS & STATUS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Xu hướng hồ sơ (Mockup) */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">Xu hướng hồ sơ</h3>
                <p className="text-slate-400 font-bold text-base">Phân tích biến động trong 7 ngày qua</p>
              </div>
              <span className="text-3xl font-black text-primary">342 hồ sơ</span>
           </div>
           {/* Mockup Chart bằng SVG */}
           <div className="h-64 w-full bg-slate-50 rounded-[32px] flex items-end justify-between p-8 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-xl opacity-20 uppercase tracking-widest italic">Biểu đồ đang tải...</div>
              {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                <div key={i} className="w-12 bg-primary/20 rounded-t-xl hover:bg-primary transition-all relative group" style={{height: `${h}%`}}>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-bold">Day {i+1}</div>
                </div>
              ))}
           </div>
        </div>

        {/* Trạng thái hồ sơ */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
           <h3 className="text-2xl font-black text-slate-900 uppercase italic">Trạng thái</h3>
           <StatusProgress label="Mới nhận" value={428} percent="75%" color="bg-blue-500" />
           <StatusProgress label="Phỏng vấn" value={85} percent="45%" color="bg-orange-500" />
           <StatusProgress label="Đã tuyển" value={42} percent="20%" color="bg-green-500" />
           <StatusProgress label="Từ chối" value={156} percent="30%" color="bg-red-500" />
        </div>
      </div>

      {/* 4. RECENT ACTIVITY TABLE */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-2xl font-black text-slate-900 uppercase">Hoạt động gần đây</h3>
          <button className="text-primary font-black hover:underline text-lg">Xem tất cả</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest">
              <tr>
                <th className="px-10 py-5">Ứng viên</th>
                <th className="px-10 py-5">Hành động</th>
                <th className="px-10 py-5">Vị trí</th>
                <th className="px-10 py-5">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              <ActivityRow name="Nguyễn Thanh Tùng" action="Nộp hồ sơ" job="Senior Frontend Developer" time="2 phút trước" color="text-blue-600 bg-blue-50" />
              <ActivityRow name="Lê Anh Tuấn" action="Phỏng vấn" job="Marketing Manager" time="15 phút trước" color="text-orange-600 bg-orange-50" />
              <ActivityRow name="Phạm Hoàng Nam" action="Xem hồ sơ" job="UI/UX Designer" time="45 phút trước" color="text-indigo-600 bg-indigo-50" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function HRStatCard({ label, value, trend, icon, color, bg }: any) {
  return (
    <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm group hover:border-primary transition-all">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-slate-400 font-black text-sm uppercase tracking-widest mb-2">{label}</p>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
        <div className={`size-16 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-inner`}>
          <span className="material-symbols-outlined text-4xl font-bold">{icon}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-green-600 font-black text-sm">
        <span className="material-symbols-outlined text-lg">trending_up</span> {trend}
        <span className="text-slate-400 font-bold ml-1 italic lowercase">so với tháng trước</span>
      </div>
    </div>
  );
}

function StatusProgress({ label, value, percent, color }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-black text-slate-600 text-lg">{label}</span>
        <span className="font-black text-slate-900 text-lg">{value}</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: percent }}></div>
      </div>
    </div>
  );
}

function ActivityRow({ name, action, job, time, color }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-primary border border-slate-200">{name[0]}</div>
          <div><p className="text-slate-900 text-lg font-black">{name}</p><p className="text-slate-400 text-xs">ID: #CAN-9410</p></div>
        </div>
      </td>
      <td className="px-10 py-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>{action}</span></td>
      <td className="px-10 py-6 text-slate-600 font-bold text-base">{job}</td>
      <td className="px-10 py-6 text-slate-400 font-bold italic text-sm">{time}</td>
    </tr>
  );
}