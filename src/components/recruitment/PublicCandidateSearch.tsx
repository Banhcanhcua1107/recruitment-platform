"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecruiterCandidateActions } from "@/components/hr/RecruiterCandidateActions";
import {
  getRecruiterCandidateSignalLabels,
  getRecruiterCandidateSignals,
  matchesRecruiterCandidateFilters,
  type RecruiterCandidateFilterState,
} from "@/components/hr/hrWorkspaceContentModel";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";

const INITIAL_FILTERS: RecruiterCandidateFilterState = {
  q: "",
  skills: "",
  experience: "",
  location: "",
  salary: "all",
  level: "all",
  workMode: "all",
  readiness: "all",
};

function CandidatePreview({
  candidate,
}: {
  candidate: PublicCandidateSearchResult | null;
}) {
  if (!candidate) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
        Chọn một hồ sơ để xem nhanh chi tiết ứng viên, kỹ năng nổi bật và hành động tiếp theo.
      </div>
    );
  }

  const signalLabels = getRecruiterCandidateSignalLabels(getRecruiterCandidateSignals(candidate));

  return (
    <div className="space-y-4 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)] xl:sticky xl:top-[124px]">
      <div className="flex items-start gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-[20px] bg-slate-100 text-xl font-black text-primary">
          {candidate.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.avatarUrl}
              alt={candidate.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            candidate.fullName.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black tracking-tight text-slate-950">
            {candidate.fullName}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{candidate.headline}</p>
          {candidate.location ? (
            <p className="mt-2 text-sm text-slate-500">{candidate.location}</p>
          ) : null}
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            Cập nhật {new Date(candidate.updatedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[signalLabels.level, signalLabels.workMode, signalLabels.readiness, signalLabels.salary]
          .filter(Boolean)
          .map((label) => (
            <span
              key={`${candidate.candidateId}-${label}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {label}
            </span>
          ))}
      </div>

      <div className="space-y-4 text-sm leading-6 text-slate-600">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Giới thiệu
          </p>
          <p className="mt-2">
            {candidate.introduction || "Ứng viên chưa bổ sung phần giới thiệu công khai."}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Kinh nghiệm
          </p>
          <p className="mt-2">
            {candidate.workExperience || "Chưa có tóm tắt kinh nghiệm làm việc."}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Học vấn
          </p>
          <p className="mt-2">{candidate.education || "Chưa có thông tin học vấn."}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Kỹ năng chính
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {candidate.skills.length > 0 ? (
            candidate.skills.slice(0, 12).map((skill) => (
              <span
                key={`${candidate.candidateId}-${skill}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">Ứng viên chưa khai báo kỹ năng.</span>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <RecruiterCandidateActions candidate={candidate} />
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/candidate/${candidate.candidateId}?from=hr`}
            className={buttonVariants("outline", "default")}
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Xem hồ sơ
          </Link>
          {candidate.cvUrl ? (
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants("default", "default")}
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              Xem CV
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PublicCandidateSearch() {
  const router = useRouter();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicCandidateSearchResult[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const filteredItems = items.filter((candidate) =>
    matchesRecruiterCandidateFilters(candidate, filters)
  );
  const selectedCandidate =
    filteredItems.find((candidate) => candidate.candidateId === selectedCandidateId) ??
    filteredItems[0] ??
    null;

  useEffect(() => {
    if (!selectedCandidate && filteredItems.length > 0) {
      setSelectedCandidateId(filteredItems[0].candidateId);
      return;
    }

    if (
      selectedCandidateId &&
      filteredItems.length > 0 &&
      !filteredItems.some((candidate) => candidate.candidateId === selectedCandidateId)
    ) {
      setSelectedCandidateId(filteredItems[0].candidateId);
    }
  }, [filteredItems, selectedCandidate, selectedCandidateId]);

  const loadCandidates = async (nextFilters: RecruiterCandidateFilterState) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (nextFilters.q.trim()) {
        params.set("keywords", nextFilters.q.trim());
      }

      if (nextFilters.skills.trim()) {
        params.set("skills", nextFilters.skills.trim());
      }

      if (nextFilters.experience.trim()) {
        params.set("experience", nextFilters.experience.trim());
      }

      const response = await fetch(`/api/recruiter/candidates/search?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể tìm kiếm hồ sơ ứng viên công khai.");
      }

      const nextItems = Array.isArray(result.items)
        ? (result.items as PublicCandidateSearchResult[])
        : [];

      setItems(nextItems);
      setSelectedCandidateId(nextItems[0]?.candidateId ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tìm kiếm hồ sơ ứng viên công khai."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidates(INITIAL_FILTERS);
  }, []);

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Talent marketplace
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Kho hồ sơ công khai để tuyển dụng chủ động
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Tìm ứng viên theo tên, vai trò, kỹ năng hoặc tín hiệu nghề nghiệp. Các bộ lọc
            nâng cao như mức lương, cấp bậc, hình thức làm việc và trạng thái sẵn sàng hiện
            đang dùng suy luận từ nội dung hồ sơ công khai để giữ tương thích với mô hình dữ
            liệu hiện tại.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Kết quả hiện tại
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {loading ? "..." : filteredItems.length}
          </p>
        </div>
      </div>

      <form
        className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr_220px_220px_220px_220px_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadCandidates(filters);
        }}
      >
        <Input
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="Tên ứng viên, vai trò hoặc kỹ năng"
        />
        <Input
          value={filters.skills}
          onChange={(event) =>
            setFilters((current) => ({ ...current, skills: event.target.value }))
          }
          placeholder="Kỹ năng"
        />
        <Input
          value={filters.experience}
          onChange={(event) =>
            setFilters((current) => ({ ...current, experience: event.target.value }))
          }
          placeholder="Kinh nghiệm"
        />
        <Input
          value={filters.location}
          onChange={(event) =>
            setFilters((current) => ({ ...current, location: event.target.value }))
          }
          placeholder="Địa điểm"
        />
        <Select
          value={filters.salary}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              salary: event.target.value as RecruiterCandidateFilterState["salary"],
            }))
          }
        >
          <option value="all">Mức lương mong muốn</option>
          <option value="under_15">&lt; 15 triệu</option>
          <option value="between_15_30">15 - 30 triệu</option>
          <option value="between_30_50">30 - 50 triệu</option>
          <option value="above_50">&gt; 50 triệu</option>
        </Select>
        <Select
          value={filters.level}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              level: event.target.value as RecruiterCandidateFilterState["level"],
            }))
          }
        >
          <option value="all">Cấp bậc</option>
          <option value="junior">Junior</option>
          <option value="middle">Middle</option>
          <option value="senior">Senior</option>
          <option value="manager">Quản lý</option>
        </Select>
        <Select
          value={filters.workMode}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              workMode: event.target.value as RecruiterCandidateFilterState["workMode"],
            }))
          }
        >
          <option value="all">Hình thức làm việc</option>
          <option value="onsite">Tại văn phòng</option>
          <option value="hybrid">Hybrid</option>
          <option value="remote">Từ xa</option>
          <option value="flexible">Linh hoạt</option>
        </Select>
        <Select
          value={filters.readiness}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              readiness: event.target.value as RecruiterCandidateFilterState["readiness"],
            }))
          }
        >
          <option value="all">Sẵn sàng làm việc</option>
          <option value="ready_now">Sẵn sàng ngay</option>
          <option value="open">Đang mở cơ hội</option>
          <option value="notice_period">Có thời gian báo trước</option>
        </Select>
        <button className={buttonVariants("default", "default")} type="submit">
          Tìm kiếm
        </button>
        <button
          className={buttonVariants("outline", "default")}
          type="button"
          onClick={() => {
            setFilters(INITIAL_FILTERS);
            void loadCandidates(INITIAL_FILTERS);
          }}
        >
          Xóa lọc
        </button>
      </form>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-[28px] bg-slate-100" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-[28px] bg-slate-100" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Không có hồ sơ công khai nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredItems.map((candidate) => {
              const signalLabels = getRecruiterCandidateSignalLabels(
                getRecruiterCandidateSignals(candidate)
              );
              const isActive = candidate.candidateId === selectedCandidate?.candidateId;

              return (
                <article
                  key={candidate.candidateId}
                  className={`cursor-pointer rounded-[28px] border p-5 transition-all ${
                    isActive
                      ? "border-primary/30 bg-primary/5 shadow-[0_20px_45px_-32px_rgba(37,99,235,0.45)]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  onClick={() => router.push(`/candidate/${candidate.candidateId}?from=hr`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex size-14 items-center justify-center overflow-hidden rounded-[18px] bg-white text-lg font-black text-primary shadow-sm">
                        {candidate.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.avatarUrl}
                            alt={candidate.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          candidate.fullName.charAt(0)
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/candidate/${candidate.candidateId}?from=hr`}
                          className="truncate text-lg font-black text-slate-950 hover:text-primary"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {candidate.fullName}
                        </Link>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          {candidate.headline || "Ứng viên công khai"}
                        </p>
                        {candidate.location ? (
                          <p className="mt-1 text-sm text-slate-500">{candidate.location}</p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedCandidateId(candidate.candidateId);
                      }}
                      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                        isActive
                          ? "bg-primary text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      Xem nhanh
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[signalLabels.level, signalLabels.workMode, signalLabels.readiness]
                      .filter(Boolean)
                      .map((label) => (
                        <span
                          key={`${candidate.candidateId}-${label}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          {label}
                        </span>
                      ))}
                    {candidate.skills.slice(0, 4).map((skill) => (
                      <span
                        key={`${candidate.candidateId}-${skill}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
                    {candidate.introduction || "Ứng viên chưa bổ sung phần giới thiệu công khai."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/candidate/${candidate.candidateId}?from=hr`}
                      onClick={(event) => event.stopPropagation()}
                      className={buttonVariants("outline", "sm")}
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      Xem hồ sơ
                    </Link>
                    <RecruiterCandidateActions candidate={candidate} compact />
                  </div>
                </article>
              );
            })}
          </div>

          <CandidatePreview candidate={selectedCandidate} />
        </div>
      )}
    </div>
  );
}
