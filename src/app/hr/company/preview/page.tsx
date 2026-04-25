import CompanyProfilePreview from "../components/CompanyProfilePreview";
import { getCurrentHrCompanyProfile } from "@/lib/company-profiles";
import { getJobPortfolioSummary } from "@/lib/recruitment";

export default async function HRCompanyPreviewPage() {
  const [companyProfile, portfolioSummary] = await Promise.all([
    getCurrentHrCompanyProfile(),
    getJobPortfolioSummary(),
  ]);

  return (
    <CompanyProfilePreview
      document={companyProfile.document}
      updatedAt={companyProfile.updatedAt}
      portfolioSummary={portfolioSummary}
    />
  );
}
