"use client";
import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  icon: string; // emoji or icon name
  title: string;
  description: string;
  timestamp: string; // e.g., "5 phút trước", "2 giờ trước"
  read: boolean;
}

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      icon: "📋",
      title: "Công ty ABC tìm kiếm Frontend Developer",
      description: "Bạn phù hợp với vị trí này",
      timestamp: "5 phút trước",
      read: false,
    },
    {
      id: "2",
      icon: "✅",
      title: "Ứng dụng của bạn đã được xem xét",
      description: "Công ty XYZ vừa xem hồ sơ của bạn",
      timestamp: "1 giờ trước",
      read: false,
    },
    {
      id: "3",
      icon: "💼",
      title: "Cập nhật hồ sơ thành công",
      description: "Hồ sơ của bạn đã được cập nhật",
      timestamp: "2 giờ trước",
      read: true,
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
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

  const handleMarkAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  // ========================
  // ANTIGRAVITY + SAAS ANIMATIONS
  // ========================

  // Bell button hover/wiggle animation
  const bellVariants = {
    rest: { rotate: 0, scale: 1 },
    hover: {
      rotate: [0, -8, 8, -5, 5, 0],
      transition: { duration: 0.6, ease: "easeInOut" as const },
    },
  };

  // Ping animation for unread dot (subtle)
  const pingVariants = {
    animate: {
      scale: [1, 1.4, 1],
      opacity: [1, 0.4, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  // Popover with spring physics (Antigravity feel)
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -12,
      transition: {
        duration: 0.15,
      },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -12,
      transition: {
        duration: 0.15,
      },
    },
  };

  // Staggered container for list items
  const containerVariants = {
    visible: {
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
  };

  // Individual notification item animation (slide in + lift)
  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -12,
      y: 8,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
      },
    },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button - Wiggle Animation on Hover */}
      <motion.button
        ref={bellButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        initial="rest"
        whileHover="hover"
        variants={bellVariants}
        className="relative flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 hover:bg-slate-900/5 active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" strokeWidth={2.5} />

        {/* Red Dot Badge - Ping Animation */}
        {unreadCount > 0 && (
          <>
            {/* Background ping glow */}
            <motion.div
              variants={pingVariants}
              animate="animate"
              className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full"
            />
            {/* Solid dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/40"
            />
          </>
        )}
      </motion.button>

      {/* Notification Popover - Floating Antigravity Style */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 mt-4 w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50"
          >
            {/* Header - Monochromatic with Blue Accent */}
            <div className="px-6 py-4 bg-gradient-to-br from-slate-50/50 to-transparent">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Thông báo
                </h3>
                {unreadCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarkAsRead}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Đánh dấu đã đọc
                  </motion.button>
                )}
              </div>
            </div>

            {/* Notification List - Staggered Animation */}
            <div className="max-h-96 overflow-y-auto bg-gradient-to-b from-slate-50/30 to-transparent">
              {notifications.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className=""
                >
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ y: -2 }}
                      className={`px-6 py-4 transition-all duration-200 cursor-pointer group ${
                        !notification.read
                          ? "bg-blue-50/40"
                          : "hover:bg-slate-50/40"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="text-xl mt-0.5 flex-shrink-0"
                        >
                          {notification.icon}
                        </motion.div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <motion.div
                                layoutId="unreadDot"
                                className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"
                              />
                            )}
                          </div>
                          <p className="text-xs text-slate-600/80 mt-1.5 leading-relaxed line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-xs text-slate-500/70 mt-2.5 font-medium">
                            {notification.timestamp}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* Empty State - Beautiful and Minimal */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="px-6 py-16 text-center flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="mb-4"
                  >
                    <CheckCircle className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                  </motion.div>
                  <p className="text-sm font-medium text-slate-500 tracking-tight">
                    You're all caught up
                  </p>
                  <p className="text-xs text-slate-400/70 mt-1">
                    No new notifications
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer - View All Link */}
            {notifications.length > 0 && (
              <div className="px-6 py-3 bg-gradient-to-r from-slate-50/50 to-transparent border-t border-slate-200/50 text-center">
                <motion.a
                  href="/candidate/notifications"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
                >
                  Xem tất cả
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    →
                  </motion.span>
                </motion.a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
