"use client";

import { useEffect, useState } from "react";
import { ApplicationDetailModal } from "@/components/recruitment/ApplicationDetailModal";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  PaginatedResult,
  RecruitmentCandidate,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

type ApplicationFilterState = {
  q: string;
  position: string;
  status: "all" | RecruitmentPipelineStatus;
};

const INITIAL_FILTERS: ApplicationFilterState = {
  q: "",
  position: "",
  status: "all",
};

export function PublicCandidateSearch() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecruitmentCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState<RecruitmentCandidate | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const loadApplications = async (nextFilters: ApplicationFilterState) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (nextFilters.q.trim()) {
        params.set("q", nextFilters.q.trim());
      }

      if (nextFilters.position.trim()) {
        params.set("position", nextFilters.position.trim());
      }

      if (nextFilters.status !== "all") {
        params.set("status", nextFilters.status);
      }

      params.set("page", "1");
      params.set("limit", "20");

      const response = await fetch(`/api/recruiter/applications?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể tìm kiếm đơn ứng tuyển.");
      }

      const payload = result as PaginatedResult<RecruitmentCandidate>;
      const nextItems = Array.isArray(payload.items) ? payload.items : [];

      setItems(nextItems);
      setTotal(typeof payload.total === "number" ? payload.total : nextItems.length);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tìm kiếm đơn ứng tuyển."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications(INITIAL_FILTERS);
  }, []);

  const handleStatusUpdated = (
    applicationId: string,
    status: RecruitmentPipelineStatus
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.applicationId === applicationId ? { ...item, status } : item
      )
    );

    setSelectedApplication((current) =>
      current && current.applicationId === applicationId
        ? { ...current, status }
        : current
    );
  };

  return (
    <div className="space-y-6 rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Không gian đơn ứng tuyển
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Danh sách đơn ứng tuyển theo workflow tuyển dụng
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Danh sách dưới đây hiển thị theo từng đơn ứng tuyển thực tế để recruiter thao tác
            đúng ngữ cảnh: ứng viên nào đã apply vào job nào, trạng thái ra sao và hồ sơ CV đi kèm.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Kết quả hiện tại
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {loading ? "..." : total}
          </p>
        </div>
      </div>

      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_220px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadApplications(filters);
        }}
      >
        <Input
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="Tên, email, điện thoại hoặc mã ứng viên"
        />
        <Input
          value={filters.position}
          onChange={(event) =>
            setFilters((current) => ({ ...current, position: event.target.value }))
          }
          placeholder="Vị trí đã ứng tuyển"
        />
        <Select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value as ApplicationFilterState["status"],
            }))
          }
        >
          <option value="all">Trạng thái ứng tuyển</option>
          <option value="applied">Đã nộp</option>
          <option value="reviewing">Đang xem xét</option>
          <option value="interview">Phỏng vấn</option>
          <option value="offer">Đề nghị</option>
          <option value="hired">Đã tuyển</option>
          <option value="rejected">Từ chối</option>
        </Select>
        <div className="flex flex-wrap gap-2">
          <button className={buttonVariants("default", "default")} type="submit">
            Tìm kiếm
          </button>
          <button
            className={buttonVariants("outline", "default")}
            type="button"
            onClick={() => {
              setFilters(INITIAL_FILTERS);
              void loadApplications(INITIAL_FILTERS);
            }}
          >
            Xóa lọc
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <div className="hidden border-b border-slate-200 bg-slate-50/70 px-5 py-3 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-10 w-52 animate-pulse rounded-xl bg-slate-100 lg:justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Không có đơn ứng tuyển nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <div className="hidden border-b border-slate-200 bg-slate-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
            <span>Ứng viên</span>
            <span>Đơn ứng tuyển</span>
            <span className="justify-self-end">Thao tác</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((candidate) => {
              return (
                <article
                  key={candidate.applicationId}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-slate-100 text-lg font-black text-primary shadow-sm">
                      {candidate.fullName.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <p className="block truncate text-lg font-black text-slate-950">
                        {candidate.fullName}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-600">
                        {candidate.email || "Chưa có email trong snapshot ứng tuyển"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {candidate.phone ? <span>{candidate.phone}</span> : null}
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono tracking-[0.08em] text-slate-600">
                          {candidate.candidateCode}
                        </span>
                        <span>Nộp ngày {new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-base font-black text-slate-900">{candidate.appliedPosition}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <StatusBadge status={candidate.status} />
                      <span>
                        Ứng tuyển {new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {candidate.coverLetter || "Ứng viên không gửi thêm nội dung giới thiệu."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApplication(candidate);
                        setOpenDetail(true);
                      }}
                      className={buttonVariants("outline", "sm")}
                    >
                      <span className="material-symbols-outlined text-[18px]">manage_search</span>
                      Xem chi tiết
                    </button>
                    {candidate.resumeUrl ? (
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants("default", "sm")}
                      >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Xem CV
                      </a>
                    ) : (
                      <span className={buttonVariants("outline", "sm") + " pointer-events-none opacity-60"}>
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Chưa có CV
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <ApplicationDetailModal
        isOpen={openDetail}
        application={selectedApplication}
        onClose={() => setOpenDetail(false)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
