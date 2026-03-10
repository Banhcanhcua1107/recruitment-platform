"use client";

import React from "react";
import { useFieldArray, useForm, UseFormRegister } from "react-hook-form";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  Briefcase,
  Check,
  Code,
  FolderOpen,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { OCRDraftData } from "./ocr-types";

interface CVDraftPreviewProps {
  defaultValues: OCRDraftData;
  onConfirm: (data: OCRDraftData) => void;
  onCancel: () => void;
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 0.7) {
    return (
      <motion.div
        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        title="AI tin cậy cao"
      />
    );
  }

  if (confidence >= 0.4) {
    return (
      <div
        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400"
        title="Cần kiểm tra"
      >
        <AlertCircle size={8} className="absolute inset-0 m-auto text-amber-800" />
      </div>
    );
  }

  return (
    <div
      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-400"
      title="Cần sửa"
    />
  );
}

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
    w-full rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-slate-700
    transition-all duration-200 hover:bg-slate-50/50
    focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none
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
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50">
        <Icon size={14} className="text-blue-600" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
          {count}
        </span>
      )}
    </div>
  );
}

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
  const { fields: certFields } = useFieldArray({
    control,
    name: "certifications",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="mx-auto w-full max-w-2xl"
    >
      <form onSubmit={handleSubmit(onConfirm)}>
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                Bản nháp từ AI
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80">
              Kiểm tra và chỉnh sửa thông tin bên dưới. Nhấn vào từng trường để
              sửa trực tiếp trước khi nhập vào CV Builder.
            </p>
          </div>

          <div className="max-h-[55vh] space-y-6 overflow-y-auto p-6">
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="shrink-0 text-slate-400" />
                    <InlineInput
                      register={register}
                      name="email"
                      placeholder="Email"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="shrink-0 text-slate-400" />
                    <InlineInput
                      register={register}
                      name="phone"
                      placeholder="Số điện thoại"
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <MapPin size={12} className="shrink-0 text-slate-400" />
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
                      className="relative space-y-1 border-l-2 border-blue-200 pl-3"
                    >
                      <ConfidenceDot
                        confidence={
                          defaultValues.experiences[index]?.confidence ?? 0.5
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          {...register(`experiences.${index}.position`)}
                          placeholder="Vị trí"
                          className="rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                        />
                        <input
                          {...register(`experiences.${index}.company`)}
                          placeholder="Công ty"
                          className="rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-xs text-slate-500 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <input
                          {...register(`experiences.${index}.startDate`)}
                          placeholder="Bắt đầu"
                          className="w-20 rounded border-0 bg-transparent px-1 py-0.5 text-[10px] text-slate-400 transition-all hover:bg-slate-50/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-300">-</span>
                        <input
                          {...register(`experiences.${index}.endDate`)}
                          placeholder="Kết thúc"
                          className="w-20 rounded border-0 bg-transparent px-1 py-0.5 text-[10px] text-slate-400 transition-all hover:bg-slate-50/50 focus:outline-none"
                        />
                      </div>
                      <textarea
                        {...register(`experiences.${index}.description`)}
                        placeholder="Mô tả công việc..."
                        rows={2}
                        className="w-full resize-none rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-[11px] leading-relaxed text-slate-600 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      className="relative space-y-1 border-l-2 border-emerald-200 pl-3"
                    >
                      <ConfidenceDot
                        confidence={
                          defaultValues.educations[index]?.confidence ?? 0.5
                        }
                      />
                      <input
                        {...register(`educations.${index}.institution`)}
                        placeholder="Trường"
                        className="w-full rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                      <input
                        {...register(`educations.${index}.degree`)}
                        placeholder="Bằng cấp / Chuyên ngành"
                        className="w-full rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-[11px] text-slate-500 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 px-2">
                        <input
                          {...register(`educations.${index}.startDate`)}
                          placeholder="Bắt đầu"
                          className="w-20 rounded border-0 bg-transparent px-1 py-0.5 text-[10px] text-slate-400 transition-all hover:bg-slate-50/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-300">-</span>
                        <input
                          {...register(`educations.${index}.endDate`)}
                          placeholder="Kết thúc"
                          className="w-20 rounded border-0 bg-transparent px-1 py-0.5 text-[10px] text-slate-400 transition-all hover:bg-slate-50/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {skillFields.length > 0 && (
              <div>
                <SectionHeader
                  icon={Code}
                  title="Kỹ năng"
                  count={skillFields.length}
                />
                <div className="flex flex-wrap gap-2">
                  {skillFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 transition-all hover:border-blue-200 hover:bg-blue-50"
                    >
                      <input
                        {...register(`skills.${index}.name`)}
                        placeholder="Kỹ năng"
                        className="w-auto min-w-[80px] max-w-[200px] border-0 bg-transparent px-1.5 py-1 text-[11px] text-slate-600 transition-all focus:outline-none"
                        style={{
                          width: `${Math.max(
                            80,
                            (field.name?.length || 8) * 7
                          )}px`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      className="relative space-y-1 border-l-2 border-purple-200 pl-3"
                    >
                      <ConfidenceDot
                        confidence={
                          defaultValues.projects[index]?.confidence ?? 0.5
                        }
                      />
                      <input
                        {...register(`projects.${index}.name`)}
                        placeholder="Tên dự án"
                        className="w-full rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                      <textarea
                        {...register(`projects.${index}.description`)}
                        placeholder="Mô tả dự án..."
                        rows={2}
                        className="w-full resize-none rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-[11px] leading-relaxed text-slate-600 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      className="relative flex items-center gap-3 border-l-2 border-amber-200 pl-3"
                    >
                      <ConfidenceDot
                        confidence={
                          defaultValues.certifications[index]?.confidence ?? 0.5
                        }
                      />
                      <input
                        {...register(`certifications.${index}.name`)}
                        placeholder="Tên chứng chỉ"
                        className="flex-1 rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                      <input
                        {...register(`certifications.${index}.issuer`)}
                        placeholder="Tổ chức"
                        className="w-28 rounded-md border-0 border-b border-transparent bg-transparent px-2 py-1 text-[11px] text-slate-500 transition-all hover:bg-slate-50/50 focus:border-blue-300 focus:bg-blue-50/30 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
            >
              <Check size={16} />
              Xác nhận và nhập dữ liệu
            </motion.button>
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
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
