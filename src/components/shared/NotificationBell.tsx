"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, ExternalLink } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string | null;
  is_read: boolean;
  created_at: string;
  type: string | null;
}

function formatRelativeTime(value: string) {
  const now = Date.now();
  const created = new Date(value).getTime();
  const diff = Math.max(0, Math.floor((now - created) / 1000));

  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function iconForType(type: string | null) {
  switch (type) {
    case "application_applied":
      return "📩";
    case "application_status_updated":
      return "🔄";
    case "application_submitted":
      return "✅";
    default:
      return "🔔";
  }
}

const NotificationBell: React.FC = () => {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, description, href, is_read, created_at, type")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active || error) {
        return;
      }

      setNotifications((data ?? []) as NotificationItem[]);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as NotificationItem | undefined;
          const old = payload.old as NotificationItem | undefined;

          setNotifications((prev) => {
            if (payload.eventType === "INSERT" && next) {
              return [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 20);
            }

            if (payload.eventType === "UPDATE" && next) {
              return prev.map((item) => (item.id === next.id ? next : item));
            }

            if (payload.eventType === "DELETE" && old) {
              return prev.filter((item) => item.id !== old.id);
            }

            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function handleMarkAllAsRead() {
    if (!userId || unreadCount === 0) {
      return;
    }

    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("recipient_id", userId);

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={bellButtonRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-900/5 active:scale-95"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5 text-slate-600" strokeWidth={2.5} />

        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-4 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
          <div className="bg-linear-to-br from-slate-50/60 to-transparent px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Thông báo</h3>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Đánh dấu đã đọc
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto bg-linear-to-b from-slate-50/30 to-transparent">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const content = (
                  <div
                    className={`group flex items-start gap-3.5 px-6 py-4 transition-colors ${
                      notification.is_read ? "hover:bg-slate-50/40" : "bg-blue-50/40"
                    }`}
                  >
                    <div className="mt-0.5 text-xl">{iconForType(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                          {notification.title}
                        </h4>
                        {!notification.is_read ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600/80">
                        {notification.description}
                      </p>
                      <p className="mt-2.5 text-xs font-medium text-slate-500/70">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {notification.href ? (
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                    ) : null}
                  </div>
                );

                return notification.href ? (
                  <Link key={notification.id} href={notification.href} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <CheckCircle2 className="mb-4 h-12 w-12 text-slate-300" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-500">Hiện chưa có thông báo mới</p>
                <p className="mt-1 text-xs text-slate-400/70">Thông báo ATS của HR và ứng viên sẽ hiển thị ở đây.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
