import Link from "next/link";
import { closeJobAction } from "@/app/hr/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { PaginationBar } from "@/components/recruitment/PaginationBar";
import type { PaginatedResult, RecruitmentJob } from "@/types/recruitment";

interface JobTableProps {
  data: PaginatedResult<RecruitmentJob>;
  query: Record<string, string | undefined>;
}

export function JobTable({ data, query }: JobTableProps) {
  return (
    <Card className="rounded-[32px] border-slate-200/80">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tin tuyển dụng</CardTitle>
          <p className="text-sm text-slate-500">
            Tìm kiếm, chỉnh sửa và đóng tin ngay trong một bảng quản lý.
          </p>
        </div>
        <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
          Tạo tin mới
        </Link>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Tiêu đề</TableHead>
              <TableHead>Địa điểm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày đăng</TableHead>
              <TableHead>Số ứng viên</TableHead>
              <TableHead className="pr-6 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-16 text-center text-slate-500">
                  Không có tin tuyển dụng phù hợp với bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="pl-6">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="text-xs text-slate-400">ID: {job.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{job.location || "Từ xa"}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    {job.postedAt
                      ? new Date(job.postedAt).toLocaleDateString("vi-VN")
                      : "Không có"}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {job.candidateCount}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Link href={`/hr/jobs/${job.id}`}>Chỉnh sửa</Link>
                      </Button>
                      {job.status !== "closed" ? (
                        <form action={closeJobAction}>
                          <input type="hidden" name="id" value={job.id} />
                          <Button variant="secondary" size="sm" type="submit">
                            Đóng tin
                          </Button>
                        </form>
                      ) : null}
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
          basePath="/hr/jobs"
          query={query}
        />
      </CardContent>
    </Card>
  );
}
