"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RelatedCompanyJob {
  id: string;
  title: string;
  url: string;
  matchScore: number;
}

export interface RelatedCompanyJobDetail extends RelatedCompanyJob {
  location: string;
  description: string;
  requirements: string[];
  industry: string[];
  experienceLevel: string | null;
  salary: string | null;
  deadline: string | null;
  employmentType: string | null;
  level: string | null;
  candidateCount: number | null;
  targetApplications: number | null;
  isPublicVisible: boolean;
}

export interface HrCandidateItem {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  skills: string[];
  experience: number;
  location: string;
  isOpenToWork: boolean;
  email: string | null;
  profileUrl: string;
  updatedAt: string;
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  expectedSalaryLabel: string;
  matchScore: number;
  matchLabel: string;
  relatedJobs: RelatedCompanyJob[];
  relatedJobDetails: RelatedCompanyJobDetail[];
}

interface CandidateCardProps {
  candidate: HrCandidateItem;
  onOpenJobsDrawer?: (candidate: HrCandidateItem) => void;
}

function CandidateCard({ candidate, onOpenJobsDrawer }: CandidateCardProps) {
  const router = useRouter();
  const profileHref = candidate.profileUrl || `/candidate/${candidate.id}?from=hr`;
  const relatedJobsCount =
    candidate.relatedJobDetails.length > 0
      ? candidate.relatedJobDetails.length
      : candidate.relatedJobs.length;

  return (
    <article
      className="group flex cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_20px_46px_-32px_rgba(37,99,235,0.55)]"
      onClick={() => router.push(profileHref)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-sm font-black text-primary">
            {candidate.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.avatar} alt={candidate.name} className="h-full w-full object-cover" />
            ) : (
              candidate.name.charAt(0)
            )}
          </div>

          <div className="min-w-0">
            <Link
              href={profileHref}
              className="line-clamp-1 text-base font-black text-slate-950 transition group-hover:text-primary"
              onClick={(event) => event.stopPropagation()}
            >
              {candidate.name}
            </Link>
            <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-slate-600">{candidate.role}</p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
          🔥 {candidate.matchLabel} ({candidate.matchScore}%)
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
          <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
          <span className="line-clamp-1">{candidate.location || "Chưa cập nhật"}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
          <span className="material-symbols-outlined text-sm text-slate-400">work_history</span>
          <span className="line-clamp-1">{candidate.experience} năm KN</span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <span>Cập nhật {new Date(candidate.updatedAt).toLocaleDateString("vi-VN")}</span>
        <span>•</span>
        <span>Lương: {candidate.expectedSalaryLabel}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.skills.length > 0 ? (
          candidate.skills.slice(0, 5).map((skill) => (
            <span
              key={`${candidate.id}-${skill}`}
              className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600"
              title={skill}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">Chưa có kỹ năng công khai.</span>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Phù hợp với</p>
          {onOpenJobsDrawer && relatedJobsCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenJobsDrawer(candidate);
              }}
              className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-widest text-primary transition hover:border-primary/40"
            >
              Xem {relatedJobsCount} job
            </button>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {candidate.relatedJobs.length > 0 ? (
            candidate.relatedJobs.map((job) => (
              <Link
                key={`${candidate.id}-${job.id}`}
                href={job.url}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                title={`Xem job ${job.title}`}
              >
                {job.title}
                <span className="text-[10px] text-primary">{job.matchScore}%</span>
              </Link>
            ))
          ) : (
            <span className="text-xs font-medium text-slate-500">Chưa có job liên kết phù hợp.</span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Link
          href={profileHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3.5 text-xs font-black text-slate-700 transition hover:border-primary/40 hover:text-primary"
        >
          Xem hồ sơ
          <span className="material-symbols-outlined text-base">arrow_outward</span>
        </Link>
      </div>
    </article>
  );
}

export default memo(CandidateCard);