"use client";

import React, { useCallback, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, X } from "lucide-react";

interface OCRUploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  // DOCX — browsers may send either of these
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".docx"];
const MAX_SIZE_MB = 10;

export function OCRUploadZone({ onFileSelected, disabled }: OCRUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isKnownType = ACCEPTED_TYPES.includes(file.type);
    const isKnownExt = ACCEPTED_EXTENSIONS.includes(`.${ext}`);
    if (!isKnownType && !isKnownExt) {
      return "Chỉ hỗ trợ PDF, JPG, PNG, WebP, hoặc DOCX.";
    }
    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      return `File quá lớn. Tối đa ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [validateFile, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-10
          transition-all duration-300 backdrop-blur-md
          ${isDragOver
            ? "border-blue-400 bg-blue-50/60 shadow-lg shadow-blue-500/10 scale-[1.01]"
            : "border-slate-200/60 bg-white/40 hover:border-blue-300 hover:bg-blue-50/30"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {/* Animated icon */}
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={isDragOver ? { scale: 1.05 } : { scale: 1 }}
        >
          <motion.div
            className={`
              flex items-center justify-center w-16 h-16 rounded-2xl
              ${isDragOver
                ? "bg-blue-100 shadow-lg shadow-blue-500/20"
                : "bg-slate-100"
              }
            `}
            animate={isDragOver ? { y: -4 } : { y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Upload
              size={28}
              className={isDragOver ? "text-blue-600" : "text-slate-400"}
            />
          </motion.div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 mb-1">
              {isDragOver ? "Thả file vào đây!" : "Kéo & thả CV của bạn vào đây"}
            </p>
            <p className="text-xs text-slate-400">
              hoặc <span className="text-blue-600 font-semibold hover:underline">chọn file</span> từ máy tính
            </p>
          </div>

          {/* Supported formats */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100">
              <FileText size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-600">PDF</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
              <ImageIcon size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600">JPG</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-100">
              <ImageIcon size={12} className="text-purple-500" />
              <span className="text-[10px] font-bold text-purple-600">PNG</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100">
              <FileText size={12} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-600">DOCX</span>
            </div>
          </div>
        </motion.div>
      </div>

      <input
        ref={inputRef}
        type="file"
        aria-label="Chọn file CV để upload"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl"
        >
          <X size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
