"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  Palette,
  PencilLine,
  Plus,
  Redo2,
  Save,
  Type,
  Undo2,
} from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { CV_TEMPLATE_LIBRARY, CV_TEMPLATE_LIBRARY_UI } from "@/components/cv/templates/templateCatalog";
import {
  CV_THEME_PATTERN_OPTIONS,
  CV_THEME_PRIMARY_SWATCHES,
} from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/theme-tokens";
import type { CVThemePatternId } from "../../types";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";

interface SaveStateChipProps {
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
}

function SaveStateChip({ saveStatus, isDirty }: SaveStateChipProps) {
  if (saveStatus === "saving") {
    return (
      <StatusBadge
        label={EDITOR_UI_TEXTS.saveState.saving}
        tone="warning"
        className="normal-case tracking-normal"
      />
    );
  }

  if (saveStatus === "saved") {
    return (
      <StatusBadge
        label={EDITOR_UI_TEXTS.saveState.saved}
        tone="success"
        className="normal-case tracking-normal"
      />
    );
  }

  return (
    <StatusBadge
      label={isDirty ? EDITOR_UI_TEXTS.saveState.unsaved : EDITOR_UI_TEXTS.saveState.noChanges}
      tone={isDirty ? "warning" : "neutral"}
      className="normal-case tracking-normal"
    />
  );
}

type FontSizeMode = "small" | "medium" | "large";

