"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCVStore } from "../store";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { clsx } from "clsx";

interface EditableBlockProps {
  id: string;
  children: React.ReactNode;
}

export const EditableBlock = ({ id, children }: EditableBlockProps) => {
  const { selectedSectionId, setSelectedSection, removeSection } = useCVStore();
  const isSelected = selectedSectionId === id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : isSelected ? 40 : 1,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSection(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSection(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative transition-all rounded-sm",
        isSelected
          ? "ring-2 ring-emerald-500 ring-offset-2"
          : "hover:ring-1 hover:ring-emerald-200"
      )}
      onClick={handleSelect}
    >
      {/* Action Toolbar - Visible on Hover/Selection */}
      <div
        className={clsx(
            "absolute -top-3 -right-3 flex gap-1 bg-white shadow-lg rounded-full p-1 border border-slate-100 z-50 transition-opacity duration-200",
            isSelected || "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Drag to Move"
        >
          <GripVertical size={14} />
        </button>
        <button
          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-colors"
          onClick={handleDelete}
          title="Delete Section"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {children}
    </div>
  );
};
