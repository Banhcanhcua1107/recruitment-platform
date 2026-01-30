"use client";
import React from "react";
import Link from "next/link";

interface CompanyCardProps {
  id?: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  jobCount: number;
}

export default function CompanyCard({ 
  id = "1", 
  name, 
  industry, 
  location, 
  size, 
  jobCount 
}: CompanyCardProps) {
  return (
    /* 1. CONTAINER: Bo góc cực đại rounded-[40px], Padding p-10 bự rõ, Shadow sâu */
    <div className="group bg-white border border-slate-100 rounded-[40px] p-10 hover:border-primary/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_30px_70px_rgba(30,77,183,0.15)] transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden h-full">
      
      {/* Trang trí góc nhẹ nhàng cho cảm giác Native App */}
      <div className="absolute -top-10 -right-10 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>

      {/* 2. LOGO: Cho phép click vào ảnh để vào trang chi tiết */}
      <Link href={`/companies/${id}`} className="relative z-10">
        <div className="size-28 lg:size-32 rounded-[32px] bg-white border-4 border-slate-50 shadow-xl mb-8 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden">
          <img 
            src="https://placehold.co/600x400?text=LOGO" 
            alt={name} 
            className="w-full h-full object-contain p-2" 
          />
        </div>
      </Link>

      {/* 3. THÔNG TIN CHÍNH: Cỡ chữ text-[26px] cực bự và Font Black */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center">
        <Link href={`/companies/${id}`}>
          <h3 className="text-[26px] font-black text-slate-900 group-hover:text-primary transition-colors mb-3 line-clamp-1 tracking-tight">
            {name}
          </h3>
        </Link>
        <p className="text-xl font-bold text-primary italic mb-6 opacity-90">{industry}</p>

        {/* Thông tin phụ: Badge xám font Black uppercase */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-slate-400 font-black uppercase text-[13px] tracking-widest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold text-xl">location_on</span>
            {location}
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold text-xl">group</span>
            {size}
          </div>
        </div>
      </div>

      {/* 4. NÚT BẤM: Đổi màu linh hoạt khi Hover cả Card */}
      <div className="w-full pt-8 border-t border-slate-50 mt-auto relative z-10">
        <Link href={`/companies/${id}`}>
          <button className="w-full py-5 bg-slate-50 group-hover:bg-primary text-primary group-hover:text-white font-black rounded-[24px] text-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3">
            <span>{jobCount} việc làm đang tuyển</span>
            <span className="material-symbols-outlined font-black text-xl">arrow_forward</span>
          </button>
        </Link>
      </div>
    </div>
  );
}