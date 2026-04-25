"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays, Camera, Loader2, Mail, MapPin, Phone, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CV_AVATAR_ACCEPT_ATTR,
  type AvatarUploadStatus,
  uploadCvAvatarImage,
  validateAvatarUploadFile,
} from "./avatar-upload";
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
  onEditAvatar?: (avatarUrl: string) => void;
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
    return <span className={cn(!value && "italic text-slate-400", className)}>{value || placeholder}</span>;
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
        "w-full rounded-md border border-slate-300/90 bg-white/95 px-2 py-1 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[rgb(var(--cv-template-primary-rgb,15_118_110))] focus:ring-2 focus:ring-[rgb(var(--cv-template-primary-soft-rgb,236_253_250))]",
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
  onEditAvatar,
}: CVHeaderProps) {
  const isTealFamily = template.visualFamily === "teal";
  const isSidebarProfileVariant = template.headerLayout.variant === "sidebar-profile";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectingTimeoutRef = useRef<number | null>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<AvatarUploadStatus>("idle");
  const [avatarUploadFeedback, setAvatarUploadFeedback] = useState<string>("");
  const infoColumnsClassName = template.headerLayout.infoColumns === 1 ? "grid-cols-1" : "grid-cols-2";
  const addressRowClassName = template.headerLayout.infoColumns === 1 ? "flex gap-3" : "col-span-2 flex gap-3";
  const summaryBullets = (summary?.bullets ?? []).map((item) => item.trim()).filter(Boolean);
  const summaryIntro = summary?.intro?.trim() || "";
  const summaryTitle = summary?.title?.trim() || template.headerLayout.summaryTitle || "Tổng quan";
  const hasSummaryContent = summaryIntro.length > 0 || summaryBullets.length > 0;

  const activeShellClassName = isTealFamily
    ? "border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))] bg-transparent shadow-none"
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
  const avatarUrl = String(header.avatarUrl || "").trim();
  const hasAvatarImage = avatarUrl.length > 0 && avatarUrl !== "/avatars/default-avatar.png";
  const isAvatarUploading = avatarUploadStatus === "uploading";
  const canEditAvatar = selected && typeof onEditAvatar === "function";

  const clearSelectingTimeout = () => {
    if (selectingTimeoutRef.current !== null) {
      window.clearTimeout(selectingTimeoutRef.current);
      selectingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearSelectingTimeout();
    };
  }, []);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const showAvatarFeedback = (status: AvatarUploadStatus, message: string, autoClear = false) => {
    setAvatarUploadStatus(status);
    setAvatarUploadFeedback(message);

    if (autoClear) {
      window.setTimeout(() => {
        setAvatarUploadStatus("idle");
        setAvatarUploadFeedback("");
      }, 1800);
    }
  };

  const openAvatarPicker = () => {
    if (!canEditAvatar || isAvatarUploading) {
      return;
    }

    clearSelectingTimeout();
    setAvatarUploadStatus("selecting");
    setAvatarUploadFeedback("Đang chọn ảnh...");
    fileInputRef.current?.click();

    selectingTimeoutRef.current = window.setTimeout(() => {
      setAvatarUploadStatus((prev) => (prev === "selecting" ? "idle" : prev));
      setAvatarUploadFeedback((prev) => (prev === "Đang chọn ảnh..." ? "" : prev));
      selectingTimeoutRef.current = null;
    }, 2000);
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!canEditAvatar) {
      return;
    }

    clearSelectingTimeout();
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setAvatarUploadStatus("idle");
      setAvatarUploadFeedback("");
      return;
    }

    const validationError = validateAvatarUploadFile(file);
    if (validationError) {
      showAvatarFeedback("error", validationError);
      resetFileInput();
      return;
    }

    try {
      showAvatarFeedback("uploading", "Đang tải ảnh...");
      const uploadedAvatarUrl = await uploadCvAvatarImage(file);
      onEditAvatar?.(uploadedAvatarUrl);
      showAvatarFeedback("success", "Đã cập nhật ảnh đại diện.", true);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh lên Cloudinary.";
      showAvatarFeedback("error", message);
    } finally {
      resetFileInput();
    }
  };

  const handleRemoveAvatar = () => {
    if (!canEditAvatar || isAvatarUploading || !hasAvatarImage) {
      return;
    }

    onEditAvatar?.("");
    showAvatarFeedback("success", "Đã xóa ảnh đại diện.", true);
  };

  if (isSidebarProfileVariant) {
    const sidebarContactRows: Array<{
      field: "phone" | "email" | "address" | "dob";
      value: string;
      placeholder: string;
      icon: typeof Phone;
    }> = [
      {
        field: "phone",
        value: contact.phone,
        placeholder: "+84 1234567890",
        icon: Phone,
      },
      {
        field: "email",
        value: contact.email,
        placeholder: "nguyenvana@gmail.com",
        icon: Mail,
      },
      {
        field: "address",
        value: contact.address,
        placeholder: "Hà Nội, Việt Nam",
        icon: MapPin,
      },
      {
        field: "dob",
        value: contact.dob || "",
        placeholder: "01/01/2000",
        icon: CalendarDays,
      },
    ];

    return (
      <div
        data-cv-editor-selectable="true"
        onClick={onSelect}
        className={cn(
          "border px-1 py-1 text-left transition-all duration-200",
          "rounded-none",
          selected
            ? "border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.8)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.22)]"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="relative overflow-hidden border border-transparent px-4 py-4 text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]">
          <input
            ref={fileInputRef}
            type="file"
            accept={CV_AVATAR_ACCEPT_ATTR}
            className="hidden"
            aria-label="Chọn ảnh đại diện"
            onChange={(event) => {
              void handleAvatarFileChange(event);
            }}
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                if (!selected) {
                  onSelect();
                  return;
                }

                openAvatarPicker();
              }}
              disabled={isAvatarUploading}
              className={cn(
                "group relative flex h-34 w-34 overflow-hidden transition",
                "mt-2 items-end justify-center rounded-none border-0 bg-transparent text-slate-400/85 shadow-none",
                canEditAvatar ? "cursor-pointer" : "cursor-default",
                isAvatarUploading ? "opacity-80" : "",
              )}
              title={canEditAvatar ? "Đổi ảnh đại diện" : "Chọn phần đầu để đổi ảnh"}
            >
              {hasAvatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Ảnh đại diện"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="relative flex h-full w-full items-center justify-center rounded-sm bg-[#e5e7eb]">
                  <span className="absolute left-[34%] top-[22%] h-2 w-2 rounded-full bg-[#cbd5e1]" />
                  <span className="absolute right-[24%] top-[14%] h-5 w-5 rounded-full bg-[#c5d4d8]" />
                  <UserRound size={86} strokeWidth={1.5} className="text-[#94a3b8]" />
                </span>
              )}

              {canEditAvatar ? (
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-900/55 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
                    isAvatarUploading ? "opacity-100" : "",
                  )}
                >
                  {isAvatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {isAvatarUploading ? "Đang tải..." : "Đổi ảnh"}
                </span>
              ) : null}
            </button>

            <p className={cn("mt-2 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]", template.headerLayout.nameTextClassName)}>
              <EditableValue
                value={header.fullName}
                placeholder="Nguyen Van A"
                isActive={selected}
                onChange={(value) => onEditHeader("fullName", value)}
                className={cn(
                  "text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]",
                  selected ? "border-white/25! bg-white/95! text-slate-900!" : "",
                )}
              />
            </p>

            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.24em]", template.headerLayout.roleTextClassName)}>
              <EditableValue
                value={header.headline}
                placeholder="Lập trình viên Fullstack"
                isActive={selected}
                onChange={(value) => onEditHeader("headline", value)}
                className={cn(
                  "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]",
                  selected ? "border-white/25! bg-white/95! text-slate-900!" : "",
                )}
              />
            </p>
          </div>

          <div className="mt-4 border-t border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.7)] pt-3.5">
            <div className="space-y-2.5">
              {sidebarContactRows.map((row) => {
                const Icon = row.icon;

                return (
                  <div key={row.field} className="grid grid-cols-[0.95rem_1fr] items-start gap-2">
                    <Icon size={13} className="mt-1 text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]" />
                    <EditableValue
                      value={row.value}
                      placeholder={row.placeholder}
                      isActive={selected}
                      onChange={(value) => onEditContact(row.field, value)}
                      className={cn(
                        "text-[12.5px] leading-5 text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))]",
                        selected ? "border-white/25! bg-white/95! text-slate-900!" : "",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {canEditAvatar ? (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={openAvatarPicker}
                disabled={isAvatarUploading}
                className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.75)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.24)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))] transition hover:border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177))] hover:bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.38)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAvatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                {hasAvatarImage ? "Đổi ảnh" : "Tải ảnh"}
              </button>

              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isAvatarUploading || !hasAvatarImage}
                className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177)/0.68)] bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.2)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--cv-template-sidebar-text-rgb,255_255_255))] transition hover:border-[rgb(var(--cv-template-sidebar-divider-rgb,162_189_177))] hover:bg-[rgb(var(--cv-template-sidebar-overlay-rgb,95_136_114)/0.33)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 size={11} />
                Xóa ảnh
              </button>
            </div>
          ) : null}

          {canEditAvatar && avatarUploadFeedback ? (
            <p
              className={cn(
                "mt-2 text-[11px] font-medium leading-4",
                avatarUploadStatus === "error" ? "text-rose-200" : "text-[rgb(var(--cv-template-sidebar-muted-rgb,205_224_213))]",
              )}
            >
              {avatarUploadFeedback}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-cv-editor-selectable="true"
      onClick={onSelect}
      className={cn(
        "border px-3.5 py-3 text-left transition-all duration-200",
        isTealFamily ? "rounded-none" : "rounded-xl",
        selected ? activeShellClassName : idleShellClassName,
      )}
    >
      <div className={headerFrameClassName}>
        {template.headerLayout.decorativeDots ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-7 top-5 h-4 w-4 rounded-full bg-[rgb(var(--cv-template-primary-rgb,15_118_110)/0.25)]" />
            <div className="absolute left-18 top-15 h-5 w-5 rounded-full bg-[rgb(var(--cv-template-primary-rgb,15_118_110)/0.18)]" />
            <div className="absolute right-30 top-8 h-3.5 w-3.5 rounded-full bg-[rgb(var(--cv-template-primary-rgb,15_118_110)/0.18)]" />
            <div className="absolute right-9 top-20 h-7 w-7 rounded-full bg-[rgb(var(--cv-template-primary-rgb,15_118_110)/0.16)]" />
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
              <div className="mt-4 rounded-lg border border-[rgb(var(--cv-template-primary-border-rgb,167_243_208))] bg-white/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--cv-template-primary-rgb,15_118_110))]">{summaryTitle}</p>

                {summaryIntro ? (
                  <p className="mt-1.5 text-[12.5px] leading-5 text-slate-700">{summaryIntro}</p>
                ) : null}

                {summaryBullets.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-slate-800">
                    {summaryBullets.map((item, index) => (
                      <li key={`header-summary-${index}`} className="flex gap-2">
                        <span className="mt-1.75 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--cv-template-primary-rgb,15_118_110))]" />
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
              <div className="flex flex-col items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CV_AVATAR_ACCEPT_ATTR}
                  className="hidden"
                  aria-label="Chọn ảnh đại diện"
                  onChange={(event) => {
                    void handleAvatarFileChange(event);
                  }}
                />

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (!selected) {
                      onSelect();
                      return;
                    }

                    openAvatarPicker();
                  }}
                  disabled={isAvatarUploading}
                  className={cn(
                    "group relative flex overflow-hidden transition",
                    isTealFamily
                      ? "mt-2 items-end justify-center rounded-none border-0 bg-transparent text-slate-400/85 shadow-none"
                      : "mt-1 items-center justify-center rounded-lg border border-teal-200/85 bg-teal-50/65 text-teal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
                    isTealFamily ? "h-34 w-34" : template.headerLayout.avatarSizeClassName,
                    canEditAvatar ? "cursor-pointer" : "cursor-default",
                    isAvatarUploading ? "opacity-80" : "",
                  )}
                  title={canEditAvatar ? "Đổi ảnh đại diện" : "Chọn phần đầu để đổi ảnh"}
                >
                  {hasAvatarImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Ảnh đại diện"
                      className={cn("h-full w-full object-cover", isTealFamily ? "rounded-full" : "rounded-[inherit]")}
                    />
                  ) : (
                    <UserRound size={isTealFamily ? 104 : 56} strokeWidth={isTealFamily ? 1.2 : 1.6} />
                  )}

                  {canEditAvatar ? (
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-900/55 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
                        isAvatarUploading ? "opacity-100" : "",
                      )}
                    >
                      {isAvatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      {isAvatarUploading ? "Đang tải..." : "Đổi ảnh"}
                    </span>
                  ) : null}
                </button>

                {canEditAvatar ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      disabled={isAvatarUploading}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAvatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                      {hasAvatarImage ? "Đổi ảnh" : "Tải ảnh"}
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isAvatarUploading || !hasAvatarImage}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Trash2 size={11} />
                      Xóa ảnh
                    </button>
                  </div>
                ) : null}

                {canEditAvatar && avatarUploadFeedback ? (
                  <p
                    className={cn(
                      "max-w-34 text-right text-[11px] font-medium leading-4",
                      avatarUploadStatus === "error" ? "text-rose-600" : "text-slate-500",
                    )}
                  >
                    {avatarUploadFeedback}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
