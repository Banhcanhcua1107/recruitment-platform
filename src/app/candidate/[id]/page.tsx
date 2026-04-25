"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PublicCandidateProfileView } from "@/components/recruitment/PublicCandidateProfileView";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";

type CandidateApiResponse = {
  candidate?: PublicCandidateSearchResult;
  error?: string;
};

export default function CandidatePublicProfilePage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const [candidate, setCandidate] = useState<PublicCandidateSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const candidateId = typeof params.id === "string" ? params.id : "";
  const from = searchParams.get("from");

  const backHref = useMemo(() => {
    if (from === "hr") {
      return "/hr-home";
    }

    return "/hr/candidates";
  }, [from]);

  const backLabel = from === "hr" ? "Quay lai trang chu HR" : "Quay lai danh sach ung vien";

  useEffect(() => {
    let active = true;

    async function fetchCandidateProfile() {
      if (!candidateId) {
        setError("ID ung vien khong hop le.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/candidates/${encodeURIComponent(candidateId)}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as CandidateApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Khong the tai ho so ung vien.");
        }

        if (!active) {
          return;
        }

        if (!payload.candidate) {
          setError("Khong tim thay ho so ung vien.");
          setCandidate(null);
          return;
        }

        setCandidate(payload.candidate);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setCandidate(null);
        setError(
          fetchError instanceof Error ? fetchError.message : "Khong the tai ho so ung vien."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchCandidateProfile();

    return () => {
      active = false;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-330 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Dang tai ho so ung vien...
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="mx-auto w-full max-w-330 px-4 pt-6 sm:px-6 lg:px-8">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Khong the mo ho so ung vien</h1>
          <p className="text-sm text-slate-600">{error || "Du lieu ho so khong ton tai."}</p>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {backLabel}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <PublicCandidateProfileView
      candidate={candidate}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
