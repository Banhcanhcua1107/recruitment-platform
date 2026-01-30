"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RoleSelectionPage() {
  const [role, setRole] = useState("candidate");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    // Lấy thông tin user hiện tại đang chờ chọn role
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Cập nhật role vào bảng profiles
      const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id);

      if (!error) {
        // Xong! Đưa vào dashboard phù hợp
        router.push(`/${role}/dashboard`);
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại!");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] flex items-center justify-center p-6 font-['Manrope']">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl max-w-xl w-full text-center border border-slate-100">
        <h1 className="text-4xl font-black text-slate-900 mb-4">Chào mừng bạn!</h1>
        <p className="text-lg text-slate-500 mb-10 font-bold italic">Chỉ một bước nữa, bạn tham gia TalentFlow với vai trò nào?</p>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <button
            onClick={() => setRole("candidate")}
            className={`py-8 rounded-3xl border-4 transition-all flex flex-col items-center gap-4 ${
              role === "candidate" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-5xl">person</span>
            <span className="font-black text-xl">Ứng viên</span>
          </button>

          <button
            onClick={() => setRole("hr")}
            className={`py-8 rounded-3xl border-4 transition-all flex flex-col items-center gap-4 ${
              role === "hr" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-5xl">corporate_fare</span>
            <span className="font-black text-xl">Nhà tuyển dụng</span>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-xl shadow-primary/25 active:scale-95 transition-all"
        >
          {loading ? "Đang lưu..." : "Bắt đầu trải nghiệm ngay"}
        </button>
      </div>
    </div>
  );
}