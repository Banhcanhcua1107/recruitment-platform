import { searchPublicJobs } from "@/lib/jobs";
import { NextResponse } from "next/server";

function parseCsvParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";
  const company = searchParams.get("company") || "";
  const levels = parseCsvParam(searchParams.get("levels"));
  const types = parseCsvParam(searchParams.get("types"));
  const industries = parseCsvParam(searchParams.get("industries"));
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
  const sort = searchParams.get("sort") || "newest";

  try {
    const result = await searchPublicJobs({
      q,
      location,
      company,
      levels,
      types,
      industries,
      page,
      limit,
      sort: sort as
        | "newest"
        | "oldest"
        | "az"
        | "salary-high"
        | "salary-low",
    });

    return NextResponse.json(
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        items: result.items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
