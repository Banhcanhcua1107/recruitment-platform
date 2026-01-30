"use client";
import React from "react";
import Link from "next/link";

export default function HRCalendarPage() {
  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-10 font-['Manrope']">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            <span>Hệ thống</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary">Lịch phỏng vấn</span>
          </nav>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Lịch phỏng vấn</h1>
          <p className="text-slate-500 text-xl font-bold mt-2 italic">Quản lý và theo dõi các buổi làm việc với ứng viên.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all text-lg shadow-sm">
            <span className="material-symbols-outlined font-bold">filter_list</span> Lọc
          </button>
          <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95">
            <span className="material-symbols-outlined font-bold">add_circle</span> Sắp xếp lịch mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* BÊN TRÁI: LỊCH (MONTH VIEW) */}
        <div className="lg:col-span-3 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-black text-slate-900">Tháng 10, 2026</h2>
              <div className="flex items-center border-2 border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <button className="p-2 hover:bg-slate-100 bg-white"><span className="material-symbols-outlined">chevron_left</span></button>
                <button className="p-2 hover:bg-slate-100 bg-white border-l-2 border-slate-100"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 font-black text-sm">
              <button className="px-5 py-2.5 rounded-xl bg-white text-primary shadow-sm">Tháng</button>
              <button className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600">Tuần</button>
              <button className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600">Ngày</button>
            </div>
          </div>

          {/* GRID LỊCH */}
          <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
            {["T.Hai", "T.Ba", "T.Tư", "T.Năm", "T.Sáu", "T.Bảy", "C.Nhật"].map(day => (
              <div key={day} className="py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
            {/* Mockup các ô trống */}
            {[...Array(3)].map((_, i) => <div key={i} className="min-h-[140px] bg-slate-50/20"></div>)}
            {/* Ô có dữ liệu */}
            <CalendarDay day="01" />
            <CalendarDay day="02" events={[
              { time: "09:00", name: "Nguyễn Tùng", color: "bg-blue-100 text-blue-700 border-blue-500" },
              { time: "14:00", name: "Lê Tuấn", color: "bg-orange-100 text-orange-700 border-orange-500" }
            ]} />
            <CalendarDay day="03" />
            <CalendarDay day="04" />
          </div>
        </div>

        {/* BÊN PHẢI: CHI TIẾT SẮP TỚI */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm sticky top-28">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 italic">Sắp tới</h3>
              <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">Hôm nay</span>
            </div>
            
            <div className="space-y-10 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
               <TimelineEvent time="09:00 - 10:00" name="Nguyễn Thanh Tùng" job="Senior Frontend Developer" type="Online" color="primary" />
               <TimelineEvent time="14:00 - 15:00" name="Lê Anh Tuấn" job="Marketing Manager" type="Trực tiếp" color="orange-500" />
            </div>

            <button className="w-full mt-10 py-4 text-base font-black text-primary border-2 border-primary/20 bg-primary/5 hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm">
              Xem tất cả lịch trình
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// --- SUPPORTING UI ---
function CalendarDay({ day, events }: any) {
  return (
    <div className="min-h-[140px] p-4 group hover:bg-slate-50 transition-all cursor-pointer">
      <span className={`text-lg font-black ${events ? 'text-primary' : 'text-slate-400'}`}>{day}</span>
      <div className="mt-3 space-y-2">
        {events?.map((e: any, i: number) => (
          <div key={i} className={`text-[10px] p-1.5 rounded-lg border-l-4 font-black truncate shadow-sm ${e.color}`}>
            {e.time} - {e.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEvent({ time, name, job, type, color }: any) {
  return (
    <div className="relative pl-12">
      <div className={`absolute left-0 top-1 size-10 rounded-full border-4 border-white bg-${color} flex items-center justify-center z-10 shadow-md text-white`}>
        <span className="material-symbols-outlined text-sm">{type === 'Online' ? 'videocam' : 'person'}</span>
      </div>
      <div>
        <p className="text-xs font-black text-primary mb-1 uppercase tracking-tighter">{time}</p>
        <h4 className="font-black text-slate-900 text-[16px] leading-tight">{name}</h4>
        <p className="text-slate-400 font-bold text-xs mt-1">{job}</p>
        <span className={`inline-block mt-3 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${type === 'Online' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
          {type}
        </span>
      </div>
    </div>
  );
}