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

export default function CompanyCard({ id = "1", name, industry, location, size, jobCount }: CompanyCardProps) {
  return (
    <div className="group bg-white border border-slate-100 rounded-[32px] p-8 hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-300">
      <div className="flex flex-col items-center text-center">
        {/* Logo Công ty */}
        <div className="size-24 rounded-[24px] bg-slate-50 border border-slate-100 p-4 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
          <img src="https://placehold.co/600x400?text=LOGO" alt={name} className="w-full h-full object-contain rounded-lg" />
        </div>

        {/* Thông tin */}
        <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors mb-2 line-clamp-1">
          {name}
        </h3>
        <p className="text-lg font-bold text-primary mb-4">{industry}</p>

        <div className="flex flex-wrap justify-center gap-4 mb-8 text-slate-500 font-bold">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xl">location_on</span>
            {location}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xl">group</span>
            {size}
          </div>
        </div>

        {/* Nút bấm */}
        <div className="w-full pt-6 border-t border-slate-50">
          <Link href={`/companies/${id}`}>
            <button className="w-full py-4 bg-primary/5 hover:bg-primary text-primary hover:text-white font-black rounded-2xl transition-all active:scale-95">
              {jobCount} việc làm đang mở
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}