import React from "react";
import Link from "next/link";
import { CandidateProfile } from "@/types/dashboard";

interface WelcomeHeaderProps {
  user: CandidateProfile | null;
  notificationCount?: number;
}

export default function WelcomeHeader({ user, notificationCount = 0 }: WelcomeHeaderProps) {
  const firstName = user?.full_name?.split(" ").pop() || "Candidate";

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Xin chào, {firstName}! 👋
        </h2>
        <p className="text-slate-500 text-xl font-bold mt-3 opacity-80">
          Hôm nay bạn có <span className="text-primary">{notificationCount} thông báo mới</span> và việc làm gợi ý phù hợp.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/jobs">
          <button className="flex items-center gap-2 px-7 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-all text-lg cursor-pointer">
            <span className="material-symbols-outlined font-bold">search</span> 
            Tìm việc ngay
          </button>
        </Link>
        <Link href="/candidate/cv-builder">
            <button className="flex items-center gap-2 px-7 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all text-lg active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined font-bold">edit_document</span> 
                Cập nhật CV
            </button>
        </Link>
      </div>
    </div>
  );
}
