"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useWorkspaceSidebarViewer } from "@/components/workspace/useWorkspaceSidebarViewer";
import {
  isAppShellGroupItem,
  type AppShellGroupItem,
  type AppShellLinkItem,
  type AppShellSidebarItem,
  type AppSidebarConfig,
} from "./types";

function SidebarIdentity({
  config,
  isCompact,
}: {
  config: AppSidebarConfig;
  isCompact: boolean;
}) {
  const viewerName = useWorkspaceSidebarViewer(config.fallbackViewerName);

  if (isCompact) {
    return (
      <div className="flex justify-center border-b border-slate-200/80 pb-3.5">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]">
          <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.28)]">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
        {config.workspaceLabel}
      </p>
      <p className="mt-2 truncate font-headline text-[1.55rem] font-extrabold tracking-tight text-slate-950">
        {viewerName}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{config.viewerRoleLabel}</p>
      {config.workspaceHint ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
          {config.workspaceHint}
        </p>
      ) : null}
    </div>
  );
}

function SidebarLink({
  item,
  isCompact,
  onNavigate,
}: {
  item: AppShellLinkItem;
  isCompact: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      onClick={onNavigate}
      className={cn(
        "group flex items-center rounded-2xl transition-all duration-200",
        isCompact ? "justify-center p-3.5" : "gap-3.5 px-4 py-3.5",
        item.isActive
          ? "bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(56,189,248,0.06))] text-primary shadow-[0_12px_30px_-24px_rgba(37,99,235,0.55)]"
          : "text-slate-600 hover:bg-white hover:text-slate-900",
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined shrink-0 text-[18px]",
          item.isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600",
        )}
      >
        {item.icon}
      </span>
      {!isCompact ? (
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{item.label}</span>
      ) : null}
    </Link>
  );
}

function SidebarGroupLinks({
  item,
  isCompact,
  onNavigate,
}: {
  item: AppShellGroupItem;
  isCompact: boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      {item.children.map((child) => (
        <SidebarLink key={child.id} item={child} isCompact={isCompact} onNavigate={onNavigate} />
      ))}
    </>
  );
}

interface AppSidebarProps {
  items: AppShellSidebarItem[];
  config: AppSidebarConfig;
  isCompact: boolean;
  allowCompactGroupExpand: boolean;
  onExpandCompact: () => void;
  onNavigate: () => void;
}

export function AppSidebar({
  items,
  config,
  isCompact,
  onNavigate,
}: AppSidebarProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95))]",
        isCompact ? "space-y-3 px-2.5 py-3.5" : "space-y-4 px-3.5 py-4.5",
      )}
    >
      <SidebarIdentity config={config} isCompact={isCompact} />

      <nav className={cn("space-y-1.5", isCompact ? "mt-1" : "mt-0.5")}>
        {items.map((item) =>
          isAppShellGroupItem(item) ? (
            <SidebarGroupLinks
              key={item.id}
              item={item}
              isCompact={isCompact}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink
              key={item.id}
              item={item}
              isCompact={isCompact}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>
    </div>
  );
}
