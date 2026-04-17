"use client";

import type { ChangeEvent } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CVContactContentData,
  CVHeaderContentData,
  CVHeaderSummaryContentData,
  CVTemplateConfig,
} from "./schema-driven-preview/types";

interface CVHeaderProps {
  template: CVTemplateConfig;
  header: CVHeaderContentData;
  contact: CVContactContentData;
  summary?: CVHeaderSummaryContentData;
  selected: boolean;
  onSelect: () => void;
  onEditHeader: (field: "fullName" | "headline", value: string) => void;
  onEditContact: (field: "phone" | "email" | "dob" | "address", value: string) => void;
}

function isNestedInteractiveTarget(target: EventTarget | null, currentTarget: EventTarget | null) {
  if (!(target instanceof HTMLElement) || !(currentTarget instanceof HTMLElement)) {
    return false;
  }

  if (target === currentTarget) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true'], [role='textbox']"));
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
        "w-full rounded-md border border-slate-300/90 bg-white/95 px-2 py-1 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-400/70 focus:ring-2 focus:ring-teal-100",
        className,
      )}
    />
  );
}

export function CVHeader({
  template,
  header,
  contact,
  summary,
  selected,
  onSelect,
  onEditHeader,
  onEditContact,
}: CVHeaderProps) {
  const isTealFamily = template.visualFamily === "teal";
  const infoColumnsClassName = template.headerLayout.infoColumns === 1 ? "grid-cols-1" : "grid-cols-2";
  const addressRowClassName = template.headerLayout.infoColumns === 1 ? "flex gap-3" : "col-span-2 flex gap-3";
  const summaryBullets = (summary?.bullets ?? []).map((item) => item.trim()).filter(Boolean);
  const summaryIntro = summary?.intro?.trim() || "";
  const summaryTitle = summary?.title?.trim() || template.headerLayout.summaryTitle || "Tổng quan";
  const hasSummaryContent = summaryIntro.length > 0 || summaryBullets.length > 0;

  const activeShellClassName = isTealFamily
    ? "border-teal-300/70 bg-transparent shadow-none"
    : "border-slate-400/70 bg-slate-100/60 shadow-[0_0_0_1px_rgba(100,116,139,0.16),0_14px_26px_-22px_rgba(15,23,42,0.4)]";

  const idleShellClassName = isTealFamily
    ? "border-transparent bg-transparent shadow-none"
    : "border-slate-200 bg-white shadow-[0_12px_24px_-24px_rgba(15,23,42,0.35)]";

  const headerFrameClassName = isTealFamily
    ? "relative overflow-visible rounded-none border border-transparent bg-transparent px-0 pb-0 pt-0 shadow-none"
    : "relative overflow-hidden rounded-[10px] border border-slate-200/90 bg-[linear-gradient(180deg,#f9fbfa_0%,#f3f6f4_100%)] px-6 pb-6 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";

  const contentGridClassName = template.headerLayout.showAvatar
    ? isTealFamily
      ? "grid grid-cols-[1fr_150px] gap-4"
      : "grid grid-cols-[1fr_136px] gap-5"
    : "grid grid-cols-1 gap-4";

  const nameTextClassName = "text-[52px] font-semibold leading-[1.04] tracking-[-0.02em]";
  const roleTextClassName = "mt-2 text-[16px] leading-[1.35]";

  const labels = {
    fullName: "Họ tên",
    dob: "Ngày sinh",
    phone: "Điện thoại",
    email: "Email",
    address: "Địa chỉ",
  };

  const infoGridClassName = cn("mt-4 grid gap-x-10 gap-y-0.5 text-[13px] leading-7", infoColumnsClassName);

  return (
    <div
      role="button"
      data-cv-editor-selectable="true"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (isNestedInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "border px-3.5 py-3 text-left transition-all duration-200",
        isTealFamily ? "rounded-none" : "rounded-xl",
        selected ? activeShellClassName : idleShellClassName,
      )}
    >
      <div className={headerFrameClassName}>
        {template.headerLayout.decorativeDots ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-7 top-5 h-4 w-4 rounded-full bg-teal-300/25" />
            <div className="absolute left-18 top-15 h-5 w-5 rounded-full bg-teal-300/18" />
            <div className="absolute right-30 top-8 h-3.5 w-3.5 rounded-full bg-teal-300/18" />
            <div className="absolute right-9 top-20 h-7 w-7 rounded-full bg-teal-300/16" />
          </div>
        ) : null}

        <div className={cn("relative z-10", contentGridClassName)}>
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

              <div className={addressRowClassName}>
                <span className={cn("min-w-16 font-semibold", template.headerLayout.infoLabelTextClassName)}>
                  {labels.address}
                </span>
                <EditableValue
                  value={contact.address}
                  placeholder="TP. Ho Chi Minh, Viet Nam"
                  isActive={selected}
                  onChange={(value) => onEditContact("address", value)}
                />
              </div>
            </div>

            {template.headerLayout.summaryInHeader && hasSummaryContent ? (
              <div className="mt-4 rounded-lg border border-teal-200/80 bg-white/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">{summaryTitle}</p>

                {summaryIntro ? (
                  <p className="mt-1.5 text-[12.5px] leading-5 text-slate-700">{summaryIntro}</p>
                ) : null}

                {summaryBullets.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-slate-800">
                    {summaryBullets.map((item, index) => (
                      <li key={`header-summary-${index}`} className="flex gap-2">
                        <span className="mt-1.75 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          {template.headerLayout.showAvatar ? (
            <div className="flex items-start justify-end">
              <div
                className={cn(
                  isTealFamily
                    ? "mt-2 flex items-end justify-center rounded-none border-0 bg-transparent text-slate-400/85 shadow-none"
                    : "mt-1 flex items-center justify-center rounded-lg border border-teal-200/85 bg-teal-50/65 text-teal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
                  isTealFamily ? "h-34 w-34" : template.headerLayout.avatarSizeClassName,
                )}
              >
                <UserRound size={isTealFamily ? 104 : 56} strokeWidth={isTealFamily ? 1.2 : 1.6} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
