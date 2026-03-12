"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface ApplyJobCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  sourceUrl?: string | null;
  compact?: boolean;
}

interface CandidateCvOption {
  path: string;
  label: string;
  createdAt: string;
  source: "uploaded" | "builder";
  resumeId?: string;
}

type CvMode = "upload" | "existing" | "builder";

export function ApplyJobCard({
  jobId,
  jobTitle,
  companyName,
  sourceUrl,
  compact = false,
}: ApplyJobCardProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [cvMode, setCvMode] = useState<CvMode>("upload");
  const [cvOptions, setCvOptions] = useState<CandidateCvOption[]>([]);
  const [selectedCvPath, setSelectedCvPath] = useState("");
  const [selectedBuilderResumeId, setSelectedBuilderResumeId] = useState("");
  const [loadingCvOptions, setLoadingCvOptions] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const authenticated = Boolean(user);
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        return;
      }

      setLoadingCvOptions(true);
      try {
        const response = await fetch("/api/candidate/cv-options", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Không thể tải danh sách CV.");
        }

        const items = Array.isArray(result.items) ? (result.items as CandidateCvOption[]) : [];
        setCvOptions(items);

        const uploadedItems = items.filter((item) => item.source === "uploaded");
        const builderItems = items.filter((item) => item.source === "builder");

        if (uploadedItems.length > 0) {
          setSelectedCvPath(uploadedItems[0].path);
        }
        if (builderItems.length > 0 && builderItems[0].resumeId) {
          setSelectedBuilderResumeId(builderItems[0].resumeId);
        }
      } catch {
        setCvOptions([]);
      } finally {
        setLoadingCvOptions(false);
      }
    })();
  }, []);

  const uploadedCvOptions = useMemo(
    () => cvOptions.filter((item) => item.source === "uploaded"),
    [cvOptions]
  );
  const builderCvOptions = useMemo(
    () => cvOptions.filter((item) => item.source === "builder"),
    [cvOptions]
  );
  const canUseExistingCv = uploadedCvOptions.length > 0;
  const canUseBuilderCv = builderCvOptions.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cvMode === "upload" && !file) {
      setError("Vui lòng tải lên CV trước khi nộp đơn.");
      return;
    }

    if (cvMode === "existing" && !selectedCvPath) {
      setError("Vui lòng chọn một CV đã upload trước đó.");
      return;
    }

    if (cvMode === "builder" && !selectedBuilderResumeId) {
      setError("Vui lòng chọn một CV từ CV Builder.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("job_id", jobId);
      formData.append("cover_letter", coverLetter);

      if (cvMode === "upload" && file) {
        formData.append("cv_file", file);
      }

      if (cvMode === "existing" && selectedCvPath) {
        formData.append("existing_cv_path", selectedCvPath);
      }

      if (cvMode === "builder" && selectedBuilderResumeId) {
        formData.append("builder_resume_id", selectedBuilderResumeId);
      }

      const response = await fetch("/api/apply-job", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể nộp đơn.");
      }

      setSuccess(`Đã gửi hồ sơ cho vị trí ${jobTitle} tại ${companyName}.`);
      setFile(null);
      setCoverLetter("");

      const input = document.getElementById(`cv-upload-${jobId}`) as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Không thể nộp đơn vào lúc này."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900">Ứng tuyển nhanh</h3>
        <p className="text-sm text-slate-500">
          Tải CV hoặc dùng CV có sẵn để nộp hồ sơ trực tiếp trong hệ thống ATS.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Bạn cần đăng nhập tài khoản ứng viên để nộp hồ sơ.</p>
          <Link href="/login" className="mt-3 inline-flex font-semibold text-primary hover:underline">
            Đăng nhập để ứng tuyển
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Nguồn CV</label>
            <div className="grid gap-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`cv-mode-${jobId}`}
                  checked={cvMode === "upload"}
                  onChange={() => setCvMode("upload")}
                />
                Tải CV mới
              </label>

              <label
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  canUseExistingCv
                    ? "border-slate-200 text-slate-700"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name={`cv-mode-${jobId}`}
                  checked={cvMode === "existing"}
                  onChange={() => setCvMode("existing")}
                  disabled={!canUseExistingCv}
                />
                Dùng lại CV đã upload
              </label>

              <label
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  canUseBuilderCv
                    ? "border-slate-200 text-slate-700"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name={`cv-mode-${jobId}`}
                  checked={cvMode === "builder"}
                  onChange={() => setCvMode("builder")}
                  disabled={!canUseBuilderCv}
                />
                Dùng CV từ CV Builder
              </label>
            </div>
          </div>

          <div className={compact ? "min-h-27.5" : "min-h-42.5"}>
            {cvMode === "upload" ? (
              <div className="space-y-2">
                <label htmlFor={`cv-upload-${jobId}`} className="text-sm font-semibold text-slate-700">
                  CV của bạn
                </label>
                <input
                  id={`cv-upload-${jobId}`}
                  type="file"
                  title="Tải CV của bạn"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary"
                />
                {file ? <p className="break-all text-xs text-slate-500">Đã chọn: {file.name}</p> : null}
              </div>
            ) : cvMode === "existing" ? (
              <div className="min-w-0 space-y-2">
                <label htmlFor={`existing-cv-${jobId}`} className="text-sm font-semibold text-slate-700">
                  CV đã upload
                </label>
                <select
                  id={`existing-cv-${jobId}`}
                  title="Chọn CV đã upload"
                  value={selectedCvPath}
                  onChange={(event) => setSelectedCvPath(event.target.value)}
                  disabled={!canUseExistingCv || loadingCvOptions}
                  className="block w-full max-w-full truncate rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {canUseExistingCv ? (
                    uploadedCvOptions.map((option) => (
                      <option key={option.path} value={option.path}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {loadingCvOptions ? "Đang tải danh sách CV..." : "Bạn chưa có CV đã upload"}
                    </option>
                  )}
                </select>
                <p className="text-xs text-slate-500">
                  Dùng lại CV đã từng nộp trong hệ thống, không cần tải file lên lại.
                </p>
              </div>
            ) : (
              <div className="min-w-0 space-y-2">
                <label htmlFor={`builder-cv-${jobId}`} className="text-sm font-semibold text-slate-700">
                  CV từ CV Builder
                </label>
                <select
                  id={`builder-cv-${jobId}`}
                  title="Chọn CV từ CV Builder"
                  value={selectedBuilderResumeId}
                  onChange={(event) => setSelectedBuilderResumeId(event.target.value)}
                  disabled={!canUseBuilderCv || loadingCvOptions}
                  className="block w-full max-w-full truncate rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {canUseBuilderCv ? (
                    builderCvOptions.map((option) => (
                      <option key={option.resumeId} value={option.resumeId}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {loadingCvOptions ? "Đang tải danh sách CV..." : "Bạn chưa có CV trong CV Builder"}
                    </option>
                  )}
                </select>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ xuất CV Builder thành PDF, lưu vào storage, rồi dùng file đó cho đơn ứng tuyển này.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Thư giới thiệu</label>
            <textarea
              rows={compact ? 4 : 6}
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              placeholder="Giới thiệu ngắn gọn vì sao bạn phù hợp với vị trí này."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
              <Link href="/candidate/applications" className="ml-2 font-semibold underline">
                Xem đơn ứng tuyển
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl">send</span>
            {submitting ? "Đang gửi hồ sơ..." : "Nộp hồ sơ"}
          </button>

          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
            >
              Mở nguồn đăng tuyển gốc
            </a>
          ) : null}
        </form>
      )}
    </div>
  );
}
