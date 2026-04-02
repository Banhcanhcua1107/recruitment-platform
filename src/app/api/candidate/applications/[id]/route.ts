import { NextResponse } from "next/server";
import { getCandidateApplicationDetail } from "@/lib/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("khong tim thay") || normalized.includes("không tìm thấy")) {
    return 404;
  }

  return 500;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const detail = await getCandidateApplicationDetail(id);

    return NextResponse.json(
      { detail },
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
        : "Khong the tai chi tiet don ung tuyen.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
