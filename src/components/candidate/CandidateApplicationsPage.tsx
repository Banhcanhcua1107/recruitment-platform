"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidateApplicationDetailModal } from "@/components/candidate/CandidateApplicationDetailModal";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { useCandidateApplications } from "@/hooks/useCandidateApplications";
import type { Application, ApplicationStatus } from "@/types/dashboard";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "applied", label: "Đã nộp" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "interview", label: "Phỏng vấn" },
  { value: "offer", label: "Đề nghị" },
  { value: "hired", label: "Đã tuyển" },
  { value: "rejected", label: "Từ chối" },
] as const;

function normalizeApplicationStatus(status: ApplicationStatus): RecruitmentPipelineStatus {
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
    default:
      return "rejected";
  }
}

export default function CandidateApplicationsPage() {
  const { applications, isLoading, error } = useCandidateApplications();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const itemsPerPage = 8;

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      if (
        filter !== "all" &&
        normalizeApplicationStatus(application.status) !== filter
      ) {
        return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          application.job.title.toLowerCase().includes(query) ||
          application.job.company_name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [applications, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full space-y-7 pb-2 pt-1">
      <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white/90 px-5 py-5 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.2)]">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Việc đã ứng tuyển</h1>
        <p className="text-sm font-medium leading-7 text-slate-500 sm:text-base">
          Theo dõi trạng thái hồ sơ theo thời gian thực và mở chi tiết từng đơn ứng tuyển.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)] sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2.5">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setFilter(item.value);
                setCurrentPage(1);
              }}
              className={[
                "rounded-full px-4 py-2.5 text-sm font-bold transition-all",
                filter === item.value
                  ? "bg-primary text-white shadow-[0_14px_30px_-22px_rgba(37,99,235,0.58)]"
                  : "bg-white text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
          </div>

          <div className="relative w-full lg:max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm tên công việc hoặc công ty"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-[18px] border border-slate-200 bg-white py-3.5 pl-12 pr-5 text-base font-semibold text-slate-900 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-4xl bg-slate-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center font-semibold text-rose-700">
          {error}
        </div>
      ) : (
        <div className="min-h-100 overflow-hidden rounded-[26px] border border-slate-200/85 bg-white shadow-[0_20px_40px_-30px_rgba(15,23,42,0.28)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400 sm:px-8">
                    Tên việc làm
                  </th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400 sm:px-8">
                    Công ty
                  </th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400 sm:px-8">
                    Ngày nộp
                  </th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400 sm:px-8">
                    Trạng thái
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-[0.2em] text-slate-400 sm:px-8">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined mb-4 text-6xl text-slate-200">
                          inbox
                        </span>
                        <p className="text-lg font-bold text-slate-400">
                          Không tìm thấy đơn ứng tuyển phù hợp.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedApplications.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      onOpenDetail={setSelectedApplication}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CandidateApplicationDetailModal
        isOpen={Boolean(selectedApplication)}
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />

      {filteredApplications.length > itemsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-4 pt-1 sm:flex-row">
          <p className="text-sm font-semibold text-slate-500 sm:text-base">
            Hiển thị{" "}
            <span className="font-black text-slate-900">{paginatedApplications.length}</span>
            {" "}trên tổng số{" "}
            <span className="font-black text-slate-900">{filteredApplications.length}</span>{" "}
            đơn
          </p>
          <div className="flex items-center gap-2">
            <PaginationButton
              icon="chevron_left"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            />
            {Array.from({ length: totalPages }).map((_, index) => (
              <PaginationButton
                key={index}
                label={String(index + 1)}
                active={currentPage === index + 1}
                onClick={() => setCurrentPage(index + 1)}
              />
            ))}
            <PaginationButton
              icon="chevron_right"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApplicationRow({
  application,
  onOpenDetail,
}: {
  application: Application;
  onOpenDetail: (application: Application) => void;
}) {
  const normalizedStatus = normalizeApplicationStatus(application.status);

  return (
    <tr className="group transition-colors hover:bg-slate-50/80">
      <td className="px-8 py-6">
        <div className="flex flex-col">
          <Link href={`/jobs/${application.job.id}`} className="hover:underline decoration-primary">
            <span className="text-[17px] font-black leading-tight text-slate-900 transition-colors group-hover:text-primary">
              {application.job.title}
            </span>
          </Link>
          <span className="mt-1.5 text-sm font-bold uppercase tracking-wide text-slate-400">
            {application.job.location || "Remote"}
          </span>
        </div>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          {application.job.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={application.job.logo_url}
              alt={application.job.company_name}
              className="size-11 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
              <span className="text-sm font-black uppercase text-slate-500">
                {application.job.company_name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-[16px] font-bold text-slate-700">
            {application.job.company_name}
          </span>
        </div>
      </td>
      <td className="px-8 py-6 text-base font-bold text-slate-500">
        {new Date(application.created_at).toLocaleDateString("vi-VN")}
      </td>
      <td className="px-8 py-6">
        <StatusBadge status={normalizedStatus} />
      </td>
      <td className="px-8 py-6 text-right">
        <div className="inline-flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail(application)}
            className={buttonVariants("outline", "sm")}
          >
            <span className="material-symbols-outlined text-[18px]">manage_search</span>
            Xem chi tiết
          </button>

          <a
            href={`/api/applications/${application.id}/cv`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants("default", "sm")}
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Xem CV
          </a>
        </div>
      </td>
    </tr>
  );
}

interface PaginationButtonProps {
  label?: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

function PaginationButton({
  label,
  icon,
  active = false,
  onClick,
  disabled,
}: PaginationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex size-12 items-center justify-center rounded-2xl border text-lg font-black transition-all",
        active
          ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
          : "border-slate-200 bg-white text-slate-400 hover:border-primary hover:text-primary",
        disabled ? "cursor-not-allowed opacity-50 hover:border-slate-200 hover:text-slate-400" : "cursor-pointer",
      ].join(" ")}
    >
      {icon ? <span className="material-symbols-outlined font-bold">{icon}</span> : label}
    </button>
  );
}
