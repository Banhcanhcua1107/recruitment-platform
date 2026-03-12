import { NextResponse } from "next/server";
import { getAllCompanies } from "@/lib/companies";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
  const sort = (searchParams.get("sort") || "jobs_desc").toLowerCase();

  let companies = (await getAllCompanies()).map((company) => ({
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    location: company.location ?? "Chưa cập nhật",
    industry: company.industry.length > 0 ? company.industry.join(", ") : "Chưa cập nhật",
    size: company.size ?? "Chưa cập nhật",
    jobCount: company.jobCount,
  }));

  if (q) {
    companies = companies.filter((company) =>
      `${company.name} ${company.location}`.toLowerCase().includes(q)
    );
  }

  if (sort === "name_asc") {
    companies.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } else {
    companies.sort((a, b) => b.jobCount - a.jobCount);
  }

  const total = companies.length;
  const start = (page - 1) * limit;
  const items = companies.slice(start, start + limit);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  });
}
