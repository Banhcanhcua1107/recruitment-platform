"use client";

import { Lightbulb, Plus, Trash2 } from "lucide-react";
import type { CVSection } from "../../types";
import {
  type EditorFieldSchema,
  getSectionSchema,
} from "./template-schema";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";

function fieldInputType(field: EditorFieldSchema) {
  if (field.kind === "email") {
    return "email";
  }
  if (field.kind === "tel") {
    return "tel";
  }
  if (field.kind === "month") {
    return "month";
  }
  return "text";
}

function SectionField({
  field,
  value,
  onChange,
}: {
  field: EditorFieldSchema;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  if (field.kind === "textarea") {
    return (
      <label className="grid gap-1.5 text-[11px] text-slate-500">
        <span className="font-medium tracking-[0.01em]">{field.label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-[1.65] text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
    );
  }

  return (
    <label className="grid gap-1.5 text-[11px] text-slate-500">
      <span className="font-medium tracking-[0.01em]">{field.label}</span>
      <input
        type={fieldInputType(field)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

interface SectionFormRendererProps {
  selectedSection: CVSection | null;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onAddListItem: (sectionId: string) => void;
  onRemoveListItem: (sectionId: string, itemIndex: number) => void;
}

export function SectionFormRenderer({
  selectedSection,
  onUpdateSectionData,
  onAddListItem,
  onRemoveListItem,
}: SectionFormRendererProps) {
  const selectedSchema = selectedSection ? getSectionSchema(selectedSection.type) : null;
  const sectionData = (selectedSection?.data ?? {}) as Record<string, unknown>;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Lightbulb size={13} className="text-amber-500" />
        {EDITOR_UI_TEXTS.rightPanel.editTitle}
      </div>

      {!selectedSection ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-4 text-[12px] leading-5 text-slate-500">
          {EDITOR_UI_TEXTS.rightPanel.selectHint}
        </div>
      ) : selectedSchema?.fields ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.2)]">
          {selectedSchema.fields.map((field) => (
            <SectionField
              key={field.key}
              field={field}
              value={String(sectionData[field.key] ?? "")}
              onChange={(nextValue) =>
                onUpdateSectionData(selectedSection.id, {
                  [field.key]: nextValue,
                })
              }
            />
          ))}
        </div>
      ) : selectedSchema?.list ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-xs font-medium text-slate-700">{selectedSchema.list.itemLabel}</p>
            <button
              type="button"
              onClick={() => onAddListItem(selectedSection.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Plus size={11} />
              {EDITOR_UI_TEXTS.rightPanel.addItem}
            </button>
          </div>

          {Array.isArray(sectionData.items) && sectionData.items.length > 0 ? (
            sectionData.items.map((rawItem, itemIndex) => {
              const item = (rawItem ?? {}) as Record<string, unknown>;
              return (
                <div key={String(item.id ?? itemIndex)} className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.2)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {selectedSchema.list!.itemLabel} {itemIndex + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveListItem(selectedSection.id, itemIndex)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={11} />
                      {EDITOR_UI_TEXTS.rightPanel.remove}
                    </button>
                  </div>

                  {selectedSchema.list!.fields.map((field) => (
                    <SectionField
                      key={`${itemIndex}-${field.key}`}
                      field={field}
                      value={String(item[field.key] ?? "")}
                      onChange={(nextValue) => {
                        const currentItems = Array.isArray(sectionData.items) ? [...sectionData.items] : [];
                        const nextItem = {
                          ...(currentItems[itemIndex] as Record<string, unknown>),
                          [field.key]: nextValue,
                        };
                        currentItems[itemIndex] = nextItem;
                        onUpdateSectionData(selectedSection.id, { items: currentItems });
                      }}
                    />
                  ))}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-4 text-[12px] leading-5 text-slate-500">
              {EDITOR_UI_TEXTS.rightPanel.emptyList}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-4 text-[12px] leading-5 text-slate-500">
          {EDITOR_UI_TEXTS.rightPanel.noForm}
        </div>
      )}
    </section>
  );
}
