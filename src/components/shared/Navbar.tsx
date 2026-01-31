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
      const { data: { user } } = await supabase.auth.getUser();
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
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain scale-150" />
            </div>
            <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">TalentFlow</h2>
          </Link>
          <div className="flex items-center gap-6 lg:gap-10 flex-1 justify-between ml-10">
            <nav className="flex items-center gap-6 lg:gap-8">
              {guestLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={`text-[17px] font-bold transition-colors whitespace-nowrap ${
                    pathname === link.href ? "text-[#2563eb]" : "text-[#334155] hover:text-[#2563eb]"
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
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-4 shrink-0">
          <div className="size-10 lg:size-14 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain scale-150" />
          </div>
          <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">TalentFlow</h2>
        </Link>

        {/* CỤM MENU VÀ NÚT TÀI KHOẢN */}
        <div className="flex items-center gap-6 lg:gap-10">
          
          <nav className="flex items-center gap-6 lg:gap-8">
            {currentLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`text-[17px] font-bold transition-colors whitespace-nowrap ${
                  pathname === link.href ? "text-[#2563eb]" : "text-[#334155] hover:text-[#2563eb]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 justify-end min-w-[160px]">
          {loading ? (
            /* Trong lúc load thì hiện Spinner nhỏ thay vì để trắng cả header */
            <div className="size-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          ) : !isLoggedIn ? (
            /* CHƯA ĐĂNG NHẬP */
            <div className="flex items-center gap-3">
            {/* Nút Đăng nhập giờ đã giống nút Đăng ký */}
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
            /* ĐÃ ĐĂNG NHẬP - Box Avatar nhỏ gọn */
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-slate-200 hover:border-primary/50 transition-all bg-white"
              >
                <img 
                  src={profile?.avatar_url || "https://placehold.co/100x100?text=U"} 
                  className="size-9 rounded-full object-cover border border-slate-100" 
                  alt="User" 
                />
                <span className="hidden xl:block font-bold text-slate-700 text-sm">
                  {profile?.full_name?.split(" ").pop() || "Thành viên"}
                </span>
                <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowProfileDropdown(false)}></div>
                  <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-50">
                    <div className="px-4 py-2 mb-1 border-b border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                    </div>
                    <Link 
                      href={role === "GUEST" ? "/role-selection" : `/${role}/dashboard`} 
                      onClick={() => setShowProfileDropdown(false)} 
                      className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">dashboard</span> 
                      {role === "GUEST" ? "Chọn vai trò" : "Dashboard"}
                    </Link>
                    <hr className="my-1 border-slate-50" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-all font-bold text-red-500 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span> Đăng xuất
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