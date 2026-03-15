"use client";
import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f7f8]">
      <main className="flex-1">
        
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative bg-white pt-20 pb-32 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient Orbs */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-soft delay-200" />
            {/* Floating Shapes */}
            <div className="absolute top-40 right-1/4 w-20 h-20 bg-primary/20 rounded-2xl rotate-12 animate-float" />
            <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-violet-400/20 rounded-full animate-float-delayed" />
            <div className="absolute top-60 left-20 w-12 h-12 border-4 border-primary/20 rounded-xl rotate-45 animate-float" />
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>
          
          <div className="max-w-[1360px] mx-auto px-6 lg:px-10 relative z-10 flex flex-col items-center">
            <div className="grid lg:grid-cols-2 gap-24 items-center mb-10 text-left w-full">
              
              {/* LEFT: Content */}
              <div className="animate-fade-in-up">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-bold text-primary mb-8 shadow-sm">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary mr-3 animate-pulse" />
                  Nền tảng sự nghiệp thế hệ mới
                </div>
                
                <h1 className="text-slate-900 text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-8">
                  Kết nối với{" "}
                  <span className="text-gradient italic whitespace-nowrap relative">
                    công việc
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                      <path d="M0 6 Q50 12 100 6 T200 6" fill="none" stroke="currentColor" strokeWidth="3"/>
                    </svg>
                  </span>{" "}
                  <br className="hidden lg:block" /> 
                  bạn hằng mong ước
                </h1>
                
                <p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed max-w-xl mb-10 opacity-90">
                  Khám phá hàng ngàn cơ hội nghề nghiệp từ các doanh nghiệp uy tín nhất. 
                  Tạo CV chuyên nghiệp và ứng tuyển chỉ trong 1 phút.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4" suppressHydrationWarning>
                  <Link 
                    href="/jobs" 
                    className="btn-shine inline-flex items-center h-14 px-8 bg-primary hover:bg-primary-hover text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Khám phá việc làm
                    <span className="material-symbols-outlined ml-2">arrow_forward</span>
                  </Link>
                  <Link 
                    href="/cv-builder" 
                    className="inline-flex items-center h-14 px-8 bg-white border-2 border-slate-200 hover:border-primary text-slate-700 hover:text-primary text-lg font-bold rounded-2xl transition-all hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined mr-2">description</span>
                    Tạo CV miễn phí
                  </Link>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-slate-100">
                  <Stat value="10K+" label="Việc làm" />
                  <Stat value="5K+" label="Công ty" />
                  <Stat value="50K+" label="Ứng viên" />
                </div>
              </div>

              {/* RIGHT: Hero Image */}
              <div className="hidden lg:block relative animate-fade-in delay-300">
                <div className="relative">
                  {/* Decorative blob behind image */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-[40px] animate-blob" />
                  
                  {/* Main image container */}
                  <div className="relative w-full h-[480px] bg-slate-100 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/10 group">
                    <img 
                      alt="Professional team collaboration" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                    
                    {/* Floating card */}
                    <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl animate-fade-in-up delay-500">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-green-500 flex items-center justify-center text-white">
                          <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <div>
                          <p className="text-slate-900 font-bold">+1,234 việc làm mới</p>
                          <p className="text-slate-500 text-sm">Được cập nhật hôm nay</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== SEARCH BAR ==================== */}
            <div className="w-full max-w-5xl bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 p-6 transition-all hover:shadow-[0_25px_70px_rgba(0,0,0,0.12)] hover:-translate-y-1">
              <div className="flex flex-col md:flex-row gap-4">
                
                {/* Input Vị trí */}
                <div className="flex-[1.4] flex items-center px-6 h-16 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-primary focus-within:glow-primary transition-all group">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mr-4 transition-colors group-focus-within:text-primary">search</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0 focus:outline-none" 
                    placeholder="Vị trí ứng tuyển, kỹ năng..." 
                    type="text"
                  />
                </div>
                
                {/* Input Địa điểm */}
                <div className="flex-1 flex items-center px-6 h-16 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-primary focus-within:glow-primary transition-all group">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mr-4 transition-colors group-focus-within:text-primary">location_on</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0 focus:outline-none" 
                    placeholder="Địa điểm..." 
                    type="text"
                  />
                </div>

                {/* Search Button */}
                <button className="btn-shine h-16 px-10 bg-primary hover:bg-primary-hover text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-95 hover:-translate-y-0.5">
                  Tìm kiếm ngay
                </button>
              </div>

              {/* Quick Tags */}
              <div className="mt-5 flex flex-wrap gap-3 px-2">
                <span className="font-bold text-slate-400 uppercase tracking-tight text-sm">Gợi ý:</span>
                {["Developer", "Marketing", "Kế toán", "Thiết kế", "Sales", "HR"].map((tag) => (
                  <Link 
                    key={tag} 
                    href={`/search?q=${tag}`} 
                    className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-primary hover:text-white transition-all"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FEATURED JOBS ==================== */}
        <section className="py-24 bg-[#f6f7f8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
              <div>
                <span className="inline-block px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-full mb-4">
                  HOT 🔥
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Việc làm nổi bật</h2>
                <p className="text-slate-500 mt-3 text-lg">Đừng bỏ lỡ những cơ hội tốt nhất được cập nhật mỗi ngày.</p>
              </div>
              <Link href="/jobs" className="inline-flex items-center text-primary font-bold hover:gap-3 gap-1 transition-all group">
                Xem tất cả việc làm 
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Senior Frontend Engineer", company: "VNG Corporation", salary: "$2,000 - $3,500", location: "Hồ Chí Minh", tag: "HOT" },
                { title: "Product Manager", company: "Tiki", salary: "$1,800 - $2,800", location: "Hà Nội", tag: "NEW" },
                { title: "UI/UX Designer", company: "FPT Software", salary: "$1,200 - $2,000", location: "Đà Nẵng", tag: "" },
              ].map((job, index) => (
                <JobCard key={index} {...job} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== PROCESS SECTION ==================== */}
        <section className="py-24 bg-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.05)_0%,transparent_50%)]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-full mb-4">
                CÁCH HOẠT ĐỘNG
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Quy trình ứng tuyển dễ dàng</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Chỉ 3 bước đơn giản để bắt đầu hành trình sự nghiệp mới của bạn</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              
              <Step icon="account_circle" step="1" title="Tạo tài khoản" desc="Đăng ký thành viên và hoàn thiện hồ sơ cá nhân của bạn." />
              <Step icon="description" step="2" title="Tạo/Tải CV" desc="Dùng công cụ tạo CV online hoặc tải lên file sẵn có." />
              <Step icon="send" step="3" title="Ứng tuyển ngay" desc="Tìm kiếm và gửi hồ sơ trực tiếp đến nhà tuyển dụng." />
            </div>
          </div>
        </section>

        {/* ==================== CTA SECTION ==================== */}
        <section className="py-24 bg-gradient-to-br from-primary via-blue-600 to-violet-600 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              Sẵn sàng khởi đầu sự nghiệp mới?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Hàng ngàn công ty đang chờ đợi bạn. Đăng ký ngay hôm nay và nhận thông báo về những công việc phù hợp nhất.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/register" 
                className="btn-shine inline-flex items-center h-14 px-10 bg-white text-primary text-lg font-bold rounded-2xl shadow-xl shadow-black/10 transition-all hover:-translate-y-1 active:scale-95"
              >
                Đăng ký miễn phí
                <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </Link>
              <Link 
                href="/employer" 
                className="inline-flex items-center h-14 px-10 border-2 border-white/30 hover:bg-white/10 text-white text-lg font-bold rounded-2xl transition-all hover:-translate-y-1"
              >
                Dành cho nhà tuyển dụng
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

// ==================== COMPONENTS ====================

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <div>
      <p className="text-2xl md:text-3xl font-black text-primary">{value}</p>
      <p className="text-slate-500 font-medium">{label}</p>
    </div>
  );
}

interface JobCardProps {
  title: string;
  company: string;
  salary: string;
  location: string;
  tag: string;
  index: number;
}

function JobCard({ title, company, salary, location, tag, index }: JobCardProps) {
  return (
    <div 
      className="group bg-white p-6 rounded-3xl border border-slate-100 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-violet-500/0 group-hover:from-primary/5 group-hover:to-violet-500/5 transition-all duration-500" />
      
      <div className="relative z-10">
        {/* Tag */}
        {tag && (
          <span className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl rounded-tr-2xl ${
            tag === "HOT" ? "bg-red-500 text-white" : "bg-green-500 text-white"
          }`}>
            {tag}
          </span>
        )}
        
        <div className="flex items-center gap-4 mb-6">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center border border-primary/10 font-bold text-primary group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined">business</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-slate-500">{company}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            <span className="material-symbols-outlined text-sm mr-1">location_on</span>
            {location}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-bold">
            {salary}
          </span>
        </div>
        
        <button className="btn-shine w-full py-3.5 rounded-2xl border-2 border-primary/20 text-primary font-bold hover:bg-primary hover:text-white hover:border-primary transition-all duration-300">
          Ứng tuyển ngay
        </button>
      </div>
    </div>
  );
}

interface StepProps {
  icon: string;
  step: string;
  title: string;
  desc: string;
}

function Step({ icon, step, title, desc }: StepProps) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* Icon container */}
      <div className="relative mb-8">
        <div className="size-24 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/40 transition-all duration-300">
          <span className="material-symbols-outlined text-4xl">{icon}</span>
        </div>
        {/* Step number badge */}
        <div className="absolute -top-3 -right-3 size-10 rounded-full bg-white border-4 border-primary text-primary flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
          {step}
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-slate-500 leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}