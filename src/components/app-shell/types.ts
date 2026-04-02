export interface AppShellBreadcrumb {
  label: string;
  href?: string;
}

export interface AppShellLinkItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  isActive?: boolean;
}

export interface AppShellGroupItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  children: AppShellLinkItem[];
  isActive?: boolean;
}

export type AppShellSidebarItem = AppShellLinkItem | AppShellGroupItem;

export function isAppShellGroupItem(
  item: AppShellSidebarItem,
): item is AppShellGroupItem {
  return "children" in item;
}

export interface AppSidebarConfig {
  workspaceLabel: string;
  workspaceTitle: string;
  workspaceHint?: string;
  heroGradientClassName?: string;
  viewerRoleLabel: string;
  fallbackViewerName: string;
}
