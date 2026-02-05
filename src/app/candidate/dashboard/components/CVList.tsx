
import React from "react";
import { CV } from "@/types/dashboard";

interface CVListProps {
  cvs: CV[];
  loading?: boolean;
}

export default function CVList({ cvs, loading }: CVListProps) {
  if (loading) return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[200px] animate-pulse"></div>
  );

  return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-black text-slate-900 italic">CV của tôi</h4>
        <button className="text-primary font-black text-2xl hover:scale-110 transition-transform cursor-pointer">+</button>
      </div>
      <div className="space-y-4">
        {cvs.length === 0 ? (
            <div className="text-center py-4 text-slate-400 font-bold italic">Chưa có CV nào</div>
        ) : (
            cvs.map((cv, index) => (
                <CVItem key={cv.id} cv={cv} color={index % 2 === 0 ? 'red' : 'blue'} />
            ))
        )}
      </div>
    </div>
  );
}

function CVItem({ cv, color }: { cv: CV, color: string }) {
  const iconColor = color === 'red' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
  const displayDate = new Date(cv.updated_at).toLocaleDateString('vi-VN');

  return (
    <div className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group">
      <div className={`size-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColor}`}>
        <span className="material-symbols-outlined text-3xl font-bold">{color === 'red' ? 'picture_as_pdf' : 'description'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-900 text-lg truncate group-hover:text-primary transition-colors">{cv.title}</p>
        <p className="text-[13px] font-bold text-slate-400 mt-1">Cập nhật: {displayDate}</p>
      </div>
      <button className="text-slate-300 hover:text-primary"><span className="material-symbols-outlined text-2xl">edit</span></button>
    </div>
  );
}
