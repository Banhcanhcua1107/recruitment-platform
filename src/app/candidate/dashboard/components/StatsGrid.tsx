
import React from "react";
import { DashboardStats } from "@/types/dashboard";

interface StatsGridProps {
  stats: DashboardStats;
  loading?: boolean;
}

export default function StatsGrid({ stats, loading }: StatsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[180px] animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-6"></div>
            <div className="h-12 bg-slate-100 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard 
        label="Tổng đơn nộp" 
        value={stats.totalApplied} 
        sub="đơn ứng tuyển" 
        icon="send" 
        color="text-blue-600" 
        bg="bg-blue-50" 
      />
      <StatCard 
        label="NTD đã xem" 
        value={stats.profileViews} 
        sub="lượt xem" 
        icon="visibility" 
        color="text-purple-600" 
        bg="bg-purple-50" 
      />
      <StatCard 
        label="Phỏng vấn" 
        value={stats.interviews} 
        sub="sắp tới" 
        icon="calendar_month" 
        color="text-orange-600" 
        bg="bg-orange-50" 
      />
      <StatCard 
        label="Việc đã lưu" 
        value={stats.savedJobs} 
        sub="việc làm" 
        icon="bookmark" 
        color="text-pink-600" 
        bg="bg-pink-50" 
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  sub: string;
  icon: string;
  color: string;
  bg: string;
}

function StatCard({ label, value, sub, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6 group hover:border-primary transition-all">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 font-black text-sm uppercase tracking-widest">{label}</span>
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-inner`}>
          <span className="material-symbols-outlined font-black text-2xl">{icon}</span>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-black text-slate-900 tracking-tighter">{value < 10 ? `0${value}` : value}</span>
        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${bg} ${color} mb-1.5`}>{sub}</span>
      </div>
    </div>
  );
}
