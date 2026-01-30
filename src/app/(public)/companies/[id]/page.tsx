"use client";
import React from "react";
import Link from "next/link";

export default function CompanyProfilePage() {
  return (
    <main className="bg-[#f6f7f8] min-h-screen pb-20 font-['Manrope']">
      
      {/* 1. HERO BANNER SECTION - Cao và thoáng */}
      <section className="relative w-full h-64 md:h-80 lg:h-[450px] overflow-hidden">
        <div 
          className="w-full h-full bg-center bg-no-repeat bg-cover flex flex-col justify-end"
          style={{ 
            backgroundImage: `url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069")` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        </div>
      </section>

      {/* 2. COMPANY IDENTITY HEADER - Logo đè lên Banner */}
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10">
        <div className="relative z-10 -mt-20 lg:-mt-24 flex flex-col lg:flex-row items-end justify-between gap-8">
          <div className="flex flex-col lg:flex-row items-end lg:items-center gap-8 w-full">
            {/* Logo bự */}
            <div className="bg-white p-3 rounded-[32px] shadow-2xl border-4 border-white shrink-0 group">
              <div className="size-32 lg:size-44 rounded-[24px] overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                <img src="https://placehold.co/400x400?text=LOGO" alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            
            <div className="flex flex-col mb-4">
              <h1 className="text-3xl lg:text-5xl font-black text-slate-900 lg:text-white tracking-tight drop-shadow-sm">
                Công ty Công nghệ BlueTech
              </h1>
              <p className="text-primary lg:text-blue-200 text-xl lg:text-2xl font-bold mt-2 italic drop-shadow-sm">
                Kiến tạo tương lai số - Chuyên gia giải pháp phần mềm
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full lg:w-auto gap-4 pb-4">
            <button className="flex-1 lg:flex-none min-w-[160px] h-14 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-50 transition-all active:scale-95 border border-slate-100">
              Theo dõi
            </button>
            <button className="flex-1 lg:flex-none min-w-[160px] h-14 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:bg-primary-hover transition-all active:scale-95">
              Ghé thăm Website
            </button>
          </div>
        </div>

        {/* 3. NAVIGATION TABS - To và rõ */}
        <div className="mt-12 border-b-2 border-slate-100 flex gap-12 overflow-x-auto no-scrollbar">
          <TabLink label="Giới thiệu" active />
          <TabLink label="Việc làm (12)" />
          <TabLink label="Hình ảnh" />
          <TabLink label="Đánh giá" />
        </div>

        {/* 4. MAIN CONTENT GRID (70/30) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
          
          {/* CỘT TRÁI (70%): GIỚI THIỆU & GALLERY */}
          <div className="lg:col-span-8 space-y-12">
            <section>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-6 flex items-center gap-4 uppercase tracking-tight">
                <span className="w-2 h-10 bg-primary rounded-full"></span>
                Giới thiệu công ty
              </h2>
              <div className="text-slate-600 text-lg lg:text-xl font-medium leading-relaxed space-y-6 opacity-90">
                <p>Được thành lập từ năm 2015, BlueTech là một trong những công ty công nghệ đi đầu trong việc cung cấp các giải pháp chuyển đổi số toàn diện. Với đội ngũ hơn 500 chuyên gia tài năng, chúng tôi không chỉ xây dựng phần mềm mà còn kiến tạo những giá trị bền vững cho doanh nghiệp.</p>
                <p>Tầm nhìn của chúng tôi là trở thành biểu tượng niềm tin hàng đầu Việt Nam về dịch vụ phần mềm chất lượng quốc tế, góp phần đưa trí tuệ Việt vươn tầm thế giới.</p>
              </div>
            </section>

            {/* Info Cards bự 125% */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoCard icon="location_on" title="Địa chỉ" detail="Tháp Keangnam, Hà Nội" />
              <InfoCard icon="groups" title="Quy mô" detail="500 - 1000 nhân viên" />
              <InfoCard icon="category" title="Lĩnh vực" detail="Phần mềm & AI" />
            </div>

            {/* Gallery Section */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                   <span className="w-2 h-10 bg-primary rounded-full"></span>
                   Văn phòng làm việc
                </h2>
                <button className="text-primary font-black text-lg hover:underline">Xem tất cả ảnh</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GalleryImage src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069" />
                <GalleryImage src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070" />
                <GalleryImage src="https://images.unsplash.com/photo-1531973576160-7125cd663d86?q=80&w=2070" />
              </div>
            </section>
          </div>

          {/* CỘT PHẢI (30%): VIỆC LÀM & CHIA SẺ */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm sticky top-28">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900 italic">
                <span className="material-symbols-outlined text-primary text-3xl font-bold">work</span>
                Việc làm đang mở
              </h3>
              
              <div className="space-y-6">
                <MiniJobCard title="Senior React Developer" loc="Hà Nội" salary="$2,500 - $3,500" />
                <MiniJobCard title="Product Designer (UI/UX)" loc="TP. HCM" salary="Thỏa thuận" />
                <MiniJobCard title="DevOps Engineer" loc="Remote" salary="$1,800 - $2,800" />
              </div>

              <button className="w-full mt-10 py-4 rounded-2xl bg-primary/5 text-primary font-black text-lg hover:bg-primary hover:text-white transition-all shadow-sm">
                Xem tất cả 12 vị trí
              </button>

              <div className="mt-10 pt-10 border-t border-slate-50">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 italic">Chia sẻ qua</p>
                <div className="flex gap-4">
                  <ShareIcon icon="share" color="bg-slate-100 text-slate-600 hover:bg-primary" />
                  <ShareIcon icon="public" color="bg-slate-100 text-slate-600 hover:bg-blue-600" />
                  <ShareIcon icon="mail" color="bg-slate-100 text-slate-600 hover:bg-red-500" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---

function TabLink({ label, active = false }: any) {
  return (
    <Link href="#" className={`pb-4 border-b-4 text-xl font-black transition-all whitespace-nowrap ${
      active ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
    }`}>
      {label}
    </Link>
  );
}

function InfoCard({ icon, title, detail }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-5 shadow-sm hover:border-primary/30 transition-all">
      <div className="bg-primary/5 p-4 rounded-2xl text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl font-bold">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-lg font-black text-slate-900">{detail}</p>
      </div>
    </div>
  );
}

function GalleryImage({ src }: { src: string }) {
  return (
    <div className="aspect-[4/3] rounded-[24px] overflow-hidden shadow-lg border-4 border-white hover:scale-[1.05] transition-transform duration-500 cursor-zoom-in">
      <img src={src} className="w-full h-full object-cover" alt="Office" />
    </div>
  );
}

function MiniJobCard({ title, loc, salary }: any) {
  return (
    <div className="group p-5 rounded-2xl border-2 border-slate-50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
      <h4 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">{title}</h4>
      <div className="flex items-center gap-2 mt-3 text-slate-400 font-bold">
        <span className="material-symbols-outlined text-xl">location_on</span>
        <span className="text-sm">{loc}</span>
      </div>
      <div className="flex items-center justify-between mt-5">
        <span className="text-primary font-black text-base">{salary}</span>
        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg">Apply</span>
      </div>
    </div>
  );
}

function ShareIcon({ icon, color }: any) {
  return (
    <div className={`size-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:text-white hover:shadow-lg ${color}`}>
      <span className="material-symbols-outlined text-2xl font-bold">{icon}</span>
    </div>
  );
}