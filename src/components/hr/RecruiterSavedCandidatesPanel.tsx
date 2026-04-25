"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecruiterCandidateSignalLabels, getRecruiterCandidateSignals } from "./hrWorkspaceContentModel";
import {
  getSavedRecruiterCandidates,
  removeRecruiterCandidate,
  subscribeSavedRecruiterCandidates,
  type SavedRecruiterCandidate,
} from "./recruiterSavedCandidates";

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <span className="material-symbols-outlined text-[24px]">bookmark_manager</span>
      </div>
      <h3 className="mt-4 text-base font-black text-slate-900">Chưa lưu ứng viên nào</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Các hồ sơ bạn đánh dấu trong kho ứng viên sẽ xuất hiện tại đây để theo dõi nhanh.
      </p>
    </div>
  );
}

export function RecruiterSavedCandidatesPanel({
  title = "Ứng viên đã lưu",
  description = "Danh sách hồ sơ công khai bạn đã đánh dấu để xem lại nhanh.",
  limit = 4,
}: {
  title?: string;
  description?: string;
  limit?: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<SavedRecruiterCandidate[]>([]);

  useEffect(() => {
    const sync = () => {
      setItems(getSavedRecruiterCandidates());
    };

    sync();
    return subscribeSavedRecruiterCandidates(sync);
  }, []);

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Saved pipeline
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Số lượng
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {items.length}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {items.slice(0, limit).map((candidate) => {
              const signalLabels = getRecruiterCandidateSignalLabels(
                getRecruiterCandidateSignals({
                  candidateId: candidate.candidateId,
                  fullName: candidate.fullName,
                  avatarUrl: candidate.avatarUrl,
                  headline: candidate.headline,
                  location: candidate.location,
                  email: candidate.email,
                  phone: candidate.phone,
                  introduction: "",
                  skills: candidate.skills,
                  workExperiences: [],
                  educations: [],
                  workExperience: candidate.headline,
                  education: "",
                  cvUrl: candidate.cvUrl,
                  updatedAt: candidate.updatedAt,
                })
              );

              return (
                <article
                  key={candidate.candidateId}
                  className="cursor-pointer rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  onClick={() => router.push(`/candidate/${candidate.candidateId}?from=hr`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/candidate/${candidate.candidateId}?from=hr`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-base font-black text-slate-900 transition-colors hover:text-primary"
                      >
                        {candidate.fullName}
                      </Link>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {candidate.headline || "Hồ sơ công khai đã lưu"}
                      </p>
                      {candidate.location ? (
                        <p className="mt-1 text-sm text-slate-500">{candidate.location}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setItems(removeRecruiterCandidate(candidate.candidateId));
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                      aria-label={`Bỏ lưu ${candidate.fullName}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">bookmark_remove</span>
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[signalLabels.level, signalLabels.workMode, signalLabels.readiness]
                      .filter(Boolean)
                      .map((label) => (
                        <span
                          key={`${candidate.candidateId}-${label}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
