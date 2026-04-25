import { NextResponse } from "next/server";
import { getCandidateApplicationsList } from "@/lib/applications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  return 500;
}

export async function GET() {
  try {
    const applications = await getCandidateApplicationsList();

    return NextResponse.json(
      { applications },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Khong the tai danh sach ung tuyen moi nhat.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
