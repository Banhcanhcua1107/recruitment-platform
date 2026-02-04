"use client";
import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Mock Data for Dashboard
const MY_CVS = [
  { id: "cv-1", title: "Software Engineer CV", updatedAt: new Date("2024-02-01"), status: "Draft", thumbnail: "/cv-thumb-1.png", mode: "Template" },
  { id: "cv-2", title: "Creative Designer Resume", updatedAt: new Date("2023-12-15"), status: "Published", thumbnail: "/cv-thumb-2.png", mode: "Canvas" },
];

export default function CVBeDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-['Manrope'] pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">My CVs</h1>
             <p className="text-slate-500 font-medium text-sm">Manage and organize your job applications</p>
          </div>
          <Link href="/candidate/cv-builder/new" className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all active:scale-95">
             <span className="material-symbols-outlined">add_circle</span>
             Create New CV
          </Link>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* CV GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* CREATE NEW CARD (Alternative Entry) */}
            <Link href="/candidate/cv-builder/new" className="group flex flex-col items-center justify-center h-[320px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-primary hover:shadow-xl transition-all cursor-pointer">
               <div className="size-16 rounded-full bg-slate-200 group-hover:bg-primary/10 flex items-center justify-center transition-colors mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">add</span>
               </div>
               <h3 className="text-lg font-bold text-slate-900">Create New CV</h3>
               <p className="text-slate-500 text-sm mt-1">Start from scratch or a template</p>
            </Link>

            {/* EXISTING CVs */}
            {MY_CVS.map(cv => (
              <div key={cv.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-[320px]">
                 {/* PREVIEW THUMBNAIL AREA */}
                 <div className="h-[180px] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-linear-to-t from-black/5 to-transparent"></div>
                    <span className="material-symbols-outlined text-6xl text-slate-200 group-hover:scale-110 transition-transform duration-500">article</span>
                    
                    {/* STATUS BADGE */}
                    <div className="absolute top-4 left-4">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${cv.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                         {cv.status}
                       </span>
                    </div>

                    {/* OVERLAY ACTIONS */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Link href={`/candidate/cv-builder/${cv.id}/edit?mode=${cv.mode.toLowerCase()}`} className="size-10 rounded-full bg-white flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-lg" title="Edit">
                           <span className="material-symbols-outlined text-lg">edit</span>
                        </Link>
                        <button className="size-10 rounded-full bg-white flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-lg" title="Delete">
                           <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                 </div>

                 {/* INFO */}
                 <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-900 text-lg truncate mb-1">{cv.title}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-4">
                       <span className="material-symbols-outlined text-sm">schedule</span>
                       Edited {formatDistanceToNow(cv.updatedAt)} ago
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{cv.mode} Mode</span>
                       <Link href={`/candidate/cv-builder/${cv.id}/edit?mode=${cv.mode.toLowerCase()}`} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                          Continue <span className="material-symbols-outlined text-sm">arrow_forward</span>
                       </Link>
                    </div>
                 </div>
              </div>
            ))}

        </div>

      </div>
    </div>
  );
}