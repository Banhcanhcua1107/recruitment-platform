import { NextResponse } from "next/server";
import { listCandidateCvOptions } from "@/lib/applications";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  if (message === "Only candidates can access candidate CV options.") {
    return 403;
  }

  return 500;
}

export async function GET() {
  try {
    const items = await listCandidateCvOptions();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the tai danh sach CV.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
