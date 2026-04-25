"use client";

import { AppTopbar } from "@/components/app-shell/AppTopbar";
import type { WorkspaceHeaderConfig, WorkspaceShellModel } from "./types";

interface WorkspaceHeaderProps {
  model: WorkspaceShellModel;
  config: WorkspaceHeaderConfig;
  isDesktopViewport: boolean;
  isTabletViewport: boolean;
  isTabletExpanded: boolean;
  onToggleTabletSidebar: () => void;
  onOpenMobileDrawer: () => void;
}

export default function WorkspaceHeader({
  model,
  config,
  isDesktopViewport,
  isTabletViewport,
  isTabletExpanded,
  onToggleTabletSidebar,
  onOpenMobileDrawer,
}: WorkspaceHeaderProps) {
  return (
    <AppTopbar
      breadcrumbs={model.breadcrumbs}
      title={model.title}
      description={model.description}
      headerVariant={model.headerVariant}
      showTitleInHeader={model.showTitleInHeader}
      compactHintIcon={config.compactHintIcon}
      compactHintText={config.compactHintText}
      drawerTitle={config.drawerTitle}
      isDesktopViewport={isDesktopViewport}
      isTabletViewport={isTabletViewport}
      isTabletExpanded={isTabletExpanded}
      onToggleTabletSidebar={onToggleTabletSidebar}
      onOpenMobileDrawer={onOpenMobileDrawer}
      menuAriaLabel={config.menuAriaLabel}
    />
  );
}
