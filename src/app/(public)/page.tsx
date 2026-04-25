import Link from "next/link";
import HomeDeferredSectionsLoader from "./HomeDeferredSectionsLoader";
import { getLatestPublicJobSummaries } from "@/lib/public-job-summaries";

export const revalidate = 600;

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

function resolveFeaturedTag(postedDate: string, index: number) {
  if (!postedDate) {
    return index === 0 ? "HOT" : "";
  }

  const parsed = new Date(postedDate);
  if (Number.isNaN(parsed.getTime())) {
    return index === 0 ? "HOT" : "";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 2) {
    return "HOT";
  }

  if (diffDays <= 7) {
    return "NEW";
  }

  return "";
}

function getFallbackFeaturedJobs(): FeaturedJobCardData[] {
  return [
    {
      title: "Senior Frontend Engineer",
      company: "VNG Corporation",
      salary: "$2,000 - $3,500",
      location: "Hồ Chí Minh",
      tag: "HOT",
    },
    {
      title: "Product Manager",
      company: "Tiki",
      salary: "$1,800 - $2,800",
      location: "Hà Nội",
      tag: "NEW",
    },
    {
      title: "UI/UX Designer",
      company: "FPT Software",
      salary: "$1,200 - $2,000",
      location: "Đà Nẵng",
      tag: "",
    },
  ];
}

export default async function HomePage() {
  const latestJobs = await getLatestPublicJobSummaries(3);
  const featuredJobs: FeaturedJobCardData[] = latestJobs.length
    ? latestJobs.map((job, index) => ({
        id: job.id,
        title: job.title,
        company: job.company_name,
        salary: job.salary || "Thỏa thuận",
        location: job.location || "Toàn quốc",
        tag: resolveFeaturedTag(job.posted_date, index),
      }))
    : getFallbackFeaturedJobs();

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#f6f7f8]">
      <main className="flex-1">
        <section className="relative overflow-hidden bg-white pb-32 pt-20">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute right-1/4 top-40 h-20 w-20 rotate-12 rounded-2xl bg-primary/14" />
            <div className="absolute bottom-32 left-1/4 h-16 w-16 rounded-full bg-primary/10" />
            <div className="absolute left-20 top-60 h-12 w-12 rotate-45 rounded-xl border-4 border-primary/20" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.03)_1px,transparent_1px)] bg-size-[60px_60px]" />
          </div>

          <div className="relative z-10 mx-auto flex max-w-340 flex-col items-center px-6 lg:px-10">
            <div className="mb-10 grid w-full items-center gap-24 text-left lg:grid-cols-2">
              <div>
                <div className="mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-bold text-primary shadow-sm">
                  <span className="mr-3 flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
                  Nền tảng sự nghiệp thế hệ mới
                </div>

                <h1 className="mb-8 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                  Kết nối với{" "}
                  <span className="text-gradient hero-gradient-heading relative whitespace-nowrap">
                    công việc
                    <svg className="absolute -bottom-2 left-0 h-3 w-full text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                      <path d="M0 6 Q50 12 100 6 T200 6" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  </span>{" "}
                  <br className="hidden lg:block" />
                  bạn hằng mong ước
                </h1>

                <p className="mb-10 max-w-xl text-lg font-medium leading-relaxed text-slate-600 md:text-xl">
                  Khám phá hàng ngàn cơ hội nghề nghiệp từ các doanh nghiệp uy tín nhất.
                  Tạo CV chuyên nghiệp và ứng tuyển chỉ trong 1 phút.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/jobs"
                    className="btn-shine inline-flex h-14 items-center rounded-2xl bg-primary px-8 text-lg font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover active:scale-95"
                  >
                    Khám phá việc làm
                    <MaterialIcon name="arrow_forward" className="ml-2 text-xl" />
                  </Link>
                  <Link
                    href="/candidate/cv-builder"
                    className="inline-flex h-14 items-center rounded-2xl border-2 border-slate-200 bg-white px-8 text-lg font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                  >
                    <MaterialIcon name="description" className="mr-2 text-xl" />
                    Tạo CV miễn phí
                  </Link>
                </div>

                <div className="mt-12 flex flex-wrap gap-8 border-t border-slate-100 pt-8">
                  <Stat value="10K+" label="Việc làm" />
                  <Stat value="5K+" label="Công ty" />
                  <Stat value="50K+" label="Ứng viên" />
                </div>
              </div>

              <div className="relative hidden animate-fade-in delay-300 lg:block">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[40px] bg-linear-to-br from-primary/16 to-sky-400/12" />

                  <div className="group relative h-120 w-full overflow-hidden rounded-4xl bg-slate-100 shadow-2xl shadow-slate-900/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=900&fit=crop&auto=format&q=80"
                      alt="Đội ngũ đang cộng tác tại văn phòng"
                      fetchPriority="high"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 via-transparent to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 p-5 shadow-xl shadow-slate-900/10">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-green-500 text-white">
                          <MaterialIcon name="trending_up" className="text-xl" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">+1,234 việc làm mới</p>
                          <p className="text-sm text-slate-500">Được cập nhật hôm nay</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-5xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="group flex h-16 flex-[1.4] items-center rounded-2xl border-2 border-transparent bg-slate-50 px-6 transition-all focus-within:border-primary focus-within:bg-white focus-within:glow-primary">
                  <MaterialIcon name="search" className="mr-4 text-2xl text-slate-400 transition-colors group-focus-within:text-primary" />
                  <input
                    className="w-full border-none bg-transparent p-0 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    placeholder="Vị trí ứng tuyển, kỹ năng..."
                    type="text"
                  />
                </div>

                <div className="group flex h-16 flex-1 items-center rounded-2xl border-2 border-transparent bg-slate-50 px-6 transition-all focus-within:border-primary focus-within:bg-white focus-within:glow-primary">
                  <MaterialIcon name="location_on" className="mr-4 text-2xl text-slate-400 transition-colors group-focus-within:text-primary" />
                  <input
                    className="w-full border-none bg-transparent p-0 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    placeholder="Địa điểm..."
                    type="text"
                  />
                </div>

                <button className="btn-shine h-16 rounded-2xl bg-primary px-10 text-lg font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover active:scale-95">
                  Tìm kiếm ngay
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 px-2">
                <span className="text-sm font-bold uppercase tracking-tight text-slate-400">Gợi ý:</span>
                {["Developer", "Marketing", "Kế toán", "Thiết kế", "Sales", "HR"].map((tag) => (
                  <Link
                    key={tag}
                    href={`/jobs?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-primary hover:text-white"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <HomeDeferredSectionsLoader featuredJobs={featuredJobs} />
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-primary md:text-3xl">{value}</p>
      <p className="font-medium text-slate-500">{label}</p>
    </div>
  );
}
