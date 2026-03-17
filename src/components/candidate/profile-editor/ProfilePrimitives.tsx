"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function createInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ProfileSection({
  title,
  description,
  onEdit,
  children,
}: {
  title: string;
  description?: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {onEdit ? (
          <Button variant="outline" className="shrink-0" onClick={onEdit}>
            <span className="material-symbols-outlined text-lg">edit</span>
            Chỉnh sửa
          </Button>
        ) : null}
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
      {text}
    </div>
  );
}

export function ProfileModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-[111] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Hồ sơ cá nhân
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng cửa sổ">
            <span className="material-symbols-outlined">close</span>
          </Button>
        </div>
        <div className="overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function SectionActions({
  onCancel,
  onSave,
  saving,
  saveLabel = "Lưu thay đổi",
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={onCancel}>
        Hủy
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? "Đang lưu..." : saveLabel}
      </Button>
    </div>
  );
}

export function SkillComposer({
  value,
  onChange,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) {
      return;
    }

    if (value.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      setInput("");
      return;
    }

    onChange([...value, skill]);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap gap-2">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== skill))}
                className="rounded-full text-sky-700 transition hover:text-sky-900"
                aria-label={`Xóa kỹ năng ${skill}`}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </span>
          ))}
          {value.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chưa có kỹ năng nào. Hãy thêm những kỹ năng nổi bật để nhà tuyển dụng dễ tìm thấy bạn.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addSkill(input);
            }
          }}
          placeholder="Nhập kỹ năng và nhấn Enter"
        />
        <Button variant="outline" onClick={() => addSkill(input)}>
          Thêm kỹ năng
        </Button>
      </div>
    </div>
  );
}
