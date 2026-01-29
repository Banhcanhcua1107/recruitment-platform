"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  
  // Logic nhận diện: Nếu ở các trang bắt đầu bằng /candidate thì là đã đăng nhập
  const isCandidateArea = pathname.startsWith("/candidate");
  const isLoggedIn = isCandidateArea; 
  const role = isCandidateArea ? "CANDIDATE" : "GUEST";

  const [isOpen, setIsOpen] = useState(false); 
  const [showProfileDropdown, setShowProfileDropdown] = useState(false); 
  const [showMoreDropdown, setShowMoreDropdown] = useState(false); 

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md h-20 lg:h-24 flex items-center">
      <div className="max-w-[1536px] w-[92%] mx-auto flex items-center justify-between relative">
        
        {/* 1. LOGO WEB (LUÔN CỐ ĐỊNH LÀ HÌNH ẢNH LOGO.PNG) */}
        <Link href="/" className="flex items-center gap-4 z-50">
          <div className="size-8 lg:size-10 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="TalentFlow Logo" 
              className="w-full h-full object-contain scale-150" 
            />
          </div>
          <h2 className="text-slate-900 text-2xl lg:text-3xl font-black tracking-tighter">TalentFlow</h2>
        </Link>

        {/* 2. MENU TRUNG TÂM */}
        <div className={`fixed lg:static top-0 right-0 h-screen lg:h-auto w-[75%] lg:w-auto bg-white lg:bg-transparent flex flex-col lg:flex-row items-center gap-8 p-10 lg:p-0 pt-28 lg:pt-0 transition-all duration-300 ${isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"}`}>
          
          <nav className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
            {role === "GUEST" ? (
              /* MENU CHO KHÁCH */
              <>
                <Link href="/jobs" className="text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary transition-colors">Tìm việc làm</Link>
                <Link href="/companies" className="text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary transition-colors">Công ty</Link>
                <Link href="/contact" className="text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary transition-colors">Liên hệ</Link>
              </>
            ) : (
              /* MENU CHO ỨNG VIÊN (CANDIDATE) */
              <>
                <Link href="/jobs" className="text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary transition-colors">Tìm việc</Link>
                <Link href="/candidate/dashboard" className={`text-lg lg:text-[17px] font-bold transition-colors ${pathname === "/candidate/dashboard" ? "text-primary" : "text-slate-700 hover:text-primary"}`}>Tổng quan</Link>
                
                {/* DROPDOWN "KHÁC" (THAY THẾ CHO ĐƠN ỨNG TUYỂN) */}
                <div className="relative group">
                  <button 
                    onMouseEnter={() => setShowMoreDropdown(true)}
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="flex items-center gap-1 text-lg lg:text-[17px] font-bold text-slate-700 hover:text-primary transition-colors"
                  >
                    Khác <span className={`material-symbols-outlined text-xl transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {showMoreDropdown && (
                    <div 
                      onMouseLeave={() => setShowMoreDropdown(false)}
                      className="absolute left-0 lg:left-1/2 lg:-translate-x-1/2 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in duration-150"
                    >
                      <Link href="/candidate/profile" className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 text-sm hover:text-primary">
                        <span className="material-symbols-outlined text-lg">person</span> Hồ sơ cá nhân
                      </Link>
                      <Link href="/candidate/cv-builder" className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 text-sm hover:text-primary">
                        <span className="material-symbols-outlined text-lg">description</span> CV của tôi
                      </Link>
                      <Link href="/candidate/applications" className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 text-sm hover:text-primary">
                        <span className="material-symbols-outlined text-lg">business_center</span> Việc đã ứng tuyển
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
          
          {/* 3. KHỐI TÀI KHOẢN (BÊN PHẢI) */}
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto ml-0 lg:ml-6">
            {!isLoggedIn ? (
              <>
                <Link href="/login" className="w-full lg:w-auto px-8 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 text-sm hover:bg-slate-100 transition-all">Đăng nhập</Link>
                <Link href="/register" className="w-full lg:w-auto px-8 h-12 flex items-center justify-center bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">Đăng ký</Link>
              </>
            ) : (
              /* BOX AVATAR NHỎ GỌN NHƯ TRONG HÌNH 27 */
              <div className="relative">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-slate-200 hover:border-primary/50 transition-all bg-white shadow-sm"
                >
                  <div className="size-9 rounded-full overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    <img src="https://placehold.co/100x100?text=T" className="w-full h-full object-cover" alt="User" />
                  </div>
                  <span className="hidden xl:block font-bold text-slate-700 text-sm">Vũ Thiên</span>
                  <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {/* DROPDOWN AVATAR TINH TẾ */}
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setShowProfileDropdown(false)}></div>
                    <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-50">
                      <div className="px-4 py-2 mb-1 border-b border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ứng viên</p>
                      </div>
                      <Link href="/candidate/dashboard" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 hover:text-primary text-sm">
                        <span className="material-symbols-outlined text-lg">dashboard</span> Tổng quan
                      </Link>
                      <Link href="/candidate/profile" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-all font-bold text-slate-600 hover:text-primary text-sm">
                        <span className="material-symbols-outlined text-lg">person</span> Hồ sơ
                      </Link>
                      <hr className="my-1 border-slate-50" />
                      <Link href="/" className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-all font-bold text-red-500 text-sm">
                        <span className="material-symbols-outlined text-lg">logout</span> Đăng xuất
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NÚT MOBILE MENU */}
        <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 z-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-slate-900 font-bold">
            {isOpen ? "close" : "menu"}
          </span>
        </button>
      </div>
    </header>
  );
}