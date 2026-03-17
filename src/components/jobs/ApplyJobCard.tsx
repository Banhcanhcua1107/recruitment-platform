"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import type { CandidateProfileRecord } from "@/types/candidate-profile";

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
  source: "profile" | "uploaded" | "builder";
  resumeId?: string;
}

type CvMode = "existing" | "upload";

export function ApplyJobCard({
  jobId,
  jobTitle,
  companyName,
  sourceUrl,
  compact = false,
}: ApplyJobCardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [candidateEmailSent, setCandidateEmailSent] = useState(false);
  const [cvOptions, setCvOptions] = useState<CandidateCvOption[]>([]);
  const [cvMode, setCvMode] = useState<CvMode>("existing");
  const [selectedCvPath, setSelectedCvPath] = useState("");
  const [selectedBuilderResumeId, setSelectedBuilderResumeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    introduction: "",
  });

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user));
    })();
  }, []);

  async function loadApplyDefaults() {
    setLoadingData(true);
    setError(null);

    try {
      const [profileResponse, cvResponse] = await Promise.all([
        fetch("/api/candidate/profile", { cache: "no-store" }),
        fetch("/api/candidate/cv-options", { cache: "no-store" }),
      ]);
      const profileResult = await profileResponse.json();
      const cvResult = await cvResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileResult.error || "Unable to load candidate profile.");
      }

      if (!cvResponse.ok) {
        throw new Error(cvResult.error || "Unable to load saved CV options.");
      }

      const profile = profileResult.profile as CandidateProfileRecord;
      const options = Array.isArray(cvResult.items)
        ? (cvResult.items as CandidateCvOption[])
        : [];

      setForm({
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        introduction: profile.introduction || "",
      });
      setCvOptions(options);

      const defaultExisting = options[0];
      if (defaultExisting) {
        if (defaultExisting.source === "builder" && defaultExisting.resumeId) {
          setSelectedBuilderResumeId(defaultExisting.resumeId);
          setSelectedCvPath("");
        } else {
          setSelectedCvPath(defaultExisting.path);
          setSelectedBuilderResumeId("");
        }
        setCvMode("existing");
      } else {
        setCvMode("upload");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load application form."
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function openModal() {
    setIsOpen(true);
    setSuccess(null);
    setCandidateEmailSent(false);
    setFile(null);
    await loadApplyDefaults();
  }

  function validateForm() {
    if (!form.email.trim() && !form.phone.trim()) {
      return "Please enter at least email or phone number";
    }

    if (!form.introduction.trim()) {
      return "Introduction is required";
    }

    if (cvMode === "upload" && !file) {
      return "Please upload or select a CV";
    }

    if (cvMode === "existing" && !selectedCvPath && !selectedBuilderResumeId) {
      return "Please upload or select a CV";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
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
        throw new Error(result.error || "Unable to submit application.");
      }

      setSuccess(
        "Application submitted successfully. Your information has been sent to the recruiter."
      );
      setCandidateEmailSent(Boolean(result.candidateEmailSent));
      setFile(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit application."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="min-w-0 space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-900">Apply with profile</h3>
          <p className="text-sm text-slate-500">
            Open the application modal to review your details, write an introduction, and choose
            the exact CV you want the recruiter to receive.
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Sign in as a candidate to apply for this job.</p>
            <Link href="/login" className="mt-3 inline-flex font-semibold text-primary hover:underline">
              Sign in to continue
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void openModal()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-xl">send</span>
            Apply now
          </button>
        )}

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary ${
              compact ? "h-11" : "h-12"
            }`}
          >
            View original posting
          </a>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative z-[101] max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                  Application Form
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Review before you apply
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-6 py-6">
              <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Job details
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{jobTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">{companyName}</p>
              </div>

              {loadingData ? (
                <div className="h-80 animate-pulse rounded-[28px] bg-slate-100" />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Full Name
                      </label>
                      <Input
                        value={form.fullName}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, fullName: event.target.value }))
                        }
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Email
                      </label>
                      <Input
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="Email address"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Phone
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Introduction
                      </label>
                      <textarea
                        rows={6}
                        value={form.introduction}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            introduction: event.target.value,
                          }))
                        }
                        placeholder="Explain why you are a strong fit for this role."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-4 text-sm font-semibold text-slate-700">CV selection</p>
                    <div className="grid gap-3">
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="radio"
                          checked={cvMode === "existing"}
                          onChange={() => setCvMode("existing")}
                          disabled={cvOptions.length === 0}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Select existing CV</p>
                          <p className="text-xs text-slate-500">
                            Reuse your profile CV, a previous upload, or a CV Builder export.
                          </p>
                        </div>
                      </label>

                      {cvMode === "existing" ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          {cvOptions.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No saved CVs were found. Upload a new CV below.
                            </p>
                          ) : (
                            <select
                              value={selectedBuilderResumeId || selectedCvPath}
                              onChange={(event) => {
                                const option = cvOptions.find(
                                  (item) =>
                                    item.path === event.target.value ||
                                    item.resumeId === event.target.value
                                );
                                if (option?.source === "builder" && option.resumeId) {
                                  setSelectedBuilderResumeId(option.resumeId);
                                  setSelectedCvPath("");
                                } else {
                                  setSelectedCvPath(option?.path || "");
                                  setSelectedBuilderResumeId("");
                                }
                              }}
                              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            >
                              {cvOptions.map((option) => (
                                <option
                                  key={`${option.source}-${option.path || option.resumeId}`}
                                  value={option.resumeId || option.path}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : null}

                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="radio"
                          checked={cvMode === "upload"}
                          onChange={() => setCvMode("upload")}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Upload new CV</p>
                          <p className="text-xs text-slate-500">
                            Send a fresh file just for this application.
                          </p>
                        </div>
                      </label>

                      {cvMode === "upload" ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            className="block w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary"
                          />
                          {file ? (
                            <p className="mt-2 text-xs text-slate-500">Selected: {file.name}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <p>{success}</p>
                      {candidateEmailSent ? (
                        <p className="mt-2 font-semibold">A confirmation email has been sent.</p>
                      ) : null}
                      <Link href="/candidate/applications" className="mt-3 inline-flex font-semibold underline">
                        View my applications
                      </Link>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Submitting application..." : "Submit application"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
