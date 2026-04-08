"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  Plus,
  Redo2,
  Save,
  ScanLine,
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

interface EditorTopbarProps {
  resumeTitle: string;
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTemplateId?: string;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onOpenOCR: () => void;
  onDownload: () => void;
  onOpenAddSection: () => void;
  onChangeTemplate: (templateId: string) => void;
}

export function EditorTopbar({
  resumeTitle,
  saveStatus,
  isDirty,
  canUndo,
  canRedo,
  activeTemplateId,
  onUndo,
  onRedo,
  onSave,
  onOpenOCR,
  onDownload,
  onOpenAddSection,
  onChangeTemplate,
}: EditorTopbarProps) {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  const activeTemplate = useMemo(() => {
    return CV_TEMPLATE_LIBRARY.find((item) => item.id === activeTemplateId) ?? CV_TEMPLATE_LIBRARY[0] ?? null;
  }, [activeTemplateId]);

  const templateOptions = CV_TEMPLATE_LIBRARY_UI;
  const hasTemplateOptions = templateOptions.length > 0;
  const activeTemplateLabel =
    activeTemplate && templateOptions.some((template) => template.id === activeTemplate.id)
      ? activeTemplate.name
      : "Mẫu đang cập nhật";

  return (
    <header className="border-b border-[var(--app-border)] bg-white/82 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-[1760px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/candidate/cv-builder"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          aria-label="Quay lai trang danh sach CV"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="min-w-0">
          <p className="truncate font-headline text-lg font-extrabold tracking-tight text-slate-900">
            {resumeTitle}
          </p>
          <p className="text-[12px] font-medium text-slate-500">{EDITOR_UI_TEXTS.topbar.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveStateChip saveStatus={saveStatus} isDirty={isDirty} />
          <StatusBadge label={activeTemplateLabel} tone="primary" className="normal-case tracking-normal" />
        </div>

        <div className="relative ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!hasTemplateOptions) {
                return;
              }

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
            <div className="absolute right-0 top-12 z-30 w-[26rem] rounded-[24px] border border-[var(--app-border)] bg-white p-3 shadow-[0_34px_90px_-54px_rgba(15,23,42,0.42)]">
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
            onClick={onOpenOCR}
            size="sm"
            variant="secondary"
            icon={<ScanLine size={14} />}
          >
            {EDITOR_UI_TEXTS.topbar.importCv}
          </ActionButton>
          <ActionButton
            onClick={onDownload}
            size="sm"
            variant="secondary"
            icon={<Download size={14} />}
          >
            {EDITOR_UI_TEXTS.topbar.exportPdf}
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
