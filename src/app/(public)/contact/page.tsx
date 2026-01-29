"use client";
import React from "react";

export default function ContactPage() {
  return (
    <main className="flex-1 bg-[#f6f7f8] font-['Manrope']">
      
      {/* 1. HERO SECTION - Giống hệt hình mẫu */}
      <section className="w-full py-10 lg:py-14 px-6">
        <div className="max-w-[1360px] mx-auto">
          <div 
            className="flex min-h-[450px] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-[32px] items-center justify-center p-8 lg:p-16 relative overflow-hidden shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069")`
            }}
          >
            <div className="relative z-10 flex flex-col gap-5 text-center max-w-[800px]">
              <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight">
                Liên hệ & Hỗ trợ
              </h1>
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed opacity-90">
                Chúng tôi luôn sẵn sàng lắng nghe bạn. Hãy kết nối với bộ phận hỗ trợ hoặc ghé thăm văn phòng của chúng tôi để được giải đáp mọi thắc mắc.
              </p>
            </div>
            <div className="relative z-10 mt-4">
              <button className="px-10 py-4 bg-primary hover:bg-primary-hover text-white transition-all rounded-xl font-bold text-lg shadow-xl shadow-primary/30 active:scale-95">
                Gửi tin nhắn ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THÔNG TIN LIÊN HỆ - 3 Cột giống hệt hình */}
      <section className="max-w-[1360px] mx-auto px-6 py-10">
        <div className="flex flex-col gap-3 mb-12">
          <h2 className="text-slate-900 text-4xl font-black tracking-tight">Thông tin liên hệ</h2>
          <p className="text-slate-500 text-lg font-bold">Kết nối trực tiếp qua các kênh chính thức của TalentFlow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card Email */}
          <ContactInfoCard 
            icon="mail" 
            title="Email Hỗ trợ" 
            detail="support@talentflow.vn" 
            sub="Phản hồi trong vòng 24h" 
          />
          {/* Card Hotline */}
          <ContactInfoCard 
            icon="call" 
            title="Hotline" 
            detail="1900 1234" 
            sub="Thứ 2 - Thứ 6 (8:00 - 17:30)" 
          />
          {/* Card Địa chỉ */}
          <ContactInfoCard 
            icon="location_on" 
            title="Văn phòng" 
            detail="Tầng 12, Tòa nhà Innovation" 
            sub="Quận 1, TP. Hồ Chí Minh" 
          />
        </div>
      </section>

      {/* 3. FORM & MAP SECTION - Giống hệt bố cục hình mẫu */}
      <section className="max-w-[1360px] mx-auto px-6 py-16 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Cột trái: Form gửi tin nhắn */}
          <div className="flex flex-col gap-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Gửi tin nhắn cho chúng tôi</h2>
              <p className="text-slate-500 text-lg font-bold">Vui lòng điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.</p>
            </div>
            
            <form className="bg-white p-8 lg:p-12 rounded-[32px] border border-slate-100 shadow-xl space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-base font-black text-slate-900">Họ và tên</label>
                <input 
                  id="name" 
                  type="text" 
                  placeholder="Nhập họ tên của bạn" 
                  className="w-full h-14 rounded-xl border-slate-200 bg-slate-50 px-5 font-bold text-lg focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-base font-black text-slate-900">Email liên hệ</label>
                <input 
                  id="email" 
                  type="email" 
                  placeholder="example@email.com" 
                  className="w-full h-14 rounded-xl border-slate-200 bg-slate-50 px-5 font-bold text-lg focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-base font-black text-slate-900">Vấn đề cần hỗ trợ</label>
                <div className="relative">
                  <select id="subject" className="w-full h-14 rounded-xl border-slate-200 bg-slate-50 px-5 font-bold text-lg focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer text-slate-700">
                    <option value="">Chọn vấn đề</option>
                    <option value="candidate">Tôi là Ứng viên</option>
                    <option value="hr">Tôi là Nhà tuyển dụng</option>
                    <option value="tech">Hỗ trợ kỹ thuật</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-base font-black text-slate-900">Nội dung tin nhắn</label>
                <textarea 
                  id="message" 
                  rows={4} 
                  placeholder="Mô tả chi tiết vấn đề của bạn..." 
                  className="w-full rounded-xl border-slate-200 bg-slate-50 p-5 font-bold text-lg focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button className="w-full h-16 bg-primary hover:bg-primary-hover text-white font-black text-xl rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95">
                <span>Gửi tin nhắn</span>
                <span className="material-symbols-outlined font-bold text-2xl">send</span>
              </button>
            </form>
          </div>

          {/* Cột phải: Bản đồ thực tế ảo */}
          <div className="flex flex-col gap-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Vị trí văn phòng</h2>
              <p className="text-slate-500 text-lg font-bold">Ghé thăm chúng tôi tại trung tâm Quận 1.</p>
            </div>
            
            <div className="flex-1 min-h-[500px] rounded-[32px] overflow-hidden relative border border-slate-200 shadow-lg group">
              <img 
                src="https://placehold.co/600x800?text=MAP+VIEW" 
                alt="Office Map" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              {/* HQ Overlay giống hệt hình */}
              <div className="absolute bottom-8 left-8 bg-white p-6 rounded-2xl shadow-2xl max-w-[280px] border border-slate-50">
                <div className="flex items-start gap-4">
                  <div className="text-primary mt-1">
                    <span className="material-symbols-outlined text-3xl font-bold">business</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-base">TalentFlow HQ</p>
                    <p className="text-slate-500 font-bold text-xs mt-1">Tòa nhà Innovation, Quận 1</p>
                    <a href="#" className="text-primary text-sm font-black mt-4 inline-block hover:underline">
                      Xem trên Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

// --- SUB-COMPONENT ---

function ContactInfoCard({ icon, title, detail, sub }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
        <span className="material-symbols-outlined text-3xl font-bold">{icon}</span>
      </div>
      <h3 className="text-slate-900 text-xl font-black mb-1">{title}</h3>
      <p className="text-primary font-bold text-lg mb-2 truncate">{detail}</p>
      <p className="text-slate-400 font-bold text-sm italic">{sub}</p>
    </div>
  );
}