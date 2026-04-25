"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import type { HrCandidateItem } from "./CandidateCard";

interface CandidateJobsDrawerProps {
  candidate: HrCandidateItem | null;
  onClose: () => void;
}

function formatDeadline(value: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export default function CandidateJobsDrawer({ candidate, onClose }: CandidateJobsDrawerProps) {
  useEffect(() => {
    if (!candidate) {
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
  }, [candidate, onClose]);

  return (
    <AnimatePresence>
      {candidate ? (
        <div className="fixed inset-0 z-120 flex justify-end">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Đóng danh sách job phù hợp"
            className="absolute inset-0 bg-black/40"
          />

          <motion.aside
            initial={{ x: 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 36, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative flex h-full w-[50%] min-w-130 max-w-215 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl"
          >
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-6 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                    Job phù hợp theo ứng viên
                  </p>
                  <h2 className="line-clamp-2 text-2xl font-black tracking-tight text-slate-950">
                    {candidate.name}
                  </h2>
                  <p className="text-sm font-medium text-slate-600">{candidate.role}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Tổng số job: {candidate.relatedJobDetails.length}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                      Match hồ sơ: {candidate.matchScore}%
                    </span>
                  </div>
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
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {candidate.relatedJobDetails.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  Chưa có danh sách job phù hợp để hiển thị.
                </div>
              ) : (
                <div className="space-y-4">
                  {candidate.relatedJobDetails.map((job) => (
                    <article key={`${candidate.id}-${job.id}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-black leading-6 text-slate-950">{job.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Địa điểm: {job.location || "Chưa cập nhật"}
                          </p>
                        </div>

                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                          Match {job.matchScore}%
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">Lương:</span>{" "}
                          {job.salary || "Thỏa thuận"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Kinh nghiệm:</span>{" "}
                          {job.experienceLevel || "Không yêu cầu"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Cấp bậc:</span>{" "}
                          {job.level || "Chưa cập nhật"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Hình thức:</span>{" "}
                          {job.employmentType || "Chưa cập nhật"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Hạn nộp:</span>{" "}
                          {formatDeadline(job.deadline)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Ứng viên hiện tại:</span>{" "}
                          {job.candidateCount ?? 0}
                          {job.targetApplications ? ` / mục tiêu ${job.targetApplications}` : ""}
                        </p>
                      </div>

                      <section className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-sm font-semibold text-slate-900">Mô tả công việc</p>
                        <p className="overflow-x-hidden whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-slate-600">
                          {job.description || "Chưa có mô tả công việc."}
                        </p>
                      </section>

                      <section className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-sm font-semibold text-slate-900">Yêu cầu</p>
                        {job.requirements.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                            {job.requirements.map((requirement, index) => (
                              <li key={`${job.id}-requirement-${index}`}>{requirement}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-600">Chưa có yêu cầu chi tiết.</p>
                        )}
                      </section>

                      <section className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-sm font-semibold text-slate-900">Ngành nghề</p>
                        {job.industry.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {job.industry.map((industry) => (
                              <span
                                key={`${job.id}-${industry}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                              >
                                {industry}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">Chưa có ngành nghề.</p>
                        )}
                      </section>

                      <div className="border-t border-slate-200 pt-3">
                        <Link
                          href={job.url}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:border-primary/40 hover:text-primary"
                        >
                          Xem chi tiết job
                          <span className="material-symbols-outlined text-base">arrow_outward</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
