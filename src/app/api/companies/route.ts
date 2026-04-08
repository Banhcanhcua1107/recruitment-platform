import { NextResponse } from "next/server";
import { searchPublicCompanies, type PublicCompaniesSort } from "@/lib/companies";

function parseSort(value: string | null): PublicCompaniesSort {
  if (value?.toLowerCase() === "name_asc") {
    return "name_asc";
  }

  return "jobs_desc";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
  const sort = parseSort(searchParams.get("sort"));

  const result = await searchPublicCompanies({
    q,
    page,
    limit,
    sort,
  });

  const items = result.items.map((company) => ({
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    location: company.location ?? "Chưa cập nhật",
    industry: company.industry.length > 0 ? company.industry.join(", ") : "Chưa cập nhật",
    size: company.size ?? "Chưa cập nhật",
    jobCount: company.jobCount,
  }));

  return NextResponse.json(
    {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      items,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
