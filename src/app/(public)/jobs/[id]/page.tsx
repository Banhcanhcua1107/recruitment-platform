"use client";
import React from "react";
import Link from "next/link";

export default function JobDetailPage() {
  return (
    <main className="bg-[#f6f7f8] min-h-screen pb-20">
      {/* 1. BREADCRUMBS - Phóng to rõ ràng */}
      <div className="max-w-[1360px] mx-auto px-6 py-6">
        <nav className="flex items-center text-[15px] font-bold text-slate-500 gap-2">
          <Link href="/" className="hover:text-primary">Trang chủ</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/jobs" className="hover:text-primary">Việc làm IT</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-slate-900 truncate">Senior UI/UX Designer</span>
        </nav>
      </div>

      <div className="max-w-[1360px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CỘT TRÁI: CHI TIẾT CÔNG VIỆC (8 CỘT) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Header Card */}
          <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[140px] text-primary">design_services</span>
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                <div className="size-24 rounded-2xl bg-white border border-slate-100 shadow-sm p-2 shrink-0 flex items-center justify-center">
                  <img src="https://placehold.co/200x200" alt="Company Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-4">
                    Senior UI/UX Designer
                  </h1>
                  <p className="text-xl font-bold text-slate-500 mb-6 italic">TechSolutions Inc.</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-green-50 text-green-700 text-lg font-black border border-green-100">
                      <span className="material-symbols-outlined text-2xl">payments</span>
                      $1,500 - $2,500
                    </span>
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-50 text-slate-600 text-lg font-bold border border-slate-100">
                      <span className="material-symbols-outlined text-2xl">location_on</span>
                      Hà Nội
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon="work_history" label="Kinh nghiệm" value="3+ năm" />
            <StatBox icon="group" label="Cấp bậc" value="Senior" />
            <StatBox icon="calendar_month" label="Hạn nộp" value="30/11/2026" />
            <StatBox icon="timelapse" label="Cập nhật" value="2 giờ trước" />
          </section>

          {/* Detailed Content */}
          <section className="bg-white rounded-[32px] p-8 lg:p-10 border border-slate-100 shadow-sm flex flex-col gap-10">
            <ContentSection title="Mô tả công việc">
              <ul className="list-disc pl-5 space-y-4">
                <li>Thiết kế giao diện người dùng (UI) và trải nghiệm người dùng (UX) cho các sản phẩm Web và Mobile App.</li>
                <li>Nghiên cứu hành vi người dùng, phân tích yêu cầu sản phẩm để đưa ra các giải pháp tối ưu.</li>
                <li>Xây dựng Design System, Guideline đảm bảo tính nhất quán của sản phẩm.</li>
                <li>Phối hợp chặt chẽ với team Product và Developer.</li>
              </ul>
            </ContentSection>

            <hr className="border-slate-50" />

            <ContentSection title="Yêu cầu ứng viên">
              <ul className="list-disc pl-5 space-y-4">
                <li>Có ít nhất 3 năm kinh nghiệm ở vị trí tương đương.</li>
                <li>Thành thạo công cụ thiết kế: Figma (Ưu tiên), Adobe Suite.</li>
                <li>Có tư duy thẩm mỹ tốt, hiểu biết sâu về Layout, Typography và Color.</li>
                <li>Có Portfolio thể hiện các dự án đã thực hiện thực tế.</li>
              </ul>
            </ContentSection>

            <hr className="border-slate-50" />

            <ContentSection title="Quyền lợi">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BenefitItem text="Lương thưởng hấp dẫn, review 2 lần/năm." />
                <BenefitItem text="Đầy đủ BHXH, BHYT theo quy định." />
                <BenefitItem text="Cung cấp MacBook Pro làm việc." />
                <BenefitItem text="Team building, du lịch hàng năm." />
              </div>
            </ContentSection>

            <div className="grid md:grid-cols-2 gap-10 pt-6">
              <div>
                <h3 className="text-xl font-black mb-5 text-slate-900">Kỹ năng chuyên môn</h3>
                <div className="flex flex-wrap gap-2.5">
                  {["Figma", "UI Design", "UX Research", "Prototyping"].map(s => (
                    <span key={s} className="px-4 py-2 bg-primary/5 text-primary rounded-xl text-base font-black italic">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black mb-5 text-slate-900">Địa điểm</h3>
                <div className="flex items-start gap-3 text-slate-600">
                  <span className="material-symbols-outlined text-primary text-3xl">map</span>
                  <div className="text-lg font-bold">
                    <p>Tòa nhà Keangnam Landmark 72</p>
                    <p className="text-slate-400 font-medium text-base">Nam Từ Liêm, Hà Nội</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* CỘT PHẢI: SIDEBAR (4 CỘT) */}
        <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-28">
          
          {/* Company Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-5 mb-6">
              <div className="size-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                <img src="https://placehold.co/100x100" className="rounded-lg" alt="Logo" />
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-900 leading-tight">TechSolutions Inc.</h3>
                <p className="text-lg font-bold text-slate-400">Công nghệ phần mềm</p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <SidebarInfo icon="group" text="50 - 100 nhân viên" />
              <SidebarInfo icon="language" text="techsolutions.com" isLink />
              <SidebarInfo icon="location_on" text="Hà Nội, Việt Nam" />
            </div>
            <button className="w-full py-4 rounded-2xl border-2 border-slate-100 font-black text-lg text-slate-600 hover:bg-slate-50 transition-all">
              Xem trang công ty
            </button>
          </div>

          {/* Action Card - Box Ứng tuyển */}
          <div className="bg-white rounded-[32px] p-8 border-2 border-primary/20 shadow-[0_20px_50px_rgba(30,77,183,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Ứng tuyển ngay</h3>
            <p className="text-lg font-medium text-slate-500 mb-8">Hạn nộp hồ sơ còn 15 ngày. Đừng bỏ lỡ cơ hội!</p>
            
            <div className="flex flex-col gap-4">
              <button className="w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 text-xl active:scale-95">
                <span className="material-symbols-outlined text-2xl font-bold">send</span>
                Nộp hồ sơ ngay
              </button>
              <button className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-black py-5 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 text-xl">
                <span className="material-symbols-outlined text-2xl">bookmark_border</span>
                Lưu tin này
              </button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <p className="text-sm font-bold text-amber-800 leading-snug">
                Bạn chưa đăng nhập. Hãy <Link href="/login" className="underline">Đăng nhập</Link> để ứng tuyển.
              </p>
            </div>
          </div>

          {/* Share */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-between">
            <span className="font-black text-slate-900 text-lg">Chia sẻ:</span>
            <div className="flex gap-3">
              <button className="size-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">share</span></button>
              <button className="size-12 rounded-full bg-[#0077b5] text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">link</span></button>
            </div>
          </div>

        </aside>
      </div>
    </main>
  );
}

// --- SUPPORTING COMPONENTS (LOCAL) ---

function StatBox({ icon, label, value }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col items-start shadow-sm group hover:border-primary transition-all">
      <span className="material-symbols-outlined text-primary text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className="font-black text-lg text-slate-900">{value}</span>
    </div>
  );
}

function ContentSection({ title, children }: any) {
  return (
    <div>
      <h3 className="text-2xl font-black mb-6 flex items-center gap-4 text-slate-900">
        <span className="w-2 h-8 bg-primary rounded-full"></span>
        {title}
      </h3>
      <div className="text-lg font-medium text-slate-600 leading-[1.8] pl-6">
        {children}
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white hover:border-primary transition-all">
      <span className="material-symbols-outlined text-green-500 font-bold text-2xl">check_circle</span>
      <span className="text-[17px] font-bold text-slate-700">{text}</span>
    </div>
  );
}

function SidebarInfo({ icon, text, isLink }: any) {
  return (
    <div className="flex items-center gap-4 text-lg font-bold text-slate-600">
      <span className="material-symbols-outlined text-slate-300 text-2xl">{icon}</span>
      <span className={isLink ? "text-primary hover:underline cursor-pointer truncate" : "truncate"}>{text}</span>
    </div>
  );
}