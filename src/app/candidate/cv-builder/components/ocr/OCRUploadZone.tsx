"use client";

import React, { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";

interface OCRUploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".docx",
];

const MAX_SIZE_MB = 10;

export function OCRUploadZone({
  onFileSelected,
  disabled,
}: OCRUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isKnownType = ACCEPTED_TYPES.includes(file.type);
    const isKnownExt = ACCEPTED_EXTENSIONS.includes(`.${extension}`);

    if (!isKnownType && !isKnownExt) {
      return "Chỉ hỗ trợ PDF, JPG, PNG, WebP hoặc DOCX.";
    }

    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      return `File quá lớn. Tối đa ${MAX_SIZE_MB}MB.`;
    }

    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onFileSelected(file);
    },
    [onFileSelected, validateFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="mx-auto w-full max-w-lg"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-10
          backdrop-blur-md transition-all duration-300
          ${
            isDragOver
              ? "scale-[1.01] border-blue-400 bg-blue-50/60 shadow-lg shadow-blue-500/10"
              : "border-slate-200/60 bg-white/40 hover:border-blue-300 hover:bg-blue-50/30"
          }
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={isDragOver ? { scale: 1.05 } : { scale: 1 }}
        >
          <motion.div
            className={`
              flex h-16 w-16 items-center justify-center rounded-2xl
              ${isDragOver ? "bg-blue-100 shadow-lg shadow-blue-500/20" : "bg-slate-100"}
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
            <p className="mb-1 text-sm font-bold text-slate-700">
              {isDragOver ? "Thả file vào đây" : "Kéo và thả CV của bạn vào đây"}
            </p>
            <p className="text-xs text-slate-400">
              hoặc{" "}
              <span className="font-semibold text-blue-600 hover:underline">
                chọn file
              </span>{" "}
              từ máy tính
            </p>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1">
              <FileText size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-600">PDF</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1">
              <ImageIcon size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600">JPG</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-purple-100 bg-purple-50 px-2.5 py-1">
              <ImageIcon size={12} className="text-purple-500" />
              <span className="text-[10px] font-bold text-purple-600">PNG</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1">
              <FileText size={12} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-600">DOCX</span>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
        Hỗ trợ PDF, ảnh và DOCX. OCR giữ lại block text cùng vị trí để dựng lại
        bố cục CV trong bước preview.
      </p>

      <input
        ref={inputRef}
        type="file"
        aria-label="Chọn file CV để tải lên"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5"
        >
          <X size={14} className="shrink-0 text-red-500" />
          <p className="text-xs font-medium text-red-600">{error}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
