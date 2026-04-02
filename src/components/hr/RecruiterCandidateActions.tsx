"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import { RecruiterContactCandidateButton } from "@/components/hr/RecruiterContactCandidateButton";
import {
  isRecruiterCandidateSaved,
  subscribeSavedRecruiterCandidates,
  toggleRecruiterCandidateSaved,
} from "./recruiterSavedCandidates";

export function RecruiterCandidateActions({
  candidate,
  compact = false,
}: {
  candidate: PublicCandidateSearchResult;
  compact?: boolean;
}) {
  const [isSaved, setIsSaved] = useState(false);

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

      <RecruiterContactCandidateButton
        candidateId={candidate.candidateId}
        candidateName={candidate.fullName}
        candidateEmail={candidate.email}
        compact={compact}
        label="Mời kết nối"
        variant="outline"
      />
    </div>
  );
}
