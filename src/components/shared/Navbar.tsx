"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  
  // Logic nhận diện Role: GUEST | CANDIDATE | HR
  const isCandidate = pathname.startsWith("/candidate");
  const isHR = pathname.startsWith("/hr");
  
  const isLoggedIn = isCandidate || isHR; 
  const role = isHR ? "HR" : (isCandidate ? "CANDIDATE" : "GUEST");

  const [isOpen, setIsOpen] = useState(false); 
  const [showProfileDropdown, setShowProfileDropdown] = useState(false); 
  const [showMoreDropdown, setShowMoreDropdown] = useState(false); 

  const navLinks = {
    GUEST: [
      { name: "Tìm việc làm", href: "/jobs" },
      { name: "Công ty", href: "/companies" },
      { name: "Liên hệ", href: "/contact" }
    ],
    CANDIDATE: [
      { name: "Tìm việc", href: "/jobs" },
      { name: "Tổng quan", href: "/candidate/dashboard" }
      // Các mục khác nằm trong dropdown "Khác"
    ],
    HR: [
      { name: "Bảng điều khiển", href: "/hr/dashboard" },
      { name: "Tin tuyển dụng", href: "/hr/jobs" },
      { name: "Ứng viên", href: "/hr/candidates" },
      { name: "Lịch phỏng vấn", href: "/hr/calendar" }
    ]
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md h-20 lg:h-24 flex items-center">
      <div className="max-w-[1536px] w-[92%] mx-auto flex items-center justify-between relative">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-4 z-50">
          <div className="size-10 lg:size-14 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain scale-150" />
          </div>
          <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">TalentFlow</h2>
        </Link>

        {/* MENU TRUNG TÂM */}
        <div className={`fixed lg:static top-0 right-0 h-screen lg:h-auto w-[75%] lg:w-auto bg-white lg:bg-transparent flex flex-col lg:flex-row items-center gap-8 p-10 lg:p-0 pt-28 lg:pt-0 transition-all duration-300 ${isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"}`}>
          <nav className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
            {navLinks[role].map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`text-lg lg:text-[17px] font-bold transition-colors whitespace-nowrap ${pathname === link.href ? "text-primary" : "text-slate-700 hover:text-primary"}`}
              >
                {link.name}
              </Link>
            ))}

            {/* Dropdown "Khác" chỉ hiện cho Candidate */}
            {role === "CANDIDATE" && (
              <div className="relative">
                <button onMouseEnter={() => setShowMoreDropdown(true)} className="flex items-center gap-1 font-bold text-slate-700 hover:text-primary">
                  Khác <span className="material-symbols-outlined text-xl">expand_more</span>
                </button>
                {showMoreDropdown && (
                  <div onMouseLeave={() => setShowMoreDropdown(false)} className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                     <Link href="/candidate/profile" className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl font-bold text-sm">Hồ sơ cá nhân</Link>
                     <Link href="/candidate/cv-builder" className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl font-bold text-sm">CV của tôi</Link>
                  </div>
                )}
              </div>
            )}
          </nav>
          
          {/* KHỐI TÀI KHOẢN */}
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto ml-0 lg:ml-6">
            {!isLoggedIn ? (
              <Link href="/login" className="px-8 h-12 flex items-center bg-primary text-white rounded-xl font-bold">Đăng nhập</Link>
            ) : (
              <div className="relative">
                <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-slate-200 hover:bg-white shadow-sm bg-slate-50">
                  <img src="https://placehold.co/100x100?text=A" className="size-9 rounded-full border border-slate-200" alt="Admin" />
                  <span className="hidden xl:block font-bold text-slate-700 text-sm">{role === "HR" ? "Admin HR" : "Minh Nguyễn"}</span>
                  <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-50">
                    <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">{role}</p>
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl font-bold text-red-500 text-sm">Đăng xuất</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}