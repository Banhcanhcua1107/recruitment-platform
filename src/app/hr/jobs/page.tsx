import { JobTable } from "@/components/recruitment/JobTable";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getJobs } from "@/lib/recruitment";
import Link from "next/link";

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function HRJobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const page = params.page ?? "1";

  const jobs = await getJobs({
    q,
    status: status as "all" | "open" | "closed" | "draft",
    page: Number(page),
    limit: 8,
  });

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Quản lý tin tuyển dụng
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
            Quản lý tin đang mở và bản nháp
          </h1>
          <p className="max-w-2xl text-base text-slate-500 lg:text-lg">
            Tìm kiếm tin tuyển dụng, lọc theo trạng thái, chỉnh sửa nội dung và đóng tin trong khu vực nhà tuyển dụng.
          </p>
        </div>
        <Link className={buttonVariants("default", "lg")} href="/hr/jobs/create">
          Tạo tin mới
        </Link>
      </section>

      <Card className="rounded-[32px] border-slate-200/80">
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,2fr)_220px_auto]">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tiêu đề, địa điểm hoặc mô tả"
            />
            <Select name="status" defaultValue={status}>
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Đang mở</option>
              <option value="draft">Bản nháp</option>
              <option value="closed">Đã đóng</option>
            </Select>
            <button className={buttonVariants("outline", "default")} type="submit">
              Áp dụng
            </button>
          </form>
        </CardContent>
      </Card>

      <JobTable
        data={jobs}
        query={{
          q: q || undefined,
          status: status === "all" ? undefined : status,
        }}
      />
    </div>
  );
}
