# Full Source Code: Authentication System

Tài liệu này chứa **toàn bộ source code gốc** (không rút gọn) của các file liên quan đến hệ thống Authentication Auth.

---

## 1. Database & SQL

### `Schema & Policies` (Manual Handling Version)

```sql
-- 1. Tạo Enum user_role
CREATE TYPE user_role AS ENUM ('candidate', 'hr');

-- 2. Tạo bảng profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role user_role, -- Cho phép NULL ban đầu
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Bật RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Các Policy
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Cấp quyền
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

### Bảng Tổng Hợp Schema: `public.profiles`

| Tên Cột      | Kiểu Dữ Liệu | Mô Tả                    | Ghi Chú                                                                                |
| :----------- | :----------- | :----------------------- | :------------------------------------------------------------------------------------- |
| `id`         | `UUID`       | Khóa chính (Primary Key) | Foreign Key tham chiếu `auth.users(id)`.                                               |
| `full_name`  | `TEXT`       | Họ và tên                | Lấy từ metadata hoặc nhập tay.                                                         |
| `email`      | `TEXT`       | Địa chỉ Email            | Đồng bộ từ bảng `auth.users`.                                                          |
| `avatar_url` | `TEXT`       | Link ảnh đại diện        |                                                                                        |
| `role`       | `user_role`  | Vai trò (Enum)           | Giá trị: `'candidate'` hoặc `'hr'`. Có thể `NULL` (nếu reg qua Google chưa chọn role). |
| `updated_at` | `TIMESTAMP`  | Thời gian cập nhật       | Mặc định là `now()`.                                                                   |

---

## 2. Server Actions

### `src/app/(auth)/actions.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Type-casting here for convenience
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check role to redirect correctly
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "hr") {
      redirect("/hr/dashboard");
    } else if (profile?.role === "candidate") {
      redirect("/candidate/dashboard");
    } else {
      redirect("/role-selection");
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  // Role form input: "candidate" or "employer" -> Map employer to "hr"
  const roleInput = formData.get("role") as string;
  const role = roleInput === "employer" ? "hr" : "candidate";

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role, // Pass role to metadata
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Manual profile creation to avoid Trigger reliance
  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role,
      })
      .select();

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }
  }

  if (data.session) {
    if (role === "hr") redirect("/hr/dashboard");
    else redirect("/candidate/dashboard");
  }

  return { success: "Check your email to confirm your account." };
}

export async function updateRole(role: "candidate" | "employer") {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const dbRole = role === "employer" ? "hr" : "candidate";

  const { error } = await supabase
    .from("profiles")
    .update({ role: dbRole })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating role:", error);
    return { error: "Failed to update role" };
  }

  revalidatePath("/", "layout");

  if (dbRole === "hr") redirect("/hr/dashboard");
  else redirect("/candidate/dashboard");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

---

## 3. Middleware & Configuration

