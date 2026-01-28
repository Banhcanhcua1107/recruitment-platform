"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [role, setRole] = useState("GUEST"); 
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = {
    GUEST: [{ name: "Tìm việc làm", href: "/jobs" }, { name: "Công ty", href: "/companies" }, { name: "Giới thiệu", href: "/about" }],
    CANDIDATE: [{ name: "Tìm việc", href: "/jobs" }, { name: "Tạo CV", href: "/cv" }, { name: "Đơn ứng tuyển", href: "/applied" }],
    HR: [{ name: "Dashboard", href: "/hr" }, { name: "Đăng tin", href: "/hr/post" }, { name: "Ứng viên", href: "/hr/candidates" }],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md h-20 lg:h-24 flex items-center">
      <div className="max-w-[1536px] w-[92%] mx-auto flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-4 z-50">
          <div className="size-8 lg:size-11">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain scale-150" />
          </div>
          <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">TalentFlow</h2>
        </Link>

        {/* MENU */}
        <div className={`fixed lg:static top-0 right-0 h-screen lg:h-auto w-[75%] lg:w-auto bg-white lg:bg-transparent flex flex-col lg:flex-row items-center gap-8 lg:gap-10 p-10 lg:p-0 pt-28 lg:pt-0 transition-all duration-300 ${isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"}`}>
          <nav className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
            {navLinks[role as keyof typeof navLinks].map((link) => (
              <Link key={link.name} href={link.href} className="text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary whitespace-nowrap">
                {link.name}
              </Link>
            ))}
          </nav>
          
          {/* SỬA LỖI NÚT Ở ĐÂY */}
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
            <Link 
              href="/login" 
              className="w-full lg:w-auto px-8 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 whitespace-nowrap hover:bg-slate-100 transition-all"
            >
              Đăng nhập
            </Link>
            <Link 
              href="/register" 
              className="w-full lg:w-auto px-8 h-12 flex items-center justify-center bg-primary text-white rounded-xl font-bold whitespace-nowrap shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
            >
              Đăng ký
            </Link>
          </div>
        </div>

        {/* NÚT MOBILE */}
        <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 z-50">
          <span className="material-symbols-outlined text-3xl">{isOpen ? "close" : "menu"}</span>
        </button>
      </div>
    </header>
  );
}