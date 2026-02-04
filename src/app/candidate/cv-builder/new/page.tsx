"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Link from 'next/link';

export default function NewCVPage() {
  const router = useRouter();

  const handleSelectMode = (mode: 'template' | 'canvas') => {
    // In a real app, calls API to create record
    const newId = uuidv4();
    // Redirect to editor
    router.push(`/candidate/cv-builder/${newId}/edit?mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-['Manrope']">
      <div className="text-center max-w-2xl mb-12">
        <Link href="/candidate/cv-builder" className="text-slate-400 font-bold text-sm mb-4 inline-block hover:text-primary transition-colors">
            ← Quay lại Dashboard
        </Link>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          Bắt đầu tạo CV của bạn
        </h1>
        <p className="text-slate-600 text-lg font-medium">
          Chọn cách bạn muốn bắt đầu. Bạn có thể thay đổi bố cục bất cứ lúc nào sau này.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Option 1: Template */}
        <button
          onClick={() => handleSelectMode('template')}
          className="group relative flex flex-col items-start p-10 bg-white rounded-3xl border-2 border-slate-200 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all text-left"
        >
          <div className="size-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">dashboard</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-primary transition-colors">
            Sử dụng Mẫu có sẵn
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            Chọn từ các mẫu chuyên nghiệp được thiết kế sẵn. Điền thông tin vào các ô và xem kết quả ngay lập tức. Phù hợp cho người mới bắt đầu.
          </p>
          <span className="mt-auto py-2.5 px-6 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
            Chọn Mẫu này
          </span>
          
           {/* Badge Recommended */}
          <div className="absolute top-6 right-6 px-3 py-1 bg-green-100 text-green-700 text-[11px] font-black uppercase tracking-wider rounded-full">
            Khuyên dùng
          </div>
        </button>

        {/* Option 2: Canvas */}
        <button
          onClick={() => handleSelectMode('canvas')}
          className="group flex flex-col items-start p-10 bg-white rounded-3xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/10 transition-all text-left"
        >
          <div className="size-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">drag_pan</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
            Tự thiết kế (Canvas)
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            Tự do kéo thả và sắp xếp các thành phần trên trang giấy trắng. Dành cho người muốn kiểm soát hoàn toàn bố cục.
          </p>
          <span className="mt-auto py-2.5 px-6 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
            Chọn Canvas
          </span>
        </button>
      </div>
    </div>
  );
}
