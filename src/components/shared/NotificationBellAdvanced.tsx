"use client";
import React, { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface Notification {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  created_at?: string; // For real backend data
  user_id?: string;
}

/**
 * ADVANCED VERSION: Connect to Real Supabase Notifications
 * 
 * To use this version:
 * 1. Replace the current NotificationBell.tsx with this file
 * 2. Ensure you have a "notifications" table in Supabase
 * 3. Set up RLS policies (see NOTIFICATION_FEATURE_GUIDE.md)
 * 4. Enable Supabase real-time subscriptions
 */

function formatTimeAgo(date: string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diff = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const NotificationBellAdvanced: React.FC = () => {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  // Fetch notifications from Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching notifications:", error);
          return;
        }

        // Format notifications
        const formatted = data?.map((notif: any) => ({
          id: notif.id,
          icon: notif.icon || "📬",
          title: notif.title,
          description: notif.description,
          timestamp: formatTimeAgo(notif.created_at),
          read: notif.read,
          created_at: notif.created_at,
          user_id: notif.user_id,
        })) || [];

        setNotifications(formatted);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newNotif = {
              id: payload.new.id,
              icon: payload.new.icon || "📬",
              title: payload.new.title,
              description: payload.new.description,
              timestamp: formatTimeAgo(payload.new.created_at),
              read: payload.new.read,
              created_at: payload.new.created_at,
              user_id: payload.new.user_id,
            };
            setNotifications((prev) => [newNotif, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((notif) =>
                notif.id === payload.new.id
                  ? {
                      ...notif,
                      read: payload.new.read,
                      timestamp: formatTimeAgo(payload.new.created_at),
                    }
                  : notif
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  const handleMarkAsRead = async () => {
    if (!user?.id) return;

    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    // Batch update unread notifications
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .in("id", unreadIds);

    if (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Animation variants
  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" as const },
    },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -5 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.2 },
    }),
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-slate-700" strokeWidth={2} />

        {/* Red Dot Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"
            aria-label={`${unreadCount} unread notifications`}
          />
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="px-5 py-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`px-5 py-4 hover:bg-blue-50 transition-colors cursor-pointer group ${
                        !notification.read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icon */}
                          <div className="text-2xl mt-1 flex-shrink-0">
                            {notification.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">
                              {notification.timestamp}
                            </p>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded flex-shrink-0"
                          title="Delete notification"
                        >
                          <span className="text-sm">✕</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-slate-500 font-medium">
                    Không có thông báo
                  </p>
                </div>
              )}
            </div>

            {/* Footer - View All Link */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
                <a
                  href="/candidate/notifications"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline"
                >
                  Xem tất cả →
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBellAdvanced;
