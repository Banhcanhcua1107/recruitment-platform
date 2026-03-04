"use client";

import React, { useState, useCallback, useEffect, useTransition } from "react";
import { useCVStore } from "../store";
import { optimizeCVContent } from "@/app/actions/ai-actions";
import {
  Sparkles,
  Wand2,
  Check,
  X,
  Brain,
  Lightbulb,
  Zap,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Section labels ──────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  header: "Thông tin cá nhân",
  personal_info: "Liên hệ",
  summary: "Giới thiệu bản thân",
  experience_list: "Kinh nghiệm làm việc",
  education_list: "Học vấn",
  skill_list: "Kỹ năng",
  project_list: "Dự án",
  award_list: "Giải thưởng",
  certificate_list: "Chứng chỉ",
};

// ── Section icons ───────────────────────────────────────────
const SECTION_ICONS: Record<string, string> = {
  header: "person",
  personal_info: "contact_page",
  summary: "article",
  experience_list: "work",
  education_list: "school",
  skill_list: "psychology",
  project_list: "code",
  award_list: "emoji_events",
  certificate_list: "workspace_premium",
};

// ── Quick tips per section ──────────────────────────────────
const QUICK_TIPS: Record<string, string[]> = {
  summary: [
    "Viết 3-5 câu, tập trung vào giá trị bạn mang lại",
    "Đề cập số năm kinh nghiệm và chuyên môn chính",
    "Tùy chỉnh theo từng vị trí ứng tuyển",
  ],
  experience_list: [
    "Bắt đầu bằng động từ mạnh: Xây dựng, Triển khai, Tối ưu...",
    "Thêm số liệu cụ thể: 'Tăng tốc 40%', 'Phục vụ 50k users'",
    "Tập trung vào kết quả, không chỉ liệt kê nhiệm vụ",
  ],
  education_list: [
    "Ghi GPA nếu >= 3.2/4.0 hoặc >= 7.5/10",
    "Thêm khóa học, chứng chỉ liên quan",
  ],
  skill_list: [
    "Nhóm theo danh mục: Frontend, Backend, DevOps",
    "Chỉ liệt kê kỹ năng bạn tự tin khi phỏng vấn",
  ],
  project_list: [
    "Ưu tiên dự án có users hoặc doanh thu thực tế",
    "Luôn ghi rõ tech stack và vai trò của bạn",
  ],
  award_list: [
    "Chỉ thêm giải thưởng liên quan đến ngành nghề",
    "Ghi rõ tên tổ chức trao giải và năm",
  ],
  default: [
    "Click vào mục bên trái để bắt đầu chỉnh sửa",
    "AI sẽ tối ưu nội dung khi bạn bấm nút bên dưới",
  ],
};

// ── Optimizable fields per section ──────────────────────────
const OPTIMIZABLE_FIELDS: Record<string, { key: string; label: string }[]> = {
  summary: [{ key: "text", label: "Nội dung giới thiệu" }],
  experience_list: [{ key: "description", label: "Mô tả công việc" }],
  project_list: [{ key: "description", label: "Mô tả dự án" }],
  award_list: [{ key: "description", label: "Mô tả giải thưởng" }],
};

// ── Animation variants (Spring physics) ─────────────────────
const sidebarContentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

const suggestionBoxVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

const skeletonPulse = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

