"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
} from "lucide-react";

interface InlineRichTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Inline rich-text editor (Notion / Canva style).
 * Renders plain HTML when idle; on click turns into a Tiptap editor
 * with a small floating toolbar (Bold, Italic, Underline, Bullet list).
 *
 * `value` / `onChange` work with **plain text** (newline-separated lines).
 * Internally we convert to/from simple HTML for the editor.
 */
export const InlineRichText = ({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  className,
}: InlineRichTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ── helpers: plain text ↔ HTML ────────────────────── */
  const textToHtml = useCallback((text: string): string => {
    if (!text) return "";
    // If every line starts with "- " treat as bullet list
    const lines = text.split("\n").filter(Boolean);
    const allBullets = lines.length > 0 && lines.every((l) => l.trimStart().startsWith("- "));
    if (allBullets) {
      const lis = lines
        .map((l) => `<li><p>${l.replace(/^[\s]*-\s*/, "")}</p></li>`)
        .join("");
      return `<ul>${lis}</ul>`;
    }
    // Otherwise paragraphs
    return lines.map((l) => `<p>${l}</p>`).join("");
  }, []);

  const htmlToText = useCallback((html: string): string => {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;

    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent ?? "");
        return;
      }
      const el = node as HTMLElement;
      const tag = el.tagName?.toLowerCase();

      if (tag === "li") {
        parts.push("- ");
        el.childNodes.forEach(walk);
        parts.push("\n");
      } else if (tag === "p" || tag === "br") {
        el.childNodes.forEach(walk);
        parts.push("\n");
      } else {
        el.childNodes.forEach(walk);
      }
    };
    div.childNodes.forEach(walk);
    return parts.join("").replace(/\n+$/, "");
  }, []);

  /* ── Tiptap editor ─────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        listItem: false,
      }),
      Underline,
      BulletList,
      ListItem,
    ],
    content: textToHtml(value),
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[1.5em] text-inherit font-inherit leading-inherit prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:space-y-0.5 [&_p]:my-0",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const text = htmlToText(html);
      onChange(text);
    },
    // Prevent Tiptap from auto-focusing on mount
    autofocus: false,
    immediatelyRender: false,
  });

  // Sync external value changes into editor while not focused
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHtml = editor.getHTML();
      const newHtml = textToHtml(value);
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml, { emitUpdate: false });
      }
    }
  }, [value, editor, textToHtml]);

  /* ── Click-outside handler ─────────────────────────── */
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        editor?.commands.blur();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing, editor]);

  /* ── Activate editor on click ──────────────────────── */
  const handleActivate = () => {
    if (!isEditing) {
      setIsEditing(true);
      // Small timeout so the editor DOM mounts, then focus
      setTimeout(() => editor?.commands.focus("end"), 30);
    }
  };

  /* ── Toolbar button helper ─────────────────────────── */
  const ToolBtn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focused
        onClick();
      }}
      title={title}
      className={cn(
        "p-1 rounded hover:bg-white/80 transition-colors",
        active ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"
      )}
    >
      {children}
    </button>
  );

  /* ── Render ─────────────────────────────────────────── */
  if (!isEditing) {
    // Static display — renders plain text with line breaks
    return (
      <div
        onClick={handleActivate}
        className={cn(
          "w-full cursor-text whitespace-pre-wrap border border-transparent hover:border-slate-200 rounded px-1 -mx-1 transition-colors min-h-[1.5em]",
          !value && "text-slate-400 italic",
          className
        )}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("w-full relative", className)}>
      {/* Fixed mini toolbar above the editor */}
      {editor && (
        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-t-md px-1.5 py-1 -mb-px relative z-10">
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Đậm (Ctrl+B)"
          >
            <Bold size={13} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Gạch chân (Ctrl+U)"
          >
            <UnderlineIcon size={13} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Nghiêng (Ctrl+I)"
          >
            <Italic size={13} />
          </ToolBtn>
          <div className="w-px h-4 bg-slate-300 mx-0.5" />
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Danh sách"
          >
            <List size={13} />
          </ToolBtn>
        </div>
      )}

      {/* Editor content */}
      <div className="bg-blue-50/40 border border-blue-400 rounded-b-md px-2 py-1 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
