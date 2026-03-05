"use client";

import React from "react";
import { useForm, useFieldArray, UseFormRegister } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Check,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  FolderOpen,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { OCRDraftData } from "./ocr-types";

// ── Props ────────────────────────────────────────────────────
interface CVDraftPreviewProps {
  defaultValues: OCRDraftData;
  onConfirm: (data: OCRDraftData) => void;
  onCancel: () => void;
}

// ── Confidence indicator ─────────────────────────────────────
function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 0.7) {
    return (
      <motion.div
        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        title="AI tin cậy cao"
      />
    );
  }
  if (confidence >= 0.4) {
    return (
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" title="Cần kiểm tra">
        <AlertCircle size={8} className="text-amber-800 absolute inset-0 m-auto" />
      </div>
    );
  }
  return (
    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white" title="Cần sửa" />
  );
}

// ── Inline editable input ────────────────────────────────────
function InlineInput({
  register,
  name,
  placeholder,
  className = "",
  as = "input",
}: {
  register: UseFormRegister<OCRDraftData>;
  name: Parameters<UseFormRegister<OCRDraftData>>[0];
  placeholder: string;
  className?: string;
  as?: "input" | "textarea";
}) {
  const baseClass = `
    w-full bg-transparent border-0 border-b border-transparent
    focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none
    hover:bg-slate-50/50 transition-all duration-200
    rounded-md px-2 py-1 text-slate-700
  `;

  if (as === "textarea") {
    return (
      <textarea
        {...register(name)}
        placeholder={placeholder}
        rows={3}
        className={`${baseClass} resize-none text-xs leading-relaxed ${className}`}
      />
    );
  }

  return (
    <input
      {...register(name)}
      placeholder={placeholder}
      className={`${baseClass} ${className}`}
    />
  );
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50">
        <Icon size={14} className="text-blue-600" />
      </div>
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CV Draft Preview — Main Component
// ════════════════════════════════════════════════════════════════
export function CVDraftPreview({
  defaultValues,
  onConfirm,
  onCancel,
}: CVDraftPreviewProps) {
  const { register, handleSubmit, control } = useForm<OCRDraftData>({
    defaultValues,
  });

  const { fields: expFields } = useFieldArray({ control, name: "experiences" });
  const { fields: eduFields } = useFieldArray({ control, name: "educations" });
  const { fields: skillFields } = useFieldArray({ control, name: "skills" });
  const { fields: projFields } = useFieldArray({ control, name: "projects" });
  const { fields: certFields } = useFieldArray({ control, name: "certifications" });

  const onSubmit = (data: OCRDraftData) => {
    onConfirm(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Draft Card — Floating CV look */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          className="
            bg-white rounded-2xl border border-slate-200/60
            shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)]
            overflow-hidden
          "
        >
          {/* ── Header Bar ─────────────────────────────────── */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-blue-200" />
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                Bản nháp từ AI
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80">
              Kiểm tra và chỉnh sửa thông tin bên dưới. Click vào bất kỳ field nào để sửa.
            </p>
          </div>

          {/* ── CV Content ─────────────────────────────────── */}
          <div className="p-6 space-y-6 max-h-[55vh] overflow-y-auto">
            {/* Personal Info */}
            <div>
              <SectionHeader icon={User} title="Thông tin cá nhân" />
              <div className="space-y-2">
                <InlineInput
                  register={register}
                  name="fullName"
                  placeholder="Họ và tên"
                  className="text-lg font-bold"
                />
                <InlineInput
                  register={register}
                  name="title"
                  placeholder="Vị trí ứng tuyển"
                  className="text-sm text-slate-500"
                />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <InlineInput
                      register={register}
                      name="email"
                      placeholder="Email"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <InlineInput
                      register={register}
                      name="phone"
                      placeholder="Số điện thoại"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <InlineInput
                      register={register}
                      name="address"
                      placeholder="Địa chỉ"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            {defaultValues.summary && (
              <div>
                <SectionHeader icon={FolderOpen} title="Giới thiệu" />
                <InlineInput
                  register={register}
                  name="summary"
                  placeholder="Giới thiệu bản thân..."
                  className="text-xs"
                  as="textarea"
                />
              </div>
            )}

            {/* Experience */}
            {expFields.length > 0 && (
              <div>
                <SectionHeader
                  icon={Briefcase}
                  title="Kinh nghiệm"
                  count={expFields.length}
                />
                <div className="space-y-4">
                  {expFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="relative pl-3 border-l-2 border-blue-200 space-y-1"
                    >
                      <ConfidenceDot
                        confidence={defaultValues.experiences[index]?.confidence ?? 0.5}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          {...register(`experiences.${index}.position`)}
                          placeholder="Vị trí"
                          className="bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 transition-all"
                        />
                        <input
                          {...register(`experiences.${index}.company`)}
                          placeholder="Công ty"
                          className="bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-xs text-slate-500 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <input
                          {...register(`experiences.${index}.startDate`)}
                          placeholder="Bắt đầu"
                          className="bg-transparent border-0 focus:outline-none hover:bg-slate-50/50 rounded px-1 py-0.5 text-[10px] text-slate-400 w-20 transition-all"
                        />
                        <span className="text-[10px] text-slate-300">—</span>
                        <input
                          {...register(`experiences.${index}.endDate`)}
                          placeholder="Kết thúc"
                          className="bg-transparent border-0 focus:outline-none hover:bg-slate-50/50 rounded px-1 py-0.5 text-[10px] text-slate-400 w-20 transition-all"
                        />
                      </div>
                      <textarea
                        {...register(`experiences.${index}.description`)}
                        placeholder="Mô tả công việc..."
                        rows={2}
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-[11px] text-slate-600 leading-relaxed resize-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {eduFields.length > 0 && (
              <div>
                <SectionHeader
                  icon={GraduationCap}
                  title="Học vấn"
                  count={eduFields.length}
                />
                <div className="space-y-3">
                  {eduFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="relative pl-3 border-l-2 border-emerald-200 space-y-1"
                    >
                      <ConfidenceDot
                        confidence={defaultValues.educations[index]?.confidence ?? 0.5}
                      />
                      <input
                        {...register(`educations.${index}.institution`)}
                        placeholder="Trường"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 transition-all"
                      />
                      <input
                        {...register(`educations.${index}.degree`)}
                        placeholder="Bằng cấp / Chuyên ngành"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-[11px] text-slate-500 transition-all"
                      />
                      <div className="flex items-center gap-2 px-2">
                        <input
                          {...register(`educations.${index}.startDate`)}
                          placeholder="Bắt đầu"
                          className="bg-transparent border-0 focus:outline-none hover:bg-slate-50/50 rounded px-1 py-0.5 text-[10px] text-slate-400 w-20 transition-all"
                        />
                        <span className="text-[10px] text-slate-300">—</span>
                        <input
                          {...register(`educations.${index}.endDate`)}
                          placeholder="Kết thúc"
                          className="bg-transparent border-0 focus:outline-none hover:bg-slate-50/50 rounded px-1 py-0.5 text-[10px] text-slate-400 w-20 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {skillFields.length > 0 && (
              <div>
                <SectionHeader icon={Code} title="Kỹ năng" count={skillFields.length} />
                <div className="flex flex-wrap gap-2">
                  {skillFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="inline-flex items-center bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg px-1 transition-all"
                    >
                      <input
                        {...register(`skills.${index}.name`)}
                        placeholder="Kỹ năng"
                        className="bg-transparent border-0 focus:outline-none px-1.5 py-1 text-[11px] text-slate-600 w-auto min-w-[80px] max-w-[200px] transition-all"
                        style={{ width: `${Math.max(80, (field.name?.length || 8) * 7)}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {projFields.length > 0 && (
              <div>
                <SectionHeader
                  icon={FolderOpen}
                  title="Dự án"
                  count={projFields.length}
                />
                <div className="space-y-3">
                  {projFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="relative pl-3 border-l-2 border-purple-200 space-y-1"
                    >
                      <ConfidenceDot
                        confidence={defaultValues.projects[index]?.confidence ?? 0.5}
                      />
                      <input
                        {...register(`projects.${index}.name`)}
                        placeholder="Tên dự án"
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 transition-all"
                      />
                      <textarea
                        {...register(`projects.${index}.description`)}
                        placeholder="Mô tả dự án..."
                        rows={2}
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-[11px] text-slate-600 leading-relaxed resize-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certFields.length > 0 && (
              <div>
                <SectionHeader
                  icon={Award}
                  title="Chứng chỉ"
                  count={certFields.length}
                />
                <div className="space-y-2">
                  {certFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="relative flex items-center gap-3 pl-3 border-l-2 border-amber-200"
                    >
                      <ConfidenceDot
                        confidence={
                          defaultValues.certifications[index]?.confidence ?? 0.5
                        }
                      />
                      <input
                        {...register(`certifications.${index}.name`)}
                        placeholder="Tên chứng chỉ"
                        className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 transition-all"
                      />
                      <input
                        {...register(`certifications.${index}.issuer`)}
                        placeholder="Tổ chức"
                        className="w-28 bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none hover:bg-slate-50/50 rounded-md px-2 py-1 text-[11px] text-slate-500 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Action Buttons ─────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all"
            >
              <Check size={16} />
              Xác nhận & Nhập dữ liệu
            </motion.button>
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold border border-slate-200 shadow-sm transition-all"
            >
              <X size={16} />
              Hủy
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
