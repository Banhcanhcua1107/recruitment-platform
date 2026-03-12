"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { signOutAndRedirect } from "@/utils/supabase/auth-helpers";
import { updateRole } from "@/app/(auth)/actions";

export default function RoleSelectionPage() {
  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleConfirm = async () => {
    setLoading(true);
    // Use Server Action for strict flow
    const result = await updateRole(role);
    
    if (result?.error) {
        alert(result.error);
        setLoading(false);
    }
    // Success redirect is handled by action
  };

  const handleLogout = async () => {
    await signOutAndRedirect(supabase, "/login");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 font-['Manrope'] relative selection:bg-primary/20">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] mix-blend-multiply"></div>
      </div>

      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold text-slate-900 tracking-tight">TalentFlow</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Bạn muốn tham gia với vai trò gì?
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          Chọn vai trò phù hợp để chúng tôi cá nhân hóa trải nghiệm của bạn.
        </p>
      </div>

      {/* Main Selection Area */}
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
          {/* Active Indicator */}
          <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            role === "candidate" ? "border-blue-600 bg-blue-600" : "border-slate-300"
          }`}>
            {role === "candidate" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
          </div>

          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-colors ${
            role === "candidate" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
          }`}>
             <span className="material-symbols-outlined text-5xl">person</span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-3">Ứng viên</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            Tôi đang tìm kiếm cơ hội việc làm, muốn tạo CV chuyên nghiệp và phát triển sự nghiệp.
          </p>

          <div className={`mt-8 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            role === "candidate" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
          }`}>
            Chọn Ứng viên
          </div>
        </div>

        {/* Card: Employer */}
        <div 
          onClick={() => setRole("employer")}
          className={`group relative overflow-hidden p-8 rounded-[32px] cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center ${
            role === "employer" 
            ? "border-indigo-600 bg-white shadow-2xl shadow-indigo-900/10 scale-[1.02]" 
            : "border-white bg-white/60 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 hover:scale-[1.01]"
          }`}
        >
          {/* Active Indicator */}
          <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            role === "employer" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
          }`}>
            {role === "employer" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
          </div>

          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-colors ${
            role === "employer" ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
          }`}>
             <span className="material-symbols-outlined text-5xl">corporate_fare</span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-3">Nhà tuyển dụng</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            Tôi muốn đăng tin tuyển dụng, tìm kiếm nhân tài và quản lý quy trình tuyển dụng.
          </p>

          <div className={`mt-8 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            role === "employer" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
          }`}>
            Chọn Nhà tuyển dụng
          </div>
        </div>
      </div>

      {/* Button Action */}
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`w-full py-4 px-8 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${
             role === 'candidate' 
             ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700" 
             : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
          }`}
        >
          {loading ? (
            <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Tiếp tục với vai trò {role === 'candidate' ? "Ứng viên" : "Nhà tuyển dụng"}
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
