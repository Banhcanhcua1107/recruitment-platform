"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Bold, Italic, List, Plus, Trash2, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionToolbarCommand = "bold" | "italic" | "underline" | "list";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInlineMarkers(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~([^~]+)~/g, "<u>$1</u>");
}

interface TextPreviewOptions {
  preserveDashBullets?: boolean;
}

function textToPreviewHtml(input: string, options?: TextPreviewOptions) {
  const source = input.trim();
  if (!source) {
    return "";
  }

  const lines = source.split(/\r?\n/);

  if (options?.preserveDashBullets) {
    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return "<div><br/></div>";
        }

        return `<div>${formatInlineMarkers(escapeHtml(trimmed))}</div>`;
      })
      .join("");
  }

  const allBullets = lines.length > 1 && lines.every((line) => line.trim().startsWith("- "));

  if (allBullets) {
    const items = lines
      .map((line) => line.trim().replace(/^-\s*/, ""))
      .filter(Boolean)
      .map((line) => `<li>${formatInlineMarkers(escapeHtml(line))}</li>`)
      .join("");
    return `<ul class=\"list-disc pl-5\">${items}</ul>`;
  }

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return "<div><br/></div>";
      }
      if (trimmed.startsWith("- ")) {
        return `<div class=\"pl-1\">• ${formatInlineMarkers(escapeHtml(trimmed.replace(/^-\s*/, "")))}</div>`;
      }
      return `<div>${formatInlineMarkers(escapeHtml(trimmed))}</div>`;
    })
    .join("");
}

function normalizeListItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function applyWrapper(
  input: HTMLTextAreaElement,
  value: string,
  startToken: string,
  endToken: string,
  fallbackText: string,
) {
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  const selectedText = value.slice(selectionStart, selectionEnd);
  const insertedText = selectedText || fallbackText;

  const nextValue =
    value.slice(0, selectionStart) +
    `${startToken}${insertedText}${endToken}` +
    value.slice(selectionEnd);

  const nextSelectionStart = selectionStart + startToken.length;
  const nextSelectionEnd = nextSelectionStart + insertedText.length;

  return {
    nextValue,
    nextSelectionStart,
    nextSelectionEnd,
  };
}

function applyListCommand(input: HTMLTextAreaElement, value: string) {
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  const hasSelection = selectionEnd > selectionStart;

  const target = hasSelection ? value.slice(selectionStart, selectionEnd) : value;
  const lines = target.split(/\r?\n/);
  const shouldRemove = lines.every((line) => line.trim().startsWith("- "));

  const transformed = lines
    .map((line) => {
      if (!line.trim()) {
        return line;
      }
      if (shouldRemove) {
        return line.replace(/^(\s*)-\s?/, "$1");
      }
      return line.replace(/^(\s*)/, "$1- ");
    })
    .join("\n");

  if (!hasSelection) {
    return {
      nextValue: transformed,
      nextSelectionStart: 0,
      nextSelectionEnd: transformed.length,
    };
  }

  const nextValue = value.slice(0, selectionStart) + transformed + value.slice(selectionEnd);
  return {
    nextValue,
    nextSelectionStart: selectionStart,
    nextSelectionEnd: selectionStart + transformed.length,
  };
}

interface SectionToolbarProps {
  onCommand: (command: SectionToolbarCommand) => void;
}

