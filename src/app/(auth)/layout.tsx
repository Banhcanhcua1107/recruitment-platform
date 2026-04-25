import type { ReactNode } from "react";
import { AppDialogProvider } from "@/components/ui/app-dialog";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AppDialogProvider>{children}</AppDialogProvider>;
}
