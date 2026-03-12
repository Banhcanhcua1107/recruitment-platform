import { NextResponse } from "next/server";
import { getJobById } from "@/lib/jobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy tin tuyển dụng." }, { status: 404 });
  }

  return NextResponse.json(job);
}
