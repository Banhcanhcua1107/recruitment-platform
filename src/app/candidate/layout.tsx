"use client";
import React from "react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f8]">
      {/* Sử dụng Header chung duy nhất ở đây */}
      <Navbar />

      {/* Nội dung trang Dashboard/Profile sẽ tràn ra hết chiều ngang */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Thêm Footer cho đồng bộ với trang chủ */}
      <Footer />
    </div>
  );
}