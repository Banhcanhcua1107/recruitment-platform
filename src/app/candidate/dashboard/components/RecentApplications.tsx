import Link from "next/link";
import type { Application } from "@/types/dashboard";

interface RecentApplicationsProps {
  applications: Application[];
  loading?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; color: string }
> = {
  applied: { label: "Đã nộp", color: "text-sky-700 bg-sky-50" },
  reviewing: { label: "Đang xem xét", color: "text-amber-700 bg-amber-50" },
  interview: { label: "Phỏng vấn", color: "text-violet-700 bg-violet-50" },
  offer: { label: "Đề nghị", color: "text-orange-700 bg-orange-50" },
  hired: { label: "Đã tuyển", color: "text-emerald-700 bg-emerald-50" },
  rejected: { label: "Từ chối", color: "text-rose-700 bg-rose-50" },
};

export default function RecentApplications({
  applications,
  loading,
}: RecentApplicationsProps) {
  if (loading) {
    return (
      <div className="h-[400px] rounded-[40px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] animate-pulse" />
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[40px] border border-slate-100 bg-white p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-slate-50">
          <span className="material-symbols-outlined text-4xl text-slate-300">work_off</span>
        </div>
        <h3 className="mb-2 text-2xl font-black text-slate-900">Chưa có đơn ứng tuyển</h3>
        <p className="mb-8 max-w-md text-slate-500">
          Bạn chưa nộp hồ sơ cho công việc nào. Hãy chọn một vị trí phù hợp và nộp CV trực tiếp từ hệ thống.
        </p>
        <Link href="/jobs">
          <button className="rounded-xl bg-primary px-8 py-3 font-black text-white transition-all hover:bg-primary-hover">
            Khám phá việc làm
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-50 px-10 py-8">
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          Ứng tuyển gần đây
        </h3>
        <Link href="/candidate/jobs/applied" className="text-lg font-black text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-10 py-5">Vị trí và công ty</th>
              <th className="px-10 py-5">Ngày nộp</th>
              <th className="px-10 py-5">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {applications.map((application) => (
              <ApplicationRow key={application.id} app={application} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  const config = statusConfig[app.status] ?? statusConfig.applied;

  return (
    <tr className="cursor-default transition-all hover:bg-slate-50">
      <td className="px-10 py-6">
        <div className="flex items-center gap-5">
          {app.job.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.job.logo_url}
              alt={app.job.company_name}
              className="size-14 rounded-2xl border border-slate-100 object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-black uppercase text-white shadow-lg">
              {app.job.company_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-black text-slate-900">{app.job.title}</p>
            <p className="mt-0.5 text-base font-bold text-slate-400">{app.job.company_name}</p>
          </div>
        </div>
      </td>
      <td className="px-10 py-6 text-base font-bold text-slate-500">
        {new Date(app.created_at).toLocaleDateString("vi-VN")}
      </td>
      <td className="px-10 py-6">
        <span className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>
      </td>
    </tr>
  );
}
