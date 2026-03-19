"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/shared/Footer";

export default function CandidateLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEditingCV = pathname?.includes("/cv-builder/") && pathname?.endsWith("/edit");

  return (
    <>
      <main className="w-full flex-1">{children}</main>
      {!isEditingCV ? <Footer /> : null}
    </>
  );
}
