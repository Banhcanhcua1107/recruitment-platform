import { NextResponse } from "next/server";
import { recordCandidateViewed } from "@/lib/recruitment";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("quyen") || normalized.includes("chi nha tuyen dung")) {
    return 403;
  }

  if (normalized.includes("khong tim thay")) {
    return 404;
  }

  return 500;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await context.params;
    await recordCandidateViewed(applicationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the ghi nhan luot xem ung vien.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