// ════════════════════════════════════════════════════════════
// AISidebar Component
// ════════════════════════════════════════════════════════════
export function AISidebar() {
  const { selectedSectionId, cv, updateSectionData } = useCVStore();

  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [provider, setProvider] = useState<string | null>(null);

  const selectedSection = cv.sections.find((s) => s.id === selectedSectionId);
  const sectionType = selectedSection?.type || "";
  const sectionLabel = selectedSection?.title || SECTION_LABELS[sectionType] || "Chọn một mục";
  const sectionIcon = SECTION_ICONS[sectionType] || "edit_note";
  const tips = QUICK_TIPS[sectionType] || QUICK_TIPS.default;
  const optimizableFields = OPTIMIZABLE_FIELDS[sectionType] || [];
  const canOptimize = optimizableFields.length > 0;
  const activeField = optimizableFields[0] || null;

  // Reset when section changes
  useEffect(() => {
    setSuggestion(null);
    setError(null);
    setProvider(null);
    setActiveItemIndex(0);
  }, [selectedSectionId]);

  // Get current content for the active field
  const getCurrentContent = useCallback((): string => {
    if (!selectedSection || !activeField) return "";
    const data = selectedSection.data as Record<string, unknown>;

    if (data.items && Array.isArray(data.items)) {
      const items = data.items as Record<string, unknown>[];
      const item = items[activeItemIndex];
      return item ? String(item[activeField.key] || "") : "";
    }

    return String(data[activeField.key] || "");
  }, [selectedSection, activeField, activeItemIndex]);

  // Request AI optimization via Server Action
  const handleOptimize = useCallback(() => {
    const content = getCurrentContent();
    if (!content.trim()) {
      setError("Hãy nhập nội dung trước khi tối ưu bằng AI.");
      return;
    }

    setSuggestion(null);
    setError(null);
    setProvider(null);

    startTransition(async () => {
      const result = await optimizeCVContent(
        sectionType,
        activeField?.key || "",
        content
      );

      if (result.success && result.suggestion) {
        setSuggestion(result.suggestion);
        setProvider(result.provider || null);
      } else {
        setError(result.error || "Không thể tối ưu. Vui lòng thử lại.");
      }
    });
  }, [getCurrentContent, sectionType, activeField, startTransition]);

  // Apply suggestion
  const handleApply = useCallback(() => {
    if (!selectedSection || !activeField || !suggestion) return;
    const data = selectedSection.data as Record<string, unknown>;

    if (data.items && Array.isArray(data.items)) {
      const newItems = [...(data.items as Record<string, unknown>[])];
      newItems[activeItemIndex] = {
        ...newItems[activeItemIndex],
        [activeField.key]: suggestion,
      };
      updateSectionData(selectedSection.id, { items: newItems });
    } else {
      updateSectionData(selectedSection.id, { [activeField.key]: suggestion });
    }

    setSuggestion(null);
    setProvider(null);
  }, [selectedSection, activeField, suggestion, activeItemIndex, updateSectionData]);

  // Discard
  const handleDiscard = useCallback(() => {
    setSuggestion(null);
    setError(null);
    setProvider(null);
  }, []);

  // Item count for list sections
  const getItemCount = (): number => {
    if (!selectedSection) return 0;
    const data = selectedSection.data as Record<string, unknown>;
    if (data.items && Array.isArray(data.items)) return (data.items as unknown[]).length;
    return 0;
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* ── Sticky Header ─────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* AI Icon with ping */}
          <div className="relative">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Brain size={18} className="text-white" />
            </div>
            {/* Ping animation */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">AI Writing Assistant</h2>
            <p className="text-[11px] text-slate-400">Tối ưu nội dung CV thông minh</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedSectionId || "empty"}
              variants={sidebarContentVariants}
              initial="hidden"
              animate="visible"
            >
              {/* ── Active Section Card ─────────────────── */}
              <motion.div variants={cardVariants} className="mb-5">
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined text-base text-blue-600">
                      {sectionIcon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Đang chỉnh sửa
                    </p>
                    <p className="text-sm font-bold text-slate-700 truncate">{sectionLabel}</p>
                  </div>
                  {canOptimize && (
                    <Zap size={14} className="text-blue-500 shrink-0" />
                  )}
                </div>
              </motion.div>

              {/* ── Quick Tips ──────────────────────────── */}
              <motion.div variants={cardVariants} className="mb-5">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-amber-500" />
                  Mẹo viết hay
                </h3>
                <div className="space-y-2">
                  {tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-[13px] text-slate-600 leading-relaxed"
                    >
                      <span className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400/70" />
                      {tip}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Divider ────────────────────────────── */}
              <motion.div variants={cardVariants}>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </motion.div>

              {/* ── AI Optimize Section ─────────────────── */}
              {canOptimize ? (
                <motion.div variants={cardVariants} className="mt-5 space-y-4">
                  {/* Item selector for list sections */}
                  {getItemCount() > 1 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Chọn mục tối ưu
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: getItemCount() }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setActiveItemIndex(i);
                              setSuggestion(null);
                              setError(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              activeItemIndex === i
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            Mục {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current content preview */}
                  {getCurrentContent().trim() && (
                    <div className="rounded-xl bg-slate-50/60 border border-slate-200/60 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Nội dung hiện tại
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                        {getCurrentContent().replace(/<[^>]*>/g, "").slice(0, 300)}
                        {getCurrentContent().length > 300 ? "..." : ""}
                      </p>
                    </div>
                  )}

                  {/* ── Optimize Button ──────────────────── */}
                  <motion.button
                    onClick={handleOptimize}
                    disabled={isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-blue-600/20 transition-all"
                  >
                    {isPending ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles size={16} />
                        </motion.div>
                        Đang phân tích...
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} />
                        Tối ưu bằng AI ✨
                      </>
                    )}
                  </motion.button>

                  {/* ── Loading Skeleton ──────────────────── */}
                  <AnimatePresence>
                    {isPending && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border-2 border-dashed border-blue-200/60 bg-blue-50/30 backdrop-blur-sm p-5 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <motion.div {...skeletonPulse}>
                              <Sparkles size={15} className="text-blue-400" />
                            </motion.div>
                            <motion.span
                              {...skeletonPulse}
                              className="text-xs font-semibold text-blue-500"
                            >
                              AI đang phân tích nội dung...
                            </motion.span>
                          </div>
                          <div className="space-y-2.5">
                            <div className="h-3 bg-blue-200/40 rounded-full w-full animate-pulse" />
                            <div className="h-3 bg-blue-200/40 rounded-full w-[85%] animate-pulse" />
                            <div className="h-3 bg-blue-200/40 rounded-full w-[65%] animate-pulse" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Error ─────────────────────────────── */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="rounded-xl bg-red-50/80 border border-red-200/60 p-4"
                      >
                        <p className="text-xs text-red-600 font-medium">{error}</p>
                        <button
                          onClick={() => setError(null)}
                          className="text-[10px] text-red-500 font-bold mt-2 hover:underline"
                        >
                          Đóng
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Suggestion Box (Antigravity) ──────── */}
                  <AnimatePresence mode="wait">
                    {suggestion && (
                      <motion.div
                        variants={suggestionBoxVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="rounded-2xl border-2 border-dashed border-blue-200/50 bg-blue-50/40 backdrop-blur-md p-5 shadow-2xl shadow-blue-500/10"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100">
                            <Sparkles size={13} className="text-blue-600" />
                          </div>
                          <span className="text-xs font-bold text-blue-700 tracking-tight">
                            Gợi ý từ AI
                          </span>
                          {provider && (
                            <span className="ml-auto text-[9px] font-medium text-blue-400 bg-blue-100/60 px-2 py-0.5 rounded-full">
                              via {provider}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-100/60 shadow-inner">
                          {suggestion}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2.5 mt-4">
                          <motion.button
                            onClick={handleApply}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                          >
                            <Check size={14} />
                            Áp dụng
                          </motion.button>
                          <motion.button
                            onClick={handleDiscard}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all border border-slate-200 shadow-sm"
                          >
                            <X size={14} />
                            Bỏ qua
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* ── Non-optimizable section ──────────────── */
                <motion.div variants={cardVariants} className="mt-5">
                  <div className="rounded-2xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/50 p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 mb-4">
                      <Wand2 size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1.5">
                      Chọn mục có nội dung dài
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      AI tối ưu được phần <strong className="text-slate-500">Giới thiệu</strong>,{" "}
                      <strong className="text-slate-500">Kinh nghiệm</strong>,{" "}
                      <strong className="text-slate-500">Dự án</strong> hoặc{" "}
                      <strong className="text-slate-500">Giải thưởng</strong>.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-blue-500">
                      <ArrowRight size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Click mục bên trái
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
