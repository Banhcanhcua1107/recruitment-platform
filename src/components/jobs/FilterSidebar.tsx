"use client";
import React from "react";

export default function FilterSidebar() {
  return (
    <aside className="space-y-8">
      {/* Promo Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-indigo-800 p-7 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute -top-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-[120px]">description</span>
        </div>
        <h3 className="font-black text-xl mb-3 relative z-10">Tạo CV Chuyên nghiệp</h3>
        <p className="text-base text-blue-100 mb-6 relative z-10 leading-relaxed">Tăng 80% cơ hội được gọi phỏng vấn với mẫu CV chuẩn.</p>
        <button className="w-full py-4 bg-white text-primary font-black text-base rounded-xl hover:bg-blue-50 transition-all shadow-lg relative z-10">
          Tạo CV Ngay
        </button>
      </div>

      {/* Filter Box */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900">Bộ lọc</h3>
          <button className="text-sm font-bold text-primary hover:underline">Xóa tất cả</button>
        </div>

        <div className="space-y-10">
          <div>
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">Hình thức làm việc</h4>
            <div className="space-y-4">
              {["Toàn thời gian", "Bán thời gian", "Thực tập", "Remote"].map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="size-5 rounded-lg border-slate-200 text-primary focus:ring-primary transition-all" />
                  <span className="text-[17px] font-bold text-slate-600 group-hover:text-primary transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">Mức lương</h4>
            <div className="space-y-4">
              {["Tất cả mức lương", "Dưới 10 triệu", "10 - 20 triệu", "Trên 20 triệu", "Thỏa thuận"].map((item, idx) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer group">
                  <input name="salary" type="radio" defaultChecked={idx===0} className="size-5 border-slate-200 text-primary focus:ring-primary transition-all" />
                  <span className="text-[17px] font-bold text-slate-600 group-hover:text-primary transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}