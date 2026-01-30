"use client";
import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("candidate"); // 'candidate' hoặc 'hr'
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  // 1. Xử lý Đăng ký bằng Google
  const handleGoogleRegister = async () => {
    // Lưu role vào localStorage để sau khi Google quay lại, 
    // chúng ta biết user này thuộc nhóm nào để lưu vào database
    localStorage.setItem("pending_role", role);
    
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  // 2. Xử lý Đăng ký bằng Email (Demo logic)
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Code xử lý signUp của Supabase sẽ được thêm ở bước làm Backend
    alert("Tính năng đăng ký email đang được kết nối với Database...");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      
      {/* --- PHẦN BÊN TRÁI: FORM ĐĂNG KÝ (50%) --- */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[50%] relative py-12">
        
        <div className="mx-auto w-full max-w-[480px]">
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
          <div className="flex items-center gap-4 mb-10">
            <div className="size-12">
              <img src="/logo.png" className="scale-150 w-full h-full object-contain" alt="Logo" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter">TalentFlow</h2>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">Tham gia ngay!</h1>
          <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">Bắt đầu hành trình sự nghiệp hoặc tìm kiếm nhân tài.</p>
          
          <form onSubmit={handleEmailRegister} className="space-y-6">
            
            {/* CHỌN VAI TRÒ (BỰ RÕ) */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                  role === "candidate" 
                  ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                  : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-3xl">person</span>
                Ứng viên
              </button>
              <button
                type="button"
                onClick={() => setRole("hr")}
                className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                  role === "hr" 
                  ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                  : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                Nhà tuyển dụng
              </button>
            </div>

            {/* HỌ VÀ TÊN */}
            <div className="space-y-2.5">
              <label htmlFor="fullname" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
              <input 
                id="fullname"
                type="text" 
                required
                placeholder="Nguyễn Văn A" 
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all" 
              />
            </div>

            {/* EMAIL */}
            <div className="space-y-2.5">
              <label htmlFor="email" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
              <input 
                id="email"
                type="email" 
                required
                placeholder="vidu@gmail.com" 
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all" 
              />
            </div>

            {/* MẬT KHẨU */}
            <div className="space-y-2.5">
              <label htmlFor="password" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="Tối thiểu 8 ký tự" 
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all" 
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

            <button 
              disabled={loading}
              className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all mt-4"
            >
              {loading ? "Đang xử lý..." : "Tạo tài khoản miễn phí"}
            </button>
          </form>

          {/* GOOGLE REGISTER ONLY */}
          <div className="mt-10">
            <div className="relative mb-8 text-center">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
               <span className="relative bg-white px-5 text-sm font-black text-slate-400 uppercase tracking-widest">Đăng ký nhanh với</span>
            </div>
            
            <button 
              onClick={handleGoogleRegister}
              className="w-full flex items-center justify-center gap-4 rounded-2xl py-4.5 border-2 border-slate-100 bg-white font-black text-lg hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="size-6" alt="Google" />
              Tiếp tục với Google
            </button>
          </div>

          <p className="mt-12 text-center text-lg text-slate-500 font-bold">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline underline-offset-4 decoration-2">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>

      {/* --- PHẦN BÊN PHẢI: IMAGE & QUOTE (ẨN TRÊN MOBILE) --- */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img 
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1974&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="TalentFlow Office"
        />
        {/* Gradient Overlay chuyên nghiệp */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
        
        {/* Nội dung truyền cảm hứng */}
        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <div className="flex gap-1 mb-6 text-yellow-400">
             {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined filled text-3xl">star</span>)}
          </div>
          <blockquote className="text-4xl font-black leading-[1.2] mb-10 tracking-tight">
            "Sự nghiệp của bạn bắt đầu từ những lựa chọn đúng đắn. Hãy để TalentFlow kết nối bạn với những cơ hội tốt nhất."
          </blockquote>
          <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md p-5 rounded-[24px] border border-white/20">
            <div className="h-16 w-16 rounded-2xl border-2 border-white overflow-hidden shadow-lg shrink-0">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974" className="w-full h-full object-cover" alt="User" />
            </div>
            <div>
                <p className="text-xl font-black tracking-tight">Lê Minh Nhật</p>
                <p className="text-white/70 font-bold text-base italic uppercase tracking-wider">Fullstack Developer @ Google</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}