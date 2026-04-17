"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
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

interface EditorTopbarProps {
  resumeTitle: string;
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTemplateId?: string;
  fontFamily: string;
  fontOptions: string[];
  fontSizeMode: FontSizeMode;
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
}

export function EditorTopbar({
  resumeTitle,
  saveStatus,
  isDirty,
  canUndo,
  canRedo,
  activeTemplateId,
  fontFamily,
  fontOptions,
  fontSizeMode,
  onUndo,
  onRedo,
  onSave,
  onRenameResume,
  onOpenAddSection,
  onChangeTemplate,
  onChangeFontFamily,
  onChangeFontSizeMode,
}: EditorTopbarProps) {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isTypographyMenuOpen, setIsTypographyMenuOpen] = useState(false);
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
                setIsTypographyMenuOpen((prev) => !prev);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
              title="Chỉnh phông chữ và cỡ chữ"
            >
              <Type size={15} />
              <span className="max-w-20 truncate">Phông chữ</span>
              <ChevronDown size={15} />
            </button>

            {isTypographyMenuOpen ? (
              <div className="absolute right-0 top-12 z-70 w-72 rounded-[18px] border border-slate-200 bg-slate-700 p-3 text-slate-100 shadow-[0_30px_70px_-42px_rgba(15,23,42,0.65)]">
                <p className="mb-2 text-xs font-semibold">Phông chữ</p>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-slate-600/65 p-2">
                  {fontOptions.map((fontOption) => {
                    const selected = normalizeFontChoiceValue(fontOption) === normalizeFontChoiceValue(fontFamily);

                    return (
                      <button
                        key={fontOption}
                        type="button"
                        onClick={() => onChangeFontFamily(fontOption)}
                        className={cn(
                          "w-full rounded-lg px-2 py-1.5 text-left text-sm transition",
                          selected
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "text-slate-100 hover:bg-slate-500/70",
                        )}
                      >
                        {formatFontChoiceLabel(fontOption)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-slate-500/70 pt-3">
                  <p className="mb-2 text-xs font-semibold">Cỡ chữ</p>
                  <div className="flex items-center gap-3 text-sm">
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
                          className="inline-flex items-center gap-1.5"
                        >
                          <span
                            className={cn(
                              "inline-flex h-4 w-4 rounded-full border border-slate-200",
                              selected ? "border-cyan-400 bg-cyan-400" : "bg-white",
                            )}
                          />
                          <span className={selected ? "text-cyan-100" : "text-slate-100"}>{option.label}</span>
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
                if (!hasTemplateOptions) {
                  return;
                }

                setIsTypographyMenuOpen(false);
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
