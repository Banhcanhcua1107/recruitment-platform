import jobs from "@/data/jobs.json";
import { NextResponse } from "next/server";

type Job = {
  id: number;
  title: string;
  company_name: string;
  logo_url: string;
  location: string;
  salary: string;
  requirements: string[];
  posted_date: string;
};

type Company = {
  name: string;
  logoUrl?: string;
  location?: string;
  industry?: string; // nếu dataset chưa có thì để "Chưa cập nhật"
  size?: string;     // nếu dataset chưa có thì để "Chưa cập nhật"
  jobCount: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const location = (searchParams.get("location") || "").toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
  const sort = (searchParams.get("sort") || "jobs_desc").toLowerCase(); // jobs_desc | name_asc

  const data = jobs as Job[];

  // Group by company_name
  const map = new Map<string, Company>();

  for (const j of data) {
    const key = j.company_name?.trim();
    if (!key) continue;

    const current = map.get(key) || {
      name: key,
      logoUrl: j.logo_url,
      location: j.location,
      industry: "Chưa cập nhật",
      size: "Chưa cập nhật",
      jobCount: 0,
    };

    current.jobCount += 1;

    // cập nhật logo/location nếu thiếu
    if (!current.logoUrl && j.logo_url) current.logoUrl = j.logo_url;
    if (!current.location && j.location) current.location = j.location;

    map.set(key, current);
  }

  let companies = Array.from(map.values());

  // filters
  if (q) {
    companies = companies.filter((c) =>
      `${c.name} ${c.location ?? ""}`.toLowerCase().includes(q)
    );
  }
  if (location) {
    companies = companies.filter((c) => (c.location ?? "").toLowerCase().includes(location));
  }

  // sort
  if (sort === "name_asc") {
    companies.sort((a, b) => a.name.localeCompare(b.name));
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
