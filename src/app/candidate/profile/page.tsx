"use client";
import React from "react";
import Link from "next/link";

export default function CandidateProfilePage() {
  return (
    <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CỘT TRÁI: NỘI DUNG CHÍNH (8 CỘT) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* 1. Profile Header Card */}
          <div className="bg-white rounded-[32px] shadow-sm overflow-hidden p-8 border border-slate-100">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative group">
                  <div className="size-32 lg:size-40 rounded-[32px] overflow-hidden shadow-xl border-4 border-white">
                    <img 
                      src="https://placehold.co/400x400?text=AVATAR" 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-all">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </button>
                </div>
                
                <div className="text-center md:text-left flex flex-col justify-center">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900">Nguyễn Văn A</h1>
                    <span className="material-symbols-outlined text-primary text-3xl font-bold filled">verified</span>
                  </div>
                  <p className="text-primary font-black text-xl lg:text-2xl mt-2">Senior Frontend Developer</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 mt-2 font-bold text-lg">
                    <span className="material-symbols-outlined">location_on</span>
                    <span>Quận 7, TP. Hồ Chí Minh</span>
                  </div>
                  <div className="flex gap-3 mt-6 justify-center md:justify-start">
                    <span className="px-4 py-1.5 bg-green-100 text-green-700 text-sm font-black rounded-full uppercase tracking-wider">Đang tìm việc</span>
                    <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-black rounded-full">8+ năm kinh nghiệm</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button className="flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all">
                  <span className="material-symbols-outlined">description</span>
                  Xem CV công khai
                </button>
                <button className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all border border-slate-100">
                  <span className="material-symbols-outlined">share</span>
                  Chia sẻ hồ sơ
                </button>
              </div>
            </div>
          </div>

          {/* 2. Thông tin cá nhân */}
          <SectionCard title="Thông tin cá nhân" icon="person" hasEdit>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
              <InfoField label="Email" value="nguyenvana@email.com" />
              <InfoField label="Số điện thoại" value="0901 234 567" />
              <InfoField label="Địa chỉ" value="123 Đường ABC, Tân Phong, Quận 7, TP. HCM" />
              <InfoField label="Ngày sinh" value="01/01/1995" />
              <InfoField label="Giới tính" value="Nam" />
              <InfoField label="Tình trạng hôn nhân" value="Độc thân" />
            </div>
          </SectionCard>

          {/* 3. Kinh nghiệm làm việc */}
          <SectionCard title="Kinh nghiệm làm việc" icon="work" hasAdd>
            <div className="space-y-12 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-1 before:bg-slate-50">
              <ExperienceItem 
                title="Senior Frontend Developer"
                company="TechCorp Global Solutions"
                time="05/2021 - Hiện tại (3 năm 2 tháng)"
                desc={[
                  "Dẫn dắt đội ngũ 5 lập trình viên phát triển hệ thống Dashboard cho khách hàng doanh nghiệp.",
                  "Tối ưu hiệu suất ứng dụng React, giảm thời gian tải trang xuống 40%.",
                  "Xây dựng thư viện component nội bộ dùng chung cho 3 dự án khác nhau."
                ]}
              />
              <ExperienceItem 
                title="Frontend Developer"
                company="StartupHub Vietnam"
                time="01/2018 - 04/2021 (3 năm 4 tháng)"
                desc={[
                  "Phát triển giao diện người dùng cho ứng dụng TMĐT đa nền tảng. Phối hợp với team UI/UX để chuyển đổi thiết kế sang code pixel-perfect."
                ]}
              />
            </div>
          </SectionCard>

          {/* 4. Học vấn */}
          <SectionCard title="Học vấn" icon="school" hasAdd>
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white hover:border-primary/30 transition-all">
                <div className="flex gap-6">
                    <div className="size-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-3xl">account_balance</span>
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900">Đại học Công nghệ Thông tin - ĐHQG TP.HCM</h3>
                        <p className="text-primary font-bold text-lg">Chuyên ngành: Kỹ thuật Phần mềm</p>
                        <p className="text-slate-400 font-bold mt-2 italic text-base">Tốt nghiệp năm 2017 • GPA: 3.6/4.0</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"><span className="material-symbols-outlined">edit</span></button>
                    <button className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><span className="material-symbols-outlined">delete</span></button>
                </div>
             </div>
          </SectionCard>

        </div>

        {/* CỘT PHẢI: SIDEBAR (4 CỘT) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Độ hoàn thiện hồ sơ */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <p className="text-xl font-black text-slate-900">Độ hoàn thiện hồ sơ</p>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-xl font-black">85%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(30,77,183,0.4)]" style={{ width: "85%" }}></div>
            </div>
            <div className="mt-6 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  Hồ sơ đầy đủ giúp bạn tăng <span className="text-primary font-black text-base">3.5 lần</span> cơ hội được chú ý.
                </p>
              </div>
              <button className="w-full mt-4 text-sm font-black text-primary hover:underline flex items-center justify-center gap-2">
                Thêm mục tiêu nghề nghiệp (+15%)
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Kỹ năng chuyên môn */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">terminal</span> Kỹ năng
                </h3>
                <button className="text-primary"><span className="material-symbols-outlined text-3xl">add_circle</span></button>
            </div>
            <div className="flex flex-wrap gap-3">
              {["ReactJS", "TypeScript", "Tailwind CSS", "Redux", "Next.js", "Node.js", "Git / GitHub"].map(skill => (
                <span key={skill} className="px-4 py-2 bg-slate-50 text-slate-700 font-black text-sm rounded-2xl flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all group">
                  {skill}
                  <span className="material-symbols-outlined text-base cursor-pointer text-slate-300 group-hover:text-primary">close</span>
                </span>
              ))}
              <button className="px-4 py-2 border-2 border-dashed border-slate-200 text-slate-400 font-black text-sm rounded-2xl hover:border-primary hover:text-primary transition-all">
                + Thêm
              </button>
            </div>
          </div>

          {/* Ngoại ngữ */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
             <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">translate</span> Ngoại ngữ
             </h3>
             <div className="space-y-8">
                <LanguageSkill label="Tiếng Anh (IELTS 7.5)" level="Thành thạo" percent="85%" />
                <LanguageSkill label="Tiếng Nhật (N3)" level="Giao tiếp" percent="50%" />
             </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-gradient-to-br from-primary to-indigo-900 rounded-[40px] p-10 text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
            <h3 className="text-2xl font-black mb-4 relative z-10">Bạn cần tư vấn sự nghiệp?</h3>
            <p className="text-blue-100 font-bold mb-8 leading-relaxed text-lg relative z-10">Kết nối với chuyên gia để được review CV miễn phí.</p>
            <button className="w-full py-4 bg-white text-primary font-black rounded-2xl text-lg hover:bg-blue-50 transition-all active:scale-95 shadow-xl relative z-10">
              Đăng ký ngay
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- SUPPORTING COMPONENTS ---

function SectionCard({ title, icon, hasEdit, hasAdd, children }: any) {
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
        <h2 className="text-2xl font-black flex items-center gap-4 text-slate-900 uppercase tracking-tight">
          <span className="material-symbols-outlined text-primary text-3xl font-bold">{icon}</span>
          {title}
        </h2>
        {hasEdit && (
          <button className="text-primary hover:underline text-base font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">edit</span> Chỉnh sửa
          </button>
        )}
        {hasAdd && (
          <button className="flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-xl text-base font-black hover:bg-primary hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">add</span> Thêm mới
          </button>
        )}
      </div>
      <div className="p-8 lg:p-10">{children}</div>
    </div>
  );
}

function InfoField({ label, value }: any) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-slate-400 text-sm font-black uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ExperienceItem({ title, company, time, desc }: any) {
  return (
    <div className="relative pl-14 pb-4">
      <div className="absolute left-4 top-1.5 size-5 rounded-full bg-primary border-4 border-white shadow-md z-10"></div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-2xl text-slate-900 leading-tight">{title}</h3>
          <p className="text-primary font-black text-xl mt-1">{company}</p>
          <p className="text-slate-400 font-bold text-base mt-2 italic">{time}</p>
        </div>
        <div className="flex gap-2">
            <button className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"><span className="material-symbols-outlined text-2xl">edit</span></button>
            <button className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><span className="material-symbols-outlined text-2xl">delete</span></button>
        </div>
      </div>
      <div className="mt-5 text-lg font-medium text-slate-600 leading-relaxed">
        <ul className="list-disc pl-5 space-y-3">
          {desc.map((item: string, i: number) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function LanguageSkill({ label, level, percent }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-lg font-black text-slate-800">{label}</p>
        <span className="text-sm font-black text-slate-400 uppercase tracking-tight">{level}</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(30,77,183,0.3)]" style={{ width: percent }}></div>
      </div>
    </div>
  );
}