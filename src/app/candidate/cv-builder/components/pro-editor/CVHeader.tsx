"use client";

import type { ChangeEvent } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CVContactContentData, CVHeaderContentData, CVTemplateConfig } from "./schema-driven-preview/types";

interface CVHeaderProps {
  template: CVTemplateConfig;
  header: CVHeaderContentData;
  contact: CVContactContentData;
  selected: boolean;
  onSelect: () => void;
  onEditHeader: (field: "fullName" | "headline", value: string) => void;
  onEditContact: (field: "phone" | "email" | "dob" | "address", value: string) => void;
}

function EditableValue({
  value,
  placeholder,
  isActive,
  onChange,
  className,
}: {
  value: string;
  placeholder: string;
  isActive: boolean;
  onChange?: (value: string) => void;
  className?: string;
}) {
  if (!isActive || !onChange) {
    return <span className={cn(!value && "italic text-slate-400")}>{value || placeholder}</span>;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-md border border-slate-300/90 bg-white/95 px-2 py-1 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-100",
        className,
      )}
    />
  );
}

export function CVHeader({
  template,
  header,
  contact,
  selected,
  onSelect,
  onEditHeader,
  onEditContact,
}: CVHeaderProps) {
  const isTealTimeline = template.id === "teal-timeline";
  const isCompact = template.headerLayout.variant === "compact";
  const isModernBand = template.headerLayout.variant === "modern-band";
  const infoColumnsClassName = template.headerLayout.infoColumns === 1 ? "grid-cols-1" : "grid-cols-2";

  const activeShellClassName = isTealTimeline
    ? "border-teal-300/70 bg-transparent shadow-none"
    : isModernBand
      ? "border-blue-400/70 bg-blue-50/45 shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_14px_26px_-22px_rgba(15,23,42,0.4)]"
      : isCompact
        ? "border-slate-400/70 bg-slate-100/60 shadow-[0_0_0_1px_rgba(100,116,139,0.16),0_14px_26px_-22px_rgba(15,23,42,0.4)]"
        : "border-emerald-400/70 bg-emerald-50/45 shadow-[0_0_0_1px_rgba(16,185,129,0.16),0_14px_26px_-22px_rgba(15,23,42,0.4)]";

  const idleShellClassName = isTealTimeline
    ? "border-transparent bg-transparent shadow-none"
    : isModernBand
      ? "border-slate-200 bg-white shadow-[0_12px_24px_-24px_rgba(15,23,42,0.35)] hover:border-blue-300/70 hover:bg-blue-50/25"
      : isCompact
        ? "border-slate-200 bg-white shadow-[0_12px_24px_-24px_rgba(15,23,42,0.35)] hover:border-slate-400/60 hover:bg-slate-100/35"
        : "border-slate-200 bg-white shadow-[0_12px_24px_-24px_rgba(15,23,42,0.35)] hover:border-emerald-300/60 hover:bg-emerald-50/20";

  const headerFrameClassName = isTealTimeline
    ? "relative overflow-visible rounded-none border border-transparent bg-transparent px-0 pb-0 pt-0 shadow-none"
    : isModernBand
      ? "relative overflow-hidden rounded-[10px] border border-blue-200/85 bg-white px-6 pb-6 pt-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
      : "relative overflow-hidden rounded-[10px] border border-slate-200/90 bg-[linear-gradient(180deg,#f9fbfa_0%,#f3f6f4_100%)] px-6 pb-6 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";

  const contentGridClassName = template.headerLayout.showAvatar
    ? isTealTimeline
      ? "grid grid-cols-[1fr_150px] gap-4"
      : isCompact
        ? "grid grid-cols-[1fr_120px] gap-5"
        : "grid grid-cols-[1fr_136px] gap-5"
    : "grid grid-cols-1 gap-4";

  const nameTextClassName = isTealTimeline
    ? "text-[52px] font-semibold leading-[1.04] tracking-[-0.02em]"
    : isCompact
      ? "text-[34px] font-semibold leading-[1.1] tracking-[-0.02em]"
      : isModernBand
        ? "text-[36px] font-semibold leading-[1.08] tracking-[-0.02em]"
        : "text-[40px] font-semibold leading-[1.08] tracking-[-0.02em]";

  const roleTextClassName = isTealTimeline
    ? "mt-2 text-[16px] leading-[1.35]"
    : isCompact
      ? "mt-1 text-[20px] leading-[1.2]"
      : "mt-1.5 text-[22px] leading-[1.2]";

  const labels = isTealTimeline
    ? {
        fullName: "Name",
        dob: "Birth",
        phone: "Phone",
        email: "Email",
        address: "Address",
      }
    : {
        fullName: "Họ tên",
        dob: "Ngày sinh",
        phone: "Điện thoại",
        email: "Email",
        address: "Địa chỉ",
      };

  const infoGridClassName = isTealTimeline
    ? "mt-4 grid grid-cols-2 gap-x-10 gap-y-0.5 text-[13px] leading-7"
    : cn("mt-4 grid gap-x-10 gap-y-2 text-[13px] leading-6", infoColumnsClassName);

  return (
    <div
      role="button"
      data-cv-editor-selectable="true"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "border px-3.5 py-3 text-left transition-all duration-200",
        isTealTimeline ? "rounded-none" : "rounded-xl",
        selected ? activeShellClassName : idleShellClassName,
      )}
    >
      <div className={headerFrameClassName}>
        {isModernBand ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(90deg,rgba(37,99,235,0.9),rgba(14,165,233,0.78))]" />
        ) : null}

        {template.headerLayout.decorativeDots ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-7 top-5 h-4 w-4 rounded-full bg-slate-300/30" />
            <div className="absolute left-18 top-15 h-5 w-5 rounded-full bg-slate-300/24" />
            <div className="absolute right-30 top-8 h-3.5 w-3.5 rounded-full bg-slate-300/24" />
            <div className="absolute right-9 top-20 h-7 w-7 rounded-full bg-slate-300/20" />
            <div className="absolute bottom-5 right-42 h-5 w-5 rounded-full bg-slate-300/16" />
            <div className="absolute bottom-9 left-42 h-3.5 w-3.5 rounded-full bg-slate-300/16" />
          </div>
        ) : null}

        <div className={cn("relative z-10", isModernBand && "pt-6", contentGridClassName)}>
          <div>
            <p className={cn(nameTextClassName, template.headerLayout.nameTextClassName)}>
              <EditableValue
                value={header.fullName}
                placeholder="Nguyen Van A"
                isActive={selected}
                onChange={(value) => onEditHeader("fullName", value)}
              />
            </p>
            <p className={cn(roleTextClassName, template.headerLayout.roleTextClassName)}>
              <EditableValue
                value={header.headline}
                placeholder="Lập trình viên Fullstack"
                isActive={selected}
                onChange={(value) => onEditHeader("headline", value)}
              />
            </p>

            <div className={cn(infoGridClassName, template.headerLayout.infoValueTextClassName)}>
              <div className="flex gap-3">
                <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                  {labels.fullName}
                </span>
                <EditableValue
                  value={header.fullName}
                  placeholder="Nguyen Van A"
                  isActive={selected}
                  onChange={(value) => onEditHeader("fullName", value)}
                />
              </div>
              <div className="flex gap-3">
                <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                  {labels.dob}
                </span>
                <EditableValue
                  value={contact.dob || ""}
                  placeholder="01/01/2000"
                  isActive={selected}
                  onChange={(value) => onEditContact("dob", value)}
                />
              </div>
              <div className="flex gap-3">
                <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                  {labels.phone}
                </span>
                <EditableValue
                  value={contact.phone}
                  placeholder="+84 1234567890"
                  isActive={selected}
                  onChange={(value) => onEditContact("phone", value)}
                />
              </div>
              <div className="flex gap-3">
                <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                  {labels.email}
                </span>
                <EditableValue
                  value={contact.email}
                  placeholder="nguyenvana@gmail.com"
                  isActive={selected}
                  onChange={(value) => onEditContact("email", value)}
                />
              </div>

              {isTealTimeline ? (
                <div className="col-span-2 flex gap-3">
                  <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                    {labels.address}
                  </span>
                  <EditableValue
                    value={contact.address}
                    placeholder="Ha Noi, Viet Nam"
                    isActive={selected}
                    onChange={(value) => onEditContact("address", value)}
                  />
                </div>
              ) : null}
            </div>

            {!isTealTimeline ? (
              <p className={cn("mt-3 text-[13px] leading-6", template.headerLayout.infoValueTextClassName)}>
                <EditableValue
                  value={contact.address}
                  placeholder="Ha Noi, Viet Nam"
                  isActive={selected}
                  onChange={(value) => onEditContact("address", value)}
                />
              </p>
            ) : null}
          </div>

          {template.headerLayout.showAvatar ? (
            <div className="flex items-start justify-end">
              <div
                className={cn(
                  isTealTimeline
                    ? "mt-2 flex h-34 w-34 items-end justify-center rounded-none border-0 bg-transparent text-slate-400/85 shadow-none"
                    : "mt-1 flex items-center justify-center rounded-lg border border-slate-300/85 bg-slate-200/65 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
                  !isTealTimeline && template.headerLayout.avatarSizeClassName,
                )}
              >
                <UserRound size={isTealTimeline ? 104 : 52} strokeWidth={isTealTimeline ? 1.2 : 1.6} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
