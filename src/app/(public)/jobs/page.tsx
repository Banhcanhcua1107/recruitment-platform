import type { Metadata } from "next";
import { getAllJobs } from "@/lib/jobs";
import JobFiltersClient from "./JobFiltersClient";

export const metadata: Metadata = {
  title: "Việc làm | TalentFlow",
  description:
    "Khám phá hàng ngàn cơ hội nghề nghiệp hấp dẫn. Tìm kiếm và ứng tuyển ngay hôm nay.",
};

export default function JobsPage() {
  const jobs = getAllJobs();

  return (
    <main className="grow bg-[#f6f7f8]">
      <JobFiltersClient jobs={jobs} />
    </main>
  );
}