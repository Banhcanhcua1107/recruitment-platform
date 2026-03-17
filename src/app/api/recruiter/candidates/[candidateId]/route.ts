import { NextResponse } from "next/server";
import { getRecruiterCandidateProfile } from "@/lib/candidate-profiles";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("chỉ nhà tuyển dụng")) {
    return 403;
  }

  if (normalized.includes("không tìm thấy")) {
    return 404;
  }

  return 500;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await context.params;
    const candidate = await getRecruiterCandidateProfile(candidateId);
    return NextResponse.json({ candidate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải hồ sơ ứng viên.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
