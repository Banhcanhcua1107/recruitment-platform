"use client";

import React, { useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarPos {
  top: number;
  left: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Nhập nội dung...",
  className = "",
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setToolbarPos(null);
        return;
      }
      // Position toolbar based on current selection
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const range = domSel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setToolbarPos({
        top: rect.top - containerRect.top - 44, // 44 = toolbar height + gap
        left: Math.max(0, rect.left - containerRect.left + rect.width / 2 - 80),
      });
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none outline-none min-h-[60px] text-slate-700 leading-relaxed ${className}`,
      },
    },
  });

  // Hide toolbar when clicking outside
  useEffect(() => {
    const handler = () => setToolbarPos(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="relative" onMouseDown={(e) => e.stopPropagation()}>
      {/* Floating Formatting Toolbar (appears on text selection) */}
      {toolbarPos && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-slate-900 text-white rounded-lg shadow-2xl px-1 py-1 pointer-events-auto"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          onMouseDown={(e) => e.preventDefault()} // prevent editor blur
        >
          {/* Bold */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="In đậm (Ctrl+B)"
          >
            <span className="font-black text-sm leading-none">B</span>
          </ToolbarBtn>

          {/* Italic */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="In nghiêng (Ctrl+I)"
          >
            <span className="italic text-sm font-semibold leading-none">I</span>
          </ToolbarBtn>

          {/* Underline */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Gạch chân (Ctrl+U)"
          >
            <span className="underline text-sm font-semibold leading-none">U</span>
          </ToolbarBtn>

          {/* Divider */}
          <div className="w-px h-4 bg-white/20 mx-0.5" />

          {/* Bullet List */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Danh sách gạch đầu dòng"
          >
            <BulletIcon />
          </ToolbarBtn>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {editor.isEmpty && (
        <p className="absolute top-0 left-0 text-sm text-slate-400 pointer-events-none select-none">
          {placeholder}
        </p>
      )}

      {/* Prose styles */}
      <style>{`
        .ProseMirror ul { list-style-type: disc; padding-left: 1.25rem; }
        .ProseMirror li { margin-bottom: 0.2rem; }
        .ProseMirror p { margin-bottom: 0.5rem; }
        .ProseMirror p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
        active ? "bg-white/20" : "hover:bg-white/10 text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function BulletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
