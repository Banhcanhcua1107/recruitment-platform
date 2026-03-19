"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { CurrentViewer } from "@/lib/viewer";
import { signOutAndRedirect } from "@/utils/supabase/auth-helpers";
import { createClient } from "@/utils/supabase/client";

const NotificationBell = dynamic(() => import("./NotificationBell"), {
  ssr: false,
  loading: () => null,
});

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khach",
  hr: "Nha tuyen dung",
  candidate: "Ung vien",
};

export function NavbarClient({ viewer }: { viewer: CurrentViewer | null }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const role = viewer?.role || "GUEST";
  const isLoggedIn = Boolean(viewer);
  const viewerId = viewer?.id ?? "";
  const viewerAvatarUrl = viewer?.avatarUrl || "https://placehold.co/100x100?text=U";
  const viewerDisplayName = viewer?.fullName?.split(" ").pop() || "Thanh vien";

  const guestLinks = [
    { name: "Tim viec lam", href: "/jobs" },
    { name: "Cong ty", href: "/companies" },
    { name: "Lien he", href: "/contact" },
  ];

  const candidateInternalLinks = [
    { name: "Tong quan", href: "/candidate/dashboard" },
    { name: "Ho so ca nhan", href: "/candidate/profile" },
    { name: "CV cua toi", href: "/candidate/cv-builder" },
    { name: "Viec da ung tuyen", href: "/candidate/applications" },
  ];

  const hrLinks = [
    { name: "Bang dieu khien", href: "/hr/dashboard" },
    { name: "Tin tuyen dung", href: "/hr/jobs" },
    { name: "Ung vien", href: "/hr/candidates" },
    { name: "Ho so cong ty", href: "/hr/company" },
  ];

  let currentLinks = guestLinks;
  if (isLoggedIn) {
    if (role === "hr") currentLinks = hrLinks;
    else if (role === "candidate" && pathname.startsWith("/candidate")) {
      currentLinks = candidateInternalLinks;
    }
  }

  const handleLogout = async () => {
    await signOutAndRedirect(supabase, "/login");
  };

  const renderAuthButtons = () => (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="flex h-12 items-center rounded-xl border-2 border-primary px-6 font-bold text-primary transition-all hover:bg-primary/5"
      >
        Dang nhap
      </Link>
      <Link
        href="/register"
        className="flex h-12 items-center rounded-xl bg-primary px-7 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
      >
        Dang ky
      </Link>
    </div>
  );

  const renderLinks = (links: Array<{ name: string; href: string }>) => (
    <nav className="flex items-center gap-6 lg:gap-8">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`whitespace-nowrap text-[17px] font-bold transition-colors ${
            pathname === link.href ? "text-[#2563eb]" : "text-[#334155] hover:text-[#2563eb]"
          }`}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-slate-100 bg-white/95 backdrop-blur-md lg:h-24">
      <div className="mx-auto flex w-[92%] max-w-[1536px] items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-4">
          <div className="flex size-10 items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo TalentFlow"
              width={40}
              height={40}
              priority
              className="h-full w-full scale-150 object-contain"
            />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 lg:text-3xl">
            TalentFlow
          </h2>
        </Link>

        <div className="ml-10 flex flex-1 items-center justify-between gap-6 lg:gap-10">
          {renderLinks(currentLinks)}

          <div className="flex min-w-[160px] items-center justify-end gap-4">
            {!isLoggedIn ? (
              renderAuthButtons()
            ) : (
              <div className="flex items-center gap-2">
                <NotificationBell viewerId={viewerId} />

                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown((value) => !value)}
                    className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white p-1 pr-3 transition-all hover:border-primary/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewerAvatarUrl}
                      className="size-9 rounded-full border border-slate-100 object-cover"
                      alt="Anh dai dien nguoi dung"
                    />
                    <span className="hidden text-sm font-bold text-slate-700 xl:block">
                      {viewerDisplayName}
                    </span>
                    <span
                      className={`material-symbols-outlined text-lg text-slate-400 transition-transform ${
                        showProfileDropdown ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {showProfileDropdown ? (
                    <>
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowProfileDropdown(false)}
                      />
                      <div className="absolute right-0 z-50 mt-3 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl">
                        <div className="mb-1 border-b border-slate-50 px-4 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {ROLE_LABELS[role] ?? role}
                          </p>
                        </div>
                        <Link
                          href={role === "GUEST" ? "/role-selection" : `/${role}/dashboard`}
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-slate-600 transition-all hover:bg-primary/5"
                        >
                          <span className="material-symbols-outlined text-lg">dashboard</span>
                          {role === "GUEST" ? "Chon vai tro" : "Bang dieu khien"}
                        </Link>
                        <hr className="my-1 border-slate-50" />
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Dang xuat
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
