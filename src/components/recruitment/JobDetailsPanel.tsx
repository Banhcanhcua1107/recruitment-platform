import Link from "next/link";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecruitmentJob } from "@/types/recruitment";

interface JobDetailsPanelProps {
  job: RecruitmentJob;
  query: Record<string, string | undefined>;
}

function buildJobsHref(query: Record<string, string | undefined>, nextViewJobId?: string) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!value) {
      continue;
    }

    if (key === "view") {
      continue;
    }

    params.set(key, value);
  }

  if (nextViewJobId) {
    params.set("view", nextViewJobId);
  }

  const queryString = params.toString();
  return queryString ? `/hr/jobs?${queryString}` : "/hr/jobs";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  return new Date(value).toLocaleDateString("vi-VN");
}

function renderTextList(items: string[]) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>;
  }

  return (
    <ul className="space-y-1.5 text-sm text-slate-700">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2">
          <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function JobDetailsPanel({ job, query }: JobDetailsPanelProps) {
  const closeHref = buildJobsHref(query);

  return (
    <div className="fixed inset-0 z-120">
      <Link
        href={closeHref}
        className="absolute inset-0 bg-slate-950/55"
        aria-label="Đóng chi tiết tin tuyển dụng"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-190 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[0_30px_80px_-32px_rgba(15,23,42,0.42)]">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Chi tiết tin tuyển dụng
              </p>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <StatusBadge status={job.status} />
                  <span>{job.location || "Linh hoạt địa điểm"}</span>
                </div>
              </div>
            </div>

            <Link
              href={closeHref}
              className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-900">Ngày đăng:</span> {formatDate(job.postedAt)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Ứng viên:</span> {job.candidateCount}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Hiển thị public:</span> {job.isPublicVisible ? "Đang hiển thị" : "Đã ẩn"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Hạn nộp:</span> {formatDate(job.deadline)}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            <section className="space-y-2 rounded-3xl border border-slate-200 p-4">
              <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mô tả công việc</h4>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {job.description || "Chưa có mô tả chi tiết."}
              </p>
            </section>

            <section className="space-y-2 rounded-3xl border border-slate-200 p-4">
              <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Yêu cầu</h4>
              {renderTextList(job.requirements)}
            </section>

            <section className="space-y-2 rounded-3xl border border-slate-200 p-4">
              <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quyền lợi</h4>
              {renderTextList(job.benefits)}
            </section>

            <section className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Mức lương:</span> {job.salary || "Thỏa thuận"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Kinh nghiệm:</span> {job.experienceLevel || "Không yêu cầu"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Cấp bậc:</span> {job.level || "Linh hoạt"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Hình thức:</span> {job.employmentType || "Toàn thời gian"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Địa chỉ đầy đủ:</span> {job.fullAddress || "Chưa cập nhật"}
              </p>
            </section>

            {job.industry.length > 0 ? (
              <section className="space-y-2 rounded-3xl border border-slate-200 p-4">
                <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ngành nghề</h4>
                <div className="flex flex-wrap gap-2">
                  {job.industry.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {job.sourceUrl ? (
              <section className="space-y-2 rounded-3xl border border-slate-200 p-4">
                <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Nguồn tham chiếu</h4>
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Mở link gốc
                </a>
              </section>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link href={closeHref} className={cn(buttonVariants("outline", "sm"), "sm:min-w-30")}>
              Đóng
            </Link>
            <Link href={`/hr/jobs/${job.id}`} className={cn(buttonVariants("default", "sm"), "sm:min-w-40")}>
              Chỉnh sửa tin này
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  );
}
