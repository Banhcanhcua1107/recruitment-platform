import Link from "next/link";
import { updateCompanyProfileAction } from "@/app/hr/actions";
import { CompanyProfileForm } from "@/components/recruitment/CompanyProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { getCompanyProfile } from "@/lib/recruitment";

export default async function HRCompanyPage() {
  const companyProfile = await getCompanyProfile();

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Hồ sơ công ty
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Cập nhật trang công ty hiển thị ra public
          </h1>
          <p className="max-w-3xl text-base text-slate-500">
            Dữ liệu ở đây được dùng làm nền cho trang công ty và hỗ trợ điền nhanh khi đăng tin tuyển dụng.
          </p>
        </div>

        <Link className={buttonVariants("outline", "lg")} href="/hr/jobs">
          Quay lại danh sách tin
        </Link>
      </section>

      <CompanyProfileForm
        action={updateCompanyProfileAction}
        initialValues={companyProfile}
      />
    </div>
  );
}
