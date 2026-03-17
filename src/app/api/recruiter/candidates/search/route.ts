import { NextResponse } from "next/server";
import { searchPublicCandidateProfiles } from "@/lib/candidate-profiles";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("nhà tuyển dụng") || normalized.includes("recruiter")) {
    return 403;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const items = await searchPublicCandidateProfiles({
      name: searchParams.get("name") ?? "",
      skills: searchParams.get("skills") ?? "",
      headline: searchParams.get("headline") ?? "",
      experience: searchParams.get("experience") ?? "",
      keywords: searchParams.get("keywords") ?? "",
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tìm kiếm hồ sơ ứng viên công khai.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
