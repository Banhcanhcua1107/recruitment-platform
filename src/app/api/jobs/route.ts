import jobs from "@/data/jobs.json";
import { NextResponse } from "next/server";

type Job = {
  id: number;
  title: string;
  company_name: string;
  logo_url: string;
  salary: string;
  location: string;
  requirements: string[];
  posted_date: string;
};

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const location = (searchParams.get("location") || "").toLowerCase().trim();
  const company = (searchParams.get("company") || "").toLowerCase().trim();

  const page = Math.max(1, toInt(searchParams.get("page"), 1));
  const limit = Math.min(50, Math.max(1, toInt(searchParams.get("limit"), 12)));
  const sort = (searchParams.get("sort") || "newest").toLowerCase(); // newest | oldest

  let data = (jobs as Job[]).slice();

  // filter
  if (q) {
    data = data.filter((j) => {
      const hay = `${j.title} ${j.company_name} ${j.salary} ${j.location} ${j.requirements.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (location) data = data.filter((j) => j.location.toLowerCase().includes(location));
  if (company) data = data.filter((j) => j.company_name.toLowerCase().includes(company));

  // sort by posted_date
  data.sort((a, b) => {
    const da = new Date(a.posted_date).getTime();
    const db = new Date(b.posted_date).getTime();
    return sort === "oldest" ? da - db : db - da;
  });

  // paginate
  const total = data.length;
  const start = (page - 1) * limit;
  const items = data.slice(start, start + limit);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  });
}
