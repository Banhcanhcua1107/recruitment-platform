"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppShellBreadcrumb } from "./types";

function Breadcrumbs({ items }: { items: AppShellBreadcrumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
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

interface AppTopbarProps {
  breadcrumbs: AppShellBreadcrumb[];
  title: string;
  description: string | null;
  headerVariant: "full" | "compact";
  showTitleInHeader: boolean;
  compactHintIcon: string;
  compactHintText: string;
  drawerTitle: string;
  isDesktopViewport: boolean;
  isTabletViewport: boolean;
  isTabletExpanded: boolean;
  onToggleTabletSidebar: () => void;
  onOpenMobileDrawer: () => void;
  menuAriaLabel: {
    tablet: string;
    mobile: string;
  };
}

export function AppTopbar({
  breadcrumbs,
  title,
  description,
  headerVariant,
  showTitleInHeader,
  compactHintIcon,
  compactHintText,
  drawerTitle,
  isDesktopViewport,
  isTabletViewport,
  isTabletExpanded,
  onToggleTabletSidebar,
  onOpenMobileDrawer,
  menuAriaLabel,
}: AppTopbarProps) {
  const isCvWorkspaceFlow = breadcrumbs.some((item) => item.label === "CV của tôi");
  const shouldHideCompactDesktopHeader =
    headerVariant === "compact" && !showTitleInHeader && isDesktopViewport && isCvWorkspaceFlow;

  if (shouldHideCompactDesktopHeader) {
    return null;
  }

  return (
    <section
      className={cn(
        headerVariant === "full"
          ? "rounded-[26px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] px-5 py-5 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:px-6 sm:py-6"
          : "px-0 py-1.5",
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {!isDesktopViewport ? (
          <button
            type="button"
            onClick={isTabletViewport ? onToggleTabletSidebar : onOpenMobileDrawer}
            className="flex size-10.5 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-sky-200 hover:bg-sky-50 hover:text-primary"
            aria-label={isTabletViewport ? menuAriaLabel.tablet : menuAriaLabel.mobile}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isTabletViewport
                ? isTabletExpanded
                  ? "left_panel_close"
                  : "left_panel_open"
                : "menu"}
            </span>
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {headerVariant === "full" || showTitleInHeader ? (
            <Breadcrumbs items={breadcrumbs} />
          ) : null}

          <div
            className={cn(
              "mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
              showTitleInHeader ? "" : "lg:items-center",
            )}
          >
            <div className="min-w-0">
              {showTitleInHeader ? (
                <>
                  <h1
                    className={cn(
                      "font-headline font-extrabold tracking-tight text-slate-950",
                      headerVariant === "full" ? "text-2xl sm:text-[2rem]" : "text-xl",
                    )}
                  >
                    {title}
                  </h1>
                  {description ? (
                    <p
                      className={cn(
                        "mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500",
                        headerVariant === "full" ? "sm:text-base sm:leading-7" : "",
                      )}
                    >
                      {description}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                  <span className="flex size-9 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-primary">
                    <span className="material-symbols-outlined text-[18px]">{compactHintIcon}</span>
                  </span>
                  <span>{compactHintText}</span>
                </div>
              )}
            </div>

            {headerVariant === "full" ? (
              <div className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.42)]">
                {drawerTitle}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
