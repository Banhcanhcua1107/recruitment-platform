"use client";
import React from "react";
import Link from "next/link";

export default function HRCandidatesPage() {
  // Dữ liệu mẫu danh sách ứng viên toàn hệ thống
  const candidates = [
    { id: "CAN-9410", name: "Nguyễn Thanh Tùng", initials: "NT", pos: "Senior Frontend Developer", status: "Mới nhận", statusColor: "text-blue-600 bg-blue-50 border-blue-100", date: "12/05/2026" },
    { id: "CAN-9411", name: "Lê Anh Tuấn", initials: "LA", pos: "Marketing Manager", status: "Phỏng vấn", statusColor: "text-orange-600 bg-orange-50 border-orange-100", date: "10/05/2026" },
    { id: "CAN-9412", name: "Phạm Hoàng Nam", initials: "PH", pos: "UI/UX Designer", status: "Đã tuyển", statusColor: "text-green-600 bg-green-50 border-green-100", date: "08/05/2026" },
    { id: "CAN-9413", name: "Trần Hoa", initials: "TH", pos: "Product Owner", status: "Từ chối", statusColor: "text-red-600 bg-red-50 border-red-100", date: "07/05/2026" },
    { id: "CAN-9414", name: "Dương Minh", initials: "DM", pos: "Backend Engineer", status: "Mới nhận", statusColor: "text-blue-600 bg-blue-50 border-blue-100", date: "06/05/2026" },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 space-y-10 font-['Manrope'] text-slate-900">
      
      {/* 1. PAGE HEADING - Bự và chuyên nghiệp */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
            <Link href="/hr/dashboard" className="hover:text-primary transition-colors">Hệ thống</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary font-black">Danh sách ứng viên</span>
          </nav>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight">Quản lý Ứng viên</h1>
          <p className="text-slate-500 text-xl font-bold italic">Quản lý và theo dõi tiến độ của <span className="text-primary">1,250 ứng viên</span> tiềm năng.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all text-lg shadow-sm">
            <span className="material-symbols-outlined font-bold">file_download</span> 
            Xuất báo cáo
          </button>
          <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95">
            <span className="material-symbols-outlined font-bold">person_add</span> 
            Thêm ứng viên
          </button>
        </div>
      </div>

      {/* 2. FILTER SECTION - Thiết kế bự 125% */}
      <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative md:col-span-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
            <input 
              className="w-full pl-12 pr-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold placeholder:text-slate-400 transition-all" 
              placeholder="Tìm tên, email, ID..." 
              type="text"
            />
          </div>
          <div className="relative">
            <select aria-label="Trạng thái hồ sơ" className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold text-slate-700 appearance-none cursor-pointer">
              <option>Tất cả vị trí</option>
              <option>Frontend Developer</option>
              <option>UI/UX Designer</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          <div className="relative">
            <select  aria-label="Kinh nghiệm" className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold text-slate-700 appearance-none cursor-pointer">
              <option>Trạng thái hồ sơ</option>
              <option>Mới nhận</option>
              <option>Đang phỏng vấn</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          <div className="relative">
            <select 
                /* Thêm dòng này để máy tính hiểu đây là ô chọn kinh nghiệm */
                aria-label="Lọc theo kinh nghiệm" 
                className="w-full px-6 h-16 rounded-2xl border-none bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold text-slate-700 appearance-none cursor-pointer"
            >
                <option>Kinh nghiệm</option>
                <option>Dưới 1 năm</option>
                <option>1-3 năm</option>
                <option>Trên 5 năm</option>
            </select>
            {/* Icon mũi tên giữ nguyên */}
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                expand_more
            </span>
            </div>
        </div>
      </div>

      {/* 3. CANDIDATE TABLE AREA */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-black text-xs uppercase tracking-widest border-b border-slate-50">
                <th className="px-10 py-6">Ứng viên</th>
                <th className="px-10 py-6">Vị trí ứng tuyển</th>
                <th className="px-10 py-6">Trạng thái</th>
                <th className="px-10 py-6">Ngày nộp</th>
                <th className="px-10 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map((can, idx) => (
                <tr key={idx} className="group hover:bg-slate-50 transition-all duration-300">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="size-14 rounded-full bg-primary/5 text-primary flex items-center justify-center font-black text-xl border-2 border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                        {can.initials}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[18px]">{can.name}</p>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-tighter">ID: {can.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-slate-700 font-black text-[17px]">{can.pos}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-flex items-center px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${can.statusColor}`}>
                      {can.status}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-slate-500 font-bold text-base">{can.date}</p>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className="text-primary hover:text-primary-dark font-black text-[17px] hover:underline transition-all">
                      Xem hồ sơ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer của Table (Phân trang thu nhỏ gọn gàng) */}
        <div className="px-10 py-8 border-t border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between gap-6">
           <span className="text-lg font-bold text-slate-400 italic">Hiển thị 1-10 của <span className="text-slate-900 font-black">1,250</span> ứng viên</span>
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