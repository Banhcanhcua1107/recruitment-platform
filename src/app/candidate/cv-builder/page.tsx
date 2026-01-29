"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function CVBuilderPage() {
  const [cvData, setCvData] = useState({
    fullName: "Vũ Thiên",
    position: "Senior Frontend Developer",
    email: "vuthien.dev@gmail.com",
    phone: "090 123 4567",
    address: "TP. Hồ Chí Minh, Việt Nam",
    summary: "Tôi là một lập trình viên nhiệt huyết với hơn 5 năm kinh nghiệm trong việc xây dựng các ứng dụng web hiện đại, tối ưu hiệu suất và trải nghiệm người dùng.",
    skills: ["ReactJS", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCvData({ ...cvData, [name]: value });
  };

  return (
    <div className="flex flex-col h-screen bg-white font-['Manrope'] text-slate-900">
      
      {/* --- TOOLBAR TRÊN CÙNG (Đã thu nhỏ h-20 -> h-16) --- */}
      <header className="h-16 border-b border-slate-100 flex items-center justify-end gap-4 px-8 bg-white z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-lg">dashboard_customize</span>
            Mẫu CV
          </button>
          <div className="h-6 w-px bg-slate-100 mx-1"></div>
          <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
            <span className="material-symbols-outlined text-xl">download</span>
            Tải PDF
          </button>
          <button className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all">
            Lưu nháp
          </button>
          <Link href="/candidate/dashboard" className="ml-2 size-9 rounded-full overflow-hidden border border-slate-200 shadow-sm">
             <img src="https://placehold.co/100x100?text=T" className="w-full h-full object-cover" alt="User" />
          </Link>
        </div>
      </header>

      {/* --- VÙNG LÀM VIỆC CHÍNH --- */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* PANEL TRÁI: NHẬP LIỆU (45%) - Thu nhỏ padding p-12 -> p-8 */}
        <aside className="w-[45%] border-r border-slate-100 bg-[#f8fafc] overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Chỉnh sửa nội dung</h1>
            <p className="text-slate-500 font-bold mt-1 text-sm">Thông tin cập nhật trực tiếp sang bản xem trước.</p>
          </div>

          <div className="space-y-4">
            {/* Mục: Thông tin cá nhân */}
            <CVAccordion title="Thông tin cá nhân" icon="person" defaultOpen={true}>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Họ và tên" name="fullName" val={cvData.fullName} onChange={handleInputChange} />
                <InputGroup label="Vị trí ứng tuyển" name="position" val={cvData.position} onChange={handleInputChange} />
                <InputGroup label="Email" name="email" val={cvData.email} onChange={handleInputChange} />
                <InputGroup label="Số điện thoại" name="phone" val={cvData.phone} onChange={handleInputChange} />
                
                <div className="col-span-2">
                  <label htmlFor="summary" className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest italic">
                    Tóm tắt giới thiệu
                  </label>
                  <textarea 
                    id="summary"
                    name="summary"
                    placeholder="Viết một đoạn ngắn về bản thân..."
                    rows={4}
                    value={cvData.summary}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent p-4 font-bold text-slate-700 transition-all text-[15px] bg-white shadow-sm"
                  ></textarea>
                </div>
              </div>
            </CVAccordion>

            {/* Mục: Kinh nghiệm */}
            <CVAccordion title="Kinh nghiệm làm việc" icon="work">
               <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-lg">add_circle</span> Thêm kinh nghiệm
               </button>
            </CVAccordion>

            {/* Mục: Kỹ năng */}
            <CVAccordion title="Kỹ năng" icon="psychology">
                <div className="flex flex-wrap gap-2 mb-4">
                    {cvData.skills.map(s => (
                        <span key={s} className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-2 uppercase">
                            {s} <span className="material-symbols-outlined text-sm cursor-pointer hover:text-red-200">close</span>
                        </span>
                    ))}
                </div>
                <input id="add-skill" placeholder="Nhập kỹ năng mới..." className="w-full rounded-xl border-slate-200 p-3.5 text-sm font-bold shadow-sm" />
            </CVAccordion>
          </div>
          <p className="text-center text-slate-400 font-bold text-xs italic pb-4">
            Tự động lưu lúc 14:30
          </p>
        </aside>

        {/* PANEL PHẢI: LIVE PREVIEW (55%) - Thu nhỏ tỷ lệ giấy */}
        <section className="flex-1 bg-slate-200 overflow-y-auto p-8 flex justify-center shadow-inner">
          <div className="w-full max-w-[720px] bg-white shadow-2xl min-h-[1000px] h-fit p-12 flex flex-col gap-10">
            
            <header className="border-b-4 border-primary pb-8">
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{cvData.fullName}</h1>
              <h2 className="text-lg text-primary font-black mt-2 italic">{cvData.position}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[13px] text-slate-500 font-bold">
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-primary text-lg">mail</span>{cvData.email}</div>
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-primary text-lg">call</span>{cvData.phone}</div>
                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-primary text-lg">location_on</span>{cvData.address}</div>
              </div>
            </header>

            <section>
              <h3 className="text-base font-black text-slate-900 border-l-4 border-primary pl-3 mb-4 uppercase tracking-widest">Tóm tắt chuyên môn</h3>
              <p className="text-[15px] text-slate-600 leading-relaxed font-medium">{cvData.summary}</p>
            </section>

            <section>
              <h3 className="text-base font-black text-slate-900 border-l-4 border-primary pl-3 mb-6 uppercase tracking-widest">Kỹ năng nổi bật</h3>
              <div className="flex flex-wrap gap-2.5">
                {cvData.skills.map(s => (
                    <span key={s} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[11px] font-black rounded-md uppercase tracking-wider">{s}</span>
                ))}
              </div>
            </section>

            <div className="mt-auto pt-10 text-center text-slate-300 font-bold text-xs italic">
                Powered by TalentFlow Builder
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Hỗ trợ UI thu nhỏ ---

function CVAccordion({ title, icon, children, defaultOpen = false }: any) {
  return (
    <details className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between p-4 lg:p-5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary font-bold text-xl">{icon}</span>
          <span className="text-[16px] font-black text-slate-900">{title}</span>
        </div>
        <span className="material-symbols-outlined transition-transform group-open:rotate-180 text-slate-400">expand_more</span>
      </summary>
      <div className="p-6 border-t border-slate-50 bg-white">
        {children}
      </div>
    </details>
  );
}

function InputGroup({ label, name, val, onChange }: any) {
  const id = `input-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">{label}</label>
      <input 
        id={id}
        name={name}
        value={val}
        onChange={onChange}
        placeholder={`Nhập ${label.toLowerCase()}...`}
        className="rounded-xl border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent p-3.5 font-bold text-slate-700 text-sm transition-all shadow-sm bg-white" 
      />
    </div>
  );
}