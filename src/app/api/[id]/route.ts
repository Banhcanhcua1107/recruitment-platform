import jobs from "@/data/jobs.json";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const job = (jobs as any[]).find((j) => j.id === id);
  if (!job) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
