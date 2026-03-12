import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ApplyJobCard } from "@/components/jobs/ApplyJobCard";
import { companySlug, getJobsByCompanySlug } from "@/lib/companies";
import { getAllJobs, getJobById } from "@/lib/jobs";

export async function generateStaticParams() {
  const jobs = await getAllJobs();
  return jobs.map((job) => ({ id: job.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return {
      title: "Không tìm thấy việc làm | TalentFlow",
    };
  }

  return {
    title: `${job.title} - ${job.company_name} | TalentFlow`,
    description: job.description?.[0] ?? `Ứng tuyển ${job.title} tại ${job.company_name}`,
    openGraph: {
      title: job.title,
      description: job.description?.[0] ?? "",
      images: job.cover_url ? [job.cover_url] : [],
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  const slug = companySlug(job.company_name);
  const relatedJobs = (await getJobsByCompanySlug(slug))
    .filter((item) => item.id !== job.id)
    .slice(0, 6);
  const initial = job.company_name?.charAt(0) ?? "?";
  const hasCompanyLogo = Boolean(job.logo_url && !job.logo_url.includes("placeholder"));

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <div className="relative h-64 overflow-hidden bg-slate-200 md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.cover_url || "https://placehold.co/1600x480?text=TalentFlow"}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-6 pb-20">
        <div className="mb-8 rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 md:p-10">
          <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-[420px_minmax(0,1fr)]">
            <div className="w-full min-w-0 min-[900px]:w-[420px] min-[900px]:min-w-[420px] min-[900px]:flex-shrink-0">
              <div className="flex min-w-0 flex-col items-start gap-6 sm:flex-row">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.logo_url || "https://placehold.co/128x128?text=Logo"}
                  alt={job.company_name}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="mb-2 whitespace-normal break-words text-2xl font-black leading-tight text-slate-900 [word-break:keep-all] md:text-3xl lg:text-4xl">
                  {job.title}
                </h1>
                <Link
                  href={`/companies/${slug}`}
                  className="text-lg font-bold text-slate-600 transition-colors hover:text-primary md:text-xl"
                >
                  {job.company_name}
                </Link>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Pill icon="location_on" text={job.location || "Chưa cập nhật"} />
                  <Pill icon="payments" text={job.salary || "Thỏa thuận"} accent />
                  {job.employment_type ? <Pill icon="work" text={job.employment_type} /> : null}
                  {job.level ? <Pill icon="badge" text={job.level} /> : null}
                  {job.deadline ? <Pill icon="event" text={`Hạn nộp: ${job.deadline}`} /> : null}
                </div>
              </div>
            </div>
            </div>

            <div className="hidden w-full max-w-[600px] min-w-0 justify-self-end min-[900px]:block">
              <ApplyJobCard
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.company_name}
                sourceUrl={job.source_url}
                compact
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {job.description?.length ? (
              <Section title="Mô tả công việc" icon="description">
                <ul className="space-y-2 text-slate-700">
                  {job.description.map((line, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-1 shrink-0 text-primary">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {job.requirements?.length ? (
              <Section title="Yêu cầu ứng viên" icon="checklist">
                <ul className="space-y-2 text-slate-700">
                  {job.requirements.map((line, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-1 shrink-0 text-primary">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {job.benefits?.length ? (
              <Section title="Quyền lợi" icon="volunteer_activism">
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((item, index) => (
                    <span
                      key={index}
                      className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <div className="min-[900px]:hidden">
                <ApplyJobCard
                  jobId={job.id}
                  jobTitle={job.title}
                  companyName={job.company_name}
                  sourceUrl={job.source_url}
                />
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-900">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Thông tin chung
                </h3>
                <div className="space-y-5">
                  <InfoRow icon="work" label="Hình thức" value={job.employment_type} />
                  <InfoRow icon="badge" label="Cấp bậc" value={job.level} />
                  <InfoRow icon="trending_up" label="Kinh nghiệm" value={job.experience_level} />
                  <InfoRow icon="school" label="Học vấn" value={job.education_level} />
                  <InfoRow icon="group" label="Độ tuổi" value={job.age_range} />
                  <InfoRow icon="pin_drop" label="Địa chỉ" value={job.full_address} />
                  {job.industry?.length ? (
                    <InfoRow icon="category" label="Ngành nghề" value={job.industry.join(", ")} />
                  ) : null}
                </div>
              </div>

              <Link
                href={`/companies/${slug}`}
                className="group block rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                  <span className="material-symbols-outlined text-primary">business</span>
                  Về công ty
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">
                    {hasCompanyLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={job.logo_url}
                        alt={job.company_name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xl font-black text-primary">{initial}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-black text-slate-900 transition-colors group-hover:text-primary">
                      {job.company_name}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-bold text-slate-400">
                      {job.location || "Chưa cập nhật"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-slate-400 transition-colors group-hover:text-primary">
                    arrow_forward
                  </span>
                </div>
              </Link>
            </div>
          </aside>
        </div>

        {relatedJobs.length ? (
          <section className="mt-10">
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">business</span>
              </span>
              Các việc làm khác tại {job.company_name}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedJobs.map((item) => (
                <Link
                  key={item.id}
                  href={`/jobs/${item.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <h4 className="mb-2 line-clamp-2 text-base font-black leading-snug text-slate-900 transition-colors group-hover:text-primary">
                    {item.title}
                  </h4>
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-black text-primary">
                      {item.salary || "Thỏa thuận"}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {item.location}
                    </span>
                    {item.deadline ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {item.deadline}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-14 inline-block">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-100 bg-white px-6 py-3 font-black text-slate-600 transition-all hover:-translate-x-1 hover:border-primary/30 hover:text-primary hover:shadow-sm"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Danh sách việc làm
          </Link>
        </div>
      </div>
    </main>
  );
}

function Pill({
  icon,
  text,
  accent = false,
}: {
  icon: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold",
        accent
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {text}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-8 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-900">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-semibold leading-relaxed text-slate-700">{value}</p>
      </div>
    </div>
  );
}
