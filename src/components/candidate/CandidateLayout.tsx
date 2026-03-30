"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type {
  CandidateWorkspaceBreadcrumb,
  CandidateWorkspaceGroupItem,
  CandidateWorkspaceLinkItem,
  CandidateWorkspaceModel,
} from "./candidateWorkspaceModel";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const TABLET_MEDIA_QUERY = "(min-width: 768px) and (max-width: 1023px)";

function isGroupItem(
  item: CandidateWorkspaceLinkItem | CandidateWorkspaceGroupItem
): item is CandidateWorkspaceGroupItem {
  return "children" in item;
}

function Breadcrumbs({ items }: { items: CandidateWorkspaceBreadcrumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "text-slate-600" : undefined}>{item.label}</span>
          )}
          {index < items.length - 1 ? (
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  item,
  isCompact,
  onNavigate,
}: {
  item: CandidateWorkspaceLinkItem;
  isCompact: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      onClick={onNavigate}
      className={`group flex items-center rounded-2xl border text-sm font-bold transition-all ${
        isCompact
          ? "justify-center px-3 py-3"
          : "gap-3 px-4 py-3.5"
      } ${
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
      {!isCompact ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarGroup({
  item,
  isCompact,
  onExpandCompact,
  onNavigate,
}: {
  item: CandidateWorkspaceGroupItem;
  isCompact: boolean;
  onExpandCompact: () => void;
  onNavigate: () => void;
}) {
  if (isCompact) {
    return (
      <button
        type="button"
        title={item.label}
        onClick={onExpandCompact}
        className={`flex w-full items-center justify-center rounded-2xl border px-3 py-3 transition-all ${
          item.isActive
            ? "border-primary/15 bg-primary text-white shadow-[0_18px_34px_-22px_rgba(37,99,235,0.85)]"
            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <span className={`material-symbols-outlined text-[20px] ${item.isActive ? "text-white" : "text-slate-400"}`}>
          {item.icon}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-[26px] border p-4 ${
        item.isActive
          ? "border-primary/15 bg-primary/5"
          : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-2xl ${
            item.isActive ? "bg-white text-primary" : "bg-white text-slate-500"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{item.label}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {item.children.length} mục
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {item.children.map((child) => (
          <Link
            key={child.id}
            href={child.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
              child.isActive
                ? "bg-white text-primary shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                child.isActive ? "text-primary" : "text-slate-400"
              }`}
            >
              {child.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{child.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({
  model,
  isCompact,
  onExpandCompact,
  onNavigate,
}: {
  model: CandidateWorkspaceModel;
  isCompact: boolean;
  onExpandCompact: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`rounded-[30px] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.35)] ${
        isCompact ? "space-y-3" : "space-y-4"
      }`}
    >
      <div
        className={`rounded-[24px] bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(14,165,233,0.04))] ${
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
                Candidate Workspace
              </p>
              <p className="mt-1 truncate text-base font-black text-slate-900">
                Không gian ứng viên
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {model.sidebarItems.map((item) =>
          isGroupItem(item) ? (
            <SidebarGroup
              key={item.id}
              item={item}
              isCompact={isCompact}
              onExpandCompact={onExpandCompact}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink key={item.id} item={item} isCompact={isCompact} onNavigate={onNavigate} />
          )
        )}
      </div>
    </div>
  );
}

function CandidateWorkspaceHeader({
  model,
  isDesktopViewport,
  isTabletViewport,
  isTabletExpanded,
  onToggleTabletSidebar,
  onOpenMobileDrawer,
}: {
  model: CandidateWorkspaceModel;
  isDesktopViewport: boolean;
  isTabletViewport: boolean;
  isTabletExpanded: boolean;
  onToggleTabletSidebar: () => void;
  onOpenMobileDrawer: () => void;
}) {
  const showMenuButton = !isDesktopViewport;
  const showTitle = model.showTitleInHeader;

  return (
    <section
      className={`rounded-[30px] border border-slate-200 bg-white/92 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-sm ${
        model.headerVariant === "full" ? "px-5 py-5 sm:px-6 sm:py-6" : "px-4 py-4 sm:px-5"
      }`}
    >
      <div className="flex items-start gap-4">
        {showMenuButton ? (
          <button
            type="button"
            onClick={isTabletViewport ? onToggleTabletSidebar : onOpenMobileDrawer}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
            aria-label={isTabletViewport ? "Toggle sidebar" : "Open candidate navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isTabletViewport ? (isTabletExpanded ? "left_panel_close" : "left_panel_open") : "menu"}
            </span>
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <Breadcrumbs items={model.breadcrumbs} />

          {showTitle ? (
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
              <span className="material-symbols-outlined text-[18px] text-primary">space_dashboard</span>
              <span>Điều hướng không gian ứng viên</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function CandidateLayout({
  children,
  model,
}: {
  children: ReactNode;
  model: CandidateWorkspaceModel;
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
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 lg:gap-8">
            <aside
              className={`hidden shrink-0 md:block ${
                shouldUseCompactSidebar ? "md:w-[96px]" : "md:w-[280px]"
              } lg:w-[288px]`}
            >
              <div className="md:sticky md:top-[108px]">
                <SidebarContent
                  model={model}
                  isCompact={shouldUseCompactSidebar}
                  onExpandCompact={() => setIsTabletExpanded(true)}
                  onNavigate={() => setIsMobileDrawerOpen(false)}
                />
              </div>
            </aside>

            <div className="min-w-0 flex-1 space-y-5">
              <CandidateWorkspaceHeader
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
              className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-[2px] md:hidden"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-label="Close candidate navigation"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed left-0 top-0 z-[80] flex h-full w-full max-w-[320px] flex-col border-r border-slate-200 bg-white p-4 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Candidate Workspace
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
                  onExpandCompact={() => undefined}
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
