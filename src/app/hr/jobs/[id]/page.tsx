import Link from "next/link";
import { notFound } from "next/navigation";
import { updateJobAction } from "@/app/hr/actions";
import { JobEditorForm } from "@/components/recruitment/JobEditorForm";
import { buttonVariants } from "@/components/ui/button";
import { getJobById } from "@/lib/recruitment";

interface EditJobPageProps {
  params: Promise<{ id: string }>;
}

export default async function HREditJobPage({ params }: EditJobPageProps) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-300 flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Chỉnh sửa tin tuyển dụng
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Cập nhật nội dung hiển thị công khai
          </h1>
          <p className="max-w-2xl text-base text-slate-500">
            Đồng bộ lại phần mô tả, quyền lợi, metadata và hình ảnh để job detail ngoài public hiển thị đúng.
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

      <JobEditorForm
        action={updateJobAction}
        mode="edit"
        initialValues={{
          id: String(job.id),
          title: job.title,
          companyName: job.companyName,
          logoUrl: job.logoUrl,
          coverUrl: job.coverUrl,
          location: job.location,
          status: job.status,
          description: job.description,
          salary: job.salary,
          requirements: job.requirements,
          benefits: job.benefits,
          industry: job.industry,
          experienceLevel: job.experienceLevel,
          level: job.level,
          employmentType: job.employmentType,
          deadline: job.deadline,
          educationLevel: job.educationLevel,
          ageRange: job.ageRange,
          fullAddress: job.fullAddress,
          sourceUrl: job.sourceUrl,
          targetApplications: job.targetApplications,
        }}
      />
    </div>
  );
}
