"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/shared/Footer";
import CandidateLayout from "@/components/candidate/CandidateLayout";
import { getCandidateWorkspaceModel } from "@/components/candidate/candidateWorkspaceModel";

export default function CandidateLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const model = getCandidateWorkspaceModel(pathname);

  return (
    <>
      {model.useWorkspaceShell ? (
        <CandidateLayout model={model}>{children}</CandidateLayout>
      ) : (
        <main className="w-full flex-1">{children}</main>
      )}
      {model.showFooter ? <Footer /> : null}
    </>
  );
}
