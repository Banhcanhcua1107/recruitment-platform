"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";

const INITIAL_FILTERS = {
  name: "",
  skills: "",
  headline: "",
  experience: "",
  keywords: "",
};

export function PublicCandidateSearch() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicCandidateSearchResult[]>([]);

  const loadCandidates = useCallback(async (nextFilters: typeof INITIAL_FILTERS) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.set(key, value.trim());
        }
      });

      const response = await fetch(`/api/recruiter/candidates/search?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể tìm kiếm hồ sơ ứng viên công khai.");
      }

      setItems(Array.isArray(result.items) ? (result.items as PublicCandidateSearchResult[]) : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tìm kiếm hồ sơ ứng viên công khai."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates(INITIAL_FILTERS);
  }, [loadCandidates]);

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
          Tìm kiếm ứng viên
        </p>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Chủ động tìm hồ sơ phù hợp
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          Chỉ hiển thị các hồ sơ đang để công khai, giúp bạn tìm kiếm theo tên, tiêu đề
          chuyên môn, kỹ năng, kinh nghiệm và từ khóa.
        </p>
      </div>

      <form
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1.2fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadCandidates(filters);
        }}
      >
        <Input
          value={filters.name}
          onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))}
          placeholder="Tìm theo tên ứng viên"
        />
        <Input
          value={filters.skills}
          onChange={(event) =>
            setFilters((current) => ({ ...current, skills: event.target.value }))
          }
          placeholder="Tìm theo kỹ năng"
        />
        <Input
          value={filters.headline}
          onChange={(event) =>
            setFilters((current) => ({ ...current, headline: event.target.value }))
          }
          placeholder="Tiêu đề chuyên môn"
        />
        <Input
          value={filters.experience}
          onChange={(event) =>
            setFilters((current) => ({ ...current, experience: event.target.value }))
          }
          placeholder="Tìm theo kinh nghiệm"
        />
        <Input
          value={filters.keywords}
          onChange={(event) =>
            setFilters((current) => ({ ...current, keywords: event.target.value }))
          }
          placeholder="Từ khóa"
        />
        <Button type="submit" className="h-11 rounded-xl px-5">
          Tìm kiếm
        </Button>
      </form>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[28px] bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Không có hồ sơ công khai nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((candidate) => (
            <article
              key={candidate.candidateId}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
            >
              <div className="mb-4 flex items-start gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  {candidate.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-black text-primary">
                      {candidate.fullName.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-slate-900">{candidate.fullName}</h3>
                  {candidate.headline ? (
                    <p className="mt-1 text-sm font-medium text-slate-600">{candidate.headline}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-500">
                    Cập nhật {new Date(candidate.updatedAt).toLocaleDateString("vi-VN")}
                  </p>
                  {candidate.location ? (
                    <p className="mt-2 text-sm text-slate-500">{candidate.location}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 8).map((skill) => (
                      <span
                        key={`${candidate.candidateId}-${skill}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm leading-6 text-slate-600">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Giới thiệu
                  </p>
                  <p>{candidate.introduction || "Ứng viên chưa bổ sung phần giới thiệu."}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Kinh nghiệm làm việc
                  </p>
                  <p>{candidate.workExperience || "Chưa có tóm tắt kinh nghiệm làm việc."}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Học vấn
                  </p>
                  <p>{candidate.education || "Chưa có thông tin học vấn."}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/hr/candidates/${candidate.candidateId}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  Xem hồ sơ
                </Link>

                {candidate.email ? (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                  >
                    Gửi email
                  </a>
                ) : null}

                {candidate.phone ? (
                  <a
                    href={`tel:${candidate.phone}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                  >
                    {candidate.phone}
                  </a>
                ) : null}

                {candidate.cvUrl ? (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    Xem CV
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
