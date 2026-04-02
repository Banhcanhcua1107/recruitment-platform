"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/shared/NotificationBell";
import { signOutAndRedirect } from "@/utils/supabase/auth-helpers";
import { createClient } from "@/utils/supabase/client";
import {
  getGlobalHeaderModel,
  type GlobalHeaderModel,
  type HeaderAccountMenuItem,
  type HeaderViewer,
} from "./headerModel";

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  candidate: "Ứng viên",
  hr: "Nhà tuyển dụng",
};

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

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
    <span className="material-symbols-outlined text-[20px] text-slate-500">
      {item.icon}
    </span>
  );

  if (item.kind === "action") {
    return (
      <button
        type="button"
        onClick={onAction}
        className={`${baseClassName} text-rose-600 hover:bg-rose-50`}
      >
        <span className="material-symbols-outlined text-[20px] text-rose-500">
          {item.icon}
        </span>
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
    <Link href={item.href} onClick={onNavigate} className={`${baseClassName} text-slate-700 hover:bg-slate-50`}>
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

    void resolveViewer();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveViewer(session?.user ?? null);
    });

    return () => {
      active = false;
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

  const closeAllMenus = () => {
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
      setIsDesktopMenuOpen((current) => !current);
      return;
    }

    setIsMobileDrawerOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.25)] backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 items-center gap-4 lg:min-h-24 lg:gap-8">
            <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="TalentFlow homepage">
              <div className="flex size-13 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Image
                  src="/logo.png"
                  alt="TalentFlow"
                  width={44}
                  height={44}
                  priority
                  className="h-12 w-12 object-contain"
                />
              </div>
              <p className="hidden text-[2.1rem] font-extrabold tracking-tight text-slate-900 sm:block">
                TalentFlow
              </p>
            </Link>

            <nav className="hidden flex-1 items-center justify-end md:flex md:pr-4 lg:pr-8 xl:pr-10">
              <div className="flex items-center gap-5 lg:gap-7">
                {model.primaryLinks.map((item) => {
                  const isActive = isPrimaryLinkActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`border-b-2 pb-1.5 text-[1.08rem] font-semibold transition-colors ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-slate-600 hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="hidden h-10 w-28 animate-pulse rounded-full bg-slate-200 sm:block" />
                </div>
              ) : model.isAuthenticated && model.viewer ? (
                <>
                  <NotificationBell />

                  <div className="hidden h-6 w-px bg-slate-200 md:block" />

                  <div
                    className="relative"
                    onMouseEnter={() => {
                      if (isDesktopViewport) {
                        setIsDesktopMenuOpen(true);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isDesktopViewport) {
                        setIsDesktopMenuOpen(false);
                      }
                    }}
                  >
                    <button
                      ref={accountButtonRef}
                      type="button"
                      onClick={handleAccountTrigger}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-2 pr-3 transition-colors hover:border-primary/30 hover:bg-slate-50 sm:gap-3"
                      aria-haspopup="menu"
                    >
                      <UserAvatar
                        avatarUrl={model.viewer.avatarUrl}
                        displayName={model.viewer.fullName}
                        sizeClassName="size-10 sm:size-11"
                        textClassName="text-xs"
                      />
                      <div className="hidden min-w-0 text-left sm:block">
                        <p className="max-w-24 truncate text-sm font-bold text-slate-900 sm:max-w-32 sm:text-base">
                          {model.viewer.displayName}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {ROLE_LABELS[model.viewer.role] ?? model.viewer.role}
                        </p>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform ${
                          isDesktopViewport
                            ? isDesktopMenuOpen
                              ? "rotate-180"
                              : ""
                            : isMobileDrawerOpen
                              ? "rotate-180"
                              : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    <AnimatePresence>
                      {isDesktopViewport && isDesktopMenuOpen ? (
                        <motion.div
                          ref={accountMenuRef}
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute right-0 top-full z-50 mt-4 w-85"
                        >
                          <AccountMenuContent
                            model={model}
                            onNavigate={closeAllMenus}
                            onSignOut={() => {
                              void handleLogout();
                            }}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="rounded-full border border-primary/20 px-5 py-2.5 text-base font-bold text-primary transition-colors hover:bg-primary/5 sm:px-6"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-primary px-5 py-2.5 text-base font-bold text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.8)] transition-colors hover:bg-primary/90 sm:px-6"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto pb-4 lg:hidden">
            {model.primaryLinks.map((item) => {
              const isActive = isPrimaryLinkActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
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

      <AnimatePresence>
        {isMobileDrawerOpen && model.isAuthenticated && model.viewer ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 bg-slate-950/40 backdrop-blur-[2px]"
              aria-label="Close account drawer"
              onClick={closeAllMenus}
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed right-0 top-0 z-70 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white"
            >
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
                  <span className="material-symbols-outlined text-[20px]">close</span>
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
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
