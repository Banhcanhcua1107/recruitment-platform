"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Circle,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Settings,
  type LucideIcon,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { scheduleIdleTask } from "@/lib/client-idle";
import { signOutAndRedirect } from "@/utils/supabase/auth-helpers";
import { createClient } from "@/utils/supabase/client";
import {
  getGlobalHeaderModel,
  type GlobalHeaderModel,
  type HeaderAccountMenuItem,
  type HeaderViewer,
} from "./headerModel";

const NotificationBell = dynamic(() => import("@/components/shared/NotificationBell"), {
  ssr: false,
  loading: () => <div className="size-10 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />,
});

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  candidate: "Ứng viên",
  hr: "Nhà tuyển dụng",
};

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

const ACCOUNT_MENU_ICONS: Record<string, LucideIcon> = {
  apartment: Building2,
  dashboard: LayoutDashboard,
  dashboard_customize: LayoutGrid,
  description: FileText,
  groups: Users,
  logout: LogOut,
  person: UserRound,
  settings: Settings,
  work: BriefcaseBusiness,
  work_history: BriefcaseBusiness,
};

function isPrimaryLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getViewerInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "TF";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function UserAvatar({
  avatarUrl,
  displayName,
  sizeClassName,
  textClassName,
}: {
  avatarUrl: string | null;
  displayName: string;
  sizeClassName: string;
  textClassName: string;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={displayName} className={`${sizeClassName} rounded-full object-cover`} />;
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center rounded-full bg-linear-to-br from-primary to-sky-500 font-black text-white ${textClassName}`}
      aria-hidden="true"
    >
      {getViewerInitials(displayName)}
    </div>
  );
}

function AccountMenuIcon({
  iconName,
  className,
}: {
  iconName: string;
  className: string;
}) {
  const Icon = ACCOUNT_MENU_ICONS[iconName] ?? Circle;
  return <Icon className={className} aria-hidden="true" />;
}

function AccountMenuItemRow({
  item,
  onNavigate,
  onAction,
}: {
  item: HeaderAccountMenuItem;
  onNavigate: () => void;
  onAction: () => void;
}) {
  const baseClassName =
    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors";

  const icon = (
    <AccountMenuIcon iconName={item.icon} className="size-5 text-slate-500" />
  );

  if (item.kind === "action") {
    return (
      <button
        type="button"
        onClick={onAction}
        className={`${baseClassName} text-rose-600 hover:bg-rose-50`}
      >
        <AccountMenuIcon iconName={item.icon} className="size-5 text-rose-500" />
        <span>{item.label}</span>
      </button>
    );
  }

  if (item.disabled || !item.href) {
    return (
      <div
        className={`${baseClassName} cursor-not-allowed text-slate-400`}
        aria-disabled="true"
      >
        {icon}
        <span className="flex-1">{item.label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      className={`${baseClassName} text-slate-700 hover:bg-slate-50`}
    >
      {icon}
      <span>{item.label}</span>
    </Link>
  );
}

function AccountMenuContent({
  model,
  onNavigate,
  onSignOut,
}: {
  model: GlobalHeaderModel;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  if (!model.viewer || !model.accountMenu) {
    return null;
  }

  const roleLabel = ROLE_LABELS[model.viewer.role] ?? model.viewer.role;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-38px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(14,165,233,0.03))] px-5 py-5">
        <div className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={model.viewer.avatarUrl}
            displayName={model.viewer.fullName}
            sizeClassName="size-12"
            textClassName="text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">
              {model.viewer.fullName}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1 p-3">
        {model.accountMenu.items.map((item) => (
          <AccountMenuItemRow
            key={item.id}
            item={item}
            onNavigate={onNavigate}
            onAction={onSignOut}
          />
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [viewer, setViewer] = useState<HeaderViewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuTimerRef = useRef<number | null>(null);

  const model = getGlobalHeaderModel(viewer);

  useEffect(() => {
    let active = true;

    async function resolveViewer(nextUser?: User | null) {
      const authUser =
        typeof nextUser === "undefined"
          ? (await supabase.auth.getUser()).data.user
          : nextUser;

      if (!active) {
        return;
      }

      if (!authUser) {
        setViewer(null);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role, email")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      setViewer({
        id: authUser.id,
        email: typeof profile?.email === "string" ? profile.email : authUser.email ?? null,
        fullName:
          typeof profile?.full_name === "string"
            ? profile.full_name
            : typeof authUser.user_metadata?.full_name === "string"
              ? authUser.user_metadata.full_name
              : null,
        avatarUrl:
          typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
        role:
          typeof profile?.role === "string"
            ? profile.role
            : typeof authUser.user_metadata?.role === "string"
              ? authUser.user_metadata.role
              : "GUEST",
        companyName: null,
      });
      setIsLoading(false);
    }

    const cancelIdleTask = scheduleIdleTask(() => {
      void resolveViewer();
    }, 450);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveViewer(session?.user ?? null);
    });

    return () => {
      active = false;
      cancelIdleTask();
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncViewport = () => {
      const isDesktop = mediaQuery.matches;
      setIsDesktopViewport(isDesktop);
      if (isDesktop) {
        setIsMobileDrawerOpen(false);
      } else {
        setIsDesktopMenuOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
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

  useEffect(() => {
    if (!isDesktopMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = accountMenuRef.current?.contains(target);
      const clickedTrigger = accountButtonRef.current?.contains(target);

      if (!clickedInsideMenu && !clickedTrigger) {
        setIsDesktopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDesktopMenuOpen]);

  useEffect(() => {
    return () => {
      if (closeMenuTimerRef.current !== null) {
        window.clearTimeout(closeMenuTimerRef.current);
      }
    };
  }, []);

  const cancelDesktopMenuClose = () => {
    if (closeMenuTimerRef.current !== null) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  };

  const scheduleDesktopMenuClose = () => {
    cancelDesktopMenuClose();
    closeMenuTimerRef.current = window.setTimeout(() => {
      setIsDesktopMenuOpen(false);
      closeMenuTimerRef.current = null;
    }, 180);
  };

  const closeAllMenus = () => {
    cancelDesktopMenuClose();
    setIsDesktopMenuOpen(false);
    setIsMobileDrawerOpen(false);
  };

  const handleLogout = async () => {
    closeAllMenus();
    await signOutAndRedirect(supabase, "/login");
  };

  const handleAccountTrigger = () => {
    if (!model.isAuthenticated) {
      return;
    }

    if (isDesktopViewport) {
      cancelDesktopMenuClose();
      setIsDesktopMenuOpen((current) => !current);
      return;
    }

    setIsMobileDrawerOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.25)] backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center gap-3 lg:min-h-20 lg:gap-6">
            <Link
              href="/"
              prefetch={false}
              className="flex shrink-0 items-center gap-2.5"
              aria-label="TalentFlow homepage"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 lg:size-12">
                <Image
                  src="/logo.png"
                  alt="TalentFlow"
                  width={40}
                  height={40}
                  priority
                  className="h-9 w-9 object-contain lg:h-10 lg:w-10"
                />
              </div>
              <p className="hidden text-[1.8rem] font-extrabold tracking-tight text-slate-900 sm:block lg:text-[1.95rem]">
                TalentFlow
              </p>
            </Link>

            <nav className="hidden flex-1 items-center justify-end md:flex md:pr-4 lg:pr-6 xl:pr-8">
              <div className="flex items-center gap-4 lg:gap-6">
                {model.primaryLinks.map((item) => {
                  const isActive = isPrimaryLinkActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`border-b-2 pb-1 text-[1rem] font-semibold transition-colors ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-600 hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="hidden h-10 w-28 animate-pulse rounded-full bg-slate-200 sm:block" />
                </div>
              ) : model.isAuthenticated && model.viewer ? (
                <>
                  <NotificationBell />

                  <div className="hidden h-5 w-px bg-slate-200 md:block" />

                  <div
                    className="relative"
                    onMouseEnter={() => {
                      if (isDesktopViewport) {
                        cancelDesktopMenuClose();
                        setIsDesktopMenuOpen(true);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isDesktopViewport) {
                        scheduleDesktopMenuClose();
                      }
                    }}
                  >
                    <button
                      ref={accountButtonRef}
                      type="button"
                      onClick={handleAccountTrigger}
                      aria-haspopup="menu"
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 pr-2.5 transition-colors hover:border-primary/30 hover:bg-slate-50 sm:gap-2.5"
                    >
                      <UserAvatar
                        avatarUrl={model.viewer.avatarUrl}
                        displayName={model.viewer.fullName}
                        sizeClassName="size-9 sm:size-10"
                        textClassName="text-xs"
                      />
                      <div className="hidden min-w-0 text-left sm:block">
                        <p className="max-w-24 truncate text-sm font-bold text-slate-900 sm:max-w-32 sm:text-sm">
                          {model.viewer.displayName}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {ROLE_LABELS[model.viewer.role] ?? model.viewer.role}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-4.5 text-slate-400 transition-transform ${
                          isDesktopViewport
                            ? isDesktopMenuOpen
                              ? "rotate-180"
                              : ""
                            : isMobileDrawerOpen
                              ? "rotate-180"
                              : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isDesktopViewport && isDesktopMenuOpen ? (
                      <div ref={accountMenuRef} className="absolute right-0 top-full z-50 w-85 pt-2">
                        <AccountMenuContent
                          model={model}
                          onNavigate={closeAllMenus}
                          onSignOut={() => {
                            void handleLogout();
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    prefetch={false}
                    className="rounded-full border border-primary/20 px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5 sm:px-6"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    prefetch={false}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.8)] transition-colors hover:bg-primary/90 sm:px-6"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto pb-3 lg:hidden">
            {model.primaryLinks.map((item) => {
              const isActive = isPrimaryLinkActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {isMobileDrawerOpen && model.isAuthenticated && model.viewer ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-60 bg-slate-950/40 backdrop-blur-[2px]"
            aria-label="Close account drawer"
            onClick={closeAllMenus}
          />

          <aside className="fixed right-0 top-0 z-70 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Tài khoản
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {model.viewer.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAllMenus}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <AccountMenuContent
                model={model}
                onNavigate={closeAllMenus}
                onSignOut={() => {
                  void handleLogout();
                }}
              />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
