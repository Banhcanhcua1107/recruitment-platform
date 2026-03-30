"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type {
  EmployerCandidateApplicationDetail,
  RecruitmentCandidate,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

interface ApplicationDetailModalProps {
  isOpen: boolean;
  application: RecruitmentCandidate | null;
  onClose: () => void;
  onStatusUpdated?: (
    applicationId: string,
    status: RecruitmentPipelineStatus
  ) => void;
}

const STATUS_OPTIONS: Array<{
  value: RecruitmentPipelineStatus;
  label: string;
}> = [
  { value: "applied", label: "Đã nộp" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "interview", label: "Phỏng vấn" },
  { value: "hired", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
];

const TIMELINE_ORDER: RecruitmentPipelineStatus[] = [
  "applied",
  "reviewing",
  "interview",
  "hired",
  "rejected",
];

const TIMELINE_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Mới",
  applied: "Đã nộp",
  reviewing: "Đang xem xét",
  interview: "Phỏng vấn",
  offer: "Đề nghị",
  hired: "Kết quả",
  rejected: "Kết quả",
};

function getCvFileName(url: string) {
  try {
    const normalized = decodeURIComponent(url.split("?")[0] || "");
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] || "resume.pdf";
  } catch {
    return "resume.pdf";
  }
}

function getCvDisplayName(
  resumeFileName: string | null | undefined,
  resumeUrl: string | null | undefined
) {
  const normalizedName = resumeFileName?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  if (!resumeUrl) {
    return "CV ứng tuyển";
  }

  const fallbackName = getCvFileName(resumeUrl);
  const genericName = fallbackName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "");

  if (["cv", "resume", "file", "document", "download"].includes(genericName)) {
    return "CV ứng tuyển";
  }

  return fallbackName;
}

function mapIncomingStatus(status: string): RecruitmentPipelineStatus {
  switch (status) {
    case "accepted":
      return "hired";
    case "pending":
    case "new":
      return "applied";
    case "reviewing":
    case "interview":
    case "hired":
    case "rejected":
      return status;
    default:
      return "applied";
  }
}

async function requestApplicationDetail(
  applicationId: string,
  signal?: AbortSignal
): Promise<EmployerCandidateApplicationDetail> {
  const response = await fetch(`/api/applications/${applicationId}`, {
    cache: "no-store",
    signal,
  });

  const result = (await response.json()) as {
    detail?: EmployerCandidateApplicationDetail;
    error?: string;
  };

  if (!response.ok || !result.detail) {
    throw new Error(result.error || "Không thể tải chi tiết đơn ứng tuyển.");
  }

  return result.detail;
}

