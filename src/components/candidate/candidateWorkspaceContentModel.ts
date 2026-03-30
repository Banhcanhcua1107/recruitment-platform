type ActivityApplication = {
  id: string;
  created_at: string;
  status: string;
  job: {
    id: string;
    title: string;
    company_name: string;
  };
};

type ActivityResume = {
  id: string;
  title: string;
  updated_at: string;
  url: string;
};

export interface CandidateActivityItem {
  id: string;
  type: "application" | "cv";
  title: string;
  subtitle: string;
  href: string;
  timestamp: string;
  icon: string;
}

function getTimestampValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getApplicationStatusLabel(status: string) {
  switch (status) {
    case "reviewing":
    case "viewed":
      return "Đang được xem xét";
    case "interview":
    case "interviewing":
      return "Đã chuyển sang phỏng vấn";
    case "offer":
    case "offered":
      return "Đã nhận đề nghị";
    case "hired":
      return "Đã trúng tuyển";
    case "rejected":
      return "Đã bị từ chối";
    default:
      return "Đã ứng tuyển";
  }
}

export function buildCandidateActivityItems({
  recentApplications,
  cvs,
}: {
  recentApplications: ActivityApplication[];
  cvs: ActivityResume[];
}): CandidateActivityItem[] {
  const items: CandidateActivityItem[] = [
    ...recentApplications.map((application) => ({
      id: `application-${application.id}`,
      type: "application" as const,
      title: application.job.title,
      subtitle: `${application.job.company_name} · ${getApplicationStatusLabel(application.status)}`,
      href: `/candidate/applications/${application.id}`,
      timestamp: application.created_at,
      icon: "work_history",
    })),
    ...cvs.map((cv) => ({
      id: `cv-${cv.id}`,
      type: "cv" as const,
      title: cv.title,
      subtitle: "CV đã được cập nhật",
      href: cv.url,
      timestamp: cv.updated_at,
      icon: "description",
    })),
  ];

  return items.sort((left, right) => getTimestampValue(right.timestamp) - getTimestampValue(left.timestamp));
}

export function resolveDefaultResumeId({
  storedResumeId,
  resumes,
}: {
  storedResumeId: string | null;
  resumes: Array<{ id: string; updated_at: string }>;
}) {
  if (storedResumeId && resumes.some((resume) => resume.id === storedResumeId)) {
    return storedResumeId;
  }

  const [latestResume] = [...resumes].sort(
    (left, right) => getTimestampValue(right.updated_at) - getTimestampValue(left.updated_at)
  );

  return latestResume?.id ?? null;
}
