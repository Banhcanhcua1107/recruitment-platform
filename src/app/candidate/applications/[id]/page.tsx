"use client";
import React from "react";
import Link from "next/link";

export default function ApplicationDetailPage() {
  return (
    <main className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 space-y-8 font-['Manrope']">
      
      {/* 1. BREADCRUMBS - To rõ */}
      <nav className="flex items-center gap-3 text-base font-bold text-slate-400">
        <Link href="/" className="hover:text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-xl">home</span> Trang chủ
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href="/candidate/applications" className="hover:text-primary">Việc làm của tôi</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-slate-900 font-black tracking-tight">Chi tiết đơn ứng tuyển</span>
      </nav>

      {/* 2. HEADER CARD - Thông tin công việc nộp */}
      <section className="bg-white rounded-[32px] p-8 lg:p-10 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex gap-6 items-center">
            <div className="size-20 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner shrink-0">
              <img 
                src="https://placehold.co/200x200?text=TECH" 
                alt="Logo" 
                className="w-12 h-12 object-contain" 
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Senior UI/UX Designer</h1>
                <span className="px-3 py-1 rounded-lg bg-primary/5 text-primary text-xs font-black uppercase tracking-widest border border-primary/10">
                  Toàn thời gian
                </span>
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-500 mb-3 italic">TechFlow Solutions • Quận 1, TP. HCM</p>
              <div className="flex flex-wrap gap-6 text-base font-black text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">calendar_today</span> 
                  Đã nộp: 24/10/2026
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">payments</span> 
                  $2,500 - $3,500
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-slate-50 text-slate-700 px-8 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all text-base border border-slate-200">
              <span className="material-symbols-outlined">description</span>
              Xem CV đã nộp
            </button>
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 text-base active:scale-95">
              <span className="material-symbols-outlined">chat</span>
              Nhắn tin với HR
            </button>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT GRID - Tiến độ & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* CỘT TRÁI (8 CỘT): TIẾN ĐỘ ỨNG TUYỂN */}
        <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tiến độ ứng tuyển</h2>
            <span className="bg-green-100 text-green-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-green-200">
              Đang tiến hành
            </span>
          </div>
          
          <div className="p-10 lg:p-14">
            <div className="flex flex-col gap-0">
              {/* Bước 1: Đã hoàn thành */}
              <TimelineStep 
                icon="check_circle" 
                title="Đã nộp đơn ứng tuyển" 
                desc="Hệ thống đã nhận được hồ sơ của bạn và chuyển đến bộ phận nhân sự TechFlow." 
                time="24/10/2026 • 09:00 AM" 
                isDone 
              />

              {/* Bước 2: Đã hoàn thành */}
              <TimelineStep 
                icon="visibility" 
                title="Nhà tuyển dụng đã xem hồ sơ" 
                desc="Hồ sơ của bạn đã được chuyên viên tuyển dụng Nguyễn Phương Linh xem xét." 
                time="25/10/2026 • 02:15 PM" 
                isDone 
              />

              {/* Bước 3: Đang diễn ra (Mời phỏng vấn) */}
              <div className="flex gap-8 relative pb-14">
                <div className="absolute left-6 top-12 bottom-0 w-[3px] bg-slate-100 border-dashed border-l-2"></div>
                <div className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 z-10 animate-pulse">
                  <span className="material-symbols-outlined text-2xl font-bold">calendar_month</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xl lg:text-2xl font-black text-slate-900">Mời phỏng vấn trực tuyến</p>
                    <span className="bg-blue-100 text-primary text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">Mới</span>
                  </div>
                  
                  {/* Hộp nội dung thư mời */}
                  <div className="mt-5 p-6 lg:p-8 bg-primary/5 border border-primary/10 rounded-3xl space-y-4">
                    <p className="text-slate-700 text-lg font-bold leading-relaxed">
                      Chúc mừng! Bạn được mời tham gia vòng Technical Interview qua Google Meet.
                    </p>
                    <div className="flex flex-col gap-2 pt-2 border-t border-primary/10">
                      <p className="text-primary text-lg font-black flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl">video_call</span> 
                        Link Meet: meet.google.com/xyz-abc-123
                      </p>
                      <p className="text-slate-500 text-base font-bold">
                        <span className="text-slate-900">Thời gian:</span> 10:00 AM, Thứ Hai 27/10/2026
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-4 font-bold italic">26/10/2026 • 10:00 AM</p>
                </div>
              </div>

              {/* Bước 4: Tương lai */}
              <TimelineStep 
                icon="emoji_events" 
                title="Kết quả cuối cùng" 
                desc="Đang chờ phản hồi sau vòng phỏng vấn chuyên môn." 
                isLast 
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4 CỘT): SIDEBAR THÔNG TIN */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Người phụ trách */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight italic">Người phụ trách</h3>
            <div className="flex items-center gap-5 mb-8">
              <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                <span className="material-symbols-outlined text-3xl font-bold">person</span>
              </div>
              <div>
                <p className="text-slate-900 font-black text-xl leading-tight">Nguyễn Phương Linh</p>
                <p className="text-slate-400 font-bold text-sm mt-1 uppercase">Talent Acquisition</p>
              </div>
            </div>
            <button className="w-full py-4 bg-slate-50 text-primary font-black text-base rounded-2xl hover:bg-primary hover:text-white transition-all border border-primary/10">
              Gửi lời chào kết nối
            </button>
          </div>

          {/* Tóm tắt nhanh */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Tóm tắt</h3>
            <SummaryItem icon="location_on" label="Vị trí" value="Tòa nhà Bitexco, Q.1, HCM" />
            <SummaryItem icon="work" label="Cấp bậc" value="Senior (3-5 năm exp)" />
            <SummaryItem icon="groups" label="Quy mô" value="100 - 500 nhân viên" />
          </div>

          {/* Danger Zone */}
          <div className="pt-4">
            <button className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 font-black text-sm py-4 transition-all hover:bg-red-50 rounded-2xl">
              <span className="material-symbols-outlined text-xl">cancel</span>
              Rút đơn ứng tuyển này
            </button>
          </div>

        </aside>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS (Tỉ lệ 125%) ---

function TimelineStep({ icon, title, desc, time, isDone = false, isLast = false }: any) {
  return (
    <div className="flex gap-8 relative pb-14">
      {/* Đường nối giữa các bước */}
      {!isLast && (
        <div className={`absolute left-6 top-12 bottom-0 w-[3px] ${isDone ? 'bg-primary' : 'bg-slate-100'}`}></div>
      )}
      
      {/* Icon Circle */}
      <div className={`size-12 rounded-full flex items-center justify-center z-10 shadow-lg ${
        isDone ? 'bg-primary text-white shadow-primary/30' : 'bg-slate-100 text-slate-400'
      }`}>
        <span className="material-symbols-outlined text-2xl font-bold">{icon}</span>
      </div>

      {/* Text Content */}
      <div className="flex-1">
        <p className={`text-xl lg:text-2xl font-black ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
          {title}
        </p>
        <p className={`text-base lg:text-lg font-bold mt-2 leading-relaxed ${isDone ? 'text-slate-500' : 'text-slate-300'}`}>
          {desc}
        </p>
        {time && (
          <p className="text-slate-400 text-sm mt-3 font-bold italic flex items-center gap-1.5 uppercase tracking-wide">
            <span className="material-symbols-outlined text-base">schedule</span> {time}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: any) {
  return (
    <div className="flex items-start gap-4">
      <span className="material-symbols-outlined text-slate-300 text-2xl font-bold mt-0.5">{icon}</span>
      <div>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{label}</p>
        <p className="text-slate-900 text-lg font-bold leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}