async function updateApplicationStatus(
  applicationId: string,
  status: RecruitmentPipelineStatus
) {
  const response = await fetch(`/api/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const result = (await response.json()) as {
    status?: RecruitmentPipelineStatus;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error || "Không thể cập nhật trạng thái đơn ứng tuyển.");
  }

  return mapIncomingStatus(result.status || status);
}

export function ApplicationDetailModal({
  isOpen,
  application,
  onClose,
  onStatusUpdated,
}: ApplicationDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<EmployerCandidateApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<RecruitmentPipelineStatus>("applied");
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !application) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    setActionError(null);

    void (async () => {
      try {
        const nextDetail = await requestApplicationDetail(
          application.applicationId,
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
            : "Không thể tải chi tiết đơn ứng tuyển."
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
  }, [application, isOpen]);

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, onClose]);

  if (!mounted || !application) {
    return null;
  }

  const candidateName = detail?.fullName || application.fullName;
  const jobTitle = detail?.job.title || application.appliedPosition;
  const candidateEmail = detail?.email || application.email;
  const candidatePhone = detail?.phone || application.phone;
  const candidateExperience = detail?.candidateExperience || "Chưa có mô tả kinh nghiệm";
  const companyName = detail?.job.companyName || "Chưa có tên công ty";
  const location = detail?.job.location || "Chưa có địa điểm";
  const candidateMessage =
    detail?.coverLetter ||
    detail?.introduction ||
    application.coverLetter ||
    application.introduction ||
    "Ứng viên không gửi thêm nội dung.";
  const resumeUrl = detail?.resumeUrl || application.resumeUrl;
  const resumeFileName = getCvDisplayName(detail?.resumeFileName, resumeUrl);
  const currentStatus = detail?.status || application.status;
  const timelineIndex = TIMELINE_ORDER.indexOf(currentStatus);

  const timeline = [
    {
      key: "applied" as RecruitmentPipelineStatus,
      label: TIMELINE_LABELS.applied,
    },
    {
      key: "reviewing" as RecruitmentPipelineStatus,
      label: TIMELINE_LABELS.reviewing,
    },
    {
      key: "interview" as RecruitmentPipelineStatus,
      label: TIMELINE_LABELS.interview,
    },
    {
      key:
        currentStatus === "rejected"
          ? ("rejected" as RecruitmentPipelineStatus)
          : ("hired" as RecruitmentPipelineStatus),
      label: TIMELINE_LABELS[currentStatus === "rejected" ? "rejected" : "hired"],
    },
  ];

  const handleStatusSubmit = () => {
    if (!application) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      try {
        const nextStatus = await updateApplicationStatus(
          application.applicationId,
          statusDraft
        );

        setDetail((current) =>
          current
            ? {
                ...current,
                status: nextStatus,
              }
            : current
        );

        onStatusUpdated?.(application.applicationId, nextStatus);
      } catch (submitError) {
        setActionError(
          submitError instanceof Error
            ? submitError.message
            : "Không thể cập nhật trạng thái đơn ứng tuyển."
        );
      }
    });
  };

  const content = (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-120 flex justify-end">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Đóng chi tiết đơn ứng tuyển"
            className="absolute inset-0 bg-black/40"
          />

          <motion.aside
            initial={{ x: 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 36, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative flex h-full w-[50%] min-w-125 max-w-200 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl"
          >
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-6 backdrop-blur">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                      Chi tiết đơn ứng tuyển
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {candidateName}
                    </h2>
                    <p className="text-sm font-medium text-slate-600">{jobTitle}</p>
                    <StatusBadge status={currentStatus} />
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  {timeline.map((step, index) => {
                    const isCurrent = step.key === currentStatus;
                    const isCompleted = timelineIndex >= index && currentStatus !== "rejected";
                    const isRejectedFlow = currentStatus === "rejected" && step.key === "rejected";

                    return (
                      <div
                        key={`${step.key}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {step.label}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${
                              isRejectedFlow
                                ? "bg-rose-500"
                                : isCurrent || isCompleted
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              isRejectedFlow
                                ? "text-rose-700"
                                : isCurrent || isCompleted
                                  ? "text-slate-800"
                                  : "text-slate-500"
                            }`}
                          >
                            {isCurrent ? "Hiện tại" : isCompleted ? "Đã qua" : "Chờ"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {error}
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Thông tin ứng viên</h3>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Họ tên:</span> {candidateName}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Email:</span>{" "}
                          {candidateEmail || "Chưa có email"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Số điện thoại:</span>{" "}
                          {candidatePhone || "Chưa có số điện thoại"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Kinh nghiệm:</span>{" "}
                          <span className="wrap-anywhere">
                            {candidateExperience}
                          </span>
                        </p>
                      </div>
                    </section>

                    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Tin nhắn ứng viên</h3>
                      <p className="overflow-x-hidden whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-slate-600">
                        {candidateMessage}
                      </p>
                    </section>

                    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Tệp CV</h3>
                      {resumeUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(resumeUrl, "_blank", "noopener,noreferrer")}
                          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            description
                          </span>
                          <span className="font-medium text-primary underline underline-offset-4">
                            {resumeFileName}
                          </span>
                        </button>
                      ) : (
                        <p className="text-sm text-slate-500">Ứng viên chưa đính kèm CV cho đơn này.</p>
                      )}
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Thông tin công việc ứng tuyển</h3>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Vị trí:</span> {jobTitle}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Công ty:</span> {companyName}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Địa điểm:</span> {location}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Mô tả công việc</h3>
                      <div className="max-h-50 overflow-y-auto whitespace-pre-wrap wrap-anywhere pr-1 text-sm text-slate-600">
                        {detail?.job.description || "Chưa có mô tả công việc."}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>

            <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              {actionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Trạng thái ứng tuyển
                  </p>
                  <p className="text-sm text-slate-500">
                    Chọn trạng thái và cập nhật để đồng bộ ATS.
                  </p>
                </div>

                <Select
                  value={statusDraft}
                  onChange={(event) =>
                    setStatusDraft(event.target.value as RecruitmentPipelineStatus)
                  }
                  disabled={loading || Boolean(error) || isSubmitting}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
            </footer>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
