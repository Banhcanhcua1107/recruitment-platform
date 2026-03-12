
import React from "react";
import Link from "next/link";
import { Application } from "@/types/dashboard";

interface RecentApplicationsProps {
  applications: Application[];
  loading?: boolean;
}

export default function RecentApplications({ applications, loading }: RecentApplicationsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] h-[400px] animate-pulse"></div>
    );
  }

  // Empty State
  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="size-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
             <span className="material-symbols-outlined text-4xl text-slate-300">work_off</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">Chưa có ứng tuyển nào</h3>
        <p className="text-slate-500 mb-8 max-w-md">
          Bạn chưa nộp hồ sơ cho công việc nào. Hãy bắt đầu tìm kiếm cơ hội nghề nghiệp phù hợp với bạn ngay hôm nay.
        </p>
        <Link href="/jobs">
          <button className="px-8 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all">
            Khám phá việc làm
          </button>
        </Link>
      </div>
    );
  }

  return (
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
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  const statusConfig = {
    pending: { label: "Đã gửi", color: "text-blue-600 bg-blue-50" },
    viewed: { label: "Đã xem", color: "text-purple-600 bg-purple-50" },
    interviewing: { label: "Phỏng vấn", color: "text-orange-600 bg-orange-50" },
    offered: { label: "Đề nghị", color: "text-green-600 bg-green-50" },
    rejected: { label: "Từ chối", color: "text-slate-400 bg-slate-100" },
  };

  const config =
    (statusConfig as Record<string, { label: string; color: string }>)[app.status] ||
    statusConfig.pending;
  const dateStr = new Date(app.created_at).toLocaleDateString('vi-VN');

  return (
    <tr className="hover:bg-slate-50 transition-all cursor-default">
      <td className="px-10 py-6">
        <div className="flex items-center gap-5">
           {app.job.logo_url && app.job.logo_url !== "https://via.placeholder.com/150" ? (
               <img src={app.job.logo_url} alt={app.job.company_name} className="size-14 rounded-2xl object-cover border border-slate-100" />
           ) : (
             <div className="size-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-lg uppercase">
               {app.job.company_name.charAt(0)}
             </div>
           )}
          <div>
            <p className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors">{app.job.title}</p>
            <p className="text-slate-400 font-bold text-base mt-0.5">{app.job.company_name}</p>
          </div>
        </div>
      </td>
      <td className="px-10 py-6 font-bold text-slate-500 text-base">{dateStr}</td>
      <td className="px-10 py-6">
        <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>
      </td>
    </tr>
  );
}
