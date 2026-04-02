"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import WorkspaceHeader from "./WorkspaceHeader";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { WorkspaceHeaderConfig, WorkspaceShellModel, WorkspaceSidebarConfig } from "./types";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const TABLET_MEDIA_QUERY = "(min-width: 768px) and (max-width: 1023px)";

interface WorkspaceLayoutProps {
  children: ReactNode;
  model: WorkspaceShellModel;
  sidebarConfig: WorkspaceSidebarConfig;
  headerConfig: WorkspaceHeaderConfig;
  allowCompactGroupExpand?: boolean;
}

export default function WorkspaceLayout({
  children,
  model,
  sidebarConfig,
  headerConfig,
  allowCompactGroupExpand = false,
}: WorkspaceLayoutProps) {
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
    [isTabletExpanded, isTabletViewport],
  );

  return (
    <AppShell
      header={
        <WorkspaceHeader
          model={model}
          config={headerConfig}
          isDesktopViewport={isDesktopViewport}
          isTabletViewport={isTabletViewport}
          isTabletExpanded={isTabletExpanded}
          onToggleTabletSidebar={() => setIsTabletExpanded((current) => !current)}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />
      }
      sidebar={
        <WorkspaceSidebar
          items={model.sidebarItems}
          config={sidebarConfig}
          isCompact={shouldUseCompactSidebar}
          allowCompactGroupExpand={allowCompactGroupExpand}
          onExpandCompact={() => setIsTabletExpanded(true)}
          onNavigate={() => setIsMobileDrawerOpen(false)}
        />
      }
      mobileDrawer={
        <WorkspaceSidebar
          items={model.sidebarItems}
          config={sidebarConfig}
          isCompact={false}
          allowCompactGroupExpand={allowCompactGroupExpand}
          onExpandCompact={() => undefined}
          onNavigate={() => setIsMobileDrawerOpen(false)}
        />
      }
      drawerLabel={sidebarConfig.workspaceLabel}
      drawerTitle={headerConfig.drawerTitle}
      closeAriaLabel={headerConfig.menuAriaLabel.close}
      isCompactSidebar={shouldUseCompactSidebar}
      isMobileDrawerOpen={isMobileDrawerOpen}
      onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
    >
      {children}
    </AppShell>
  );
}
