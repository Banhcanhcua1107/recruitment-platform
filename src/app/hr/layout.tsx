"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/shared/Navbar";
import HRLayoutShell from "./HRLayoutShell";

export default function RecruiterRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f8]">
      <Navbar />
      <HRLayoutShell>{children}</HRLayoutShell>
    </div>
  );
}
