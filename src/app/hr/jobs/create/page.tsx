"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function HRCreateJobPage() {
  const [skills, setSkills] = useState(["ReactJS", "Tailwind CSS", "TypeScript"]);

  return (
    <main className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 space-y-10 font-['Manrope'] text-slate-900">
      
      {/* 1. BREADCRUMBS & HEADING */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
          <Link href="/hr/dashboard" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/hr/jobs" className="hover:text-primary transition-colors">Tin tuyển dụng</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-black">Tạo tin mới</span>
        </nav>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight">Tạo tin tuyển dụng mới</h1>
        <p className="text-slate-500 text-xl font-bold italic">Thu hút nhân tài bằng một bản mô tả công việc chi tiết và chuyên nghiệp.</p>
      </div>

      {/* 2. FORM CONTAINER - Dàn trải lơ lửng giữa trang */}
      <div className="flex flex-col gap-10">
        
        {/* SECTION 1: THÔNG TIN CƠ BẢN */}
        <FormSection title="1. Thông tin cơ bản" icon="info">
          <div className="space-y-8">
            <div className="flex flex-col gap-3">
              <label htmlFor="job-title" className="text-lg font-black text-slate-700 italic">
                Tiêu đề công việc <span className="text-red-500">*</span>
              </label>
              <input 
                id="job-title"
                type="text" 
                placeholder="VD: Tuyển dụng Senior Frontend Developer (ReactJS)"
                className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary focus:bg-white text-lg font-bold outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <label htmlFor="industry" className="text-lg font-black text-slate-700 italic">Ngành nghề</label>
                <div className="relative">
                  <select id="industry" aria-label="Chọn ngành nghề" className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary appearance-none font-bold text-lg cursor-pointer">
                    <option>Công nghệ thông tin</option>
                    <option>Marketing / Truyền thông</option>
                    <option>Tài chính / Kế toán</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="location" className="text-lg font-black text-slate-700 italic">Địa điểm làm việc</label>
                <div className="relative">
                  <select id="location" aria-label="Chọn địa điểm" className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary appearance-none font-bold text-lg cursor-pointer">
                    <option>Hà Nội</option>
                    <option>TP. Hồ Chí Minh</option>
                    <option>Đà Nẵng</option>
                    <option>Remote (Từ xa)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        {/* SECTION 2: CHI TIẾT CÔNG VIỆC */}
        <FormSection title="2. Chi tiết công việc" icon="description">
          <div className="space-y-10">
            <RichTextarea label="Mô tả công việc" id="desc" placeholder="Nhập các nhiệm vụ chính của vị trí này..." />
            <RichTextarea label="Yêu cầu ứng viên" id="req" placeholder="Kỹ năng, kinh nghiệm và bằng cấp cần thiết..." />
            <RichTextarea label="Quyền lợi" id="benefit" placeholder="Chế độ lương thưởng, bảo hiểm, môi trường làm việc..." />
          </div>
        </FormSection>

        {/* SECTION 3: THÔNG TIN BỔ SUNG */}
        <FormSection title="3. Thông tin bổ sung" icon="add_circle">
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col gap-3">
                <label className="text-lg font-black text-slate-700 italic">Mức lương (VND)</label>
                <div className="flex items-center gap-4">
                  <input type="number" placeholder="Tối thiểu" className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary font-bold text-lg" />
                  <span className="text-slate-300 font-black">―</span>
                  <input type="number" placeholder="Tối đa" className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary font-bold text-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label htmlFor="deadline" className="text-lg font-black text-slate-700 italic">Hạn nộp hồ sơ</label>
                <input id="deadline" type="date" className="h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary font-bold text-lg" />
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <label htmlFor="skills" className="text-lg font-black text-slate-700 italic">Kỹ năng yêu cầu</label>
              <div className="flex flex-wrap gap-3">
                {skills.map(skill => (
                  <span key={skill} className="px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-black uppercase tracking-wider flex items-center gap-2 border border-primary/20">
                    {skill} <button type="button" className="material-symbols-outlined text-lg">close</button>
                  </span>
                ))}
              </div>
              <input 
                id="skills"
                type="text" 
                placeholder="Nhập kỹ năng và nhấn Enter..." 
                className="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary font-bold text-lg shadow-inner"
              />
            </div>
          </div>
        </FormSection>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-10 mb-20">
          <button className="px-10 py-4 text-slate-400 font-black text-lg hover:text-slate-600 transition-all uppercase tracking-widest">
            Lưu bản nháp
          </button>
          <button className="px-10 py-4 bg-white border-2 border-slate-200 text-slate-700 font-black text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-sm uppercase tracking-widest">
            Xem trước
          </button>
          <button className="px-12 py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 transition-all uppercase tracking-widest flex items-center gap-3">
            <span className="material-symbols-outlined font-bold">publish</span>
            Đăng tin ngay
          </button>
        </div>

      </div>
    </main>
  );
}

// --- SUB-COMPONENTS CHO FORM MASTER ---

function FormSection({ title, icon, children }: any) {
  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
        <h2 className="text-primary text-2xl font-black flex items-center gap-3 italic">
          <span className="material-symbols-outlined text-3xl font-bold">{icon}</span>
          {title}
        </h2>
      </div>
      <div className="p-10 lg:p-12">
        {children}
      </div>
    </div>
  );
}

function RichTextarea({ label, id, placeholder }: any) {
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={id} className="text-xl font-black text-slate-900 border-l-8 border-primary pl-4 uppercase tracking-widest">
        {label}
      </label>
      <div className="border-2 border-slate-100 rounded-[32px] overflow-hidden bg-slate-50 focus-within:border-primary/30 transition-all shadow-inner">
        <div className="bg-white px-6 py-3 flex gap-4 border-b-2 border-slate-50">
          <ToolbarButton icon="format_bold" />
          <ToolbarButton icon="format_italic" />
          <ToolbarButton icon="format_list_bulleted" />
          <ToolbarButton icon="link" />
        </div>
        <textarea 
          id={id}
          rows={6} 
          className="w-full border-none bg-transparent focus:ring-0 p-8 text-lg font-medium text-slate-700 placeholder:text-slate-400"
          placeholder={placeholder}
        ></textarea>
      </div>
    </div>
  );
}

function ToolbarButton({ icon }: { icon: string }) {
  return (
    <button type="button" className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl text-slate-400 transition-all">
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
}