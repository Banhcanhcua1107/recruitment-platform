import { CandidateTable } from "@/components/recruitment/CandidateTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getEmployerCandidates } from "@/lib/applications";
import { getJobPositionOptions } from "@/lib/recruitment";

interface CandidatesPageProps {
  searchParams: Promise<{
    q?: string;
    position?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function HRCandidatesPage({
  searchParams,
}: CandidatesPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const position = params.position ?? "";
  const status = params.status ?? "all";
  const page = params.page ?? "1";

  const [candidates, positions] = await Promise.all([
    getEmployerCandidates({
      q,
      position,
      status: status as
        | "all"
        | "applied"
        | "reviewing"
        | "interview"
        | "offer"
        | "hired"
        | "rejected",
      page: Number(page),
      limit: 8,
    }),
    getJobPositionOptions(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          Quản lý ứng viên
        </p>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
          Theo dõi đơn ứng tuyển và cập nhật pipeline
        </h1>
        <p className="max-w-2xl text-base text-slate-500 lg:text-lg">
          Tìm kiếm hồ sơ ứng viên, lọc theo vị trí và trạng thái, sau đó cập nhật ngay trong bảng.
        </p>
      </section>

      <Card className="rounded-[32px] border-slate-200/80">
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,2fr)_1fr_220px_auto]">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên, email hoặc số điện thoại"
            />
            <Select name="position" defaultValue={position}>
              <option value="">Tất cả vị trí</option>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select name="status" defaultValue={status}>
              <option value="all">Tất cả trạng thái</option>
              <option value="applied">Đã nộp</option>
              <option value="reviewing">Đang xem xét</option>
              <option value="interview">Phỏng vấn</option>
              <option value="offer">Đề nghị</option>
              <option value="hired">Đã tuyển</option>
              <option value="rejected">Từ chối</option>
            </Select>
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:bg-slate-50"
              type="submit"
            >
              Áp dụng
            </button>
          </form>
        </CardContent>
      </Card>

      <CandidateTable
        data={candidates}
        query={{
          q: q || undefined,
          position: position || undefined,
          status: status === "all" ? undefined : status,
        }}
      />
    </div>
  );
}
