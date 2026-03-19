"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateApplicationStatusAction } from "@/app/hr/actions";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  EmployerCandidateApplicationDetail,
  RecruitmentCandidate,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

const PIPELINE_OPTIONS: RecruitmentPipelineStatus[] = [
  "applied",
  "reviewing",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const PIPELINE_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Mới",
  applied: "Đã nộp",
  reviewing: "Đang xử lý",
  interview: "Phỏng vấn",
  offer: "Đề nghị",
  hired: "Đã tuyển",
  rejected: "Từ chối",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function requestCandidateDetail(
  applicationId: string,
  signal?: AbortSignal
): Promise<EmployerCandidateApplicationDetail> {
  const response = await fetch(`/api/recruiter/applications/${applicationId}`, {
    cache: "no-store",
    signal,
  });
  const result = (await response.json()) as {
    detail?: EmployerCandidateApplicationDetail;
    error?: string;
  };

  if (!response.ok || !result.detail) {
    throw new Error(result.error || "Không thể tải chi tiết ứng tuyển.");
  }

  return result.detail;
}

async function markCandidateViewed(applicationId: string) {
  await fetch(`/api/recruiter/applications/${applicationId}/view`, {
    method: "POST",
  });
}

function DetailSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-4 animate-pulse rounded-full bg-slate-200", className)} />;
}

interface CandidateDetailModalProps {
  isOpen: boolean;
  candidate: RecruitmentCandidate | null;
  onClose: () => void;
  onStatusUpdated: (
    applicationId: string,
    status: RecruitmentPipelineStatus
  ) => void;
}

