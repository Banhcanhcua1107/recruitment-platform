"use client";

import * as React from "react";
import type { JobCardMatchMeta } from "../jobs-page.types";
import { JobsRecommendationSection } from "./JobsRecommendationSection";
import { useRecommendedJobs } from "../useRecommendedJobs";

interface JobsRecommendationsClientProps {
  enabled: boolean;
  onBrowseAll: () => void;
  onRecommendationMapChange: (nextMap: Record<string, JobCardMatchMeta>) => void;
}

function toRecommendationMap(
  data: ReturnType<typeof useRecommendedJobs>["data"],
): Record<string, JobCardMatchMeta> {
  if (!data) {
    return {};
  }

  return data.items.reduce<Record<string, JobCardMatchMeta>>((accumulator, item) => {
    const jobId = item.job.id || item.jobId;
    if (!jobId) {
      return accumulator;
    }

    accumulator[jobId] = {
      matchScore: item.matchScore,
      fitLevel: item.fitLevel,
      badge: item.fitLevel === "High" ? "Top match" : "Recommended",
      matchedSkills: item.matchedSkills,
    };

    return accumulator;
  }, {});
}

export function JobsRecommendationsClient({
  enabled,
  onBrowseAll,
  onRecommendationMapChange,
}: JobsRecommendationsClientProps) {
  const {
    status: recommendationStatus,
    data: recommendationData,
    error: recommendationError,
  } = useRecommendedJobs({ enabled });

  const recommendationMap = React.useMemo(
    () =>
      enabled && recommendationStatus === "ready"
        ? toRecommendationMap(recommendationData)
        : {},
    [enabled, recommendationData, recommendationStatus],
  );

  React.useEffect(() => {
    onRecommendationMapChange(recommendationMap);
    return () => onRecommendationMapChange({});
  }, [onRecommendationMapChange, recommendationMap]);

  if (!enabled) {
    return null;
  }

  return (
    <JobsRecommendationSection
      status={recommendationStatus}
      data={recommendationData}
      error={recommendationError}
      onBrowseAll={onBrowseAll}
    />
  );
}
