import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient(); // Đảm bảo có await cho Next.js 15
  const { searchParams } = new URL(req.url);

  // Lấy các tham số lọc từ URL
  const q = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";
  const company = searchParams.get("company") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 10));
  const sort = searchParams.get("sort") || "newest";

  // Tạo query cơ bản
  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" });

  // 1. Lọc theo từ khóa (Tiêu đề hoặc Mô tả)
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // 2. Lọc theo Địa điểm
  if (location) {
    query = query.filter("location", "ilike", `%${location}%`);
  }

  // 3. Lọc theo Công ty
  if (company) {
    query = query.filter("company_name", "ilike", `%${company}%`);
  }

  // 4. Sắp xếp
  if (sort === "newest") {
    query = query.order("posted_date", { ascending: false });
  } else {
    query = query.order("posted_date", { ascending: true });
  }

  // 5. Phân trang (Pagination)
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

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