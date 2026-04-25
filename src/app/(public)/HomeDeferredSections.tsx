"use client";

import Link from "next/link";

interface FeaturedJobCardData {
  id?: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  tag: string;
}

function MaterialIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`} aria-hidden="true">
      {name}
    </span>
  );
}

export default function HomeDeferredSections({
  featuredJobs,
}: {
  featuredJobs: FeaturedJobCardData[];
}) {
  return (
    <>
      <section className="py-24 bg-[#f6f7f8] [content-visibility:auto] [contain-intrinsic-size:920px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <span className="inline-block px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-full mb-4">
                Nổi bật
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Việc làm nổi bật</h2>
              <p className="text-slate-500 mt-3 text-lg">Đừng bỏ lỡ những cơ hội tốt nhất được cập nhật mỗi ngày.</p>
            </div>
            <Link href="/jobs" className="inline-flex items-center text-primary font-bold hover:gap-3 gap-1 transition-all group">
              Xem tất cả việc làm
              <MaterialIcon name="arrow_forward" className="text-xl transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job, index) => (
              <JobCard key={job.id ?? `${job.title}-${index}`} {...job} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white relative overflow-hidden [content-visibility:auto] [contain-intrinsic-size:980px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.05)_0%,transparent_50%)]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-full mb-4">
              CÁCH HOẠT ĐỘNG
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Quy trình ứng tuyển dễ dàng</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Chỉ 3 bước đơn giản để bắt đầu hành trình sự nghiệp mới của bạn</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-linear-to-r from-primary/20 via-primary to-primary/20" />

            <Step iconName="person_add" step="1" title="Tạo tài khoản" desc="Đăng ký thành viên và hoàn thiện hồ sơ cá nhân của bạn." />
            <Step iconName="description" step="2" title="Tạo/Tải CV" desc="Dùng công cụ tạo CV online hoặc tải lên file sẵn có." />
            <Step iconName="send" step="3" title="Ứng tuyển ngay" desc="Tìm kiếm và gửi hồ sơ trực tiếp đến nhà tuyển dụng." />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-linear-to-br from-primary via-blue-600 to-sky-600 py-24 [content-visibility:auto] [contain-intrinsic-size:760px]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Sẵn sàng khởi đầu sự nghiệp mới?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Hàng ngàn công ty đang chờ đợi bạn. Đăng ký ngay hôm nay và nhận thông báo về những công việc phù hợp nhất.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register?role=candidate"
              className="btn-shine inline-flex items-center h-14 px-10 bg-white text-primary text-lg font-bold rounded-2xl shadow-xl shadow-black/10 transition-all hover:-translate-y-1 active:scale-95"
            >
              Đăng ký miễn phí
              <MaterialIcon name="arrow_forward" className="ml-2 text-xl" />
            </Link>
            <Link
              href="/register?role=employer"
              className="inline-flex items-center h-14 px-10 border-2 border-white/30 hover:bg-white/10 text-white text-lg font-bold rounded-2xl transition-all hover:-translate-y-1"
            >
              Dành cho nhà tuyển dụng
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

interface JobCardProps extends FeaturedJobCardData {
  index: number;
}

const JOB_CARD_ANIMATION_DELAYS = [
  "[animation-delay:0ms]",
  "[animation-delay:100ms]",
  "[animation-delay:200ms]",
  "[animation-delay:300ms]",
  "[animation-delay:400ms]",
  "[animation-delay:500ms]",
];

function JobCard({ id, title, company, salary, location, tag, index }: JobCardProps) {
  const href = id ? `/jobs/${id}` : "/jobs";

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10",
        JOB_CARD_ANIMATION_DELAYS[index % JOB_CARD_ANIMATION_DELAYS.length],
      ].join(" ")}
    >
      <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-primary/0 to-violet-500/0 transition-all duration-500 group-hover:from-primary/5 group-hover:to-violet-500/5" />

      <div className="relative z-10">
        {tag && (
          <span className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl rounded-tr-2xl ${
            tag === "HOT" ? "bg-red-500 text-white" : "bg-green-500 text-white"
          }`}>
            {tag}
          </span>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="size-14 rounded-2xl bg-linear-to-br from-primary/10 to-violet-500/10 flex items-center justify-center border border-primary/10 font-bold text-primary transition-transform duration-300 group-hover:scale-110">
            <MaterialIcon name="apartment" className="text-3xl" />
          </div>
          <div>
            <Link href={href} className="block">
              <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
            </Link>
            <p className="text-sm text-slate-500">{company}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            <MaterialIcon name="location_on" className="mr-1 text-base" />
            {location}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-bold">
            {salary}
          </span>
        </div>

        <Link href={href} className="btn-shine block w-full rounded-2xl border-2 border-primary/20 py-3.5 text-center font-bold text-primary transition-all duration-300 hover:border-primary hover:bg-primary hover:text-white">
          Ứng tuyển ngay
        </Link>
      </div>
    </div>
  );
}

function Step({
  iconName,
  step,
  title,
  desc,
}: {
  iconName: string;
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      <div className="relative mb-8">
        <div className="size-24 rounded-3xl bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-xl shadow-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/40">
          <MaterialIcon name={iconName} className="text-5xl" />
        </div>
        <div className="absolute -top-3 -right-3 size-10 rounded-full bg-white border-4 border-primary text-primary flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
          {step}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-slate-500 leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}
