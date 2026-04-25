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
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar />
      <HRLayoutShell>{children}</HRLayoutShell>
    </div>
  );
}
