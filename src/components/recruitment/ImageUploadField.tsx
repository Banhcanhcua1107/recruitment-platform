"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadFieldProps {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  folder: string;
  onChange: (value: string) => void;
}

export function ImageUploadField({
  label,
  name,
  value,
  placeholder,
  folder,
  onChange,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Không thể tải ảnh lên Cloudinary.");
      }

      onChange(result.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể tải ảnh lên Cloudinary."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <Input
        id={inputId}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload image file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void handleFileSelected(file);
          }}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Đang tải ảnh..." : "Tải ảnh lên"}
        </Button>

        <span className="text-xs text-slate-500">
          Bạn có thể dán URL trực tiếp hoặc tải ảnh lên để tự tạo URL Cloudinary.
        </span>
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
