"use client";
import React from "react";
import Link from "next/link";

interface JobCardProps {
  id?: string; // ID để định danh công việc (Ví dụ: 1, 2, 3...)
  title: string;
  company: string;
  salary: string;
  location: string;
  time: string;
  tags: string[];
  isHot?: boolean;
}

export default function JobCard({ 
  id = "1", // Mặc định là 1 nếu chưa có ID từ database
  title, 
  company, 
  salary, 
  location, 
  time, 
  tags, 
  isHot 
}: JobCardProps) {
  return (
    <div className={`group flex flex-col md:flex-row gap-6 p-6 lg:p-7 rounded-2xl border transition-all duration-300 relative overflow-hidden bg-white shadow-sm hover:shadow-xl ${isHot ? 'border-primary/30' : 'border-slate-100 hover:border-primary/50'}`}>
      
      {/* Badge Tuyển gấp - Chỉ hiện khi isHot = true */}
      {isHot && (
        <div className="absolute top-0 right-0 bg-primary text-white text-[11px] uppercase font-black px-3 py-1.5 rounded-bl-xl shadow-sm z-10">
          Tuyển gấp
        </div>
      )}

      {/* 1. Logo Công ty */}
      <div className="size-20 rounded-xl border border-slate-100 bg-white p-2 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
        <img 
          src="https://placehold.co/600x400?text=LOGO" 
          alt="Company Logo" 
          className="w-full h-full object-contain rounded-md" 
        />
      </div>

      {/* 2. Thông tin chính */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
          <div>
            {/* Click vào tiêu đề để xem chi tiết */}
            <Link href={`/jobs/${id}`} className="block">
              <h3 className="font-black text-xl lg:text-2xl text-slate-900 group-hover:text-primary transition-colors line-clamp-1 tracking-tight cursor-pointer" title={title}>
                {title}
              </h3>
            </Link>
            <p className="text-[17px] font-bold text-slate-500 mt-1 line-clamp-1">{company}</p>
          </div>
          
          {/* Mức lương nổi bật */}
          <span className="text-primary font-black text-xl lg:text-2xl whitespace-nowrap bg-primary/5 px-4 py-1 rounded-xl shrink-0">
            {salary}
          </span>
        </div>

        {/* Location & Time */}
        <div className="flex flex-wrap gap-y-2 gap-x-6 mb-5 text-base font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xl font-bold">location_on</span>
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xl font-bold">schedule</span>
            <span>{time}</span>
          </div>
        </div>

        {/* Tags kỹ năng */}
        <div className="flex flex-wrap gap-2.5">
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-wider">
            Toàn thời gian
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-wider">
            Kinh nghiệm: 2 năm
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span 
              key={tag} 
              className="px-3 py-1 rounded-lg bg-primary/5 text-xs font-black text-primary italic transition-colors group-hover:bg-primary group-hover:text-white max-w-[200px] truncate"
              title={tag}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
             <span className="px-3 py-1 rounded-lg bg-slate-50 text-xs font-black text-slate-400 border border-slate-100">
               +{tags.length - 2}
             </span>
          )}
        </div>
      </div>

      {/* 3. Cột Action bên phải (Nút ứng tuyển và Lưu tin) */}
      <div className="flex md:flex-col flex-row gap-4 justify-end md:justify-center items-center md:border-l md:border-slate-100 md:pl-7 mt-5 md:mt-0 pt-5 md:pt-0 border-t border-slate-100 md:border-t-0 w-full md:w-auto">
        
        {/* Nút Xem chi tiết / Ứng tuyển */}
        <Link href={`/jobs/${id}`} className="flex-1 md:flex-none w-full">
          <button className="w-full min-w-[150px] py-4 bg-primary text-white font-black text-[17px] rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap">
            Xem chi tiết
          </button>
        </Link>

        {/* Nút Lưu tin */}
        <button 
          className="p-3.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all border border-slate-100 hover:border-primary/20 flex items-center justify-center" 
          title="Lưu tin này"
        >
          <span className="material-symbols-outlined text-2xl font-bold">bookmark_border</span>
        </button>
      </div>

    </div>
  );
}