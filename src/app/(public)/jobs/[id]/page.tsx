import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllJobs, getJobById } from "@/lib/jobs";

// ── Static params for SSG ───────────────────────
export function generateStaticParams() {
  return getAllJobs().map((j) => ({ id: j.id }));
}

// ── SEO metadata ────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = getJobById(id);
  if (!job)
    return { title: "Không tìm thấy việc làm | TalentFlow" };

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

// ── Page ────────────────────────────────────────
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = getJobById(id);
  if (!job) notFound();

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      {/* ── cover banner ── */}
      <div className="h-64 md:h-80 relative bg-slate-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.cover_url}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10 pb-20">
        {/* ── header card ── */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-10 mb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
            <div className="flex flex-col sm:flex-row gap-6 items-start flex-1 min-w-0">
              {/* logo */}
              <div className="size-24 rounded-2xl border border-slate-100 bg-white p-3 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.logo_url}
                  alt={job.company_name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-2">
                  {job.title}
                </h1>
                <p className="text-lg md:text-xl font-bold text-slate-600">
                  {job.company_name}
                </p>

                {/* pills */}
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Pill icon="location_on" text={job.location} />
                  <Pill icon="payments" text={job.salary} accent />
                  {job.employment_type && (
                    <Pill icon="work" text={job.employment_type} />
                  )}
                  {job.level && <Pill icon="badge" text={job.level} />}
                  {job.deadline && (
                    <Pill icon="event" text={`Hạn nộp: ${job.deadline}`} />
                  )}
                </div>
              </div>
            </div>

            {/* apply CTA (desktop) */}
            <div className="hidden lg:flex flex-col gap-3 shrink-0 min-w-[200px]">
              {job.source_url && (
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-14 w-full bg-primary hover:bg-primary-hover text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-xl">send</span>
                  Ứng tuyển
                </a>
              )}
              <button
                className="flex items-center justify-center gap-2 h-14 w-full rounded-2xl border-2 border-slate-100 bg-white text-slate-600 font-black hover:border-slate-300 hover:bg-slate-50 transition-all hover:-translate-y-0.5"
                title="Lưu tin"
              >
                <span className="material-symbols-outlined text-xl">bookmark_border</span>
                Lưu tin
              </button>
            </div>
          </div>
        </div>

        {/* ── body grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* left – main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* description */}
            {job.description?.length > 0 && (
              <Section title="Mô tả công việc" icon="description">
                <ul className="space-y-2 text-slate-700 font-semibold leading-relaxed">
                  {job.description.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary mt-1 shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* requirements */}
            {job.requirements?.length > 0 && (
              <Section title="Yêu cầu ứng viên" icon="checklist">
                <ul className="space-y-2 text-slate-700 font-semibold leading-relaxed">
                  {job.requirements.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary mt-1 shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* benefits */}
            {job.benefits?.length > 0 && (
              <Section title="Quyền lợi" icon="volunteer_activism">
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((b, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* right – sidebar info */}
          <aside className="space-y-6">
            <div className="sticky top-6">
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-6">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Thông tin chung
                </h3>
                <div className="space-y-5">
                  <InfoRow
                    icon="work"
                    label="Hình thức"
                    value={job.employment_type}
                  />
                  <InfoRow icon="badge" label="Cấp bậc" value={job.level} />
                  {job.experience_level && (
                    <InfoRow
                      icon="trending_up"
                      label="Kinh nghiệm"
                      value={job.experience_level}
                    />
                  )}
                  {job.education_level && (
                    <InfoRow
                      icon="school"
                      label="Học vấn"
                      value={job.education_level}
                    />
                  )}
                  {job.age_range && (
                    <InfoRow
                      icon="group"
                      label="Độ tuổi"
                      value={job.age_range}
                    />
                  )}
                  {job.full_address && (
                    <InfoRow
                      icon="pin_drop"
                      label="Địa chỉ"
                      value={job.full_address}
                    />
                  )}
                  {job.industry?.length > 0 && (
                    <InfoRow
                      icon="category"
                      label="Ngành nghề"
                      value={job.industry.join(", ")}
                    />
                  )}
                </div>
              </div>

              {/* mobile/tablet apply */}
              <div className="lg:hidden space-y-3 mt-6">
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-14 w-full bg-primary hover:bg-primary-hover text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-xl">send</span>
                    Ứng tuyển
                  </a>
                )}
                <button
                  className="flex items-center justify-center gap-2 h-14 w-full rounded-2xl border-2 border-slate-100 bg-white text-slate-600 font-black hover:border-slate-300 hover:bg-slate-50 transition-all hover:-translate-y-0.5"
                  title="Lưu tin"
                >
                  <span className="material-symbols-outlined text-xl">bookmark_border</span>
                  Lưu tin
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* ── back link ── */}
        <div className="mt-14 inline-block">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-100 bg-white text-slate-600 font-black hover:text-primary hover:border-primary/30 hover:shadow-sm hover:-translate-x-1 transition-all"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Danh sách việc làm
          </Link>
        </div>
      </div>
    </main>
  );
}

// ── small helper components (server, no "use client") ──

function Pill({
  icon,
  text,
  accent,
}: {
  icon: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border ${
        accent
          ? "bg-primary/5 text-primary border-primary/10"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
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
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[24px] border border-slate-100 p-6 md:p-10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
      <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 mb-6">
        <span className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-2xl">
            {icon}
          </span>
        </span>
        {title}
      </h2>
      <div className="text-slate-600 text-base leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3.5 group">
      <span className="flex items-center justify-center size-10 rounded-[10px] bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        <span className="material-symbols-outlined text-xl">
          {icon}
        </span>
      </span>
      <div className="pt-0.5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
