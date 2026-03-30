"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { HRWorkspaceBreadcrumb, HRWorkspaceModel } from "./hrWorkspaceModel";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const TABLET_MEDIA_QUERY = "(min-width: 768px) and (max-width: 1023px)";

function Breadcrumbs({ items }: { items: HRWorkspaceBreadcrumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "text-slate-600" : undefined}>
              {item.label}
            </span>
          )}
          {index < items.length - 1 ? (
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({
  model,
  isCompact,
  onNavigate,
}: {
  model: HRWorkspaceModel;
  isCompact: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`rounded-[30px] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.35)] ${
        isCompact ? "space-y-3" : "space-y-4"
      }`}
    >
      <div
        className={`rounded-3xl bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(37,99,235,0.05))] ${
          isCompact ? "px-3 py-4" : "px-4 py-5"
        }`}
      >
        <div className={`flex items-center ${isCompact ? "justify-center" : "gap-3"}`}>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
            <span className="material-symbols-outlined text-[22px]">badge</span>
          </div>
          {!isCompact ? (
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                Recruiter Workspace
              </p>
              <p className="mt-1 truncate text-base font-black text-slate-900">
                Không gian tuyển dụng
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {model.sidebarItems.map((item) =>
          isCompact ? (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              className={`flex items-center justify-center rounded-2xl border px-3 py-3 transition-all ${
                item.isActive
                  ? "border-primary/15 bg-primary text-white shadow-[0_18px_34px_-22px_rgba(37,99,235,0.85)]"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  item.isActive ? "text-white" : "text-slate-400"
                }`}
              >
                {item.icon}
              </span>
            </Link>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition-all ${
                item.isActive
                  ? "border-primary/15 bg-primary text-white shadow-[0_18px_34px_-22px_rgba(37,99,235,0.85)]"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  item.isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
                }`}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}

function HRWorkspaceHeader({
  model,
  isDesktopViewport,
  isTabletViewport,
  isTabletExpanded,
  onToggleTabletSidebar,
  onOpenMobileDrawer,
}: {
  model: HRWorkspaceModel;
  isDesktopViewport: boolean;
  isTabletViewport: boolean;
  isTabletExpanded: boolean;
  onToggleTabletSidebar: () => void;
  onOpenMobileDrawer: () => void;
}) {
  return (
    <section
      className={`rounded-[30px] border border-slate-200 bg-white/92 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-sm ${
        model.headerVariant === "full" ? "px-5 py-5 sm:px-6 sm:py-6" : "px-4 py-4 sm:px-5"
      }`}
    >
      <div className="flex items-start gap-4">
        {!isDesktopViewport ? (
          <button
            type="button"
            onClick={isTabletViewport ? onToggleTabletSidebar : onOpenMobileDrawer}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
            aria-label={isTabletViewport ? "Toggle recruiter sidebar" : "Open recruiter navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isTabletViewport ? (isTabletExpanded ? "left_panel_close" : "left_panel_open") : "menu"}
            </span>
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <Breadcrumbs items={model.breadcrumbs} />

          {model.showTitleInHeader ? (
            <div className={model.headerVariant === "full" ? "mt-4" : "mt-3"}>
              <h1
                className={`font-black tracking-tight text-slate-950 ${
                  model.headerVariant === "full" ? "text-2xl sm:text-[2rem]" : "text-lg sm:text-xl"
                }`}
              >
                {model.title}
              </h1>
              {model.description ? (
                <p
                  className={`mt-2 max-w-3xl text-sm font-medium text-slate-500 ${
                    model.headerVariant === "full" ? "sm:text-base" : ""
                  }`}
                >
                  {model.description}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className="material-symbols-outlined text-[18px] text-primary">workspaces</span>
              <span>Điều hướng recruiter workspace</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function HRLayout({
  children,
  model,
}: {
  children: ReactNode;
  model: HRWorkspaceModel;
}) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);
  const [isTabletExpanded, setIsTabletExpanded] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const tabletQuery = window.matchMedia(TABLET_MEDIA_QUERY);

    const syncViewport = () => {
      const nextDesktop = desktopQuery.matches;
      const nextTablet = tabletQuery.matches;

      setIsDesktopViewport(nextDesktop);
      setIsTabletViewport(nextTablet);

      if (nextDesktop || nextTablet) {
        setIsMobileDrawerOpen(false);
      }

      if (nextDesktop) {
        setIsTabletExpanded(false);
        return;
      }

      if (!nextTablet) {
        setIsTabletExpanded(false);
      }
    };

    syncViewport();
    desktopQuery.addEventListener("change", syncViewport);
    tabletQuery.addEventListener("change", syncViewport);

    return () => {
      desktopQuery.removeEventListener("change", syncViewport);
      tabletQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileDrawerOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileDrawerOpen]);

  const shouldUseCompactSidebar = useMemo(
    () => isTabletViewport && !isTabletExpanded,
    [isTabletExpanded, isTabletViewport]
  );

  return (
    <>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-460 px-3 py-5 sm:px-5 lg:pl-3 lg:pr-8 xl:pr-10">
          <div className="flex items-start gap-4 lg:gap-6 xl:gap-7">
            <aside
              className={`hidden shrink-0 md:block ${
                shouldUseCompactSidebar ? "md:w-22" : "md:w-66"
              } lg:w-68 xl:w-70`}
            >
              <div className="md:sticky md:top-27">
                <SidebarContent
                  model={model}
                  isCompact={shouldUseCompactSidebar}
                  onNavigate={() => setIsMobileDrawerOpen(false)}
                />
              </div>
            </aside>

            <div className="min-w-0 flex-1 space-y-5">
              <HRWorkspaceHeader
                model={model}
                isDesktopViewport={isDesktopViewport}
                isTabletViewport={isTabletViewport}
                isTabletExpanded={isTabletExpanded}
                onToggleTabletSidebar={() => setIsTabletExpanded((current) => !current)}
                onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
              />

              <div className="min-w-0">{children}</div>
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
              className="fixed inset-0 z-70 bg-slate-950/40 backdrop-blur-[2px] md:hidden"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-label="Close recruiter navigation"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed left-0 top-0 z-80 flex h-full w-full max-w-[320px] flex-col border-r border-slate-200 bg-white p-4 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Recruiter Workspace
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">Điều hướng</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <SidebarContent
                  model={model}
                  isCompact={false}
                  onNavigate={() => setIsMobileDrawerOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
