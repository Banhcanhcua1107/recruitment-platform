"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/shared/Navbar";
import { AppDialogProvider } from "@/components/ui/app-dialog";
import CandidateLayoutShell from "./CandidateLayoutShell";

export default function CandidateRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppDialogProvider>
      <div className="flex min-h-screen flex-col bg-transparent">
        <Navbar />
        <CandidateLayoutShell>{children}</CandidateLayoutShell>
      </div>
    </AppDialogProvider>
  );
}
