export interface WorkspaceBreadcrumb {
  label: string;
  href?: string;
}

export interface WorkspaceSidebarLinkItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  isActive?: boolean;
}

export interface WorkspaceSidebarGroupItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  children: WorkspaceSidebarLinkItem[];
  isActive?: boolean;
}

export type WorkspaceSidebarItem = WorkspaceSidebarLinkItem | WorkspaceSidebarGroupItem;

export function isWorkspaceSidebarGroupItem(
  item: WorkspaceSidebarItem,
): item is WorkspaceSidebarGroupItem {
  return "children" in item;
}

export interface WorkspaceShellModel {
  headerVariant: "full" | "compact";
  showTitleInHeader: boolean;
  title: string;
  description: string | null;
  breadcrumbs: WorkspaceBreadcrumb[];
  sidebarItems: WorkspaceSidebarItem[];
}

export interface WorkspaceSidebarConfig {
  workspaceLabel: string;
  workspaceTitle: string;
  workspaceHint?: string;
  heroGradientClassName: string;
  viewerRoleLabel: string;
  fallbackViewerName: string;
}

export interface WorkspaceHeaderConfig {
  compactHintIcon: string;
  compactHintText: string;
  menuAriaLabel: {
    tablet: string;
    mobile: string;
    close: string;
  };
  drawerTitle: string;
}
