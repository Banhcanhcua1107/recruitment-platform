"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { signInWithGoogle } from "@/utils/supabase/auth-helpers";
import { login } from "@/app/(auth)/actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await signInWithGoogle(supabase);
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      alert(`Dang nhap that bai: ${result.error}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white font-['Manrope'] text-slate-900">
      <div className="relative flex flex-1 flex-col justify-center px-8 py-12 lg:max-w-[45%] lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-110">
          <div className="mb-10">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-[15px] font-black uppercase tracking-wider text-slate-400 transition-all hover:text-primary"
            >
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              Trang chu
            </Link>
          </div>

          <Link href="/" className="mb-12 flex items-center gap-4">
            <div className="size-12">
              <Image
                src="/logo.png"
                className="h-full w-full scale-150 object-contain"
                alt="Logo"
                width={48}
                height={48}
                priority
              />
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-slate-900">TalentFlow</h2>
          </Link>

          <h1 className="mb-3 text-4xl font-black tracking-tight lg:text-5xl">Chào mừng trở lại!</h1>
          <p className="mb-10 text-lg font-bold italic text-slate-500 opacity-80">
            Đăng nhập để tiếp tục hành trình sự nghiệp của bạn.
          </p>

          <form onSubmit={handleEmailLogin} className="space-y-7">
            <div className="space-y-2.5">
              <label htmlFor="email" className="ml-1 block text-sm font-black uppercase tracking-widest text-slate-400">
                Địa chỉ Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="vidu@gmail.com"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4.5 text-lg font-bold shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="password" className="block text-sm font-black uppercase tracking-widest text-slate-400">
                  Mật khẩu
                </label>
                <Link href="#" className="text-sm font-bold text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4.5 text-lg font-bold shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-primary py-5 text-xl font-black text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary-hover active:scale-95"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative bg-white px-5 text-sm font-black uppercase tracking-widest text-slate-400">
                Hoặc đăng nhập bằng
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-4 rounded-2xl border-2 border-slate-100 bg-white py-4.5 text-lg font-black shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="size-6"
                alt="Google"
                width={24}
                height={24}
              />
              Tiếp tục với Google
            </button>
          </div>

          <p className="mt-12 text-center text-lg font-bold text-slate-500">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary underline-offset-4 decoration-2 hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden flex-1 bg-slate-100 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          className="object-cover"
          alt="Office space"
          fill
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-primary/90 via-primary/20 to-transparent" />

        <div className="absolute bottom-20 left-20 max-w-xl text-white">
          <div className="mb-6 flex gap-1 text-yellow-400">
            {[...Array(5)].map((_, index) => (
              <Star key={index} className="size-7 fill-current" aria-hidden="true" />
            ))}
          </div>
          <blockquote className="mb-10 text-4xl font-black leading-[1.2] tracking-tight">
            &quot;TalentFlow không chỉ giúp tôi tìm thấy công việc, mà còn giúp tôi xây dựng một hồ sơ chuyên
            nghiệp để tự tin tỏa sáng.&quot;
          </blockquote>
          <div className="flex items-center gap-5 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976"
                className="h-full w-full object-cover"
                alt="User"
                width={64}
                height={64}
                sizes="64px"
              />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">Nguyễn Thị Thu Hà</p>
              <p className="text-base font-bold uppercase tracking-wider text-white/70 italic">HR Manager @ TechCorp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
