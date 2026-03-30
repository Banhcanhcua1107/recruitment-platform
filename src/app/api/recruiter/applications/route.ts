import { NextResponse } from "next/server";
import { getEmployerCandidates } from "@/lib/applications";
import type { RecruitmentPipelineStatus } from "@/types/recruitment";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set<"all" | RecruitmentPipelineStatus>([
  "all",
  "applied",
  "reviewing",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("quyen") || normalized.includes("nha tuyen dung")) {
    return 403;
  }

  return 500;
}

function parseStatus(
  raw: string | null
): "all" | RecruitmentPipelineStatus {
  if (!raw) {
    return "all";
  }

  const normalized = raw.toLowerCase() as "all" | RecruitmentPipelineStatus;
  return ALLOWED_STATUS.has(normalized) ? normalized : "all";
}

function parsePositiveInt(raw: string | null, fallback: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);

    const data = await getEmployerCandidates({
      q: searchParams.get("q") ?? "",
      position: searchParams.get("position") ?? "",
      status: parseStatus(searchParams.get("status")),
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the tai danh sach ung tuyen.";

    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