### `src/utils/supabase/middleware.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Tạo Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 2. Refresh Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 3. Logic Redirect

  // A. Nếu người dùng ĐÃ đăng nhập
  if (user) {
    if (path.startsWith("/login") || path.startsWith("/register")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role;

      if (!role) {
        return NextResponse.redirect(new URL("/role-selection", request.url));
      }

      if (role === "hr") {
        return NextResponse.redirect(new URL("/hr/dashboard", request.url));
      } else {
        return NextResponse.redirect(
          new URL("/candidate/dashboard", request.url),
        );
      }
    }

    if (path.startsWith("/role-selection")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role) {
        if (profile.role === "hr")
          return NextResponse.redirect(new URL("/hr/dashboard", request.url));
        return NextResponse.redirect(
          new URL("/candidate/dashboard", request.url),
        );
      }
    }
  }

  // B. Nếu người dùng CHƯA đăng nhập
  if (!user) {
    if (
      path.startsWith("/candidate") ||
      path.startsWith("/hr") ||
      path.startsWith("/profile") ||
      path.startsWith("/role-selection")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}
```

### `src/middleware.ts`

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 4. Supabase Utilities

### `src/utils/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

### `src/utils/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
```

---

## 5. UI Pages & Components

### `src/app/(auth)/login/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { login } from "@/app/(auth)/actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // 1. Xử lý Đăng nhập bằng Google
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
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      {/* --- PHẦN BÊN TRÁI: FORM ĐĂNG NHẬP --- */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[45%] relative py-12">
        <div className="mx-auto w-full max-w-[440px]">
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

          <Link href="/" className="flex items-center gap-4 mb-12">
            <div className="size-12">
              <img
                src="/logo.png"
                className="scale-150 w-full h-full object-contain"
                alt="Logo"
              />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              TalentFlow
            </h2>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">
            Chào mừng trở lại!
          </h1>
          <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">
            Đăng nhập để tiếp tục hành trình sự nghiệp của bạn.
          </p>

          <form onSubmit={handleEmailLogin} className="space-y-7">
            <div className="space-y-2.5">
              <label
                htmlFor="email"
                className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1"
              >
                Địa chỉ Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="vidu@gmail.com"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-black text-slate-400 uppercase tracking-widest"
                >
                  Mật khẩu
                </label>
                <Link
                  href="#"
                  className="text-sm font-bold text-primary hover:underline"
                >
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

            <button
              disabled={loading}
              className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <span className="relative bg-white px-5 text-sm font-black text-slate-400 uppercase tracking-widest">
                Hoặc đăng nhập bằng
              </span>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-4 rounded-2xl py-4.5 border-2 border-slate-100 bg-white font-black text-lg hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="size-6"
                alt="Google"
              />
              Tiếp tục với Google
            </button>
          </div>

          <p className="mt-12 text-center text-lg text-slate-500 font-bold">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline underline-offset-4 decoration-2"
            >
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>

      {/* --- PHẦN BÊN PHẢI --- */}
      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Office space"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>

        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <div className="flex gap-1 mb-6 text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="material-symbols-outlined filled text-3xl"
              >
                star
              </span>
            ))}
          </div>
          <blockquote className="text-4xl font-black leading-[1.2] mb-10 tracking-tight">
            &quot;TalentFlow không chỉ giúp tôi tìm thấy công việc, mà còn giúp
            tôi xây dựng một hồ sơ chuyên nghiệp để tự tin tỏa sáng.&quot;
          </blockquote>
          <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md p-5 rounded-[24px] border border-white/20">
            <div className="h-16 w-16 rounded-2xl border-2 border-white overflow-hidden shadow-lg shrink-0">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976"
                className="w-full h-full object-cover"
                alt="User"
              />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">
                Nguyễn Thị Thu Hà
              </p>
              <p className="text-white/70 font-bold text-base italic uppercase tracking-wider">
                HR Manager @ TechCorp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `src/app/(auth)/register/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { signup } from "@/app/(auth)/actions";

export default function RegisterPage() {
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("candidate");

  const handleGoogleRegister = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

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
    formData.append("role", role);

    const result = await signup(formData);

    if (result?.error) {
      alert("Lỗi: " + result.error);
    } else if (result?.success) {
      alert(result.success);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden font-['Manrope'] text-slate-900">
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-20 xl:px-32 lg:max-w-[50%] relative py-12">
        <div className="absolute top-10 left-8 lg:left-20 xl:left-32">
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

        <div className="mx-auto w-full max-w-[480px]">
          <div className="flex items-center gap-4 mb-10">
            <div className="size-12">
              <img
                src="/logo.png"
                className="scale-150 w-full h-full object-contain"
                alt="Logo"
              />
            </div>
            <h2 className="text-3xl font-black tracking-tighter">TalentFlow</h2>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black mb-3 tracking-tight">
            Tham gia ngay!
          </h1>
          <p className="text-lg text-slate-500 mb-10 font-bold italic opacity-80">
            Bắt đầu hành trình sự nghiệp cùng chúng tôi.
          </p>

          <form onSubmit={handleEmailRegister} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-10">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                  role === "candidate"
                    ? "border-primary bg-primary/5 text-primary shadow-lg"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  person
                </span>{" "}
                Ứng viên
              </button>
              <button
                type="button"
                onClick={() => setRole("employer")}
                className={`py-5 rounded-[24px] font-black text-[17px] border-2 transition-all flex flex-col items-center gap-2 ${
                  role === "employer"
                    ? "border-primary bg-primary/5 text-primary shadow-lg"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  corporate_fare
                </span>{" "}
                Nhà tuyển dụng
              </button>
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="fullname"
                className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1"
              >
                Họ và tên
              </label>
              <input
                id="fullname"
                name="fullName"
                type="text"
                required
                placeholder="Nguyễn Văn A"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="email"
                className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1"
              >
                Địa chỉ Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="vidu@gmail.com"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="password"
                className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 8 ký tự"
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

            <div className="space-y-2.5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-black text-slate-400 uppercase tracking-widest ml-1"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Nhập lại mật khẩu"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4.5 px-6 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined font-bold">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all"
            >
              {loading ? "Đang xử lý..." : "Tạo tài khoản miễn phí"}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <span className="relative bg-white px-5 text-sm font-black text-slate-400 uppercase tracking-widest">
                Hoặc
              </span>
            </div>
            <button
              onClick={handleGoogleRegister}
              className="w-full flex items-center justify-center gap-4 rounded-2xl py-4.5 border-2 border-slate-100 bg-white font-black text-lg hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="size-6"
                alt="Google"
              />
              Tiếp tục với Google
            </button>
          </div>

          <p className="mt-12 text-center text-lg text-slate-500 font-bold">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative flex-1 bg-slate-100">
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Office space"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>

        <div className="absolute bottom-20 left-20 text-white max-w-xl">
          <div className="flex gap-1 mb-6 text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="material-symbols-outlined filled text-3xl"
              >
                star
              </span>
            ))}
          </div>
          <blockquote className="text-4xl font-black leading-[1.2] mb-10 tracking-tight">
            &quot;TalentFlow không chỉ giúp tôi tìm thấy công việc, mà còn giúp
            tôi xây dựng một hồ sơ chuyên nghiệp để tự tin tỏa sáng.&quot;
          </blockquote>
          <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md p-5 rounded-[24px] border border-white/20">
            <div className="h-16 w-16 rounded-2xl border-2 border-white overflow-hidden shadow-lg shrink-0">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976"
                className="w-full h-full object-cover"
                alt="User"
              />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">
                Nguyễn Thị Thu Hà
              </p>
              <p className="text-white/70 font-bold text-base italic uppercase tracking-wider">
                HR Manager @ TechCorp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `src/app/(auth)/register/role-selection/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RoleSelectionPage() {
  const [role, setRole] = useState<"candidate" | "hr">("candidate");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Sử dụng Upsert: Nếu chưa có profile (do lỗi trigger) thì tạo mới, nếu có rồi thì update
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        role: role,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      });

      if (!error) {
        router.push(role === "hr" ? "/hr/dashboard" : "/candidate/dashboard");
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại!");
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 font-['Manrope'] relative selection:bg-primary/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] mix-blend-multiply"></div>
      </div>

      <div className="text-center mb-10 max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold text-slate-900 tracking-tight">
            TalentFlow
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Bạn muốn tham gia với vai trò gì?
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          Chọn vai trò phù hợp để chúng tôi cá nhân hóa trải nghiệm của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-10">
        {/* Card: Candidate */}
        <div
          onClick={() => setRole("candidate")}
          className={`group relative overflow-hidden p-8 rounded-[32px] cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center ${
            role === "candidate"
              ? "border-blue-600 bg-white shadow-2xl shadow-blue-900/10 scale-[1.02]"
              : "border-white bg-white/60 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 hover:scale-[1.01]"
          }`}
        >
          <div
            className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              role === "candidate"
                ? "border-blue-600 bg-blue-600"
                : "border-slate-300"
            }`}
          >
            {role === "candidate" && (
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            )}
          </div>

          <div
            className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-colors ${
              role === "candidate"
                ? "bg-blue-50 text-blue-600"
                : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
            }`}
          >
            <span className="material-symbols-outlined text-5xl">person</span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-3">Ứng viên</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            Tôi đang tìm kiếm cơ hội việc làm, muốn tạo CV chuyên nghiệp và phát
            triển sự nghiệp.
          </p>

          <div
            className={`mt-8 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              role === "candidate"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            Chọn Ứng viên
          </div>
        </div>

        {/* Card: Employer */}
        <div
          onClick={() => setRole("hr")}
          className={`group relative overflow-hidden p-8 rounded-[32px] cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center ${
            role === "hr"
              ? "border-indigo-600 bg-white shadow-2xl shadow-indigo-900/10 scale-[1.02]"
              : "border-white bg-white/60 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 hover:scale-[1.01]"
          }`}
        >
          <div
            className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              role === "hr"
                ? "border-indigo-600 bg-indigo-600"
                : "border-slate-300"
            }`}
          >
            {role === "hr" && (
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            )}
          </div>

          <div
            className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-colors ${
              role === "hr"
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
            }`}
          >
            <span className="material-symbols-outlined text-5xl">
              corporate_fare
            </span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-3">
            Nhà tuyển dụng
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            Tôi muốn đăng tin tuyển dụng, tìm kiếm nhân tài và quản lý quy trình
            tuyển dụng.
          </p>

          <div
            className={`mt-8 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              role === "hr"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            Chọn Nhà tuyển dụng
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`w-full py-4 px-8 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${
            role === "candidate"
              ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
              : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
          }`}
        >
          {loading ? (
            <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Tiếp tục với vai trò{" "}
              {role === "candidate" ? "Ứng viên" : "Nhà tuyển dụng"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm py-2"
        >
          Đăng xuất và quay lại
        </button>
      </div>
    </div>
  );
}
```

### `src/app/auth/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || !profile.role) {
          return NextResponse.redirect(`${origin}/role-selection`);
        }

        if (profile.role === "hr") {
          return NextResponse.redirect(`${origin}/hr/dashboard`);
        } else if (profile.role === "candidate") {
          return NextResponse.redirect(`${origin}/candidate/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
```

### `src/components/shared/Navbar.tsx`

```tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setMounted(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    window.location.reload();
  };

  const role = profile?.role || "GUEST";
  const isLoggedIn = !!user && !loading;

  // 1. Định nghĩa các tập Menu
  const guestLinks = [
    { name: "Tìm việc làm", href: "/jobs" },
    { name: "Công ty", href: "/companies" },
    { name: "Liên hệ", href: "/contact" },
  ];

  const candidateInternalLinks = [
    { name: "Tổng quan", href: "/candidate/dashboard" },
    { name: "Hồ sơ cá nhân", href: "/candidate/profile" },
    { name: "CV của tôi", href: "/candidate/cv-builder" },
    { name: "Việc đã ứng tuyển", href: "/candidate/applications" },
  ];

  const hrLinks = [
    { name: "Bảng điều khiển", href: "/hr/dashboard" },
    { name: "Tin tuyển dụng", href: "/hr/jobs" },
    { name: "Ứng viên", href: "/hr/candidates" },
  ];

  // 2. Chọn menu hiển thị
  let currentLinks = guestLinks;
  if (mounted && isLoggedIn) {
    if (role === "hr") currentLinks = hrLinks;
    else if (role === "candidate" && pathname.startsWith("/candidate")) {
      currentLinks = candidateInternalLinks;
    }
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md h-20 lg:h-24 flex items-center font-['Manrope']">
        <div className="max-w-[1536px] w-[92%] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 shrink-0">
            <div className="size-7 lg:size-7 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain scale-150"
              />
            </div>
            <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">
              TalentFlow
            </h2>
          </Link>
          <div className="flex items-center gap-6 lg:gap-10 flex-1 justify-between ml-10">
            <nav className="flex items-center gap-6 lg:gap-8">
              {guestLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[17px] font-bold transition-colors whitespace-nowrap ${
                    pathname === link.href
                      ? "text-[#2563eb]"
                      : "text-[#334155] hover:text-[#2563eb]"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-6 h-12 flex items-center border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-7 h-12 flex items-center bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md h-20 lg:h-24 flex items-center font-['Manrope']">
      <div className="max-w-[1536px] w-[92%] mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 shrink-0">
          <div className="size-10 lg:size-14 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain scale-150"
            />
          </div>
          <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">
            TalentFlow
          </h2>
        </Link>

        <div className="flex items-center gap-6 lg:gap-10">
          <nav className="flex items-center gap-6 lg:gap-8">
            {currentLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[17px] font-bold transition-colors whitespace-nowrap ${
                  pathname === link.href
                    ? "text-[#2563eb]"
                    : "text-[#334155] hover:text-[#2563eb]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 justify-end min-w-[160px]">
            {loading ? (
              <div className="size-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            ) : !isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-6 h-12 flex items-center border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all"
                >
                  Đăng nhập
                </Link>

                <Link
                  href="/register"
                  className="px-7 h-12 flex items-center bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-slate-200 hover:border-primary/50 transition-all bg-white"
                >
                  <img
                    src={
                      profile?.avatar_url ||
                      "https://placehold.co/100x100?text=U"
                    }
                    className="size-9 rounded-full object-cover border border-slate-100"
                    alt="User"
                  />
                  <span className="hidden xl:block font-bold text-slate-700 text-sm">
                    {profile?.full_name?.split(" ").pop() || "Thành viên"}
                  </span>
                  <span
                    className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${showProfileDropdown ? "rotate-180" : ""}`}
                  >
                    expand_more
                  </span>
                </button>

                {showProfileDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-0"
                      onClick={() => setShowProfileDropdown(false)}
                    ></div>
                    <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-50">
                      <div className="px-4 py-2 mb-1 border-b border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {role}
                        </p>
                      </div>
                      <Link
                        href={
                          role === "GUEST"
                            ? "/role-selection"
                            : `/${role}/dashboard`
                        }
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 text-sm"
                      >
                        <span className="material-symbols-outlined text-lg">
                          dashboard
                        </span>
                        {role === "GUEST" ? "Chọn vai trò" : "Dashboard"}
                      </Link>
                      <hr className="my-1 border-slate-50" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-all font-bold text-red-500 text-sm"
                      >
                        <span className="material-symbols-outlined text-lg">
                          logout
                        </span>{" "}
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
```
