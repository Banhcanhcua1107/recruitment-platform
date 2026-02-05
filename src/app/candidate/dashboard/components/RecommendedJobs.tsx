
import React from "react";
import { Job } from "@/types/dashboard";

interface RecommendedJobsProps {
  jobs: Job[];
  loading?: boolean;
}

export default function RecommendedJobs({ jobs, loading }: RecommendedJobsProps) {
  if (loading) return null; // Or skeleton

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Việc làm phù hợp</h3>
         <div className="flex gap-2">
            <button className="size-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"><span className="material-symbols-outlined">chevron_left</span></button>
            <button className="size-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"><span className="material-symbols-outlined">chevron_right</span></button>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {jobs.map(job => (
             <RecommendedCard key={job.id} job={job} />
         ))}
      </div>
    </div>
  );
}

function RecommendedCard({ job }: { job: Job }) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:border-primary transition-all flex flex-col h-full">
      <div className="flex justify-between mb-8">
        {job.logo_url && job.logo_url !== "https://via.placeholder.com/150" ? (
             <img src={job.logo_url} alt={job.company_name} className="size-14 rounded-2xl object-cover border border-slate-100" />
        ) : (
           <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-primary border border-slate-100 text-2xl shadow-sm uppercase">
               {job.company_name.charAt(0)}
           </div>
        )}
        <button className="text-slate-300 hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">bookmark</span></button>
      </div>
      <h4 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2 line-clamp-1">{job.title}</h4>
      <p className="text-slate-400 font-bold text-lg">{job.company_name} • {job.location || 'Remote'}</p>
      <div className="mt-6">
        <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-xl text-[17px] font-black italic border border-green-100">{job.salary || 'Thỏa thuận'}</span>
      </div>
      <div className="mt-auto pt-10">
        <button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all text-base cursor-pointer">Ứng tuyển ngay</button>
      </div>
    </div>
  );
}
