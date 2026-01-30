"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Thêm router để chuyển trang
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  // 1. Quản lý trạng thái
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("candidate"); 

  // 2. Quản lý dữ liệu form
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 3. Xử lý Đăng ký bằng Google
  const handleGoogleRegister = async () => {
    // Lưu role vào localStorage để sau khi Google callback về, 
    // trang chọn role hoặc API sẽ biết user này muốn làm gì.
    localStorage.setItem("pending_role", role);
    
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  // 4. Xử lý Đăng ký bằng Email
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert("Mật khẩu nhập lại không khớp!");
      return;
    }

    setLoading(true);

    // signUp sẽ tạo user trong Auth, và Trigger SQL sẽ tự copy sang bảng profiles
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullname, // Key này phải khớp với Trigger SQL
          role: role,          // Key này phải khớp với Trigger SQL
        },
      },
    });

    if (error) {
      alert("Lỗi: " + error.message);
    } else {
      if (data.user?.identities?.length === 0) {
        alert("Email này đã được đăng ký trước đó.");
      } else {
        alert("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.");
        router.push("/login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[50%] relative py-12">
        
        {/* NÚT QUAY LẠI */}
        <div className="absolute top-10 left-8 lg:left-20 xl:left-32">
          <Link href="/" className="group inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[15px] uppercase tracking-wider">
            <span className="material-symbols-outlined font-bold group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Trang chủ
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[480px]">
          <div className="flex items-center gap-4 mb-10">
            <div className="size-12"><img src="/logo.png" className="scale-150 w-full h-full object-contain" alt="Logo" /></div>
            <h2 className="text-3xl font-black tracking-tighter">TalentFlow</h2>
          </div>

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
                onClick={() => setRole("hr")}
                className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                  role === "hr" ? "border-primary bg-primary/5 text-primary shadow-lg" : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-3xl">corporate_fare</span> Nhà tuyển dụng
              </button>
            </div>

            {/* HỌ VÀ TÊN */}
            <div className="space-y-2.5">
              <label htmlFor="fullname" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
              <input 
                id="fullname" type="text" required placeholder="Nguyễn Văn A" 
                value={fullname} onChange={(e) => setFullname(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
              />
            </div>

            {/* EMAIL */}
            <div className="space-y-2.5">
              <label htmlFor="email" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
              <input 
                id="email" type="email" required placeholder="vidu@gmail.com" 
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm" 
              />
            </div>

            {/* MẬT KHẨU */}
            <div className="space-y-2.5">
              <label htmlFor="password" className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative">
                <input 
                  id="password" type={showPassword ? "text" : "password"} required placeholder="Tối thiểu 8 ký tự" 
                  value={password} onChange={(e) => setPassword(e.target.value)}
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
                  id="confirmPassword" type={showConfirmPassword ? "text" : "password"} required placeholder="Nhập lại mật khẩu" 
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
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
        </div>
      </div>

      {/* PHẦN BÊN PHẢI GIỮ NGUYÊN... */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
         {/* Giữ nguyên code ảnh và quote từ file cũ của bạn */}
      </div>
    </div>
  );
}