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
      <div className="h-56 md:h-72 relative bg-slate-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.cover_url}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-240 mx-auto px-6 -mt-20 relative z-10 pb-16">
        {/* ── header card ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* logo */}
            <div className="size-20 rounded-2xl border border-slate-100 bg-white p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={job.logo_url}
                alt={job.company_name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                {job.title}
              </h1>
              <p className="text-lg font-bold text-slate-500 mt-1">
                {job.company_name}
              </p>

              {/* pills */}
              <div className="mt-4 flex flex-wrap gap-2">
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

            {/* apply CTA (desktop) */}
            <div className="hidden sm:flex flex-col gap-3 shrink-0">
              {job.source_url && (
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-primary hover:bg-primary-hover text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-xl">send</span>
                  Ứng tuyển ngay
                </a>
              )}
              <button
                className="h-12 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
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
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <h3 className="font-black text-lg text-slate-900">
                Thông tin chung
              </h3>
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

            {/* mobile apply */}
            <div className="sm:hidden space-y-3">
              {job.source_url && (
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-14 w-full bg-primary text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">send</span>
                  Ứng tuyển ngay
                </a>
              )}
            </div>
          </aside>
        </div>

        {/* ── back link ── */}
        <div className="mt-12">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-primary font-black hover:underline"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Quay lại danh sách việc làm
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
        accent
          ? "bg-primary/10 text-primary"
          : "bg-slate-100 text-slate-600"
      }`}
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
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 mb-5">
        <span className="material-symbols-outlined text-primary text-2xl">
          {icon}
        </span>
        {title}
      </h2>
      {children}
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
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary text-xl mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
