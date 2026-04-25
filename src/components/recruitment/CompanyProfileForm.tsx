"use client";

import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/components/recruitment/ImageUploadField";
import type { RecruitmentCompanyProfile } from "@/types/recruitment";

interface CompanyProfileFormProps {
  action: (formData: FormData) => Promise<void>;
  initialValues: RecruitmentCompanyProfile;
  publicPreviewHref?: string | null;
}

export function CompanyProfileForm({
  action,
  initialValues,
  publicPreviewHref = null,
}: CompanyProfileFormProps) {
  const resetToInitialValues = () => {
    setCompanyName(initialValues.companyName);
    setEmail(initialValues.email);
    setCompanySize(initialValues.companySize ?? "");
    setLocation(initialValues.location ?? "");
    setLogoUrl(initialValues.logoUrl ?? "");
    setCoverUrl(initialValues.coverUrl ?? "");
    setIndustryText(initialValues.industry.join("\n"));
    setDescription(initialValues.description ?? "");
  };

  const [companyName, setCompanyName] = useState(initialValues.companyName);
  const [email, setEmail] = useState(initialValues.email);
  const [companySize, setCompanySize] = useState(initialValues.companySize ?? "");
  const [location, setLocation] = useState(initialValues.location ?? "");
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initialValues.coverUrl ?? "");
  const [industryText, setIndustryText] = useState(initialValues.industry.join("\n"));
  const [description, setDescription] = useState(initialValues.description ?? "");

  const industries = useMemo(
    () =>
      industryText
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    [industryText]
  );

  const descriptionParagraphs = useMemo(
    () =>
      description
        .split(/\r?\n+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [description]
  );

  const overviewPreview = descriptionParagraphs[0] ?? "Chưa có mô tả công ty.";
  const culturePreview =
    descriptionParagraphs.slice(1).join(" ") ||
    descriptionParagraphs[0] ||
    "Tạm thời văn hoá tuyển dụng đang dùng chung nội dung với mô tả công ty.";

  return (
    <form
      action={action}
      onReset={resetToInitialValues}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]"
    >
      <div className="space-y-6">
        <Card className="rounded-[32px] border-slate-200/80">
          <CardHeader>
            <CardTitle>Thông tin thương hiệu tuyển dụng</CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Các trường bên dưới được dùng lại cho job post, trang công ty công khai và các
              touchpoint recruiter trong workspace.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Nhận diện doanh nghiệp
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Tên hiển thị và tài sản thương hiệu
                </h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Tên công ty</label>
                  <Input
                    name="companyName"
                    required
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </div>

                <ImageUploadField
                  label="Logo công ty"
                  name="logoUrl"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="URL logo công ty"
                  folder="talentflow/company-logos"
                />

                <ImageUploadField
                  label="Ảnh bìa công ty"
                  name="coverUrl"
                  value={coverUrl}
                  onChange={setCoverUrl}
                  placeholder="URL ảnh bìa hiển thị ở đầu trang công ty"
                  folder="talentflow/company-covers"
                />
              </div>
            </section>

            <section className="space-y-5 border-t border-slate-100 pt-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Liên hệ và quy mô
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Thông tin cơ bản cho recruiter và ứng viên
                </h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email liên hệ</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Quy mô công ty</label>
                  <Input
                    name="companySize"
                    value={companySize}
                    onChange={(event) => setCompanySize(event.target.value)}
                    placeholder="Ví dụ: 50 - 200 nhân sự"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Địa điểm</label>
                  <Input
                    name="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Ví dụ: TP. Hồ Chí Minh"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Lĩnh vực hoạt động</label>
                  <textarea
                    name="industry"
                    value={industryText}
                    onChange={(event) => setIndustryText(event.target.value)}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    placeholder={"Công nghệ thông tin\nPhần mềm\nNhân sự"}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5 border-t border-slate-100 pt-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Nội dung công khai
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Mô tả doanh nghiệp và văn hoá tuyển dụng
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hiện tại mô tả công ty và văn hoá tuyển dụng cùng dùng chung một nguồn dữ liệu,
                  nên bạn có thể viết theo cấu trúc nhiều đoạn để phần xem trước hiển thị rõ hơn.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Mô tả công ty và văn hoá tuyển dụng
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  placeholder="Giới thiệu ngắn gọn về công ty, môi trường làm việc, cách tổ chức đội ngũ và trải nghiệm bạn muốn ứng viên cảm nhận khi gia nhập."
                />
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-[124px] xl:self-start">
        <Card className="overflow-hidden rounded-[32px] border-slate-200/80">
          <div className="relative h-44 bg-gradient-to-br from-primary via-blue-600 to-indigo-700">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover opacity-35" />
            ) : null}
          </div>
          <CardContent className="space-y-4 px-6 pb-6 pt-6">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-black text-primary">
                  {(companyName || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {companyName || "Chưa cập nhật tên công ty"}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {location || "Chưa cập nhật địa điểm"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(industries.length > 0 ? industries : ["Chưa cập nhật lĩnh vực"]).map((item) => (
                <span
                  key={item}
                  className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{overviewPreview}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-slate-200/80">
          <CardHeader>
            <CardTitle>Thông tin liên hệ công khai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Email
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {email || "Chưa cập nhật email"}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Quy mô
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {companySize || "Chưa cập nhật quy mô"}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Văn hoá tuyển dụng
              </p>
              <p className="mt-2 leading-6 text-slate-600">{culturePreview}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {publicPreviewHref ? (
            <a
              href={publicPreviewHref}
              className={buttonVariants("outline", "default")}
            >
              Xem trang công khai
            </a>
          ) : null}
          <Button variant="outline" type="reset">
            Đặt lại
          </Button>
          <Button type="submit" size="lg">
            Lưu hồ sơ công ty
          </Button>
        </div>
      </div>
    </form>
  );
}
