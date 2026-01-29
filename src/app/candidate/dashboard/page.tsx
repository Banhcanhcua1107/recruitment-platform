"use client";
import React from "react";
import Link from "next/link";

export default function CandidateDashboard() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-12">
      
      {/* 1. HEADER CHÀO MỪNG - To và rõ nét */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Xin chào, Thiên! 👋
          </h2>
          <p className="text-slate-500 text-xl font-bold mt-3 opacity-80">
            Hôm nay bạn có <span className="text-primary">2 thông báo mới</span> và 3 việc làm gợi ý phù hợp.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/jobs">
            <button className="flex items-center gap-2 px-7 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-all text-lg">
              <span className="material-symbols-outlined font-bold">search</span> 
              Tìm việc ngay
            </button>
          </Link>
          <button className="flex items-center gap-2 px-7 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all text-lg active:scale-95">
            <span className="material-symbols-outlined font-bold">edit_document</span> 
            Cập nhật CV
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS - 4 cột bự */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Tổng đơn nộp" value="12" sub="+2 tuần này" icon="send" color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="NTD đã xem" value="05" sub="hồ sơ" icon="visibility" color="text-purple-600" bg="bg-purple-50" />
        <StatCard label="Phỏng vấn" value="01" sub="Sắp tới" icon="calendar_month" color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Việc đã lưu" value="08" sub="việc làm" icon="bookmark" color="text-pink-600" bg="bg-pink-50" />
      </div>

      {/* 3. NỘI DUNG CHÍNH - Chia 2 cột (8-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* CỘT TRÁI (8 CỘT): HOẠT ĐỘNG & GỢI Ý */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Bảng ứng tuyển gần đây */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ứng tuyển gần đây</h3>
              <Link href="/candidate/applications" className="text-primary font-black hover:underline text-lg">Xem tất cả</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest">
                  <tr>
                    <th className="px-10 py-5">Vị trí & Công ty</th>
                    <th className="px-10 py-5">Ngày nộp</th>
                    <th className="px-10 py-5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <ApplicationRow logo="N" title="Senior React Developer" company="Netflix Inc." date="20/10/2026" status="Đã xem" statusColor="text-blue-600 bg-blue-50" />
                  <ApplicationRow logo="A" title="Product Designer" company="Airbnb" date="18/10/2026" status="Chờ duyệt" statusColor="text-yellow-600 bg-yellow-50" />
                  <ApplicationRow logo="S" title="Marketing Manager" company="Spotify" date="15/10/2026" status="Từ chối" statusColor="text-slate-400 bg-slate-100" />
                </tbody>
              </table>
            </div>
          </div>

          {/* Việc làm gợi ý */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Việc làm phù hợp</h3>
               <div className="flex gap-2">
                  <button className="size-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white"><span className="material-symbols-outlined">chevron_left</span></button>
                  <button className="size-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white"><span className="material-symbols-outlined">chevron_right</span></button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <RecommendedCard logo="G" title="Frontend Engineer" company="Google LLC" location="Hồ Chí Minh" salary="$1,000 - $2,500" />
               <RecommendedCard logo="S" title="UI/UX Designer" company="Shopee" location="Hà Nội" salary="$800 - $1,500" />
            </div>
          </div>

        </div>

        {/* CỘT PHẢI (4 CỘT): WIDGETS BỔ TRỢ */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Sức mạnh hồ sơ */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-xl font-black text-slate-900 italic">Sức mạnh hồ sơ</h4>
              <span className="text-primary font-black text-lg">70%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(30,77,183,0.4)]" style={{width: '70%'}}></div>
            </div>
            <p className="text-slate-500 font-bold mb-8 leading-relaxed">Hãy thêm Portfolio để đạt <span className="text-slate-900 font-black">100%</span> điểm tin cậy cho nhà tuyển dụng.</p>
            <button className="w-full py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all text-base">Bổ sung hồ sơ ngay</button>
          </div>

          {/* CV của tôi */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-black text-slate-900 italic">CV của tôi</h4>
              <button className="text-primary font-black text-2xl hover:scale-110 transition-transform">+</button>
            </div>
            <div className="space-y-4">
              <CVItem name="CV_Frontend_Developer" date="20/10/2026" color="red" />
              <CVItem name="CV_UIUX_Designer" date="15/09/2026" color="blue" />
            </div>
          </div>

          {/* Banner nâng cấp */}
          <div className="bg-gradient-to-br from-primary to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10">
              <span className="material-symbols-outlined text-5xl mb-6 text-yellow-400">diamond</span>
              <h4 className="text-2xl font-black mb-4">Nâng cấp tài khoản</h4>
              <p className="text-blue-100 font-bold mb-8 leading-relaxed">Đẩy hồ sơ lên Top và xem ai đã lén xem CV của bạn.</p>
              <button className="w-full py-4 bg-white text-primary font-black rounded-2xl shadow-lg hover:bg-blue-50 transition-all">Tìm hiểu thêm</button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (Tỉ lệ 125%) ---

function StatCard({ label, value, sub, icon, color, bg }: any) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6 group hover:border-primary transition-all">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 font-black text-sm uppercase tracking-widest">{label}</span>
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-inner`}>
          <span className="material-symbols-outlined font-black text-2xl">{icon}</span>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${bg} ${color} mb-1.5`}>{sub}</span>
      </div>
    </div>
  );
}

function ApplicationRow({ logo, title, company, date, status, statusColor }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-all cursor-default">
      <td className="px-10 py-6">
        <div className="flex items-center gap-5">
          <div className="size-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-lg">{logo}</div>
          <div>
            <p className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors">{title}</p>
            <p className="text-slate-400 font-bold text-base mt-0.5">{company}</p>
          </div>
        </div>
      </td>
      <td className="px-10 py-6 font-bold text-slate-500 text-base">{date}</td>
      <td className="px-10 py-6">
        <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${statusColor}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

function RecommendedCard({ logo, title, company, location, salary }: any) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:border-primary transition-all flex flex-col h-full">
      <div className="flex justify-between mb-8">
        <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-primary border border-slate-100 text-2xl shadow-sm">{logo}</div>
        <button className="text-slate-300 hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">bookmark</span></button>
      </div>
      <h4 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2">{title}</h4>
      <p className="text-slate-400 font-bold text-lg">{company} • {location}</p>
      <div className="mt-6">
        <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-xl text-[17px] font-black italic border border-green-100">{salary}</span>
      </div>
      <div className="mt-auto pt-10">
        <button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all text-base">Ứng tuyển ngay</button>
      </div>
    </div>
  );
}

function CVItem({ name, date, color }: any) {
  const iconColor = color === 'red' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
  return (
    <div className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group">
      <div className={`size-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColor}`}>
        <span className="material-symbols-outlined text-3xl font-bold">{color === 'red' ? 'picture_as_pdf' : 'description'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-900 text-lg truncate group-hover:text-primary transition-colors">{name}</p>
        <p className="text-[13px] font-bold text-slate-400 mt-1">Cập nhật: {date}</p>
      </div>
      <button className="text-slate-300 hover:text-primary"><span className="material-symbols-outlined text-2xl">edit</span></button>
    </div>
  );
}