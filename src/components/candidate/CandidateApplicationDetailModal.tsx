"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types/dashboard";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";

interface CandidateApplicationEvent {
  id: string;
  event: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface CandidateApplicationDetail {
  id: string;
  status: RecruitmentPipelineStatus;
  rawStatus: string;
  createdAt: string;
  updatedAt: string;
  appliedAt: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  introduction: string | null;
  coverLetter: string | null;
  cvUrl: string | null;
  job: {
    id: string;
    title: string;
    companyName: string;
    logoUrl: string | null;
    description: string | null;
    salary: string | null;
    location: string | null;
    employmentType: string | null;
    level: string | null;
    fullAddress: string | null;
  };
  events: CandidateApplicationEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  candidate_applied: "Đã nộp đơn",
  hr_reviewed: "Nhà tuyển dụng đang xem xét",
  interview_scheduled: "Đã chuyển sang phỏng vấn",
  offer_sent: "Nhận đề nghị",
  candidate_hired: "Đã tuyển",
  candidate_rejected: "Từ chối",
};

const STATUS_RANK: Record<RecruitmentPipelineStatus, number> = {
  new: 1,
  applied: 1,
  reviewing: 2,
  interview: 3,
  offer: 4,
  hired: 4,
  rejected: 4,
};

function normalizePipelineStatus(status: ApplicationStatus | string): RecruitmentPipelineStatus {
  switch (status) {
    case "pending":
    case "new":
    case "applied":
      return "applied";
    case "viewed":
    case "reviewing":
      return "reviewing";
    case "interviewing":
    case "interview":
      return "interview";
    case "offered":
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "applied";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function getFinalStepLabel(status: RecruitmentPipelineStatus) {
  if (status === "offer") {
    return "Đề nghị";
  }

  return "Kết quả";
}

async function requestCandidateApplicationDetail(
  applicationId: string,
  signal?: AbortSignal
): Promise<CandidateApplicationDetail> {
  const response = await fetch(
    `/api/candidate/applications/${encodeURIComponent(applicationId)}`,
    {
      cache: "no-store",
      signal,
    }
  );

  const result = (await response.json()) as {
    detail?: CandidateApplicationDetail;
    error?: string;
  };

  if (!response.ok || !result.detail) {
    throw new Error(result.error || "Không thể tải chi tiết đơn ứng tuyển.");
  }

  return {
    ...result.detail,
    status: normalizePipelineStatus(result.detail.status),
  };
}

interface CandidateApplicationDetailModalProps {
  isOpen: boolean;
  application: Application | null;
  onClose: () => void;
}

export function CandidateApplicationDetailModal({
  isOpen,
  application,
  onClose,
}: CandidateApplicationDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<CandidateApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setDetail(null);

    void (async () => {
      try {
        const nextDetail = await requestCandidateApplicationDetail(
          application.id,
          controller.signal
        );

        if (!active) {
          return;
        }

        setDetail(nextDetail);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const fallbackStatus = application ? normalizePipelineStatus(application.status) : "applied";
  const currentStatus = detail?.status ?? fallbackStatus;
  const currentRank = STATUS_RANK[currentStatus];

  const timelineSteps = useMemo(
    () => [
      { key: "applied", label: "Đã nộp", rank: 1 },
      { key: "reviewing", label: "Đang xem xét", rank: 2 },
      { key: "interview", label: "Phỏng vấn", rank: 3 },
      {
        key: currentStatus === "rejected" ? "rejected" : currentStatus === "offer" ? "offer" : "hired",
        label: getFinalStepLabel(currentStatus),
        rank: 4,
      },
    ],
    [currentStatus]
  );

  if (!mounted || !application) {
    return null;
  }

  const candidateName = detail?.fullName || "Ứng viên";
  const candidateEmail = detail?.email || "Chưa có email";
  const candidatePhone = detail?.phone || "Chưa có số điện thoại";
  const candidateIntro =
    detail?.introduction ||
    detail?.coverLetter ||
    "Không có lời nhắn bổ sung trong đơn ứng tuyển này.";

  const jobTitle = detail?.job.title || application.job.title;
  const companyName = detail?.job.companyName || application.job.company_name;
  const location = detail?.job.fullAddress || detail?.job.location || application.job.location || "Chưa có địa điểm";
  const jobDescription =
    detail?.job.description || "Chưa có mô tả công việc từ nhà tuyển dụng.";
  const cvUrl = detail?.cvUrl || `/api/applications/${application.id}/cv`;

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
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng chi tiết đơn ứng tuyển"
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
                  {timelineSteps.map((step, index) => {
                    const isCurrent = step.rank === currentRank;
                    const isCompleted = step.rank < currentRank;
                    const isRejectedFlow = currentStatus === "rejected" && step.rank === currentRank;

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
                            className={cn(
                              "size-2.5 rounded-full",
                              isRejectedFlow
                                ? "bg-rose-500"
                                : isCurrent || isCompleted
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isRejectedFlow
                                ? "text-rose-700"
                                : isCurrent || isCompleted
                                  ? "text-slate-800"
                                  : "text-slate-500"
                            )}
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
                <div className="space-y-4">
                  <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">Thông tin hồ sơ đã gửi</h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">Họ tên:</span> {candidateName}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Email:</span> {candidateEmail}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Số điện thoại:</span> {candidatePhone}
                      </p>
                      <p className="overflow-x-hidden whitespace-pre-wrap wrap-anywhere">
                        <span className="font-semibold text-slate-900">Giới thiệu:</span> {" "}
                        {candidateIntro}
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">Tệp CV đã nộp</h3>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants("default", "sm"), "w-full")}
                    >
                      <span className="material-symbols-outlined text-[18px]">description</span>
                      Xem CV
                    </a>
                  </section>

                  <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">Thông tin công việc đã ứng tuyển</h3>
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
                      <p>
                        <span className="font-semibold text-slate-900">Ngày nộp:</span>{" "}
                        {formatDateTime(detail?.appliedAt || application.created_at)}
                      </p>
                      {detail?.job.salary ? (
                        <p>
                          <span className="font-semibold text-slate-900">Mức lương:</span>{" "}
                          {detail.job.salary}
                        </p>
                      ) : null}
                      {detail?.job.employmentType ? (
                        <p>
                          <span className="font-semibold text-slate-900">Hình thức:</span>{" "}
                          {detail.job.employmentType}
                        </p>
                      ) : null}
                      {detail?.job.level ? (
                        <p>
                          <span className="font-semibold text-slate-900">Cấp bậc:</span>{" "}
                          {detail.job.level}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-semibold text-slate-900">Nội dung công việc</p>
                      <p className="overflow-x-hidden whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-slate-600">
                        {jobDescription}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <h4 className="text-sm font-semibold text-slate-900">Lịch sử trạng thái</h4>
                      {detail?.events.length ? (
                        <div className="space-y-2">
                          {detail.events.map((event) => (
                            <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {EVENT_LABELS[event.event] || event.event}
                              </p>
                              <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Chưa có lịch sử cập nhật trạng thái.</p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <p className="text-sm text-slate-500">
                  Chế độ xem chỉ đọc. Bạn chỉ theo dõi thông tin đã gửi cho đơn ứng tuyển này.
                </p>

                <a
                  href={`/jobs/${application.job.id}`}
                  className={buttonVariants("outline", "sm")}
                >
                  Mở job
                </a>

                <Button onClick={onClose}>Đóng</Button>
              </div>
            </footer>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
