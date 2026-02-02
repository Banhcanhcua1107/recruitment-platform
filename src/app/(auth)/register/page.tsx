"use client";
import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { signup, verifyOtp } from "@/app/(auth)/actions";

export default function RegisterPage() {
  const supabase = createClient();

  // 1. Quản lý trạng thái
  const [step, setStep] = useState<"register" | "otp">("register");
  const [emailForOtp, setEmailForOtp] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("candidate"); 

  // 2. Google Register
  const handleGoogleRegister = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // 3. Xử lý Đăng ký bằng Email
  const handleEmailRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      alert("Mật khẩu nhập lại không khớp!");
      return;
    }

    setLoading(true);

    // Append role explicitly
    formData.append("role", role);

    const result = await signup(formData);

    if (result?.error) {
       alert("Lỗi: " + result.error);
       setLoading(false);
    } else if (result?.success) {
       // CHUYỂN QUA BƯỚC NHẬP OTP
       setEmailForOtp(formData.get("email") as string);
       setStep("otp");
       setLoading(false);
    }
  };

  // 4. Xử lý xác thực OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Gọi Server Action verify
    const result = await verifyOtp(emailForOtp, otp);
    
    if (result?.error) {
        alert("Lỗi xác thực: " + result.error);
        setLoading(false);
    }
    // Thành công sẽ tự redirect trong server action
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      
      {/* ----------------- PHẦN BÊN TRÁI: FORM ----------------- */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[50%] relative py-12">
        
        {/* NÚT QUAY LẠI (Chỉ hiện ở bước register) */}
        {step === "register" && (
            <div className="absolute top-10 left-8 lg:left-20 xl:left-32">
            <Link href="/" className="group inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[15px] uppercase tracking-wider">
                <span className="material-symbols-outlined font-bold group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Trang chủ
            </Link>
            </div>
        )}

        <div className="mx-auto w-full max-w-[480px]">
          <div className="flex items-center gap-4 mb-10">
            <div className="size-12"><img src="/logo.png" className="scale-150 w-full h-full object-contain" alt="Logo" /></div>
            <h2 className="text-3xl font-black tracking-tighter">TalentFlow</h2>
          </div>

          {/* ============================================================ */}
          {/*                     VIEW 1: ĐĂNG KÝ FORM                     */}
          {/* ============================================================ */}
          {step === "register" && (
            <>
                <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">Tham gia ngay!</h1>
                <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">Bắt đầu hành trình sự nghiệp cùng chúng tôi.</p>
                
                <form onSubmit={handleEmailRegister} className="space-y-6">
                    {/* CHỌN VAI TRÒ */}
                    <div className="grid grid-cols-2 gap-4 mb-10">
                    <button
                        type="button"
                        onClick={() => setRole("candidate")}
                        className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                        role === "candidate" ? "border-primary bg-primary/5 text-primary shadow-lg" : "border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                    >
                        <span className="material-symbols-outlined text-3xl">person</span> Ứng viên
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole("employer")}
                        className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                        role === "employer" ? "border-primary bg-primary/5 text-primary shadow-lg" : "border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                    >
                        <span className="material-symbols-outlined text-3xl">corporate_fare</span> Nhà tuyển dụng
                    </button>
                    </div>

                    {/* HỌ VÀ TÊN */}
                    <div className="space-y-2.5">
                    <label htmlFor="fullname" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                    <input 
                        id="fullname" name="fullName" type="text" required placeholder="Nguyễn Văn A" 
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
                    />
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-2.5">
                    <label htmlFor="email" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
                    <input 
                        id="email" name="email" type="email" required placeholder="vidu@gmail.com" 
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
                    />
                    </div>

                    {/* MẬT KHẨU */}
                    <div className="space-y-2.5">
                    <label htmlFor="password" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                    <div className="relative">
                        <input 
                        id="password" name="password" type={showPassword ? "text" : "password"} required placeholder="Tối thiểu 8 ký tự" 
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined font-bold">{showPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                    </div>
                    </div>

                    {/* NHẬP LẠI MẬT KHẨU */}
                    <div className="space-y-2.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                    <div className="relative">
                        <input 
                        id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required placeholder="Nhập lại mật khẩu" 
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined font-bold">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                    </div>
                    </div>

                    <button disabled={loading} className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all">
                    {loading ? "Đang xử lý..." : "Tạo tài khoản miễn phí"}
                    </button>
                </form>

                {/* GOOGLE REGISTER */}
                <div className="mt-10">
                    <div className="relative mb-8 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <span className="relative bg-white px-5 text-sm font-black text-slate-400 uppercase tracking-widest">Hoặc</span>
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
                    Đã có tài khoản? <Link href="/login" className="text-primary hover:underline">Đăng nhập ngay</Link>
                </p>
            </>
          )}

          {/* ============================================================ */}
          {/*                       VIEW 2: OTP FORM                       */}
          {/* ============================================================ */}
          {step === "otp" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-8 p-4 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600">mark_email_read</span>
                    <div>
                        <p className="font-bold text-green-800">Kiểm tra email của bạn!</p>
                        <p className="text-sm text-green-700 mt-1">Mã xác thực 6 số đã được gửi đến <b>{emailForOtp}</b></p>
                    </div>
                </div>

                <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">Xác thực tài khoản</h1>
                <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">Nhập mã OTP để hoàn tất đăng ký.</p>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                     <div className="space-y-2.5">
                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1 text-center">MÃ OTP (6 SỐ)</label>
                        <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full mt-2 px-4 py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none focus:border-primary focus:bg-white transition-all text-center text-4xl tracking-[0.5em] shadow-sm"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
                     </div>

                     <button 
                        disabled={loading}
                        type="submit" 
                        className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                     >
                       {loading ? "Đang xác thực..." : "Xác nhận & Đăng nhập"}
                     </button>
                </form>

                <div className="text-center mt-8">
                  <button onClick={() => setStep("register")} className="text-base font-bold text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Quay lại đăng ký
                  </button>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* ----------------- PHẦN BÊN PHẢI: ẢNH MINH HỌA ----------------- */}
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