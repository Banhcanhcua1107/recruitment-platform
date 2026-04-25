"use client";

import { useEffect, useMemo, useState } from "react";
import { ApplicationDetailModal } from "@/components/recruitment/ApplicationDetailModal";
import { CandidateRow } from "@/components/recruitment/CandidateRow";
import { PaginationBar } from "@/components/recruitment/PaginationBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EmployerCandidateApplicationDetail,
  PaginatedResult,
  RecruitmentCandidate,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

interface CandidateTableProps {
  data: PaginatedResult<RecruitmentCandidate>;
  query: Record<string, string | undefined>;
  focusApplicationId?: string;
}

export function CandidateTable({
  data,
  query,
  focusApplicationId,
}: CandidateTableProps) {
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, RecruitmentPipelineStatus>
  >({});
  const [selectedApplication, setSelectedApplication] =
    useState<RecruitmentCandidate | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [hasOpenedFocusApplication, setHasOpenedFocusApplication] = useState(false);

  const items = useMemo(
    () =>
      data.items.map((item) => {
        const overriddenStatus = statusOverrides[item.applicationId];

        if (!overriddenStatus) {
          return item;
        }

        return {
          ...item,
          status: overriddenStatus,
        };
      }),
    [data.items, statusOverrides],
  );

  const handleOpenDetail = (candidate: RecruitmentCandidate) => {
    setSelectedApplication(candidate);
    setOpenDetail(true);
  };

  const handleStatusUpdated = (
    applicationId: string,
    status: RecruitmentPipelineStatus
  ) => {
    setStatusOverrides((current) => ({
      ...current,
      [applicationId]: status,
    }));

    setSelectedApplication((current) =>
      current && current.applicationId === applicationId
        ? { ...current, status }
        : current
    );
  };

  useEffect(() => {
    setHasOpenedFocusApplication(false);
  }, [focusApplicationId]);

  useEffect(() => {
    if (!focusApplicationId || hasOpenedFocusApplication) {
      return;
    }

    const matchedApplication = items.find(
      (item) => item.applicationId === focusApplicationId
    );

    if (matchedApplication) {
      setSelectedApplication(matchedApplication);
      setOpenDetail(true);
      setHasOpenedFocusApplication(true);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const response = await fetch(
          `/api/applications/${encodeURIComponent(focusApplicationId)}`,
          {
            cache: "no-store",
          }
        );

        const result = (await response.json()) as {
          detail?: EmployerCandidateApplicationDetail;
          error?: string;
        };

        if (!response.ok || !result.detail || !active) {
          return;
        }

        const detail = result.detail;
        const fallbackApplication: RecruitmentCandidate = {
          applicationId: detail.applicationId,
          candidateId: detail.candidateId,
          candidateCode: detail.candidateCode,
          fullName: detail.fullName,
          email: detail.email,
          phone: detail.phone,
          resumeUrl: detail.resumeUrl,
          introduction: detail.introduction,
          coverLetter: detail.coverLetter,
          appliedPosition: detail.job.title,
          jobId: detail.job.id,
          jobUrl: detail.job.url,
          status: detail.status,
          rawStatus: detail.rawStatus,
          appliedAt: detail.appliedAt,
          hasPublicProfile: false,
        };

        setSelectedApplication(fallbackApplication);
        setOpenDetail(true);
      } catch {
        // Keep page usable even if deep-link lookup fails.
      } finally {
        if (active) {
          setHasOpenedFocusApplication(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [focusApplicationId, hasOpenedFocusApplication, items]);

  return (
    <>
      <Card className="overflow-hidden rounded-[26px] border-slate-200/85 bg-white/95 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]">
        <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                Tổng quan ATS
              </p>
              <CardTitle>Danh sách ứng tuyển</CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                Mỗi dòng là một đơn ứng tuyển độc lập. Thông tin hiển thị lấy từ snapshot tại
                thời điểm nộp hồ sơ để HR không bị lẫn với hồ sơ công khai đã thay đổi sau này.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Tổng đơn
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {data.total}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Mã ứng viên
                </p>
                <p className="mt-2 font-mono text-sm font-semibold tracking-[0.14em] text-slate-700">
                  Mẫu: CAND-YYYY-NNNN
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <Table className="min-w-240">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Ứng viên</TableHead>
                <TableHead>Job đã ứng tuyển</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian nộp</TableHead>
                <TableHead className="pr-6 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-16">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <span className="material-symbols-outlined text-[28px]">
                          contact_page
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-semibold tracking-tight text-slate-900">
                          Chưa có ứng viên phù hợp
                        </p>
                        <p className="text-sm leading-6 text-slate-500">
                          Thử nới bộ lọc theo mã ứng viên, tên, email, số điện thoại hoặc trạng
                          thái để xem thêm các snapshot ứng tuyển khác.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((candidate) => (
                  <CandidateRow
                    key={candidate.applicationId}
                    candidate={candidate}
                    onOpenDetail={handleOpenDetail}
                  />
                ))
              )}
            </TableBody>
          </Table>

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            basePath="/hr/candidates"
            query={query}
          />
        </CardContent>
      </Card>

      <ApplicationDetailModal
        isOpen={openDetail}
        application={selectedApplication}
        onClose={() => setOpenDetail(false)}
        onStatusUpdated={handleStatusUpdated}
      />
    </>
  );
}
