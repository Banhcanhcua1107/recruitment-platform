"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Eye, EyeOff, MailCheck, Star, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { signInWithGoogle } from "@/utils/supabase/auth-helpers";
import { signup, verifyOtp } from "@/app/(auth)/actions";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const requestedRole = searchParams.get("role") === "employer" ? "employer" : "candidate";
  const [step, setStep] = useState<"register" | "otp">("register");
  const [emailForOtp, setEmailForOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"candidate" | "employer">(requestedRole);

  const handleGoogleRegister = async () => {
    await signInWithGoogle(supabase);
  };

  const handleEmailRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      alert("Mat khau nhap lai khong khop!");
      return;
    }

    setLoading(true);
    formData.append("role", role);

    const result = await signup(formData);

    if (result?.error) {
      alert(`Loi: ${result.error}`);
      setLoading(false);
    } else if (result?.success) {
      setEmailForOtp(formData.get("email") as string);
      setStep("otp");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = await verifyOtp(emailForOtp, otp);

    if (result?.error) {
      alert(`Loi xac thuc: ${result.error}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white font-['Manrope'] text-slate-900">
      <div className="relative flex flex-1 flex-col justify-center px-8 py-12 lg:max-w-[50%] lg:px-20 xl:px-32">
        {step === "register" && (
          <div className="absolute left-8 top-10 lg:left-20 xl:left-32">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-[15px] font-black uppercase tracking-wider text-slate-400 transition-all hover:text-primary"
            >
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              Trang chu
            </Link>
          </div>
        )}

        <div className="mx-auto w-full max-w-120">
          <div className="mb-10 flex items-center gap-4">
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
            <h2 className="text-3xl font-black tracking-tighter">TalentFlow</h2>
          </div>

          {step === "register" ? (
            <>
              <h1 className="mb-3 text-4xl font-black tracking-tight lg:text-5xl">Tham gia ngay!</h1>
              <p className="mb-10 text-lg font-bold italic text-slate-500 opacity-80">
                Bắt đầu hành trình sự nghiệp cùng chúng tôi.
              </p>

              <form onSubmit={handleEmailRegister} className="space-y-6">
                <div className="mb-10 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("candidate")}
                    className={`flex flex-col items-center gap-2 rounded-3xl border-2 py-5 text-[17px] font-black transition-all ${
                      role === "candidate"
                        ? "border-primary bg-primary/5 text-primary shadow-lg"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <UserRound className="size-8" aria-hidden="true" />
                    Ứng viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("employer")}
                    className={`flex flex-col items-center gap-2 rounded-3xl border-2 py-5 text-[17px] font-black transition-all ${
                      role === "employer"
                        ? "border-primary bg-primary/5 text-primary shadow-lg"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <Building2 className="size-8" aria-hidden="true" />
                    Nhà tuyển dụng
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="fullname" className="ml-1 block text-sm font-black uppercase tracking-widest text-slate-400">
                    Họ và tên
                  </label>
                  <input
                    id="fullname"
                    name="fullName"
                    type="text"
                    required
                    placeholder="Nguyen Van A"
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-lg font-bold shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary"
                  />
                </div>

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
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-lg font-bold shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="password" className="ml-1 block text-sm font-black uppercase tracking-widest text-slate-400">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Tối thiểu 8 ký tự"
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

                <div className="space-y-2.5">
                  <label htmlFor="confirmPassword" className="ml-1 block text-sm font-black uppercase tracking-widest text-slate-400">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Nhập lại mật khẩu"
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4.5 text-lg font-bold shadow-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                    >
                      {showConfirmPassword ? (
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
                  {loading ? "Đang xử lý..." : "Tạo tài khoản miễn phí"}
                </button>
              </form>

              <div className="mt-10">
                <div className="relative mb-8 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <span className="relative bg-white px-5 text-sm font-black uppercase tracking-widest text-slate-400">
                    Hoặc
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleRegister}
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
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Đăng nhập ngay
                </Link>
              </p>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4">
                <MailCheck className="size-6 text-green-600" aria-hidden="true" />
                <div>
                  <p className="font-bold text-green-800">Kiểm tra email của bạn!</p>
                  <p className="mt-1 text-sm text-green-700">
                    Mã xác thực 6 số đã được gửi đến <b>{emailForOtp}</b>
                  </p>
                </div>
              </div>

              <h1 className="mb-3 text-4xl font-black tracking-tight lg:text-5xl">Xác thực tài khoản</h1>
              <p className="mb-10 text-lg font-bold italic text-slate-500 opacity-80">
                Nhập mã OTP để hoàn tất đăng ký.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-8">
                <div className="space-y-2.5">
                  <label className="ml-1 block text-center text-sm font-black uppercase tracking-widest text-slate-400">
                    Mã OTP (6 số)
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    className="mt-2 w-full rounded-3xl border-2 border-slate-100 bg-slate-50 px-4 py-6 text-center text-4xl font-black tracking-[0.5em] text-slate-900 shadow-sm outline-none transition-all focus:border-primary focus:bg-white"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-xl font-black text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary-hover active:scale-95"
                >
                  {loading ? "Đang xác thực..." : "Xác nhận & Đăng nhập"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setStep("register")}
                  className="mx-auto flex items-center justify-center gap-2 text-base font-bold text-slate-400 transition-colors hover:text-primary"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Quay lại đăng ký
                </button>
              </div>
            </div>
          )}
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
