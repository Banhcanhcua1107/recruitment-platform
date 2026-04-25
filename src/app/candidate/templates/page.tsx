import type { Metadata } from "next";
import { TemplateGalleryPage } from "@/components/cv/templates/TemplateGalleryPage";

export const metadata: Metadata = {
  title: "Chọn mẫu CV | TalentFlow",
  description: "Chọn mẫu CV phù hợp trước khi bắt đầu tạo hồ sơ trên TalentFlow.",
};

export default function CandidateTemplatesPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <TemplateGalleryPage />
    </div>
  );
}
