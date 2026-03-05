"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useCVStore } from "../store";
import { Sparkles, Wand2, Check, X, Loader2, Brain, Lightbulb } from "lucide-react";
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

// ── Quick tips per section ──────────────────────────────────
const QUICK_TIPS: Record<string, string[]> = {
  summary: [
    "Viết 3-5 câu, tập trung vào giá trị bạn mang lại",
    "Đề cập số năm kinh nghiệm và chuyên môn chính",
    "Dùng từ khóa từ Job Description",
  ],
  experience_list: [
    "Bắt đầu bằng động từ mạnh: Xây dựng, Triển khai, Tối ưu...",
    "Thêm số liệu: 'Tăng tốc 40%', 'Phục vụ 50k users/ngày'",
    "Tập trung vào kết quả, không chỉ liệt kê nhiệm vụ",
  ],
  education_list: [
    "Ghi GPA nếu >= 3.2/4.0",
    "Thêm khóa học, chứng chỉ liên quan",
  ],
  skill_list: [
    "Nhóm theo danh mục: Frontend, Backend, DevOps",
    "Chỉ liệt kê kỹ năng bạn tự tin khi phỏng vấn",
  ],
  project_list: [
    "Ưu tiên dự án có users hoặc doanh thu thực tế",
    "Luôn ghi rõ tech stack và vai trò",
  ],
  default: [
    "Click vào mục bên trái để xem gợi ý chi tiết",
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

// ── Animation variants ──────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

const suggestionBoxVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.2 },
  },
};

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════
export function AIContentOptimizer() {
  const { selectedSectionId, cv, updateSectionData } = useCVStore();

  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<{ key: string; label: string } | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);

  const selectedSection = cv.sections.find((s) => s.id === selectedSectionId);
  const sectionType = selectedSection?.type || "";
  const sectionLabel = selectedSection?.title || SECTION_LABELS[sectionType] || "Chọn một mục";
  const tips = QUICK_TIPS[sectionType] || QUICK_TIPS.default;
  const optimizableFields = OPTIMIZABLE_FIELDS[sectionType] || [];
  const canOptimize = optimizableFields.length > 0;

  // Reset state when section changes
  useEffect(() => {
    setSuggestion(null);
    setError(null);
    setIsLoading(false);
    setActiveItemIndex(0);
    if (optimizableFields.length > 0) {
      setActiveField(optimizableFields[0]);
    } else {
      setActiveField(null);
    }
  }, [selectedSectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current content for the active field
  const getCurrentContent = useCallback((): string => {
    if (!selectedSection || !activeField) return "";
    const data = selectedSection.data as Record<string, unknown>;

    // For list-type sections (experience_list, project_list, etc.)
    if (data.items && Array.isArray(data.items)) {
      const items = data.items as Record<string, unknown>[];
      const item = items[activeItemIndex];
      return item ? String(item[activeField.key] || "") : "";
    }

    // For flat sections (summary)
    return String(data[activeField.key] || "");
  }, [selectedSection, activeField, activeItemIndex]);

  // Request AI optimization
  const handleOptimize = useCallback(async () => {
    const content = getCurrentContent();
    if (!content.trim()) {
      setError("Hãy nhập nội dung trước khi tối ưu bằng AI.");
      return;
    }

    setIsLoading(true);
    setSuggestion(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/optimize-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          fieldName: activeField?.key,
          currentContent: content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể tối ưu. Vui lòng thử lại.");
        return;
      }

      setSuggestion(data.suggestion);
    } catch {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentContent, sectionType, activeField]);

  // Apply suggestion to the store
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
  }, [selectedSection, activeField, suggestion, activeItemIndex, updateSectionData]);

  // Discard suggestion
  const handleDiscard = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  // Get item count for list sections
  const getItemCount = (): number => {
    if (!selectedSection) return 0;
    const data = selectedSection.data as Record<string, unknown>;
    if (data.items && Array.isArray(data.items)) {
      return (data.items as unknown[]).length;
    }
    return 0;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-blue-600 shadow-sm">
            <Brain size={15} className="text-white" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">AI Content Optimizer</h2>
        </div>
        <p className="text-xs text-slate-400 ml-[38px]">Tối ưu nội dung CV bằng AI</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-5">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">

          {/* Active Section Badge */}
          <motion.div variants={itemVariants} className="mb-5">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <Sparkles size={16} className="text-violet-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang chỉnh sửa</p>
                <p className="text-sm font-bold text-slate-700 truncate">{sectionLabel}</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Tips */}
          <motion.div variants={itemVariants} className="mb-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lightbulb size={13} className="text-amber-500" />
              Mẹo viết hay
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants}>
            <div className="h-px bg-slate-100 my-1" />
          </motion.div>

          {/* ── AI Optimize Section ────────────────────── */}
          {canOptimize ? (
            <motion.div variants={itemVariants} className="mt-4 space-y-4">
              {/* Item Selector for list sections */}
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeItemIndex === i
                            ? "bg-violet-100 text-violet-700 shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        Mục {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Content Preview */}
              {getCurrentContent().trim() && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nội dung hiện tại
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                    {getCurrentContent().replace(/<[^>]*>/g, "").slice(0, 300)}
                    {getCurrentContent().length > 300 ? "..." : ""}
                  </p>
                </div>
              )}

              {/* Optimize Button */}
              <button
                onClick={handleOptimize}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang tối ưu...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Tối ưu nội dung bằng AI
                  </>
                )}
              </button>

              {/* Loading Skeleton */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-violet-400 animate-pulse" />
                      <span className="text-xs font-semibold text-violet-500">AI đang phân tích...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-violet-200/50 rounded-full animate-pulse w-full" />
                      <div className="h-3 bg-violet-200/50 rounded-full animate-pulse w-4/5" />
                      <div className="h-3 bg-violet-200/50 rounded-full animate-pulse w-3/5" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="rounded-xl bg-red-50 border border-red-200 p-4"
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

              {/* ── Suggestion Box ──────────────────────── */}
              <AnimatePresence mode="wait">
                {suggestion && (
                  <motion.div
                    variants={suggestionBoxVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-blue-700">Gợi ý từ AI</span>
                    </div>

                    {/* Suggestion Content */}
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-all bg-white/60 rounded-lg p-3 border border-blue-100 max-h-[400px] overflow-y-auto">
                      {suggestion}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={handleApply}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
                      >
                        <Check size={14} />
                        Áp dụng
                      </button>
                      <button
                        onClick={handleDiscard}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all active:scale-[0.98]"
                      >
                        <X size={14} />
                        Bỏ qua
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ── Non-optimizable section info ────────── */
            <motion.div variants={itemVariants} className="mt-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-5 text-center">
                <Wand2 size={24} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 mb-1">
                  Chọn mục có nội dung dài
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI có thể tối ưu phần <strong>Giới thiệu</strong>, <strong>Kinh nghiệm</strong>, <strong>Dự án</strong>, hoặc <strong>Giải thưởng</strong> — các mục có mô tả chi tiết.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