function normalizeFontChoiceValue(fontValue: string) {
  return fontValue
    .replace(/["']/g, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function formatFontChoiceLabel(fontValue: string) {
  return fontValue
    .replace(/["']/g, "")
    .split(",")[0]
    .trim();
}

function resolveFontPreviewClassName(fontValue: string) {
  const normalized = normalizeFontChoiceValue(fontValue);

  switch (normalized) {
    case "arial":
      return "cv-preview-font-arial";
    case "times new roman":
      return "cv-preview-font-times";
    case "courier new":
      return "cv-preview-font-courier";
    case "ubuntu":
      return "cv-preview-font-ubuntu";
    case "amiri":
      return "cv-preview-font-amiri";
    case "cairo":
      return "cv-preview-font-cairo";
    case "roboto":
      return "cv-preview-font-roboto";
    case "inter":
      return "cv-preview-font-inter";
    case "manrope":
      return "cv-preview-font-manrope";
    case "ibm plex sans":
      return "cv-preview-font-ibm-plex-sans";
    case "plus jakarta sans":
      return "cv-preview-font-plus-jakarta-sans";
    case "source sans 3":
      return "cv-preview-font-source-sans-3";
    case "lora":
      return "cv-preview-font-lora";
    default:
      return "font-sans";
  }
}

const COLOR_SWATCH_CLASS_BY_HEX: Record<string, string> = {
  "#0f766e": "bg-[#0f766e]",
  "#0f4c81": "bg-[#0f4c81]",
  "#b45309": "bg-[#b45309]",
  "#be123c": "bg-[#be123c]",
  "#4c1d95": "bg-[#4c1d95]",
  "#14532d": "bg-[#14532d]",
  "#6b21a8": "bg-[#6b21a8]",
  "#374151": "bg-[#374151]",
  "#2563eb": "bg-[#2563eb]",
  "#0d9488": "bg-[#0d9488]",
  "#b91c1c": "bg-[#b91c1c]",
  "#1d4ed8": "bg-[#1d4ed8]",
};

function resolveSwatchColorClassName(colorValue: string) {
  const normalized = colorValue.trim().toLowerCase();
  return COLOR_SWATCH_CLASS_BY_HEX[normalized] ?? "bg-slate-300";
}

interface EditorTopbarProps {
  resumeTitle: string;
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
  isDownloading?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTemplateId?: string;
  fontFamily: string;
  fontOptions: string[];
  fontSizeMode: FontSizeMode;
  primaryColor: string;
  patternColor: string;
  patternId: CVThemePatternId;
  syncPatternWithPrimary: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRenameResume: (title: string) => void;
  onOpenOCR: () => void;
  onDownload: () => void;
  onOpenAddSection: () => void;
  onChangeTemplate: (templateId: string) => void;
  onChangeFontFamily: (fontFamily: string) => void;
  onChangeFontSizeMode: (mode: FontSizeMode) => void;
  onChangePrimaryColor: (color: string) => void;
  onChangePatternColor: (color: string) => void;
  onChangePatternId: (patternId: CVThemePatternId) => void;
  onTogglePatternSync: (nextValue: boolean) => void;
}

export function EditorTopbar({
  resumeTitle,
  saveStatus,
  isDirty,
  isDownloading = false,
  canUndo,
  canRedo,
  activeTemplateId,
  fontFamily,
  fontOptions,
  fontSizeMode,
  primaryColor,
  patternColor,
  patternId,
  syncPatternWithPrimary,
  onUndo,
  onRedo,
  onSave,
  onDownload,
  onRenameResume,
  onOpenAddSection,
  onChangeTemplate,
  onChangeFontFamily,
  onChangeFontSizeMode,
  onChangePrimaryColor,
  onChangePatternColor,
  onChangePatternId,
  onTogglePatternSync,
}: EditorTopbarProps) {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isTypographyMenuOpen, setIsTypographyMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(resumeTitle);

  const activeTemplate = useMemo(() => {
    return CV_TEMPLATE_LIBRARY.find((item) => item.id === activeTemplateId) ?? CV_TEMPLATE_LIBRARY[0] ?? null;
  }, [activeTemplateId]);

  const templateOptions = CV_TEMPLATE_LIBRARY_UI;
  const hasTemplateOptions = templateOptions.length > 0;
  const activeTemplateLabel =
    activeTemplate && templateOptions.some((template) => template.id === activeTemplate.id)
      ? activeTemplate.name
      : "Mẫu đang cập nhật";

  const commitResumeTitle = () => {
    setIsEditingTitle(false);

    if (titleDraft !== resumeTitle) {
      onRenameResume(titleDraft);
    }
  };

  return (
    <header className="relative z-50 border-b border-(--app-border) bg-white/82 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-440 flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/candidate/cv-builder"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          aria-label="Quay lại trang danh sách CV"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {isEditingTitle ? (
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitResumeTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitResumeTitle();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setTitleDraft(resumeTitle);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                aria-label="Chỉnh sửa tên CV"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-headline text-lg font-extrabold tracking-tight text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            ) : (
              <p className="truncate font-headline text-lg font-extrabold tracking-tight text-slate-900">
                {resumeTitle}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setTitleDraft(resumeTitle);
                setIsEditingTitle(true);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              title="Sửa tên CV"
              aria-label="Sửa tên CV"
            >
              <PencilLine size={14} />
            </button>
          </div>
          <p className="text-[12px] font-medium text-slate-500">{EDITOR_UI_TEXTS.topbar.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveStateChip saveStatus={saveStatus} isDirty={isDirty} />
          <StatusBadge label={activeTemplateLabel} tone="primary" className="normal-case tracking-normal" />
        </div>

        <div className="relative ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTemplateMenuOpen(false);
                setIsThemeMenuOpen(false);
                setIsTypographyMenuOpen((prev) => !prev);
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
                isTypographyMenuOpen
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
              title="Chỉnh phông chữ và cỡ chữ"
            >
              <Type size={15} />
              <span className="max-w-20 truncate">Phông chữ</span>
              <ChevronDown size={15} />
            </button>

            {isTypographyMenuOpen ? (
              <div className="animate-fade-in absolute right-0 top-12 z-70 w-[min(19rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-800 shadow-[0_26px_55px_-38px_rgba(15,23,42,0.4)]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Phông chữ</p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 [scrollbar-color:rgb(203_213_225)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                  {fontOptions.map((fontOption) => {
                    const selected = normalizeFontChoiceValue(fontOption) === normalizeFontChoiceValue(fontFamily);

                    return (
                      <button
                        key={fontOption}
                        type="button"
                        onClick={() => onChangeFontFamily(fontOption)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-sm transition-colors duration-150",
                          selected
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100",
                        )}
                      >
                        <span
                          className={cn("truncate", resolveFontPreviewClassName(fontOption))}
                        >
                          {formatFontChoiceLabel(fontOption)}
                        </span>
                        <span
                          className={cn(
                            "ml-2 h-2.5 w-2.5 shrink-0 rounded-full border transition",
                            selected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cỡ chữ</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {[
                      { id: "small", label: "Nhỏ" },
                      { id: "medium", label: "Vừa" },
                      { id: "large", label: "Lớn" },
                    ].map((option) => {
                      const selected = option.id === fontSizeMode;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onChangeFontSizeMode(option.id as FontSizeMode)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                            selected
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-3.5 w-3.5 rounded-full border",
                              selected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white",
                            )}
                            aria-hidden="true"
                          />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTemplateMenuOpen(false);
                setIsTypographyMenuOpen(false);
                setIsThemeMenuOpen((prev) => !prev);
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
                isThemeMenuOpen
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
              title="Tùy chỉnh màu và họa tiết"
            >
              <Palette size={15} />
              <span className="max-w-20 truncate">Màu sắc</span>
              <ChevronDown size={15} />
            </button>

            {isThemeMenuOpen ? (
              <div className="animate-fade-in absolute right-0 top-12 z-70 w-[min(21rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-800 shadow-[0_26px_55px_-38px_rgba(15,23,42,0.4)]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Màu chủ đạo</p>
                <div className="grid grid-cols-6 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                  {CV_THEME_PRIMARY_SWATCHES.map((colorValue) => {
                    const selected = colorValue.toLowerCase() === primaryColor.toLowerCase();

                    return (
                      <button
                        key={colorValue}
                        type="button"
                        onClick={() => onChangePrimaryColor(colorValue)}
                        className={cn(
                          "h-7 w-7 rounded-full border transition-transform",
                          resolveSwatchColorClassName(colorValue),
                          selected
                            ? "scale-110 border-slate-600 ring-2 ring-slate-400/40"
                            : "border-white/60 hover:scale-105",
                        )}
                        aria-label={`Chọn màu chủ đạo ${colorValue}`}
                        title={colorValue}
                      />
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Họa tiết nền</p>
                  <div className="grid grid-cols-4 gap-2">
                    {CV_THEME_PATTERN_OPTIONS.map((patternOption) => {
                      const selected = patternOption.id === patternId;

                      return (
                        <button
                          key={patternOption.id}
                          type="button"
                          onClick={() => onChangePatternId(patternOption.id)}
                          className={cn(
                            "rounded-lg border bg-white p-1.5 text-left transition",
                            selected
                              ? "border-emerald-300 ring-1 ring-emerald-200"
                              : "border-slate-200 hover:border-slate-300",
                          )}
                          title={patternOption.label}
                        >
                          <span
                            className={cn(
                              "block h-8 w-full rounded-md border border-slate-200",
                              patternOption.previewClassName,
                            )}
                          />
                          <span className="mt-1 block truncate text-[10px] font-semibold text-slate-600">
                            {patternOption.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => onTogglePatternSync(!syncPatternWithPrimary)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      syncPatternWithPrimary
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-3.5 w-3.5 rounded-full border",
                        syncPatternWithPrimary ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white",
                      )}
                      aria-hidden="true"
                    />
                    <span>Đồng bộ màu họa tiết theo màu chủ đạo</span>
                  </button>

                  {!syncPatternWithPrimary ? (
                    <div className="mt-2 grid grid-cols-6 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                      {CV_THEME_PRIMARY_SWATCHES.map((colorValue) => {
                        const selected = colorValue.toLowerCase() === patternColor.toLowerCase();

                        return (
                          <button
                            key={`pattern-${colorValue}`}
                            type="button"
                            onClick={() => onChangePatternColor(colorValue)}
                            className={cn(
                              "h-6 w-6 rounded-full border transition-transform",
                              resolveSwatchColorClassName(colorValue),
                              selected
                                ? "scale-110 border-slate-600 ring-2 ring-slate-400/40"
                                : "border-white/60 hover:scale-105",
                            )}
                            aria-label={`Chọn màu họa tiết ${colorValue}`}
                            title={colorValue}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (!hasTemplateOptions) {
                  return;
                }

                setIsTypographyMenuOpen(false);
                setIsThemeMenuOpen(false);
                setIsTemplateMenuOpen((prev) => !prev);
              }}
              disabled={!hasTemplateOptions}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title={hasTemplateOptions ? EDITOR_UI_TEXTS.topbar.changeTemplate : "Tạm thời chưa có mẫu để đổi"}
            >
              <span className="max-w-28 truncate">{EDITOR_UI_TEXTS.topbar.changeTemplate}</span>
              <ChevronDown size={15} />
            </button>

            {isTemplateMenuOpen && hasTemplateOptions ? (
              <div className="absolute right-0 top-12 z-70 w-104 rounded-3xl border border-(--app-border) bg-white p-3 shadow-[0_34px_90px_-54px_rgba(15,23,42,0.42)]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {EDITOR_UI_TEXTS.topbar.selectTemplateHint}
                </p>
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {templateOptions.map((template) => {
                    const selected = template.id === activeTemplate?.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          onChangeTemplate(template.id);
                          setIsTemplateMenuOpen(false);
                        }}
                        className={cn(
                          "rounded-[18px] border p-2 text-left transition",
                          selected
                            ? "border-sky-200 bg-sky-50"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="h-24 w-full rounded-xl border border-slate-200 bg-white object-contain"
                        />
                        <p className="mt-2 truncate text-xs font-semibold text-slate-800">{template.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            title={EDITOR_UI_TEXTS.topbar.undo}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            title={EDITOR_UI_TEXTS.topbar.redo}
          >
            <Redo2 size={15} />
          </button>

          <ActionButton
            onClick={onOpenAddSection}
            size="sm"
            variant="secondary"
            icon={<Plus size={14} />}
          >
            {EDITOR_UI_TEXTS.topbar.addSection}
          </ActionButton>
          <ActionButton
            onClick={onDownload}
            size="sm"
            variant="secondary"
            disabled={isDownloading}
            icon={
              isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )
            }
          >
            {isDownloading ? "Đang tải PDF" : EDITOR_UI_TEXTS.topbar.exportPdf}
          </ActionButton>
          <ActionButton
            onClick={onSave}
            size="sm"
            variant="primary"
            disabled={saveStatus === "saving"}
            icon={
              saveStatus === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )
            }
          >
            {EDITOR_UI_TEXTS.topbar.saveCv}
          </ActionButton>
        </div>
      </div>
    </header>
  );
}
