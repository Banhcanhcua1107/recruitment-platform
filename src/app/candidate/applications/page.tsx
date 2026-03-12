"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCandidateApplications } from "@/hooks/useCandidateApplications";
import type { Application, ApplicationStatus } from "@/types/dashboard";

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "applied", label: "Đã nộp" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "interview", label: "Phỏng vấn" },
  { value: "offer", label: "Đề nghị" },
  { value: "hired", label: "Đã tuyển" },
  { value: "rejected", label: "Từ chối" },
] as const;

const STATUS_BADGES: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: { label: "Đã nộp", className: "bg-sky-50 text-sky-700 border-sky-200" },
  viewed: { label: "Đang xem xét", className: "bg-amber-50 text-amber-700 border-amber-200" },
  interviewing: { label: "Phỏng vấn", className: "bg-violet-50 text-violet-700 border-violet-200" },
  offered: { label: "Đề nghị", className: "bg-orange-50 text-orange-700 border-orange-200" },
  rejected: { label: "Từ chối", className: "bg-rose-50 text-rose-700 border-rose-200" },
  new: { label: "Đã nộp", className: "bg-sky-50 text-sky-700 border-sky-200" },
  applied: { label: "Đã nộp", className: "bg-sky-50 text-sky-700 border-sky-200" },
  reviewing: { label: "Đang xem xét", className: "bg-amber-50 text-amber-700 border-amber-200" },
  interview: { label: "Phỏng vấn", className: "bg-violet-50 text-violet-700 border-violet-200" },
  offer: { label: "Đề nghị", className: "bg-orange-50 text-orange-700 border-orange-200" },
  hired: { label: "Đã tuyển", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function CandidateApplicationsPage() {
  const { applications, isLoading, error } = useCandidateApplications();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      if (filter !== "all" && application.status !== filter) {
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
    <div className="mx-auto max-w-[1360px] space-y-10 px-6 py-10 lg:px-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 lg:text-4xl">Quản lý đơn ứng tuyển</h1>
        <p className="text-lg font-medium text-slate-500">
          Theo dõi trạng thái hồ sơ theo thời gian thực và mở chi tiết từng đơn ứng tuyển.
        </p>
      </div>

      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setFilter(item.value);
                setCurrentPage(1);
              }}
              className={[
                "rounded-full px-6 py-2.5 text-base font-black transition-all",
                filter === item.value
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "border border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
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
            className="w-full rounded-[20px] border border-slate-200 bg-white py-4 pl-12 pr-6 text-lg font-bold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-[32px] bg-slate-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-center font-semibold text-rose-700">
          {error}
        </div>
      ) : (
        <div className="min-h-[400px] overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">
                    Tên việc làm
                  </th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">
                    Công ty
                  </th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">
                    Ngày nộp
                  </th>
                  <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-8 py-6 text-right text-sm font-black uppercase tracking-widest text-slate-400">
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
                    <ApplicationRow key={application.id} application={application} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredApplications.length > itemsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-6 pt-4 sm:flex-row">
          <p className="text-lg font-bold italic text-slate-400">
            Hiển thị{" "}
            <span className="font-black text-slate-900">{paginatedApplications.length}</span>{" "}
            trên tổng số{" "}
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

function ApplicationRow({ application }: { application: Application }) {
  const badge = STATUS_BADGES[application.status] ?? STATUS_BADGES.applied;

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
        <span className={`inline-flex rounded-xl border px-4 py-1.5 text-xs font-black uppercase tracking-widest ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-8 py-6 text-right">
        <Link href={`/candidate/applications/${application.id}`}>
          <button className="group/btn inline-flex cursor-pointer items-center gap-1 text-base font-black text-primary hover:text-primary-dark">
            Xem chi tiết
            <span className="material-symbols-outlined text-xl transition-transform group-hover/btn:translate-x-1">
              chevron_right
            </span>
          </button>
        </Link>
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
