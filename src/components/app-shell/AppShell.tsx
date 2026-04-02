"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
  mobileDrawer: ReactNode;
  drawerLabel: string;
  drawerTitle: string;
  closeAriaLabel: string;
  isCompactSidebar: boolean;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
}

export function AppShell({
  children,
  header,
  sidebar,
  mobileDrawer,
  drawerLabel,
  drawerTitle,
  closeAriaLabel,
  isCompactSidebar,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
}: AppShellProps) {
  return (
    <>
      <main className="flex-1 bg-[radial-gradient(circle_at_left_top,rgba(37,99,235,0.08),transparent_34%)]">
        <div className="mx-auto w-full max-w-440 px-3 pb-10 pt-5 sm:px-5 lg:px-7">
          <div className="flex items-start gap-4 lg:gap-6">
            <aside
              className={cn(
                "hidden shrink-0 md:block",
                isCompactSidebar ? "md:w-22 lg:w-23" : "md:w-59 lg:w-62",
              )}
            >
              <div className="sticky top-25 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
                {sidebar}
              </div>
            </aside>

            <div className="min-w-0 flex-1 pb-2">
              <div className="mx-auto w-full max-w-330 space-y-5 lg:space-y-6">
                {header}
                <div className="min-w-0">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isMobileDrawerOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-70 bg-slate-950/28 backdrop-blur-[3px] md:hidden"
              onClick={onCloseMobileDrawer}
              aria-label={closeAriaLabel}
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed left-0 top-0 z-80 flex h-full w-full max-w-78 flex-col border-r border-slate-200/90 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.34)] md:hidden"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200/90 px-4 py-3.5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-500">
                    {drawerLabel}
                  </p>
                  <p className="mt-1 font-headline text-lg font-extrabold tracking-tight text-slate-950">
                    {drawerTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseMobileDrawer}
                  className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
                  aria-label={closeAriaLabel}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">{mobileDrawer}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
