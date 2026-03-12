"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { signOutAndRedirect } from "@/utils/supabase/auth-helpers";
import NotificationBell from "./NotificationBell";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  hr: "Nhà tuyển dụng",
  candidate: "Ứng viên",
};

export default function Navbar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setMounted(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setProfile(profileData);
      }

      setLoading(false);
    };

    void fetchUser();
  }, [supabase]);

  const handleLogout = async () => {
    await signOutAndRedirect(supabase, "/login");
  };

  const role = profile?.role || "GUEST";
  const isLoggedIn = !!user && !loading;

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
    { name: "Hồ sơ công ty", href: "/hr/company" },
  ];

  let currentLinks = guestLinks;
  if (mounted && isLoggedIn) {
    if (role === "hr") currentLinks = hrLinks;
    else if (role === "candidate" && pathname.startsWith("/candidate")) {
      currentLinks = candidateInternalLinks;
    }
  }

  const renderAuthButtons = () => (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="flex h-12 items-center rounded-xl border-2 border-primary px-6 font-bold text-primary transition-all hover:bg-primary/5"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="flex h-12 items-center rounded-xl bg-primary px-7 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
      >
        Đăng ký
      </Link>
    </div>
  );

  const renderLinks = (links: Array<{ name: string; href: string }>) => (
    <nav className="flex items-center gap-6 lg:gap-8">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`whitespace-nowrap text-[17px] font-bold transition-colors ${
            pathname === link.href ? "text-[#2563eb]" : "text-[#334155] hover:text-[#2563eb]"
          }`}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-slate-100 bg-white/95 font-['Manrope'] backdrop-blur-md lg:h-24">
        <div className="mx-auto flex w-[92%] max-w-[1536px] items-center justify-between">
          <Link href="/" className="flex shrink-0 items-center gap-4">
            <div className="flex size-10 items-center justify-center">
              <img src="/logo.png" alt="Logo TalentFlow" className="h-full w-full scale-150 object-contain" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 lg:text-3xl">
              TalentFlow
            </h2>
          </Link>

          <div className="ml-10 flex flex-1 items-center justify-between gap-6 lg:gap-10">
            {renderLinks(guestLinks)}
            {renderAuthButtons()}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-slate-100 bg-white/95 font-['Manrope'] backdrop-blur-md lg:h-24">
      <div className="mx-auto flex w-[92%] max-w-[1536px] items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-4">
          <div className="flex size-10 items-center justify-center">
            <img src="/logo.png" alt="Logo TalentFlow" className="h-full w-full scale-150 object-contain" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 lg:text-3xl">
            TalentFlow
          </h2>
        </Link>

        <div className="flex items-center gap-6 lg:gap-10">
          {renderLinks(currentLinks)}

          <div className="flex min-w-[160px] items-center justify-end gap-4">
            {loading ? (
              <div className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            ) : !isLoggedIn ? (
              renderAuthButtons()
            ) : (
              <div className="flex items-center gap-2">
                <NotificationBell />

                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown((value) => !value)}
                    className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white p-1 pr-3 transition-all hover:border-primary/50"
                  >
                    <img
                      src={profile?.avatar_url || "https://placehold.co/100x100?text=U"}
                      className="size-9 rounded-full border border-slate-100 object-cover"
                      alt="Ảnh đại diện người dùng"
                    />
                    <span className="hidden text-sm font-bold text-slate-700 xl:block">
                      {profile?.full_name?.split(" ").pop() || "Thành viên"}
                    </span>
                    <span
                      className={`material-symbols-outlined text-lg text-slate-400 transition-transform ${
                        showProfileDropdown ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {showProfileDropdown ? (
                    <>
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowProfileDropdown(false)}
                      />
                      <div className="absolute right-0 z-50 mt-3 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl">
                        <div className="mb-1 border-b border-slate-50 px-4 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {ROLE_LABELS[role] ?? role}
                          </p>
                        </div>
                        <Link
                          href={role === "GUEST" ? "/role-selection" : `/${role}/dashboard`}
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-slate-600 transition-all hover:bg-primary/5"
                        >
                          <span className="material-symbols-outlined text-lg">dashboard</span>
                          {role === "GUEST" ? "Chọn vai trò" : "Bảng điều khiển"}
                        </Link>
                        <hr className="my-1 border-slate-50" />
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Đăng xuất
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
