"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ImageUploadField } from "@/components/recruitment/ImageUploadField";
import type { JobStatus } from "@/types/recruitment";

interface JobEditorFormProps {
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  initialValues?: {
    id?: string;
    title?: string | null;
    companyName?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
    location?: string | null;
    status?: string | null;
    description?: string | null;
    salary?: string | null;
    requirements?: string[] | null;
    benefits?: string[] | null;
    industry?: string[] | null;
    experienceLevel?: string | null;
    level?: string | null;
    employmentType?: string | null;
    deadline?: string | null;
    educationLevel?: string | null;
    ageRange?: string | null;
    fullAddress?: string | null;
    sourceUrl?: string | null;
    targetApplications?: number | null;
  };
}

const STATUS_OPTIONS: JobStatus[] = ["draft", "open", "closed"];
const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Bản nháp",
  open: "Đang mở",
  closed: "Đã đóng",
};

export function JobEditorForm({
  action,
  mode,
  initialValues,
}: JobEditorFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [salary, setSalary] = useState(initialValues?.salary ?? "");
  const [logoUrl, setLogoUrl] = useState(initialValues?.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? "");

  const resetPreviewState = () => {
    setTitle(initialValues?.title ?? "");
    setLocation(initialValues?.location ?? "");
    setSalary(initialValues?.salary ?? "");
    setLogoUrl(initialValues?.logoUrl ?? "");
    setCoverUrl(initialValues?.coverUrl ?? "");
  };

  return (
    <form
      action={action}
      onReset={resetPreviewState}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]"
    >
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}

      <Card className="rounded-4xl border-slate-200/80">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Tạo tin tuyển dụng" : "Chỉnh sửa tin tuyển dụng"}
          </CardTitle>
          <p className="text-sm text-slate-500">
            Nhập đầy đủ nội dung để tin tuyển dụng hiển thị đúng ở trang việc làm công khai.
          </p>
        </CardHeader>

        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Tiêu đề công việc</label>
            <Input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Lập trình viên Frontend Senior"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Địa điểm làm việc</label>
            <Input
              name="location"
              required
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ví dụ: TP. Hồ Chí Minh"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Địa chỉ đầy đủ</label>
            <Input
              name="fullAddress"
              defaultValue={initialValues?.fullAddress ?? ""}
              placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Trạng thái</label>
            <Select
              name="status"
              defaultValue={(initialValues?.status as JobStatus | undefined) ?? "draft"}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mức lương</label>
            <Input
              name="salary"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
              placeholder="Ví dụ: 25 - 35 triệu"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Số lượng hồ sơ mong muốn</label>
            <Input
              name="targetApplications"
              type="number"
              min={1}
              step={1}
              defaultValue={initialValues?.targetApplications ?? ""}
              placeholder="Ví dụ: 30"
            />
            <p className="text-xs leading-5 text-slate-500">
              Chỉ dùng để bạn tự theo dõi và tự ẩn tin khi đã đủ. Hệ thống không tự động đóng tin và không chặn ứng viên nộp CV.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Hình thức làm việc</label>
            <Input
              name="employmentType"
              defaultValue={initialValues?.employmentType ?? ""}
              placeholder="Toàn thời gian / Hybrid / Remote"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
            <Input
              name="level"
              defaultValue={initialValues?.level ?? ""}
              placeholder="Junior / Middle / Senior"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kinh nghiệm</label>
            <Input
              name="experienceLevel"
              defaultValue={initialValues?.experienceLevel ?? ""}
              placeholder="Ví dụ: Từ 2 năm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Học vấn</label>
            <Input
              name="educationLevel"
              defaultValue={initialValues?.educationLevel ?? ""}
              placeholder="Ví dụ: Đại học"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Độ tuổi</label>
            <Input
              name="ageRange"
              defaultValue={initialValues?.ageRange ?? ""}
              placeholder="Ví dụ: 22 - 30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Hạn nộp</label>
            <Input
              name="deadline"
              defaultValue={initialValues?.deadline ?? ""}
              placeholder="Ví dụ: 30/04/2026"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Link ứng tuyển</label>
            <Input
              name="sourceUrl"
              defaultValue={initialValues?.sourceUrl ?? ""}
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2">
            <ImageUploadField
              label="Logo công ty"
              name="logoUrl"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="URL logo dùng cho card và trang chi tiết"
              folder="talentflow/job-logos"
            />
          </div>

          <div className="md:col-span-2">
            <ImageUploadField
              label="Ảnh bìa tuyển dụng"
              name="coverUrl"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="URL ảnh cover hiển thị ở đầu trang việc làm"
              folder="talentflow/job-covers"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Ngành nghề</label>
            <textarea
              name="industry"
              defaultValue={(initialValues?.industry ?? []).join("\n")}
              className="min-h-25 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder={"Công nghệ thông tin\nPhần mềm\nSaaS"}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Yêu cầu</label>
            <textarea
              name="requirements"
              defaultValue={(initialValues?.requirements ?? []).join("\n")}
              className="min-h-35 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder={"React\nTypeScript\nTư duy hệ thống"}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Quyền lợi</label>
            <textarea
              name="benefits"
              defaultValue={(initialValues?.benefits ?? []).join("\n")}
              className="min-h-35 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder={"Thưởng hiệu suất\nBảo hiểm đầy đủ\nLinh hoạt thời gian làm việc"}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Mô tả công việc</label>
            <textarea
              name="description"
              required
              defaultValue={initialValues?.description ?? ""}
              className="min-h-55 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder="Nhập trách nhiệm, mục tiêu tuyển dụng và bối cảnh công việc."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-4xl border-slate-200/80">
          <div className="relative h-44 bg-linear-to-br from-primary via-blue-600 to-indigo-700">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover opacity-35" />
            ) : null}
          </div>
          <CardContent className="space-y-4 px-6 pt-6 pb-6">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={title} className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-2xl font-black text-primary">
                  {(title || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {title || "Chưa cập nhật tiêu đề công việc"}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {location || "Chưa cập nhật địa điểm"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                {salary || "Chưa cập nhật mức lương"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Bản xem trước nhanh phần media của tin tuyển dụng ngoài public.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="reset">
            Đặt lại
          </Button>
          <Button type="submit" size="lg">
            {mode === "create" ? "Đăng tin" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </form>
  );
}