export function SectionToolbar({ onCommand }: SectionToolbarProps) {
  const actions: Array<{ command: SectionToolbarCommand; label: string; icon: (props: { size?: number }) => ReactNode }> = [
    { command: "bold", label: "Đậm", icon: Bold },
    { command: "italic", label: "Nghiêng", icon: Italic },
    { command: "underline", label: "Gạch chân", icon: Underline },
    { command: "list", label: "Danh sách", icon: List },
  ];

  return (
    <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/95 px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.command}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onCommand(action.command)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-all duration-150 hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-[0.97]"
            aria-label={action.label}
            title={action.label}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

interface EditableTextProps {
  value: string;
  placeholder: string;
  isSectionActive: boolean;
  onCommit: (value: string) => void;
  multiline?: boolean;
  minRows?: number;
  showToolbar?: boolean;
  readClassName?: string;
  editClassName?: string;
  preserveDashBullets?: boolean;
}

export function EditableText({
  value,
  placeholder,
  isSectionActive,
  onCommit,
  multiline = true,
  minRows = 3,
  showToolbar = true,
  readClassName,
  editClassName,
  preserveDashBullets = false,
}: EditableTextProps) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState(value || "");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !multiline || !textAreaRef.current) {
      return;
    }

    const element = textAreaRef.current;
    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, minRows * 24)}px`;
  }, [draft, mode, multiline, minRows]);

  const previewValue = mode === "edit" ? draft : value || "";
  const previewHtml = useMemo(
    () => textToPreviewHtml(previewValue, { preserveDashBullets }),
    [previewValue, preserveDashBullets],
  );

  const startEditing = () => {
    if (!isSectionActive) {
      return;
    }

    setDraft(value || "");
    setMode("edit");
    window.requestAnimationFrame(() => {
      if (multiline) {
        textAreaRef.current?.focus();
      }
    });
  };

  const commitChanges = () => {
    if (mode !== "edit") {
      return;
    }

    setMode("read");
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const cancelChanges = () => {
    setDraft(value || "");
    setMode("read");
  };

  const handleToolbarCommand = (command: SectionToolbarCommand) => {
    if (!textAreaRef.current) {
      return;
    }

    const input = textAreaRef.current;
    let nextValue = draft;
    let nextSelectionStart = input.selectionStart;
    let nextSelectionEnd = input.selectionEnd;

    if (command === "bold") {
      const result = applyWrapper(input, draft, "**", "**", "nội dung");
      nextValue = result.nextValue;
      nextSelectionStart = result.nextSelectionStart;
      nextSelectionEnd = result.nextSelectionEnd;
    }

    if (command === "italic") {
      const result = applyWrapper(input, draft, "_", "_", "nội dung");
      nextValue = result.nextValue;
      nextSelectionStart = result.nextSelectionStart;
      nextSelectionEnd = result.nextSelectionEnd;
    }

    if (command === "underline") {
      const result = applyWrapper(input, draft, "~", "~", "nội dung");
      nextValue = result.nextValue;
      nextSelectionStart = result.nextSelectionStart;
      nextSelectionEnd = result.nextSelectionEnd;
    }

    if (command === "list") {
      const result = applyListCommand(input, draft);
      nextValue = result.nextValue;
      nextSelectionStart = result.nextSelectionStart;
      nextSelectionEnd = result.nextSelectionEnd;
    }

    setDraft(nextValue);

    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelChanges();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      commitChanges();
      return;
    }

    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      commitChanges();
    }
  };

  const handleReadModePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isSectionActive) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    // Some selectable wrappers consume the synthetic click event after mousedown.
    // Opening edit mode on pointer down keeps inline editing reliable.
    event.preventDefault();
    event.stopPropagation();
    startEditing();
  };

  if (mode === "edit") {
    return (
      <div
        className={cn(
          "rounded-lg border border-emerald-300/75 bg-white p-2.5 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.55),0_0_0_1px_rgba(16,185,129,0.14)]",
          editClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {multiline && showToolbar ? <SectionToolbar onCommand={handleToolbarCommand} /> : null}

        {multiline ? (
          <textarea
            ref={textAreaRef}
            value={draft}
            rows={minRows}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitChanges}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent px-1 py-1 text-[1em] leading-[1.65] text-slate-800 outline-none placeholder:text-slate-400"
            aria-label={placeholder}
          />
        ) : (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitChanges}
            placeholder={placeholder}
            className="h-8 w-full bg-transparent px-1 text-[1em] leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            aria-label={placeholder}
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-all duration-150",
        isSectionActive ? "hover:border-emerald-200/80 hover:bg-emerald-50/35" : "cursor-text",
        !value && "text-slate-400",
        readClassName,
      )}
      onPointerDown={handleReadModePointerDown}
      onClick={(event) => {
        if (!isSectionActive) {
          return;
        }

        // Pointer activation is handled onPointerDown to avoid dropped click events.
        // Keep onClick for keyboard activation (event.detail === 0).
        if (event.detail !== 0) {
          event.stopPropagation();
          return;
        }

        event.stopPropagation();
        startEditing();
      }}
    >
      {previewHtml ? (
        <div className="text-[1em] leading-[1.65] text-inherit" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      ) : (
        <span className="text-[1em] italic leading-6 text-slate-400">{placeholder}</span>
      )}
    </button>
  );
}

interface EditableListProps {
  items: string[];
  placeholder: string;
  isSectionActive: boolean;
  onCommit: (items: string[]) => void;
  readClassName?: string;
  editClassName?: string;
}

export function EditableList({
  items,
  placeholder,
  isSectionActive,
  onCommit,
  readClassName,
  editClassName,
}: EditableListProps) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draftItems, setDraftItems] = useState<string[]>(items.length > 0 ? items : [""]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commit = () => {
    if (mode !== "edit") {
      return;
    }

    const normalized = normalizeListItems(draftItems);
    setMode("read");
    onCommit(normalized);
  };

  const cancel = () => {
    setMode("read");
    setDraftItems(items.length > 0 ? items : [""]);
  };

  const startEditing = () => {
    if (!isSectionActive) {
      return;
    }
    setDraftItems(items.length > 0 ? items : [""]);
    setMode("edit");
  };

  const handleBlurCapture = () => {
    window.setTimeout(() => {
      if (!containerRef.current) {
        return;
      }

      if (containerRef.current.contains(document.activeElement)) {
        return;
      }

      commit();
    }, 0);
  };

  const handleReadModePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isSectionActive) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    startEditing();
  };

  if (mode === "edit") {
    return (
      <div
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
        onBlurCapture={handleBlurCapture}
        className={cn(
          "space-y-2.5 rounded-lg border border-emerald-300/75 bg-white p-2.5 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.55),0_0_0_1px_rgba(16,185,129,0.14)]",
          editClassName,
        )}
      >
        {draftItems.map((item, index) => (
          <div key={`editable-item-${index}`} className="flex items-center gap-2">
            <span className="text-[14px] text-slate-500">•</span>
            <input
              value={item}
              onChange={(event) => {
                const next = [...draftItems];
                next[index] = event.target.value;
                setDraftItems(next);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancel();
                  return;
                }

                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
              className="h-8 flex-1 bg-transparent text-[14px] text-slate-800 outline-none"
              placeholder={`${placeholder} ${index + 1}`}
              aria-label={`${placeholder} ${index + 1}`}
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const next = draftItems.filter((_, itemIndex) => itemIndex !== index);
                setDraftItems(next.length > 0 ? next : [""]);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-all duration-150 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
              title="Xóa dòng"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setDraftItems((prev) => [...prev, ""])}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[12px] font-medium text-slate-600 transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Plus size={12} />
            Thêm dòng
          </button>
          <p className="text-[11px] text-slate-400">Ctrl/Cmd + Enter để lưu</p>
        </div>
      </div>
    );
  }

  const normalizedItems = normalizeListItems(items);

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-all duration-150",
        isSectionActive ? "hover:border-emerald-200/80 hover:bg-emerald-50/35" : "cursor-text",
        readClassName,
      )}
      onPointerDown={handleReadModePointerDown}
      onClick={(event) => {
        if (!isSectionActive) {
          return;
        }

        if (event.detail !== 0) {
          event.stopPropagation();
          return;
        }

        event.stopPropagation();
        startEditing();
      }}
    >
      {normalizedItems.length === 0 ? (
        <span className="text-[13px] italic text-slate-400">{placeholder}</span>
      ) : (
        <ul className="list-disc pl-5 text-[13px] leading-[1.65] text-inherit">
          {normalizedItems.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </button>
  );
}
