import { NextResponse } from "next/server";
import { getDownloadUrlForApplication } from "@/lib/applications";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = await getDownloadUrlForApplication(id);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải CV.";
    const status =
      message === "Unauthorized" ? 401 : message.includes("không có quyền") ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
