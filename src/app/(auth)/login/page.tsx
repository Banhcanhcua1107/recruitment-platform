"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden">
      {/* PHẦN BÊN TRÁI: FORM */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-24 xl:px-32 lg:max-w-[45%] relative">
        
        {/* NÚT BACK VỀ TRANG CHỦ (Vị trí mới) */}
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

        <div className="mx-auto w-full max-w-[420px]">
          {/* Logo TalentFlow */}
          <Link href="/" className="flex items-center gap-4 mb-16">
            <div className="size-12">
              <img src="/logo.png" className="scale-125 w-full h-full object-contain" alt="Logo" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">TalentFlow</h2>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">Chào mừng trở lại!</h1>
          <p className="text-lg text-slate-500 mb-10 font-medium">Tiếp tục hành trình sự nghiệp của bạn ngay hôm nay.</p>
          
          <form className="space-y-8">
            <div>
              <label className="block text-lg font-bold mb-3 text-slate-800">Email</label>
              <input 
                type="email" 
                placeholder="nhanvien@example.com" 
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4.5 px-6 text-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-lg font-bold text-slate-800">Mật khẩu</label>
                <Link href="#" className="text-sm font-bold text-primary hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4.5 px-6 text-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" 
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

            <button className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all">
              Đăng nhập
            </button>
          </form>

          <p className="mt-12 text-center text-lg text-slate-500 font-medium">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary font-black hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      {/* PHẦN BÊN PHẢI: IMAGE */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img 
          src="https://placehold.co/600x400" 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Login background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <blockquote className="text-3xl font-bold leading-relaxed mb-8">
            "Nền tảng giúp kết nối nhân tài và doanh nghiệp một cách nhanh chóng nhất."
          </blockquote>
          <p className="text-xl font-black">Nguyễn Thị Thu Hà</p>
          <p className="text-white/80 font-medium">HR Manager @ TechCorp</p>
        </div>
      </div>
    </div>
  );
}