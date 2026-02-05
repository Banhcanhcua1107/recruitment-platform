
import React from "react";

export default function UpgradeBanner() {
  return (
    <div className="bg-gradient-to-br from-primary to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
      <div className="relative z-10">
        <span className="material-symbols-outlined text-5xl mb-6 text-yellow-400">diamond</span>
        <h4 className="text-2xl font-black mb-4">Nâng cấp tài khoản</h4>
        <p className="text-blue-100 font-bold mb-8 leading-relaxed">Đẩy hồ sơ lên Top và xem ai đã lén xem CV của bạn.</p>
        <button className="w-full py-4 bg-white text-primary font-black rounded-2xl shadow-lg hover:bg-blue-50 transition-all cursor-pointer">Tìm hiểu thêm</button>
      </div>
    </div>
  );
}
