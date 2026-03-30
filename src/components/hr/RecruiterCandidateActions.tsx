"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import {
  isRecruiterCandidateSaved,
  subscribeSavedRecruiterCandidates,
  toggleRecruiterCandidateSaved,
} from "./recruiterSavedCandidates";

function buildConnectionHref(candidate: PublicCandidateSearchResult) {
  if (candidate.email) {
    const subject = encodeURIComponent(`TalentFlow | Mời kết nối với ${candidate.fullName}`);
    return `mailto:${candidate.email}?subject=${subject}`;
  }

  if (candidate.phone) {
    return `tel:${candidate.phone}`;
  }

  return null;
}

export function RecruiterCandidateActions({
  candidate,
  compact = false,
}: {
  candidate: PublicCandidateSearchResult;
  compact?: boolean;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const connectionHref = buildConnectionHref(candidate);

  useEffect(() => {
    const syncSavedState = () => {
      setIsSaved(isRecruiterCandidateSaved(candidate.candidateId));
    };

    syncSavedState();
    return subscribeSavedRecruiterCandidates(syncSavedState);
  }, [candidate.candidateId]);

  return (
    <div className={`flex flex-wrap gap-3 ${compact ? "items-center" : ""}`}>
      <Button
        variant={isSaved ? "secondary" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => {
          const result = toggleRecruiterCandidateSaved(candidate);
          setIsSaved(result.saved);
        }}
      >
        <span className="material-symbols-outlined text-[18px]">
          {isSaved ? "bookmark_added" : "bookmark"}
        </span>
        {isSaved ? "Đã lưu" : "Lưu ứng viên"}
      </Button>

      {connectionHref ? (
        <a
          href={connectionHref}
          className={buttonVariants("outline", compact ? "sm" : "default")}
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Mời kết nối
        </a>
      ) : (
        <Button variant="outline" size={compact ? "sm" : "default"} disabled>
          <span className="material-symbols-outlined text-[18px]">person_add_disabled</span>
          Chưa có liên hệ
        </Button>
      )}
    </div>
  );
}
