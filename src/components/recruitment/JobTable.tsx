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
    <Card className="overflow-hidden rounded-[32px] border-slate-200/80 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.18)]">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)]">
        <div>
          <CardTitle>Danh mục tin tuyển dụng</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Theo dõi trạng thái phát hành, số hồ sơ ứng tuyển và thao tác quản trị trên từng tin.
          </p>
        </div>
        <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
          Tạo tin mới
        </Link>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Vị trí</TableHead>
              <TableHead>Địa điểm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Công khai</TableHead>
              <TableHead>Ngày đăng</TableHead>
              <TableHead>Ứng viên</TableHead>
              <TableHead className="pr-6 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-6 py-16">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <span className="material-symbols-outlined text-[28px]">work_off</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-semibold tracking-tight text-slate-900">
                        Chưa có tin phù hợp với bộ lọc hiện tại
                      </p>
                      <p className="text-sm leading-6 text-slate-500">
                        Hãy nới bộ lọc hoặc tạo một tin tuyển dụng mới để recruiter workspace bắt
                        đầu thu hút hồ sơ.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="pl-6">
                    <div className="space-y-1">
                      <Link
                        href={`/hr/jobs/${job.id}`}
                        className="font-semibold text-slate-900 transition-colors hover:text-primary"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-slate-400">ID: {job.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{job.location || "Linh hoạt địa điểm"}</TableCell>
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
                      {job.isPublicVisible ? "Đang hiển thị" : "Đã ẩn"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {job.postedAt
                      ? new Date(job.postedAt).toLocaleDateString("vi-VN")
                      : "Chưa đăng"}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {job.candidateCount}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/hr/jobs/${job.id}`}
                        className={buttonVariants("outline", "sm")}
                      >
                        Chỉnh sửa
                      </Link>
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
