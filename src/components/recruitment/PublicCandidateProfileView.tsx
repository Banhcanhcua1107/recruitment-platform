import Link from "next/link";
import { buildPublicProfileViewModel } from "@/lib/candidate-profile-document";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import { CandidateProfilePresentation } from "./CandidateProfilePresentation";

export function PublicCandidateProfileView({
  candidate,
}: {
  candidate: PublicCandidateSearchResult;
}) {
  const viewModel = buildPublicProfileViewModel(candidate);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_24%,#f8fafc_100%)] pb-14">
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10 lg:px-10">
        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
          <Link href="/hr/candidates" className="inline-flex items-center gap-2 hover:text-primary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Quay lại danh sách ứng viên
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-slate-900">Hồ sơ ứng viên công khai</span>
        </nav>

        <CandidateProfilePresentation viewModel={viewModel} />
      </div>
    </main>
  );
}
