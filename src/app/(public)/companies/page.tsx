"use client";
import React from "react";
import CompanyCard from "@/components/companies/CompanyCard";

export default function CompaniesPage() {
  const companies = [
    { name: "TechVision Global", industry: "Công nghệ phần mềm", location: "TP. HCM", size: "500-1000", jobCount: 12 },
    { name: "Global Bank Corp", industry: "Tài chính / Ngân hàng", location: "Hà Nội", size: "1000+", jobCount: 8 },
    { name: "Creative Hub", industry: "Thiết kế / Marketing", location: "TP. HCM", size: "50-100", jobCount: 5 },
    { name: "Vin-IT Solutions", industry: "Công nghệ thông tin", location: "Đà Nẵng", size: "200-500", jobCount: 15 },
    { name: "E-Logistics JSC", industry: "Vận chuyển / Kho bãi", location: "Bình Dương", size: "100-200", jobCount: 3 },
    { name: "Green Energy Group", industry: "Năng lượng tái tạo", location: "Hà Nội", size: "500+", jobCount: 7 },
  ];

  return (
    <main className="bg-[#f6f7f8] min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-white border-b border-slate-100 pt-16 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto text-center">
          <h1 className="text-slate-900 text-4xl lg:text-6xl font-black leading-tight mb-4 tracking-tight">
            Khám phá các <span className="text-primary">doanh nghiệp</span> hàng đầu
          </h1>
          <p className="text-slate-500 text-lg lg:text-xl font-bold mb-12">
            Tìm hiểu về môi trường làm việc và cơ hội nghề nghiệp tại những công ty uy tín nhất.
          </p>

          {/* Thanh tìm kiếm công ty */}
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100">
            <div className="flex-1 flex items-center px-6 gap-4 bg-slate-50 rounded-2xl">
              <span className="material-symbols-outlined text-slate-400 text-2xl font-bold">business</span>
              <input 
                className="w-full h-16 border-none bg-transparent focus:ring-0 text-lg font-bold placeholder:text-slate-400" 
                placeholder="Nhập tên công ty..." 
              />
            </div>
            <button className="h-16 px-12 bg-primary hover:bg-primary-hover text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3">
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="max-w-[1360px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh sách công ty nổi bật</h2>
            <p className="text-lg font-bold text-slate-400">Được sắp xếp dựa trên mức độ quan tâm của ứng viên.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 px-6 rounded-2xl border border-slate-100 shadow-sm">
             <span className="font-bold text-slate-400">Quy mô:</span>
             <select className="bg-transparent border-none focus:ring-0 text-primary font-black py-1 cursor-pointer text-lg" aria-label="Lọc công ty theo quy mô">
                <option>Tất cả</option>
                <option>Lớn (500+)</option>
                <option>Vừa (100-500)</option>
                <option>Nhỏ (dưới 100)</option>
             </select>
          </div>
        </div>

        {/* Lưới danh sách công ty */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {companies.map((company, index) => (
            <CompanyCard key={index} {...company} />
          ))}
        </div>

        {/* Nút xem thêm */}
        <div className="mt-20 text-center">
          <button className="px-12 py-5 border-2 border-slate-200 text-slate-500 hover:border-primary hover:text-primary font-black text-xl rounded-2xl transition-all">
            Xem thêm doanh nghiệp
          </button>
        </div>
      </section>
    </main>
  );
}