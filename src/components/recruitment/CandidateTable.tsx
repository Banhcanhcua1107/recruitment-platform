import { recordCandidateViewedAction, updateApplicationStatusAction } from "@/app/hr/actions";
import { PaginationBar } from "@/components/recruitment/PaginationBar";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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

const PIPELINE_OPTIONS: RecruitmentPipelineStatus[] = [
  "applied",
  "reviewing",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const PIPELINE_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Mới",
  applied: "Đã nộp",
  reviewing: "Đang xem xét",
  interview: "Phỏng vấn",
  offer: "Đề nghị",
  hired: "Đã tuyển",
  rejected: "Từ chối",
};

interface CandidateTableProps {
  data: PaginatedResult<RecruitmentCandidate>;
  query: Record<string, string | undefined>;
}

export function CandidateTable({ data, query }: CandidateTableProps) {
  return (
    <Card className="rounded-[32px] border-slate-200/80">
      <CardHeader>
        <CardTitle>Ứng viên</CardTitle>
        <p className="text-sm text-slate-500">
          Theo dõi hồ sơ ứng tuyển, cập nhật pipeline và mở CV trực tiếp từ ATS.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Ứng viên</TableHead>
              <TableHead>Vị trí ứng tuyển</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày nộp</TableHead>
              <TableHead className="pr-6 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  Chưa có ứng viên phù hợp với bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((candidate) => (
                <TableRow key={candidate.applicationId}>
                  <TableCell className="pl-6">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{candidate.fullName}</p>
                      <p className="text-xs text-slate-400">{candidate.email}</p>
                      {candidate.phone ? (
                        <p className="text-xs text-slate-400">{candidate.phone}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{candidate.appliedPosition}</TableCell>
                  <TableCell>
                    <StatusBadge status={candidate.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(candidate.appliedAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex flex-col items-end gap-2">
                      <form action={updateApplicationStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="applicationId" value={candidate.applicationId} />
                        <Select name="status" defaultValue={candidate.status} className="w-[160px]">
                          {PIPELINE_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {PIPELINE_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                        <Button variant="outline" size="sm" type="submit">
                          Lưu
                        </Button>
                      </form>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <form action={recordCandidateViewedAction}>
                          <input type="hidden" name="applicationId" value={candidate.applicationId} />
                          <Button variant="ghost" size="sm" type="submit">
                            Ghi nhận xem
                          </Button>
                        </form>
                        {candidate.resumeUrl ? (
                          <a
                            href={candidate.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants("outline", "sm")}
                          >
                            Tải CV
                          </a>
                        ) : null}
                        <a
                          href={`mailto:${candidate.email}`}
                          className={buttonVariants("outline", "sm")}
                        >
                          Liên hệ
                        </a>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
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
  );
}
