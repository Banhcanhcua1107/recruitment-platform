import { getNewestPublicJobsPage } from "@/lib/public-job-summaries";
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

function canUseNewestFastPath(input: {
  q: string;
  location: string;
  company: string;
  levels: string[];
  types: string[];
  industries: string[];
  sort: string;
  salaryMin?: number;
  salaryMax?: number;
  hideUnknownSalary: boolean;
}) {
  return (
    !input.q &&
    !input.location &&
    !input.company &&
    input.levels.length === 0 &&
    input.types.length === 0 &&
    input.industries.length === 0 &&
    input.sort === "newest" &&
    typeof input.salaryMin === "undefined" &&
    typeof input.salaryMax === "undefined" &&
    !input.hideUnknownSalary
  );
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
  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");
  const hideUnknownSalary = searchParams.get("hideUnknownSalary") === "true";

  const parsedSalaryMin =
    salaryMin && Number.isFinite(Number(salaryMin)) ? Number(salaryMin) : undefined;
  const parsedSalaryMax =
    salaryMax && Number.isFinite(Number(salaryMax)) ? Number(salaryMax) : undefined;

  try {
    const result = canUseNewestFastPath({
      q,
      location,
      company,
      levels,
      types,
      industries,
      sort,
      salaryMin: parsedSalaryMin,
      salaryMax: parsedSalaryMax,
      hideUnknownSalary,
    })
      ? await getNewestPublicJobsPage(page, limit)
      : await (async () => {
          const { searchPublicJobs } = await import("@/lib/jobs");
          return searchPublicJobs({
            q,
            location,
            company,
            levels,
            types,
            industries,
            page,
            limit,
            salaryMin: parsedSalaryMin,
            salaryMax: parsedSalaryMax,
            hideUnknownSalary,
            sort: sort as
              | "newest"
              | "oldest"
              | "relevance"
              | "az"
              | "salary-high"
              | "salary-low",
          });
        })();

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
