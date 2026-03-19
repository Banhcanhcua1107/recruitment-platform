import { CandidateTable } from "@/components/recruitment/CandidateTable";
import { PublicCandidateSearch } from "@/components/recruitment/PublicCandidateSearch";
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
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.1),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f8fafc_100%)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-10">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">
              Quản lý ứng viên ATS
            </p>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">
              Theo dõi snapshot ứng tuyển, mở nhanh chi tiết và xử lý pipeline ngay trên một màn hình.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-500 lg:text-lg">
              Danh sách bên dưới giữ nguyên dữ liệu ứng tuyển tại thời điểm nộp hồ sơ. Hồ sơ
              công khai chỉ được dùng để điều hướng khi ứng viên cho phép chia sẻ.
            </p>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Quy ước nội bộ
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mã ứng viên
                </p>
                <p className="mt-2 font-mono text-sm font-semibold tracking-[0.14em] text-slate-700">
                  ID: CAND-2026-0001
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Dùng mã này để tìm kiếm nhanh, trao đổi nội bộ và đối chiếu log hệ thống thay vì
                dựa vào email.
              </p>
            </div>
          </div>
        </section>

        <Card className="rounded-[36px] border-slate-200/80 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.24)]">
          <CardHeader className="border-b border-slate-200/80">
            <CardTitle>Bộ lọc ATS</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_1fr_240px_auto]">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Tìm theo mã ứng viên, tên, email hoặc số điện thoại"
              />

              <Select name="position" defaultValue={position}>
                <option value="">Tất cả job</option>
                {positions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <Select name="status" defaultValue={status}>
                <option value="all">Tất cả trạng thái</option>
                <option value="applied">Đã nộp</option>
                <option value="reviewing">Đang xử lý</option>
                <option value="interview">Phỏng vấn</option>
                <option value="offer">Đề nghị</option>
                <option value="hired">Đã tuyển</option>
                <option value="rejected">Từ chối</option>
              </Select>

              <button
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:border-primary/30 hover:bg-slate-50 active:translate-y-0"
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

        <section className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Hồ sơ công khai
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              Nguồn tìm kiếm chủ động ngoài ATS
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Khu vực này chỉ hiển thị các hồ sơ đang để public. Nó tách biệt với snapshot ứng
              tuyển ở bảng phía trên để HR không nhầm giữa dữ liệu nộp đơn và hồ sơ ứng viên hiện
              tại.
            </p>
          </div>

          <PublicCandidateSearch />
        </section>
      </div>
    </main>
  );
}
