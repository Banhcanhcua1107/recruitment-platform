"use client";
import React from "react";
import Link from "next/link";


export default function HomePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f7f8]">


      <main className="flex-1">
      {/* SECTION 1: HERO - Padding vừa phải */}
        <section className="relative bg-white pt-16 pb-24 overflow-hidden"> 
          <div className="max-w-[1360px] mx-auto px-6 lg:px-10 relative z-10 flex flex-col items-center">
            
            {/* Cấu trúc Grid với gap-16 (64px) - Tách nhau vừa đủ đẹp */}
            <div className="grid lg:grid-cols-2 gap-24 items-center mb-16 text-left w-full">
              
              {/* BÊN TRÁI: NỘI DUNG */}
              <div>
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-sm font-bold text-primary mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Nền tảng sự nghiệp thế hệ mới
                </div>
                
                {/* Tiêu đề: text-6xl là chuẩn 125%, chữ "công việc" đi kèm hàng đầu */}
                <h1 className="text-slate-900 text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight mb-6">
                  Kết nối với <span className="text-primary italic whitespace-nowrap">công việc</span> <br className="hidden lg:block" /> 
                  bạn hằng mong ước
                </h1>
                
                <p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed max-w-xl opacity-90">
                  Khám phá hàng ngàn cơ hội nghề nghiệp từ các doanh nghiệp uy tín nhất. Tạo CV chuyên nghiệp và ứng tuyển chỉ trong 1 phút.
                </p>
              </div>

              {/* BÊN PHẢI: HÌNH ẢNH */}
              <div className="hidden lg:block relative">
                <div className="w-full h-[460px] bg-slate-100 rounded-[32px] overflow-hidden shadow-xl relative group">
                  <img 
                    alt="Hero Image" 
                    className="w-full h-full object-cover" 
                    src="https://placehold.co/600x400" 
                  />
                  

                </div>
              </div>
            </div>

            {/* THANH TÌM KIẾM - Thu gọn lại max-w-5xl, h-16 (64px) */}
            <div className="w-full max-w-5xl bg-white rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-slate-50 p-5">
              <div className="flex flex-col md:flex-row gap-3">
                
                {/* Input Vị trí */}
                <div className="flex-[1.4] flex items-center px-5 h-16 bg-slate-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mr-3">search</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0" 
                    placeholder="Vị trí ứng tuyển, kỹ năng..." 
                    type="text"
                  />
                </div>
                
                {/* Input Địa điểm */}
                <div className="flex-1 flex items-center px-5 h-16 bg-slate-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-primary/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mr-3">location_on</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-slate-900 text-lg placeholder:text-slate-400 focus:ring-0" 
                    placeholder="Địa điểm (Toàn quốc)..." 
                    type="text"
                  />
                </div>

                {/* Nút Tìm kiếm ngay */}
                <button className="h-16 px-10 bg-primary hover:bg-blue-600 text-white text-lg font-bold rounded-xl shadow-md transition-all active:scale-95">
                  Tìm kiếm ngay
                </button>
              </div>

              {/* Gợi ý nằm gọn bên trong Card */}
              <div className="mt-4 flex flex-wrap gap-4 px-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-tight">Gợi ý:</span>
                {["Developer", "Marketing", "Kế toán", "Thiết kế"].map((tag) => (
                  <Link key={tag} href={`/search?q=${tag}`} className="text-slate-500 hover:text-primary transition-colors font-semibold">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* --- SECTION 2: FEATURED JOBS --- */}
        <section className="py-20 bg-[#f6f7f8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Việc làm nổi bật</h2>
                <p className="text-slate-500 mt-2">Đừng bỏ lỡ những cơ hội tốt nhất được cập nhật mỗi ngày.</p>
              </div>
              <Link href="/jobs" className="inline-flex items-center text-primary font-bold hover:gap-2 transition-all">
                Xem tất cả việc làm <span className="material-symbols-outlined ml-1">arrow_forward</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <JobCard key={item} />
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 3: PROCESS --- */}
        <section className="py-20 bg-white text-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-black text-slate-900 mb-16">Quy trình ứng tuyển dễ dàng</h2>
                <div className="grid md:grid-cols-3 gap-12">
                    <Step icon="account_circle" step="1" title="Tạo tài khoản" desc="Đăng ký thành viên và hoàn thiện hồ sơ cá nhân." />
                    <Step icon="description" step="2" title="Tạo/Tải CV" desc="Dùng công cụ tạo CV online hoặc tải lên file sẵn có." />
                    <Step icon="send" step="3" title="Ứng tuyển" desc="Tìm kiếm và gửi hồ sơ trực tiếp đến nhà tuyển dụng." />
                </div>
            </div>
        </section>
      </main>


    </div>
  );
}

// --- SUPPORTING COMPONENTS ---

function JobCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 font-bold text-primary">
            JOB
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">Senior Frontend Engineer</h3>
          <p className="text-sm text-slate-500">Tech Solutions Co.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Hà Nội</span>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">$1,500 - $2,500</span>
      </div>
      <button className="w-full py-3 rounded-xl border-2 border-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-all">Ứng tuyển</button>
    </div>
  );
}

function Step({ icon, step, title, desc }: any) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="size-20 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg mb-8 relative">
        <span className="material-symbols-outlined text-4xl">{icon}</span>
        <div className="absolute -top-3 -right-3 size-8 rounded-full bg-white border-4 border-primary text-primary flex items-center justify-center font-black text-sm">{step}</div>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-500">{desc}</p>
    </div>
  );
}