import { NextResponse } from "next/server";
import { listCandidateCvOptions } from "@/lib/applications";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listCandidateCvOptions();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải danh sách CV.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
