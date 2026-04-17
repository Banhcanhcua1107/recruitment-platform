import { NextResponse } from "next/server";
import { updateApplicationStatusForEmployer } from "@/lib/applications";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";

export const runtime = "nodejs";

type IncomingStatus =
  | RecruitmentPipelineStatus
  | "accepted"
  | "pending"
  | "new"
  | "interviewing"
  | "offered";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("quyen") || normalized.includes("nha tuyen dung")) {
    return 403;
  }

  if (normalized.includes("khong tim thay")) {
    return 404;
  }

  if (
    normalized.includes("vui long") ||
    normalized.includes("required") ||
    normalized.includes("test mode only allows .test recipients/senders") ||
    normalized.includes("rejected:")
  ) {
    return 400;
  }

  return 500;
}

function normalizeStatus(status: IncomingStatus): RecruitmentPipelineStatus {
  switch (status) {
    case "accepted":
      return "hired";
    case "pending":
    case "new":
      return "applied";
    case "interviewing":
      return "interview";
    case "offered":
      return "offer";
    case "applied":
    case "reviewing":
    case "interview":
    case "offer":
    case "hired":
    case "rejected":
      return status;
    default:
      return "applied";
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { status?: IncomingStatus };
    const status = normalizeStatus(payload.status ?? "applied");

    await updateApplicationStatusForEmployer(id, status);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the cap nhat trang thai ung tuyen.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
