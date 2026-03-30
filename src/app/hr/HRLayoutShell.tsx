"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/shared/Footer";
import HRLayout from "@/components/hr/HRLayout";
import { getHrWorkspaceModel } from "@/components/hr/hrWorkspaceModel";

export default function HRLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const model = getHrWorkspaceModel(pathname);

  return (
    <>
      <HRLayout model={model}>{children}</HRLayout>
      {model.showFooter ? <Footer /> : null}
    </>
  );
}
