import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";
  const company = searchParams.get("company") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 10));
  const sort = searchParams.get("sort") || "newest";

  const buildQuery = () => {
    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .not("employer_id", "is", null);

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (location) {
      query = query.filter("location", "ilike", `%${location}%`);
    }

    if (company) {
      query = query.filter("company_name", "ilike", `%${company}%`);
    }

    query =
      sort === "newest"
        ? query.order("posted_date", { ascending: false })
        : query.order("posted_date", { ascending: true });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return query.range(from, to);
  };

  let { data, count, error } = await buildQuery()
    .eq("status", "open")
    .eq("is_public_visible", true);

  if (
    error &&
    error.message?.toLowerCase().includes('column "status" does not exist')
  ) {
    const fallbackResult = await buildQuery();
    data = fallbackResult.data;
    count = fallbackResult.count;
    error = fallbackResult.error;
  }

  if (
    error &&
    (
      error.message?.toLowerCase().includes('column "is_public_visible" does not exist') ||
      error.message?.toLowerCase().includes("column jobs.is_public_visible does not exist")
    )
  ) {
    const fallbackVisibleResult = await buildQuery().eq("status", "open");
    data = fallbackVisibleResult.data;
    count = fallbackVisibleResult.count;
    error = fallbackVisibleResult.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    page,
    limit,
    total: count,
    totalPages: Math.ceil((count || 0) / limit),
    items: data,
  });
}
