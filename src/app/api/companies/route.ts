import { NextResponse } from "next/server";
import { getAllCompanies } from "@/lib/companies";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
  const sort = (searchParams.get("sort") || "jobs_desc").toLowerCase();

  let companies = getAllCompanies().map((c) => ({
    slug: c.slug,
    name: c.name,
    logoUrl: c.logoUrl,
    location: c.location ?? "Chưa cập nhật",
    industry: c.industry.length > 0 ? c.industry.join(", ") : "Chưa cập nhật",
    size: c.size ?? "Chưa cập nhật",
    jobCount: c.jobCount,
  }));

  // filters
  if (q) {
    companies = companies.filter((c) =>
      `${c.name} ${c.location}`.toLowerCase().includes(q)
    );
  }

  // sort
  if (sort === "name_asc") {
    companies.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } else {
    companies.sort((a, b) => b.jobCount - a.jobCount);
  }

  // paginate
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
