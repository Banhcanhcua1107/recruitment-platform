"use client";
import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { login } from "@/app/(auth)/actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // 1. Google Login
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // 2. Xử lý Đăng nhập bằng Email/Password
  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
       alert("Đăng nhập thất bại: " + result.error);
       setLoading(false);
    }
    // Thành công sẽ tự redirect trong server action
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      
      {/* --- PHẦN BÊN TRÁI: FORM ĐĂNG NHẬP (Dành cho Mobile 100%, Desktop ~45%) --- */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[45%] relative py-12">
        
        <div className="mx-auto w-full max-w-[440px]">
          {/* NÚT QUAY LẠI TRANG CHỦ */}
          <div className="mb-10">
            <Link 
              href="/" 
              className="group inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[15px] uppercase tracking-wider"
            >
              <span className="material-symbols-outlined font-bold group-hover:-translate-x-1 transition-transform">
                arrow_back
              </span>
              Trang chủ
            </Link>
          </div>

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-4 mb-12">
            <div className="size-12">
              <img src="/logo.png" className="scale-150 w-full h-full object-contain" alt="Logo" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">TalentFlow</h2>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">Chào mừng trở lại!</h1>
          <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">Đăng nhập để tiếp tục hành trình sự nghiệp của bạn.</p>
          
          <form onSubmit={handleEmailLogin} className="space-y-7">
            {/* NHẬP GMAIL (EMAIL) */}
            <div className="space-y-2.5">
              <label htmlFor="email" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
              <input 
                id="email"
                name="email"
                type="email" 
                required
                placeholder="vidu@gmail.com" 
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
              />
            </div>

            {/* NHẬP MẬT KHẨU */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="block text-sm font-black text-slate-400 uppercase tracking-widest">Mật khẩu</label>
                <Link href="#" className="text-sm font-bold text-primary hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <input 
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••" 
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined font-bold">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* NÚT ĐĂNG NHẬP CHÍNH */}
            <button 
              disabled={loading}
              className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="mt-10">
            <div className="relative mb-8 text-center">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
               <span className="relative bg-white px-5 text-sm font-black text-slate-400 uppercase tracking-widest">Hoặc đăng nhập bằng</span>
            </div>
            
            {/* NÚT ĐĂNG NHẬP GOOGLE */}
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-4 rounded-2xl py-4.5 border-2 border-slate-100 bg-white font-black text-lg hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="size-6" alt="Google" />
              Tiếp tục với Google
            </button>
          </div>

          <p className="mt-12 text-center text-lg text-slate-500 font-bold">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary hover:underline underline-offset-4 decoration-2">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>

      {/* --- PHẦN BÊN PHẢI: HÌNH ẢNH & TESTIMONIAL (CHỈ HIỆN TRÊN DESKTOP) --- */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img 
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Office space"
        />
        {/* Navy Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
        
        {/* Nội dung bên trong ảnh */}
        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <div className="flex gap-1 mb-6 text-yellow-400">
             {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined filled text-3xl">star</span>)}
          </div>
          <blockquote className="text-4xl font-black leading-[1.2] mb-10 tracking-tight">
            &quot;TalentFlow không chỉ giúp tôi tìm thấy công việc, mà còn giúp tôi xây dựng một hồ sơ chuyên nghiệp để tự tin tỏa sáng.&quot;
          </blockquote>
          <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md p-5 rounded-[24px] border border-white/20">
            <div className="h-16 w-16 rounded-2xl border-2 border-white overflow-hidden shadow-lg shrink-0">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976" className="w-full h-full object-cover" alt="User" />
            </div>
            <div>
                <p className="text-xl font-black tracking-tight">Nguyễn Thị Thu Hà</p>
                <p className="text-white/70 font-bold text-base italic uppercase tracking-wider">HR Manager @ TechCorp</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}