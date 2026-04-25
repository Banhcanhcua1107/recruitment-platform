"use client";

import { AppSidebar } from "@/components/app-shell/AppSidebar";
import type { WorkspaceSidebarConfig, WorkspaceSidebarItem } from "./types";

interface WorkspaceSidebarProps {
  items: WorkspaceSidebarItem[];
  config: WorkspaceSidebarConfig;
  isCompact: boolean;
  allowCompactGroupExpand: boolean;
  onExpandCompact: () => void;
  onNavigate: () => void;
}

export default function WorkspaceSidebar({
  items,
  config,
  isCompact,
  allowCompactGroupExpand,
  onExpandCompact,
  onNavigate,
}: WorkspaceSidebarProps) {
  return (
    <AppSidebar
      items={items}
      config={config}
      isCompact={isCompact}
      allowCompactGroupExpand={allowCompactGroupExpand}
      onExpandCompact={onExpandCompact}
      onNavigate={onNavigate}
    />
  );
}
