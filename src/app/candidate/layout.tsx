"use client";
import React from "react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { usePathname } from "next/navigation";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide footer when in the full-screen CV editor
  const isEditingCV = pathname?.includes("/cv-builder/") && pathname?.endsWith("/edit");

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f8]">
      {/* Sử dụng Header chung duy nhất ở đây */}
      <Navbar />

      {/* Nội dung trang Dashboard/Profile sẽ tràn ra hết chiều ngang */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Ẩn Footer khi đang ở trang Edit CV để tránh chiếm chỗ giao diện Full-screen */}
      {!isEditingCV && <Footer />}
    </div>
  );
}