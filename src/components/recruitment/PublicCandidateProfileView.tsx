import Link from "next/link";
import { RecruiterCandidateActions } from "@/components/hr/RecruiterCandidateActions";
import { buttonVariants } from "@/components/ui/button";
import { buildPublicProfileViewModel } from "@/lib/candidate-profile-document";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import { CandidateProfilePresentation } from "./CandidateProfilePresentation";

export function PublicCandidateProfileView({
  candidate,
  backHref = "/hr/candidates",
  backLabel = "Quay lại danh sách ứng viên",
}: {
  candidate: PublicCandidateSearchResult;
  backHref?: string;
  backLabel?: string;
}) {
  const viewModel = buildPublicProfileViewModel(candidate);

  return (
    <div className="mx-auto w-full max-w-330 space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
          <Link href={backHref} className="inline-flex items-center gap-2 hover:text-primary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {backLabel}
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-slate-900">Hồ sơ ứng viên công khai</span>
          </nav>

          <div className="flex flex-wrap gap-3">
            <RecruiterCandidateActions candidate={candidate} />
            {candidate.cvUrl ? (
              <a
                href={candidate.cvUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants("default", "default")}
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                Xem CV
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <CandidateProfilePresentation viewModel={viewModel} />
    </div>
  );
}
