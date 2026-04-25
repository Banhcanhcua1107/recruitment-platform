import type { Metadata } from "next";
import { CompaniesDirectory } from "@/components/companies/CompaniesDirectory";
import { searchPublicCompanies } from "@/lib/companies";

export const metadata: Metadata = {
  title: "Công ty | TalentFlow",
  description: "Khám phá doanh nghiệp đang tuyển dụng và môi trường làm việc phù hợp với bạn.",
};

export const revalidate = 300;

const PAGE_LIMIT = 12;

export default async function CompaniesPage() {
  const result = await searchPublicCompanies({
    page: 1,
    limit: PAGE_LIMIT,
    sort: "jobs_desc",
  });

  return (
    <CompaniesDirectory
      initialItems={result.items}
      initialTotal={result.total}
      initialTotalPages={result.totalPages}
    />
  );
}
