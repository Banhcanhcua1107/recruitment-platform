"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
}

interface CandidateCardProps {
  candidate: HrCandidateItem;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const router = useRouter();
  const profileHref = `/candidate/${candidate.id}?from=hr`;
  const connectHref = candidate.email
    ? `mailto:${candidate.email}?subject=${encodeURIComponent("Lời mời kết nối từ TalentFlow")}`
    : "#";

  return (
    <article
      className="cursor-pointer rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/25 hover:shadow-[0_18px_44px_-30px_rgba(37,99,235,0.5)] h-full flex flex-col"
      onClick={() => router.push(profileHref)}
    >
      <div className="min-h-31">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-lg font-black text-primary">
              {candidate.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.avatar} alt={candidate.name} className="h-full w-full object-cover" />
              ) : (
                candidate.name.charAt(0)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={profileHref}
                  className="truncate text-lg font-black text-slate-950 hover:text-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  {candidate.name}
                </Link>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                    candidate.isOpenToWork
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span
                    className={`inline-block size-2 rounded-full ${
                      candidate.isOpenToWork ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {candidate.isOpenToWork ? "Available" : "Passive"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">{candidate.role}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {candidate.location || "Chưa cập nhật"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">work_history</span>
                  {candidate.experience} năm kinh nghiệm
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:shrink-0 sm:text-right">
            {new Date(candidate.updatedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {candidate.skills.length > 0 ? (
          candidate.skills.slice(0, 6).map((skill) => (
            <span
              key={`${candidate.id}-${skill}`}
              className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              title={skill}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">Chưa có kỹ năng công khai.</span>
        )}
      </div>

      <div className="mt-auto pt-5 flex flex-wrap gap-3">
        <Link
          href={profileHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-primary/30 hover:text-primary"
        >
          Xem hồ sơ
        </Link>
        <a
          href={connectHref}
          className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-black transition ${
            candidate.email
              ? "bg-primary text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
          title={candidate.email ? "Mời kết nối" : "Ứng viên chưa công khai email"}
          onClick={(event) => {
            event.stopPropagation();
            if (!candidate.email) {
              event.preventDefault();
            }
          }}
        >
          Mời kết nối
        </a>
      </div>
    </article>
  );
}
