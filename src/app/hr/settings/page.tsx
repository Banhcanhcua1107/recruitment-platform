import Link from "next/link";
import { RecruiterSettingsPanel } from "@/components/hr/RecruiterSettingsPanel";
import { buttonVariants } from "@/components/ui/button";
import { getCompanyProfile } from "@/lib/recruitment";
import { getCurrentViewer } from "@/lib/viewer";

export default async function HRSettingsPage() {
  const [viewer, companyProfile] = await Promise.all([
    getCurrentViewer(),
    getCompanyProfile(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Workspace settings
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Cài đặt recruiter và vận hành tuyển dụng
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Gói gọn các tùy chỉnh về tài khoản, thông báo và bảo mật vào một nơi để recruiter
              có thể vận hành workspace gọn gàng hơn trong mô hình hiện tại.
            </p>
          </div>

          <Link className={buttonVariants("outline", "lg")} href="/hr/company">
            <span className="material-symbols-outlined text-[18px]">apartment</span>
            Mở hồ sơ công ty
          </Link>
        </div>
      </section>

      <RecruiterSettingsPanel
        viewerName={viewer?.fullName || "Recruiter"}
        viewerEmail={viewer?.email || companyProfile.email || ""}
        companyName={companyProfile.companyName || "Recruiter Workspace"}
      />
    </div>
  );
}
