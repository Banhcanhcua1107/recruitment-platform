import Link from "next/link";
import { notFound } from "next/navigation";
import { APPLICATION_STATUS_LABELS, getCandidateApplicationDetail } from "@/lib/applications";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

const EVENT_LABELS: Record<string, string> = {
  candidate_applied: "Da nop don",
  hr_reviewed: "Nha tuyen dung dang xem xet",
  interview_scheduled: "Da chuyen sang phong van",
  offer_sent: "Da gui de nghi",
  candidate_hired: "Da tuyen",
  candidate_rejected: "Tu choi",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await getCandidateApplicationDetail(id).catch(() => null);

  if (!application) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[1360px] space-y-8 px-6 py-10 lg:px-10">
      <nav className="flex items-center gap-3 text-base font-bold text-slate-400">
        <Link href="/" className="flex items-center gap-1 hover:text-primary">
          <span className="material-symbols-outlined text-xl">home</span>
          Trang chu
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link href="/candidate/applications" className="hover:text-primary">
          Don ung tuyen cua toi
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="font-black tracking-tight text-slate-900">Chi tiet don ung tuyen</span>
      </nav>

      <section className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm lg:p-10">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-6">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-inner">
              {application.job.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={application.job.logoUrl}
                  alt={application.job.companyName}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <span className="text-2xl font-black text-primary">
                  {application.job.companyName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
                  {application.job.title}
                </h1>
                <StatusBadge status={application.status} />
              </div>
              <p className="mb-3 text-lg font-bold italic text-slate-500">
                {application.job.companyName} - {application.job.location || "Chua cap nhat dia diem"}
              </p>
              <div className="flex flex-wrap gap-6 text-base font-black text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">calendar_today</span>
                  Da nop: {new Date(application.appliedAt).toLocaleDateString("vi-VN")}
                </span>
                {application.job.salary ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-primary">payments</span>
                    {application.job.salary}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto">
            {application.cvUrl ? (
              <a
                href={application.cvUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-4 text-base font-black text-slate-700 transition-all hover:bg-slate-100 lg:flex-none"
              >
                <span className="material-symbols-outlined">description</span>
                Xem CV da nop
              </a>
            ) : null}
            {application.email ? (
              <a
                href={`mailto:${application.email}?subject=Application ${application.job.title}`}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-hover lg:flex-none"
              >
                <span className="material-symbols-outlined">forward_to_inbox</span>
                Send follow-up
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-10 py-8">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Tien do ung tuyen
            </h2>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600">
              {APPLICATION_STATUS_LABELS[application.status]}
            </span>
          </div>

          <div className="p-10 lg:p-14">
            <div className="flex flex-col gap-0">
              {application.events.length === 0 ? (
                <p className="text-slate-500">Chua co lich su xu ly cho don ung tuyen nay.</p>
              ) : (
                application.events.map((event, index) => (
                  <TimelineStep
                    key={event.id}
                    title={EVENT_LABELS[event.event] || event.event}
                    description={
                      typeof event.metadata.status === "string"
                        ? `Trang thai hien tai: ${
                            APPLICATION_STATUS_LABELS[
                              event.metadata.status as keyof typeof APPLICATION_STATUS_LABELS
                            ] ?? event.metadata.status
                          }`
                        : "Da ghi nhan su kien xu ly trong he thong."
                    }
                    time={new Date(event.createdAt).toLocaleString("vi-VN")}
                    isLast={index === application.events.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-8 lg:col-span-4">
          <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 text-xl font-black uppercase tracking-tight text-slate-900">
              Tom tat
            </h3>
            <div className="space-y-5">
              <SummaryItem icon="person" label="Ung vien" value={application.fullName} />
              <SummaryItem icon="mail" label="Email" value={application.email} />
              <SummaryItem icon="call" label="Dien thoai" value={application.phone} />
              <SummaryItem icon="business" label="Cong ty" value={application.job.companyName} />
              <SummaryItem icon="work" label="Hinh thuc" value={application.job.employmentType} />
              <SummaryItem icon="badge" label="Cap bac" value={application.job.level} />
              <SummaryItem
                icon="pin_drop"
                label="Dia diem"
                value={application.job.fullAddress || application.job.location}
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="mb-4 text-xl font-black uppercase tracking-tight text-slate-900">
              Gioi thieu
            </h3>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-600">
              {application.introduction || "Ban chua gui gioi thieu cho don ung tuyen nay."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function TimelineStep({
  title,
  description,
  time,
  isLast,
}: {
  title: string;
  description: string;
  time: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-8 pb-14">
      {!isLast ? <div className="absolute bottom-0 left-6 top-12 w-[3px] bg-slate-100" /> : null}
      <div className="z-10 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
        <span className="material-symbols-outlined text-2xl font-bold">check_circle</span>
      </div>
      <div className="flex-1">
        <p className="text-xl font-black text-slate-900 lg:text-2xl">{title}</p>
        <p className="mt-2 text-base font-bold leading-relaxed text-slate-500 lg:text-lg">
          {description}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold italic uppercase tracking-wide text-slate-400">
          <span className="material-symbols-outlined text-base">schedule</span>
          {time}
        </p>
      </div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-4">
      <span className="material-symbols-outlined mt-0.5 text-2xl font-bold text-slate-300">
        {icon}
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-bold leading-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}