export function CandidateDetailModal({
  isOpen,
  candidate,
  onClose,
  onStatusUpdated,
}: CandidateDetailModalProps) {
  const router = useRouter();
  const viewedApplicationsRef = useRef<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const [detail, setDetail] = useState<EmployerCandidateApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<RecruitmentPipelineStatus>("applied");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !candidate) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [candidate, isOpen, onClose]);

  useEffect(() => {
    if (!candidate || !isOpen) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    setActionError(null);
    setStatusDraft(candidate.status);

    void (async () => {
      try {
        const nextDetail = await requestCandidateDetail(
          candidate.applicationId,
          controller.signal
        );

        if (!active) {
          return;
        }

        setDetail(nextDetail);
        setStatusDraft(nextDetail.status);
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setDetail(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải chi tiết ứng tuyển."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [candidate, isOpen, reloadNonce]);

  useEffect(() => {
    if (!candidate || !isOpen) {
      return;
    }

    if (viewedApplicationsRef.current.has(candidate.applicationId)) {
      return;
    }

    viewedApplicationsRef.current.add(candidate.applicationId);
    void markCandidateViewed(candidate.applicationId).catch(() => undefined);
  }, [candidate, isOpen]);

  if (!isMounted || !candidate) {
    return null;
  }

  const detailCandidate = detail ?? candidate;
  const contactHref = detail?.email
    ? `mailto:${detail.email}`
    : detail?.phone
      ? `tel:${detail.phone}`
      : candidate.email
        ? `mailto:${candidate.email}`
        : candidate.phone
          ? `tel:${candidate.phone}`
          : null;
  const resumeUrl = detail?.resumeUrl ?? candidate.resumeUrl;

  const handleStatusSubmit = () => {
    if (!candidate) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("applicationId", candidate.applicationId);
        formData.set("status", statusDraft);

        await updateApplicationStatusAction(formData);
        onStatusUpdated(candidate.applicationId, statusDraft);

        const nextDetail = await requestCandidateDetail(candidate.applicationId);
        setDetail(nextDetail);
        setStatusDraft(nextDetail.status);
        router.refresh();
      } catch (submitError) {
        setActionError(
          submitError instanceof Error
            ? submitError.message
            : "Không thể cập nhật trạng thái ứng tuyển."
        );
      }
    });
  };

  const content = (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[120]">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55"
            aria-label="Đóng chi tiết ứng viên"
          />

          <motion.aside
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[760px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[0_30px_80px_-32px_rgba(15,23,42,0.42)]"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                    Snapshot ứng tuyển
                  </p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        {detailCandidate.fullName}
                      </h2>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-slate-600">
                        {`ID: ${detailCandidate.candidateCode}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <StatusBadge status={detailCandidate.status} />
                      <span>{detail?.job.title || candidate.appliedPosition}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                  aria-label="Đóng"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {loading ? (
                <div className="space-y-8">
                  <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                    <div className="space-y-3">
                      <SkeletonLine className="w-24" />
                      <SkeletonLine className="w-48" />
                      <SkeletonLine className="w-40" />
                    </div>
                    <div className="space-y-3">
                      <SkeletonLine className="w-24" />
                      <SkeletonLine className="w-52" />
                      <SkeletonLine className="w-36" />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[28px] border border-slate-200 p-5">
                    <SkeletonLine className="w-32" />
                    <SkeletonLine className="w-full" />
                    <SkeletonLine className="w-[92%]" />
                    <SkeletonLine className="w-[85%]" />
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-semibold text-rose-700">Không thể tải chi tiết.</p>
                  <p className="mt-2 text-sm leading-6 text-rose-600">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setReloadNonce((current) => current + 1)}
                  >
                    Tải lại chi tiết
                  </Button>
                </div>
              ) : detail ? (
                <div className="space-y-8">
                  <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                    <DetailSection
                      label="Email"
                      value={detail.email || "Chưa có email trong snapshot ứng tuyển."}
                    />
                    <DetailSection
                      label="Số điện thoại"
                      value={detail.phone || "Chưa có số điện thoại trong snapshot ứng tuyển."}
                    />
                    <DetailSection
                      label="Thời gian nộp"
                      value={formatDateTime(detail.appliedAt)}
                    />
                    <DetailSection
                      label="CV ứng tuyển"
                      value={
                        detail.resumeUrl
                          ? "Đã có file CV đi kèm snapshot ứng tuyển."
                          : "Chưa có file CV trong snapshot ứng tuyển."
                      }
                    />
                  </section>

                  <section className="space-y-5 rounded-[28px] border border-slate-200 p-5">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Job liên quan
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold tracking-tight text-slate-950">
                          {detail.job.title}
                        </p>
                        <Link
                          href={detail.job.url}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary-hover"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                          Mở trang job
                        </Link>
                      </div>
                      {detail.job.companyName ? (
                        <p className="text-sm text-slate-500">{detail.job.companyName}</p>
                      ) : null}
                    </div>

                    <DetailSection
                      label="Giới thiệu"
                      value={
                        detail.introduction || "Ứng viên chưa để lại phần giới thiệu cho đơn này."
                      }
                    />
                  </section>

                  <section className="space-y-5 rounded-[28px] border border-slate-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Các job đã ứng tuyển
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Hiển thị các đơn ứng tuyển của cùng ứng viên trong pipeline tuyển dụng của bạn.
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {detail.relatedApplications.length} đơn
                      </span>
                    </div>

                    {detail.relatedApplications.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        Chưa có đơn ứng tuyển nào khác trong pipeline của bạn.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.relatedApplications.map((application) => (
                          <div
                            key={application.applicationId}
                            className={cn(
                              "rounded-[24px] border border-slate-200 p-4 transition",
                              application.isCurrent
                                ? "bg-slate-950 text-white"
                                : "bg-white text-slate-900"
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold tracking-tight">
                                    {application.jobTitle}
                                  </p>
                                  {application.isCurrent ? (
                                    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-white/80">
                                      Đơn hiện tại
                                    </span>
                                  ) : null}
                                </div>
                                <div
                                  className={cn(
                                    "flex flex-wrap items-center gap-2 text-xs",
                                    application.isCurrent ? "text-white/70" : "text-slate-500"
                                  )}
                                >
                                  <span>{formatDateTime(application.appliedAt)}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={application.status} />
                                <Link
                                  href={application.jobUrl}
                                  className={cn(
                                    "inline-flex items-center gap-1 text-sm font-medium transition",
                                    application.isCurrent
                                      ? "text-white hover:text-white/80"
                                      : "text-primary hover:text-primary-hover"
                                  )}
                                >
                                  <span className="material-symbols-outlined text-base">
                                    open_in_new
                                  </span>
                                  Mở job
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              {actionError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants("outline", "sm")}
                    >
                      Tải CV
                    </a>
                  ) : (
                    <span
                      className={cn(
                        buttonVariants("outline", "sm"),
                        "pointer-events-none opacity-50"
                      )}
                    >
                      Tải CV
                    </span>
                  )}

                  {contactHref ? (
                    <a href={contactHref} className={buttonVariants("outline", "sm")}>
                      Liên hệ
                    </a>
                  ) : (
                    <span
                      className={cn(
                        buttonVariants("outline", "sm"),
                        "pointer-events-none opacity-50"
                      )}
                    >
                      Liên hệ
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select
                    value={statusDraft}
                    onChange={(event) =>
                      setStatusDraft(event.target.value as RecruitmentPipelineStatus)
                    }
                    className="w-full min-w-[190px] sm:w-[220px]"
                    disabled={loading || Boolean(error) || isSubmitting}
                  >
                    {PIPELINE_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {PIPELINE_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    onClick={handleStatusSubmit}
                    disabled={loading || Boolean(error) || isSubmitting}
                  >
                    {isSubmitting ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
