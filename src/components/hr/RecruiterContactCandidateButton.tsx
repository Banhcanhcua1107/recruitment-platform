"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ContactField =
  | "recruiterName"
  | "recruiterEmail"
  | "recruiterPhone"
  | "companyName"
  | "hiringPosition"
  | "message";

type FieldErrors = Partial<Record<ContactField, string>>;

interface RecruiterContactCandidateButtonProps {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string | null;
  label?: string;
  compact?: boolean;
  variant?: "default" | "outline";
  className?: string;
}

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RecruiterContactCandidateButton({
  candidateId,
  candidateName,
  candidateEmail,
  label = "Mời kết nối",
  compact = false,
  variant = "outline",
  className,
}: RecruiterContactCandidateButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    recruiterName: "",
    recruiterEmail: "",
    recruiterPhone: "",
    companyName: "",
    hiringPosition: "",
    message: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  function clearFieldError(field: ContactField) {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateField(field: ContactField, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    clearFieldError(field);
    resetMessages();
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!form.recruiterName.trim()) {
      nextErrors.recruiterName = "Vui lòng nhập tên người liên hệ.";
    }

    if (!form.recruiterEmail.trim()) {
      nextErrors.recruiterEmail = "Vui lòng nhập email liên hệ.";
    } else if (!isValidEmail(form.recruiterEmail.trim())) {
      nextErrors.recruiterEmail = "Email chưa đúng định dạng.";
    }

    if (!form.recruiterPhone.trim()) {
      nextErrors.recruiterPhone = "Vui lòng nhập số điện thoại liên hệ.";
    }

    if (!form.companyName.trim()) {
      nextErrors.companyName = "Vui lòng nhập tên công ty.";
    }

    if (!form.hiringPosition.trim()) {
      nextErrors.hiringPosition = "Vui lòng nhập vị trí cần tuyển.";
    }

    if (!form.message.trim()) {
      nextErrors.message = "Vui lòng nhập nội dung liên hệ.";
    } else if (form.message.trim().length < 20) {
      nextErrors.message = "Nội dung liên hệ cần tối thiểu 20 ký tự.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    if (hasErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Vui lòng điền đầy đủ thông tin trước khi gửi.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const response = await fetch(`/api/recruiter/candidates/${encodeURIComponent(candidateId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recruiterName: form.recruiterName.trim(),
          recruiterEmail: form.recruiterEmail.trim(),
          recruiterPhone: form.recruiterPhone.trim(),
          companyName: form.companyName.trim(),
          hiringPosition: form.hiringPosition.trim(),
          message: form.message.trim(),
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        candidateEmailSent?: boolean;
        candidateHasEmail?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Không thể gửi lời mời liên hệ lúc này.");
      }

      setSuccess(
        result.candidateEmailSent
          ? "Đã gửi email liên hệ đến ứng viên thành công."
          : result.candidateHasEmail === false
            ? "Ứng viên chưa công khai email. Hệ thống đã lưu thông báo liên hệ cho ứng viên."
            : "Đã gửi lời mời liên hệ thành công."
      );
      setFieldErrors({});
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể gửi lời mời liên hệ lúc này."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const modal = isMounted && isOpen
    ? createPortal(
        <div className="fixed inset-0 z-130 grid place-items-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="Đóng biểu mẫu liên hệ"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/60"
          />

          <section className="relative z-131 flex h-[min(calc(100dvh-0.75rem),980px)] w-full max-w-190 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_-40px_rgba(15,23,42,0.42)] sm:h-auto sm:max-h-[92vh]">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                    Liên hệ ứng viên
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    Gửi đề nghị kết nối
                  </h2>
                  <p className="text-sm leading-6 text-slate-500">
                    Điền đầy đủ thông tin tuyển dụng để ứng viên có thể phản hồi nhanh và chính xác.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-950"
                  aria-label="Đóng"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Ứng viên nhận liên hệ
                  </p>
                  <p className="mt-3 text-lg font-black tracking-tight text-slate-950">{candidateName}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {candidateEmail ? `Email công khai: ${candidateEmail}` : "Ứng viên chưa công khai email. Hệ thống sẽ gửi thông báo trong tài khoản ứng viên."}
                  </p>
                </section>

                <section className="space-y-4 rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Thông tin nhà tuyển dụng
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldBlock label="Tên người liên hệ" required error={fieldErrors.recruiterName}>
                      <Input
                        value={form.recruiterName}
                        onChange={(event) => updateField("recruiterName", event.target.value)}
                        placeholder="Ví dụ: Trần Minh Hải"
                        aria-invalid={Boolean(fieldErrors.recruiterName)}
                      />
                    </FieldBlock>

                    <FieldBlock label="Email liên hệ" required error={fieldErrors.recruiterEmail}>
                      <Input
                        type="email"
                        value={form.recruiterEmail}
                        onChange={(event) => updateField("recruiterEmail", event.target.value)}
                        placeholder="hr@congty.com"
                        aria-invalid={Boolean(fieldErrors.recruiterEmail)}
                      />
                    </FieldBlock>

                    <FieldBlock label="Số điện thoại" required error={fieldErrors.recruiterPhone}>
                      <Input
                        type="tel"
                        value={form.recruiterPhone}
                        onChange={(event) => updateField("recruiterPhone", event.target.value)}
                        placeholder="0901 234 567"
                        aria-invalid={Boolean(fieldErrors.recruiterPhone)}
                      />
                    </FieldBlock>

                    <FieldBlock label="Tên công ty" required error={fieldErrors.companyName}>
                      <Input
                        value={form.companyName}
                        onChange={(event) => updateField("companyName", event.target.value)}
                        placeholder="Ví dụ: TalentFlow"
                        aria-invalid={Boolean(fieldErrors.companyName)}
                      />
                    </FieldBlock>
                  </div>
                </section>

                <section className="space-y-4 rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Nhu cầu tuyển dụng
                  </p>

                  <FieldBlock label="Vị trí cần tuyển" required error={fieldErrors.hiringPosition}>
                    <Input
                      value={form.hiringPosition}
                      onChange={(event) => updateField("hiringPosition", event.target.value)}
                      placeholder="Ví dụ: Senior Frontend Engineer"
                      aria-invalid={Boolean(fieldErrors.hiringPosition)}
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="Nội dung liên hệ"
                    required
                    error={fieldErrors.message}
                    helper="Nêu rõ mong muốn, lý do liên hệ và cách ứng viên nên phản hồi."
                  >
                    <textarea
                      rows={6}
                      value={form.message}
                      onChange={(event) => updateField("message", event.target.value)}
                      placeholder="Ví dụ: Chúng tôi đánh giá cao kinh nghiệm của bạn và muốn trao đổi về vị trí..."
                      className={cn(
                        "min-h-40 w-full rounded-[18px] border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
                        fieldErrors.message ? "border-rose-300" : "border-slate-200"
                      )}
                    />
                  </FieldBlock>
                </section>

                {error ? (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {success}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    {isSubmitting ? "Đang gửi..." : "Gửi liên hệ"}
                  </Button>
                </div>
              </form>
            </div>
          </section>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <Button
        variant={variant}
        size={compact ? "sm" : "default"}
        className={className}
        onClick={() => {
          setIsOpen(true);
          resetMessages();
        }}
      >
        <span className="material-symbols-outlined text-[18px]">mail</span>
        {label}
      </Button>
      {modal}
    </>
  );
}

function FieldBlock({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      {children}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}
