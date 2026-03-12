import Link from "next/link";
import { createJobAction } from "@/app/hr/actions";
import { JobEditorForm } from "@/components/recruitment/JobEditorForm";
import { buttonVariants } from "@/components/ui/button";

export default function HRCreateJobPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Tạo tin tuyển dụng
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Đăng một tin tuyển dụng mới
          </h1>
          <p className="max-w-2xl text-base text-slate-500">
            Nhập đầy đủ thông tin để tin tuyển dụng hiển thị đúng ở trang việc làm và trang công ty công khai.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className={buttonVariants("outline", "lg")} href="/hr/company">
            Hồ sơ công ty
          </Link>
          <Link className={buttonVariants("outline", "lg")} href="/hr/jobs">
            Quay lại danh sách tin
          </Link>
        </div>
      </section>

      <JobEditorForm action={createJobAction} mode="create" />
    </div>
  );
}
