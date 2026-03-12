"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/components/recruitment/ImageUploadField";
import type { RecruitmentCompanyProfile } from "@/types/recruitment";

interface CompanyProfileFormProps {
  action: (formData: FormData) => Promise<void>;
  initialValues: RecruitmentCompanyProfile;
}

export function CompanyProfileForm({
  action,
  initialValues,
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

  return (
    <form
      action={action}
      onReset={resetToInitialValues}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
    >
      <Card className="rounded-[32px] border-slate-200/80">
        <CardHeader>
          <CardTitle>Hồ sơ công ty</CardTitle>
          <p className="text-sm text-slate-500">
            Thông tin ở đây sẽ được dùng lại cho trang công ty và các tin tuyển dụng công khai.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:col-span-2">
            Nếu đang thấy tên cá nhân ở phần xem trước, đó là do hệ thống đang lấy mặc định từ
            hồ sơ tài khoản HR. Hãy cập nhật lại đúng tên công ty tại đây.
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Tên công ty</label>
            <Input
              name="companyName"
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Địa điểm</label>
            <Input
              name="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ví dụ: TP. Hồ Chí Minh"
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

          <div className="md:col-span-2">
            <ImageUploadField
              label="Ảnh bìa công ty"
              name="coverUrl"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="URL ảnh bìa hiển thị ở đầu trang công ty"
              folder="talentflow/company-covers"
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

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Mô tả công ty</label>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[200px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder="Giới thiệu ngắn gọn về công ty, môi trường làm việc và định hướng phát triển."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border-slate-200/80">
          <div className="relative h-44 bg-gradient-to-br from-primary via-blue-600 to-indigo-700">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover opacity-35" />
            ) : null}
          </div>
          <CardContent className="space-y-4 px-6 pt-6 pb-6">
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
            <p className="text-sm leading-relaxed text-slate-600">
              {description || "Chưa có mô tả công ty."}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
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
