"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("candidate"); // candidate hoặc hr

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden">
      
      {/* PHẦN BÊN TRÁI: FORM ĐĂNG KÝ */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-24 xl:px-32 lg:max-w-[50%] relative py-20">
        
        {/* NÚT BACK VỀ TRANG CHỦ */}
        <div className="absolute top-10 left-8 lg:left-24 xl:left-32">
          <Link 
            href="/" 
            className="group flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-base"
          >
            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Quay lại trang chủ
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          {/* Logo TalentFlow */}
          <Link href="/" className="flex items-center gap-4 mb-10">
            <div className="size-12">
              <img src="/logo.png" className="scale-125 w-full h-full object-contain" alt="Logo" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">TalentFlow</h2>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">Tham gia ngay!</h1>
          <p className="text-lg text-slate-500 mb-8 font-medium">Bắt đầu hành trình sự nghiệp hoặc tìm kiếm nhân tài hàng đầu.</p>
          
          <form className="space-y-6">
            {/* CHỌN VAI TRÒ (CỰC KỲ QUAN TRỌNG) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-4 rounded-2xl font-bold text-base border-2 transition-all ${
                  role === "candidate" 
                  ? "border-primary bg-primary/5 text-primary shadow-sm" 
                  : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                }`}
              >
                Tôi là Ứng viên
              </button>
              <button
                type="button"
                onClick={() => setRole("hr")}
                className={`py-4 rounded-2xl font-bold text-base border-2 transition-all ${
                  role === "hr" 
                  ? "border-primary bg-primary/5 text-primary shadow-sm" 
                  : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                }`}
              >
                Tôi là Nhà tuyển dụng
              </button>
            </div>

            {/* HỌ VÀ TÊN */}
            <div>
              <label className="block text-lg font-bold mb-2 text-slate-800">Họ và tên</label>
              <input 
                type="text" 
                placeholder="Nguyễn Văn A" 
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 px-6 text-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-lg font-bold mb-2 text-slate-800">Email</label>
              <input 
                type="email" 
                placeholder="nhanvien@example.com" 
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 px-6 text-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
              />
            </div>

            {/* MẬT KHẨU */}
            <div>
              <label className="block text-lg font-bold mb-2 text-slate-800">Mật khẩu</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Tối thiểu 8 ký tự" 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 px-6 text-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all mt-4">
              Tạo tài khoản ngay
            </button>
          </form>

          {/* Social Register */}
          <div className="mt-8">
            <div className="relative mb-6 text-center">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
               <span className="relative bg-white px-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Hoặc đăng ký với</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 rounded-2xl py-3 border border-slate-200 font-bold hover:bg-slate-50 transition-all">
                <img src="https://placehold.co/600x400" className="size-5" alt="Google" /> Google
              </button>
              <button className="flex items-center justify-center gap-3 rounded-2xl py-3 border border-slate-200 font-bold hover:bg-slate-50 transition-all">
                <img src="https://placehold.co/600x400" className="size-5" alt="LinkedIn" /> LinkedIn
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-lg text-slate-500 font-medium">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary font-black hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>

      {/* PHẦN BÊN PHẢI: IMAGE & QUOTE */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img 
          src="https://placehold.co/600x400" 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Register background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <blockquote className="text-3xl font-bold leading-relaxed mb-8">
            "Sự nghiệp của bạn bắt đầu từ những lựa chọn đúng đắn. Hãy để TalentFlow đồng hành cùng bạn."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full border-2 border-white overflow-hidden shadow-lg">
                <img src="https://placehold.co/600x400" className="w-full h-full object-cover" />
            </div>
            <div>
                <p className="text-xl font-black">Lê Minh Nhật</p>
                <p className="text-white/80 font-medium">Fullstack Developer @ Google</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}