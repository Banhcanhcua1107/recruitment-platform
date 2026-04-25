"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, CircleCheckBig, LoaderCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CandidateProfileRecord } from "@/types/candidate-profile";
import {
  getApplicationCvSourceDescription,
  getApplicationCvSourceLabel,
  localizeApplicationMessage,
  type ApplicationCvSource,
} from "@/lib/application-messages";
import { getCandidateCvOptionsCached } from "@/lib/client/candidate-cv-options";
import { cn } from "@/lib/utils";

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}

interface CandidateCvOption {
  path: string;
  label: string;
  createdAt: string;
  source: ApplicationCvSource;
  resumeId?: string;
}

interface ApplicationDefaults {
  form: {
    fullName: string;
    email: string;
    phone: string;
    introduction: string;
  };
  cvOptions: CandidateCvOption[];
  cvMode: CvMode;
  selectedCvPath: string;
  selectedBuilderResumeId: string;
}

type CvMode = "existing" | "upload";
type FormField = "fullName" | "email" | "phone" | "introduction" | "cv";
type FieldErrors = Partial<Record<FormField, string>>;

let cachedDefaults: ApplicationDefaults | null = null;
let cachedDefaultsPromise: Promise<ApplicationDefaults> | null = null;

function formatCvDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Cập nhật gần đây";
  }

  return `Cập nhật ${new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)}`;
}

function buildDefaults(
  profile: CandidateProfileRecord,
  cvOptions: CandidateCvOption[]
): ApplicationDefaults {
  const defaultOption = cvOptions[0];

  return {
    form: {
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      introduction: profile.introduction || "",
    },
    cvOptions,
    cvMode: defaultOption ? "existing" : "upload",
    selectedCvPath:
      defaultOption && defaultOption.source !== "builder" ? defaultOption.path : "",
    selectedBuilderResumeId:
      defaultOption && defaultOption.source === "builder" && defaultOption.resumeId
        ? defaultOption.resumeId
        : "",
  };
}

async function loadApplicationDefaults() {
  if (cachedDefaults) {
    return cachedDefaults;
  }

  if (cachedDefaultsPromise) {
    return cachedDefaultsPromise;
  }

  cachedDefaultsPromise = (async () => {
    const [profileResponse, cvOptions] = await Promise.all([
      fetch("/api/candidate/profile", { cache: "no-store" }),
      getCandidateCvOptionsCached(),
    ]);
    const profileResult = await profileResponse.json();

    if (!profileResponse.ok) {
      throw new Error(profileResult.error || "Không thể tải thông tin hồ sơ ứng viên.");
    }

    const nextDefaults = buildDefaults(
      profileResult.profile as CandidateProfileRecord,
      cvOptions as CandidateCvOption[]
    );

    cachedDefaults = nextDefaults;
    return nextDefaults;
  })();

  try {
    return await cachedDefaultsPromise;
  } finally {
    cachedDefaultsPromise = null;
  }
}

function hasFieldErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function ApplicationForm({
  jobId,
  jobTitle,
  companyName,
  onClose,
}: ApplicationFormProps) {
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [candidateEmailSent, setCandidateEmailSent] = useState(false);
  const [cvOptions, setCvOptions] = useState<CandidateCvOption[]>([]);
  const [cvMode, setCvMode] = useState<CvMode>("existing");
  const [selectedCvPath, setSelectedCvPath] = useState("");
  const [selectedBuilderResumeId, setSelectedBuilderResumeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    introduction: "",
  });

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const defaults = await loadApplicationDefaults();

        if (!isActive) {
          return;
        }

        setForm(defaults.form);
        setCvOptions(defaults.cvOptions);
        setCvMode(defaults.cvMode);
        setSelectedCvPath(defaults.selectedCvPath);
        setSelectedBuilderResumeId(defaults.selectedBuilderResumeId);
        setFieldErrors({});
        setError(null);
      } catch (loadError) {
        if (isActive) {
          setError(
            localizeApplicationMessage(
              loadError instanceof Error
                ? loadError.message
                : "Không thể tải biểu mẫu ứng tuyển."
            )
          );
        }
      } finally {
        if (isActive) {
          setLoadingData(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  function clearFieldError(field: FormField) {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function handleFieldChange(field: Exclude<FormField, "cv">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    clearFieldError(field);
    setError(null);
  }

  function handleSelectExistingCv(option: CandidateCvOption) {
    if (option.source === "builder" && option.resumeId) {
      setSelectedBuilderResumeId(option.resumeId);
      setSelectedCvPath("");
    } else {
      setSelectedCvPath(option.path);
      setSelectedBuilderResumeId("");
    }

    clearFieldError("cv");
    setError(null);
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Email chưa đúng định dạng.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    }

    if (!form.introduction.trim()) {
      nextErrors.introduction = "Vui lòng giới thiệu bản thân.";
    }

    if (cvMode === "upload" && !file) {
      nextErrors.cv = "Vui lòng tải lên CV mới.";
    }

    if (cvMode === "existing") {
      if (!cvOptions.length) {
        nextErrors.cv = "Bạn chưa có CV lưu sẵn. Hãy tải lên một CV mới.";
      } else if (!selectedCvPath && !selectedBuilderResumeId) {
        nextErrors.cv = "Vui lòng chọn một CV có sẵn.";
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm();
    if (hasFieldErrors(validationErrors)) {
      setFieldErrors(validationErrors);
      setError("Vui lòng kiểm tra lại các trường bắt buộc trước khi gửi.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setEmailWarning(null);
    setCandidateEmailSent(false);

    try {
      const formData = new FormData();
      formData.append("job_id", jobId);
      formData.append("full_name", form.fullName.trim());
      formData.append("email", form.email.trim());
      formData.append("phone", form.phone.trim());
      formData.append("introduction", form.introduction.trim());

      if (cvMode === "upload" && file) {
        formData.append("cv_file", file);
      } else if (cvMode === "existing") {
        const selectedOption = cvOptions.find(
          (option) =>
            option.path === selectedCvPath ||
            (option.resumeId && option.resumeId === selectedBuilderResumeId)
        );

        if (selectedOption?.source === "builder" && selectedOption.resumeId) {
          formData.append("builder_resume_id", selectedOption.resumeId);
        } else if (selectedOption?.path) {
          formData.append("existing_cv_path", selectedOption.path);
        }
      }

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể gửi hồ sơ ứng tuyển lúc này.");
      }

      const hasEmailFailure = Boolean(result.emailError);
      setSuccess(
        hasEmailFailure
          ? "Hồ sơ của bạn đã được ghi nhận thành công trong hệ thống."
          : "Hồ sơ của bạn đã được gửi thành công tới nhà tuyển dụng."
      );
      setCandidateEmailSent(Boolean(result.candidateEmailSent));
      setEmailWarning(
        hasEmailFailure
          ? localizeApplicationMessage(
              result.emailError ||
                "Hệ thống chưa gửi được email xác nhận. Vui lòng thử lại sau."
            )
          : null
      );
      setFieldErrors({});
      setFile(null);
    } catch (submitError) {
      setError(
        localizeApplicationMessage(
          submitError instanceof Error
            ? submitError.message
            : "Không thể gửi hồ sơ ứng tuyển lúc này."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return <ApplicationFormLoading />;
  }

  if (success) {
    return (
      <div className="space-y-5">
        <StatusAlert tone="success" title="Ứng tuyển thành công">
          <p>{success}</p>
          {candidateEmailSent ? (
            <p className="mt-2">Bạn cũng sẽ nhận được email xác nhận từ hệ thống.</p>
          ) : null}
        </StatusAlert>

        {emailWarning ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Email xác nhận chưa gửi được</p>
            <p className="mt-1">{emailWarning}</p>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm leading-6 text-slate-600">
            Bạn có thể theo dõi trạng thái tuyển dụng và xem lại CV đã gửi trong mục đơn ứng tuyển.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/candidate/applications"
              className="inline-flex h-12 items-center justify-center rounded-[18px] bg-primary px-5 text-sm font-black text-white transition-colors hover:bg-primary-hover"
            >
              Xem đơn ứng tuyển
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Tóm tắt vị trí
        </p>
        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{jobTitle}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-600">{companyName}</p>
      </div>

      <FormSection
        eyebrow="Phần 1"
        title="Thông tin cá nhân"
        description="Nhập thông tin liên hệ chính xác để nhà tuyển dụng có thể phản hồi cho bạn."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock
            label="Họ và tên"
            helper="Tên hiển thị khi gửi hồ sơ."
            required
            error={fieldErrors.fullName}
          >
            <Input
              value={form.fullName}
              onChange={(event) => handleFieldChange("fullName", event.target.value)}
              placeholder="Ví dụ: Nguyễn Minh Anh"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
          </FieldBlock>

          <FieldBlock
            label="Email"
            helper="Email bạn thường xuyên sử dụng."
            required
            error={fieldErrors.email}
          >
            <Input
              type="email"
              value={form.email}
              onChange={(event) => handleFieldChange("email", event.target.value)}
              placeholder="tenban@email.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </FieldBlock>

          <div className="sm:col-span-2">
            <FieldBlock
              label="Số điện thoại"
              helper="Dùng để nhà tuyển dụng liên hệ nhanh khi cần."
              required
              error={fieldErrors.phone}
            >
              <Input
                type="tel"
                value={form.phone}
                onChange={(event) => handleFieldChange("phone", event.target.value)}
                placeholder="Ví dụ: 0901 234 567"
                aria-invalid={Boolean(fieldErrors.phone)}
              />
            </FieldBlock>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Phần 2"
        title="Giới thiệu bản thân"
        description="Tóm tắt nhanh kinh nghiệm, thế mạnh và lý do bạn phù hợp với vị trí."
      >
        <FieldBlock
          label="Giới thiệu bản thân"
          helper="Nên viết 3 đến 5 câu, tập trung vào giá trị liên quan đến công việc."
          required
          error={fieldErrors.introduction}
        >
          {fieldErrors.introduction ? (
            <textarea
              rows={6}
              value={form.introduction}
              onChange={(event) => handleFieldChange("introduction", event.target.value)}
              placeholder="Ví dụ: Tôi có 3 năm kinh nghiệm phát triển ứng dụng web với React và Node.js, ưu tiên hiệu năng và trải nghiệm người dùng."
              aria-invalid="true"
              className={cn(
                "min-h-40 w-full rounded-[18px] border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
                fieldErrors.introduction ? "border-rose-300" : "border-slate-200"
              )}
            />
          ) : (
            <textarea
              rows={6}
              value={form.introduction}
              onChange={(event) => handleFieldChange("introduction", event.target.value)}
              placeholder="Ví dụ: Tôi có 3 năm kinh nghiệm phát triển ứng dụng web với React và Node.js, ưu tiên hiệu năng và trải nghiệm người dùng."
              className={cn(
                "min-h-40 w-full rounded-[18px] border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
                fieldErrors.introduction ? "border-rose-300" : "border-slate-200"
              )}
            />
          )}
        </FieldBlock>
      </FormSection>

      <FormSection
        eyebrow="Phần 3"
        title="Chọn CV"
        description="Chọn CV có sẵn trong tài khoản hoặc tải lên một bản mới dành riêng cho lần ứng tuyển này."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setCvMode("existing");
                clearFieldError("cv");
                setError(null);
              }}
              disabled={!cvOptions.length}
              className={cn(
                "rounded-[20px] border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                cvMode === "existing"
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <p className="text-sm font-semibold text-slate-950">Chọn CV có sẵn</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dùng CV đã lưu trong hồ sơ, CV Builder hoặc lần tải trước.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setCvMode("upload");
                clearFieldError("cv");
                setError(null);
              }}
              className={cn(
                "rounded-[20px] border px-4 py-4 text-left transition-colors",
                cvMode === "upload"
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <p className="text-sm font-semibold text-slate-950">Tải lên CV mới</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Phù hợp khi bạn muốn chỉnh CV riêng cho vị trí này.
              </p>
            </button>
          </div>

          {cvMode === "existing" ? (
            cvOptions.length ? (
              <div className="space-y-3">
                {cvOptions.map((option) => {
                  const isSelected =
                    (option.source === "builder" &&
                      option.resumeId === selectedBuilderResumeId) ||
                    (option.source !== "builder" && option.path === selectedCvPath);

                  return (
                    <button
                      key={`${option.source}-${option.resumeId || option.path}`}
                      type="button"
                      onClick={() => handleSelectExistingCv(option)}
                      className={cn(
                        "w-full rounded-[22px] border px-4 py-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                              {getApplicationCvSourceLabel(option.source)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatCvDate(option.createdAt)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {getApplicationCvSourceDescription(option.source)}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {isSelected ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : null}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5">
                <p className="text-sm font-semibold text-slate-900">
                  Hiện chưa có CV lưu sẵn trong tài khoản.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hãy chuyển sang tải lên CV mới để hoàn tất hồ sơ ứng tuyển.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5">
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Tải lên CV từ thiết bị</span>
                <span className="mt-2 block text-sm leading-6 text-slate-500">
                  Chấp nhận PDF, DOC hoặc DOCX. Dung lượng tối đa 10MB.
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    clearFieldError("cv");
                    setError(null);
                  }}
                  className="mt-4 block w-full rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary"
                />
              </label>

              {file ? (
                <div className="mt-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Tệp đã chọn
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{file.name}</p>
                </div>
              ) : null}
            </div>
          )}

          {fieldErrors.cv ? <FieldError>{fieldErrors.cv}</FieldError> : null}
        </div>
      </FormSection>

      {error ? (
        <StatusAlert tone="error" title="Chưa thể gửi hồ sơ">
          <p>{error}</p>
        </StatusAlert>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 text-sm font-black text-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-5" aria-hidden="true" />
        )}
        {submitting ? "Đang gửi hồ sơ..." : "Ứng tuyển ngay"}
      </button>
    </form>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
          {eyebrow}
        </p>
        <h3 className="text-xl font-black tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldBlock({
  label,
  required = false,
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
    <label className="block space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {required ? <span className="text-xs font-semibold text-rose-500">Bắt buộc</span> : null}
      </div>
      {children}
      {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-rose-600">{children}</p>;
}

function StatusAlert({
  tone,
  title,
  children,
}: {
  tone: "success" | "error";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}
        >
          {tone === "success" ? (
            <CircleCheckBig className="size-5" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ApplicationFormLoading() {
  return (
    <div className="space-y-5">
      <div className="animate-pulse rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-7 w-3/4 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-200" />
      </div>

      <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5">
        <div className="h-3 w-20 rounded-full bg-slate-200" />
        <div className="mt-4 h-6 w-56 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-11 rounded-[18px] bg-slate-100" />
          <div className="h-11 rounded-[18px] bg-slate-100" />
          <div className="h-11 rounded-[18px] bg-slate-100 sm:col-span-2" />
        </div>
      </div>

      <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5">
        <div className="h-3 w-20 rounded-full bg-slate-200" />
        <div className="mt-4 h-6 w-48 rounded-full bg-slate-200" />
        <div className="mt-4 h-36 rounded-[18px] bg-slate-100" />
      </div>
    </div>
  );
}
