import type { Metadata } from "next";
import { WandSparkles } from "lucide-react";
import { TemplateGallery } from "@/components/cv/templates/TemplateGallery";

export const metadata: Metadata = {
  title: "Chọn mẫu CV | TalentFlow",
  description: "Chọn mẫu CV phù hợp trước khi bắt đầu tạo hồ sơ trên TalentFlow.",
};

export default function CandidateTemplatesPage() {
  return (
    <div className="relative overflow-hidden bg-[#f6f7f8]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.12),_transparent_28%),linear-gradient(180deg,_#fdfefe_0%,_#f6f7f8_72%)]" />
      <div className="absolute left-[-6rem] top-32 -z-10 size-56 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="absolute right-[-4rem] top-52 -z-10 size-64 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-10 sm:pt-14 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-10 text-white shadow-[0_32px_120px_-56px_rgba(15,23,42,0.9)] sm:px-10 sm:py-12 lg:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),transparent_45%,rgba(148,163,184,0.12))]" />
          <div className="absolute right-0 top-0 h-44 w-44 translate-x-10 -translate-y-10 rounded-full border border-white/10" />
          <div className="absolute bottom-0 left-0 h-36 w-36 -translate-x-12 translate-y-10 rounded-full border border-white/10" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-200 backdrop-blur-sm">
                <WandSparkles size={14} />
                CV Template Gallery
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Chọn mẫu CV
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Chọn một mẫu CV phù hợp với phong cách của bạn.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Tập trung vào những layout sạch, hiện đại và đủ nổi bật để tạo ấn tượng trong vài giây đầu tiên.
              </p>
            </div>

            <div className="relative rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                Luồng sử dụng
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  1. Chọn mẫu phù hợp với phong cách ứng tuyển.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  2. TalentFlow tạo CV từ template đã chọn.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  3. Chuyển thẳng sang màn hình chỉnh sửa.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <TemplateGallery />
        </section>
      </div>
    </div>
  );
}
