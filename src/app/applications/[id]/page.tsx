import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { getEmployerCandidateApplicationDetail } from "@/lib/applications";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEmployerCandidateApplicationDetail(id).catch(() => null);

  if (!detail) {
    notFound();
  }

  const hasPdfPreview = Boolean(detail.resumeUrl);

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.24)]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Chi tiết đơn ứng tuyển
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {detail.job.title}
            </h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">
            Đơn ứng tuyển của <span className="font-semibold text-slate-900">{detail.fullName}</span>
            {" "}cho vị trí <span className="font-semibold text-slate-900">{detail.job.title}</span>.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link className={buttonVariants("outline", "sm")} href="/hr/candidates?view=pipeline">
              Quay lại Pipeline ATS
            </Link>
            {detail.resumeUrl ? (
              <a
                href={detail.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants("default", "sm")}
              >
                Xem CV
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Thông tin ứng viên</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Họ tên:</span> {detail.fullName}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Email:</span>{" "}
              {detail.email || "Chưa có email"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Số điện thoại:</span>{" "}
              {detail.phone || "Chưa có số điện thoại"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Kinh nghiệm:</span>{" "}
              {detail.candidateExperience || "Chưa có mô tả kinh nghiệm"}
            </p>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Thông tin công việc ứng tuyển</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Vị trí:</span>{" "}
              <span className="font-semibold text-primary">{detail.job.title}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">Công ty:</span>{" "}
              {detail.job.companyName || "Chưa có tên công ty"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Địa điểm:</span>{" "}
              {detail.job.location || "Chưa có địa điểm"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Mô tả công việc:</span>{" "}
              {detail.job.description || "Chưa có mô tả công việc"}
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-900">CV</h2>
          <div className="mt-4 space-y-4">
            {detail.resumeUrl ? (
              <>
                <a
                  href={detail.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants("outline", "sm")}
                >
                  Xem CV
                </a>
                {hasPdfPreview ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <iframe
                      src={detail.resumeUrl}
                      className="h-110 w-full"
                      title={`CV ${detail.fullName}`}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">Ứng viên chưa đính kèm CV cho đơn này.</p>
            )}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Tin nhắn ứng viên</h2>
          <p className="mt-4 whitespace-pre-wrap wrap-anywhere text-sm leading-7 text-slate-600">
            {detail.coverLetter || detail.introduction || "Ứng viên không gửi thêm nội dung."}
          </p>
        </article>
      </section>

      <section>
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Thông tin đơn ứng tuyển</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span>
              <span className="font-semibold text-slate-900">Ngày ứng tuyển:</span>{" "}
              {formatDate(detail.appliedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold text-slate-900">Trạng thái:</span>
              <StatusBadge status={detail.status} />
            </span>
          </div>
        </article>
      </section>
    </main>
  );
}
