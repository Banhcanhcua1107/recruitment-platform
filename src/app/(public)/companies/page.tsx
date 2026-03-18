import type { Metadata } from "next";
import { CompaniesDirectory } from "@/components/companies/CompaniesDirectory";
import { getAllCompanies } from "@/lib/companies";

export const metadata: Metadata = {
  title: "Công ty | TalentFlow",
  description: "Khám phá doanh nghiệp đang tuyển dụng và môi trường làm việc phù hợp với bạn.",
};

const PAGE_LIMIT = 12;

export default async function CompaniesPage() {
  const companies = await getAllCompanies();

  return (
    <CompaniesDirectory
      initialItems={companies.slice(0, PAGE_LIMIT)}
      initialTotal={companies.length}
      initialTotalPages={Math.max(1, Math.ceil(companies.length / PAGE_LIMIT))}
    />
  );
}
