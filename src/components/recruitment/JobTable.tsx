import Link from "next/link";
import { closeJobAction, toggleJobPublicVisibilityAction } from "@/app/hr/actions";
import { PaginationBar } from "@/components/recruitment/PaginationBar";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
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
            Quản lý tin tuyển dụng của công ty và bật/tắt hiển thị public để test luồng ATS.
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
              <TableHead>Public</TableHead>
              <TableHead>Ngày đăng</TableHead>
              <TableHead>Số ứng viên</TableHead>
              <TableHead className="pr-6 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-6 py-16 text-center text-slate-500">
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
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest",
                        job.isPublicVisible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {job.isPublicVisible ? "Hiện" : "Ẩn"}
                    </span>
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
                      <form action={toggleJobPublicVisibilityAction}>
                        <input type="hidden" name="id" value={job.id} />
                        <input
                          type="hidden"
                          name="isPublicVisible"
                          value={job.isPublicVisible ? "false" : "true"}
                        />
                        <Button variant="outline" size="sm" type="submit">
                          {job.isPublicVisible ? "Ẩn public" : "Hiện public"}
                        </Button>
                      </form>
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
