"use client";
import React from "react";
import JobCard from "@/components/jobs/JobCard";
import FilterSidebar from "@/components/jobs/FilterSidebar";

export default function JobsPage() {
  const jobs = [
    { title: "Senior Frontend Developer (ReactJS)", company: "Công ty Công nghệ TechSolutions", salary: "Up to $2,500", location: "Quận 1, TP. Hồ Chí Minh", time: "Đăng 2 giờ trước", tags: ["ReactJS", "Next.js"], isHot: true },
    { title: "UX/UI Designer", company: "Creative Studio Vietnam", salary: "15 - 25 Triệu", location: "Cầu Giấy, Hà Nội", time: "Đăng 5 giờ trước", tags: ["Figma", "UI/UX"], isHot: false },
    { title: "Digital Marketing Specialist", company: "Global Bank Corp.", salary: "Thỏa thuận", location: "Đà Nẵng", time: "Đăng hôm qua", tags: ["SEO/SEM"], isHot: false },
        { title: "Senior Frontend Developer (ReactJS)", company: "Công ty Công nghệ TechSolutions", salary: "Up to $2,500", location: "Quận 1, TP. Hồ Chí Minh", time: "Đăng 2 giờ trước", tags: ["ReactJS", "Next.js"], isHot: true },
    { title: "UX/UI Designer", company: "Creative Studio Vietnam", salary: "15 - 25 Triệu", location: "Cầu Giấy, Hà Nội", time: "Đăng 5 giờ trước", tags: ["Figma", "UI/UX"], isHot: false },
    { title: "Digital Marketing Specialist", company: "Global Bank Corp.", salary: "Thỏa thuận", location: "Đà Nẵng", time: "Đăng hôm qua", tags: ["SEO/SEM"], isHot: false },
    
  ];

  return (
    <main className="flex-grow bg-[#f6f7f8]">
      {/* HERO SEARCH SECTION */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto">
          <h1 className="text-slate-900 text-4xl lg:text-5xl font-black leading-tight mb-3 tracking-tight">
            Tìm kiếm công việc <span className="text-primary">mơ ước</span>
          </h1>
          <p className="text-slate-500 text-lg lg:text-xl font-bold mb-10">Khám phá hàng ngàn cơ hội nghề nghiệp và ứng tuyển ngay hôm nay.</p>
          
          <div className="max-w-5xl flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100">
            <div className="flex-1 relative group flex items-center px-5 gap-4 bg-slate-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">search</span>
              <input className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400" placeholder="Chức danh, từ khóa hoặc công ty..." />
            </div>
            <div className="flex-1 relative group flex items-center px-5 gap-4 bg-slate-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">location_on</span>
              <input className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400" placeholder="Tỉnh, thành phố hoặc vùng" />
            </div>
            <button className="h-16 px-12 bg-primary hover:bg-primary-hover text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3">
              <span className="material-symbols-outlined font-bold">search</span>
              <span>Tìm việc</span>
            </button>
          </div>
          
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <span className="text-base font-black text-slate-400 uppercase tracking-widest">Gợi ý:</span>
            {["Remote", "Marketing", "IT Software", "Thực tập"].map(tag => (
              <button key={tag} className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all text-base font-bold text-slate-700 shadow-sm">{tag}</button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-[1360px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-3">
          <FilterSidebar />
        </div>

        <section className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-lg font-bold text-slate-500">Hiển thị <span className="text-slate-900 font-black">124</span> việc làm phù hợp</p>
            <div className="flex items-center gap-3 text-[17px] font-black">
              <span className="text-slate-400">Sắp xếp:</span>
              <div className="relative border-b-2 border-primary">
                <select className="appearance-none bg-transparent border-none focus:ring-0 text-primary font-black py-1 cursor-pointer pr-8" aria-label="Sắp xếp công việc">
                    <option>Mới nhất</option>
                    <option>Lương cao nhất</option>
                  </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          {jobs.map((job, index) => (
            <JobCard key={index} {...job} />
          ))}

          {/* PAGINATION */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-3">
              <button className="size-12 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="size-12 rounded-xl bg-primary text-white font-black text-lg">1</button>
              <button className="size-12 rounded-xl border border-slate-200 font-bold text-lg hover:bg-white">2</button>
              <button className="size-12 rounded-xl border border-slate-200 font-bold text-lg hover:bg-white">3</button>
              <span className="px-2 text-slate-300 font-black">...</span>
              <button className="size-12 rounded-xl border border-slate-200 font-bold text-lg hover:bg-white">12</button>
              <button className="size-12 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all"><span className="material-symbols-outlined">chevron_right</span></button>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}