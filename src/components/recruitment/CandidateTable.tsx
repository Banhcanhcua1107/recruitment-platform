"use client";

import { useEffect, useState } from "react";
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
  PaginatedResult,
  RecruitmentCandidate,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

interface CandidateTableProps {
  data: PaginatedResult<RecruitmentCandidate>;
  query: Record<string, string | undefined>;
}

export function CandidateTable({ data, query }: CandidateTableProps) {
  const [items, setItems] = useState(data.items);
  const [selectedApplication, setSelectedApplication] =
    useState<RecruitmentCandidate | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    setItems(data.items);
  }, [data.items]);

  const handleOpenDetail = (candidate: RecruitmentCandidate) => {
    setSelectedApplication(candidate);
    setOpenDetail(true);
  };

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
    <>
      <Card className="overflow-hidden rounded-[36px] border-slate-200/80 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.26)]">
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
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Tổng đơn
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {data.total}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
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
