import { NextResponse } from "next/server";
import {
  getCandidateProfileCvDownloadUrl,
  uploadCurrentCandidateProfileCv,
} from "@/lib/candidate-profiles";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("không có quyền")) {
    return 403;
  }

  if (normalized.includes("không tìm thấy")) {
    return 404;
  }

  if (
    normalized.includes("vui lòng tải lên cv") ||
    normalized.includes("10mb") ||
    normalized.includes("pdf") ||
    normalized.includes("doc")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const signedUrl = await getCandidateProfileCvDownloadUrl(userId);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể mở CV.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng tải lên CV" }, { status: 400 });
    }

    const result = await uploadCurrentCandidateProfileCv(file);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải CV lên.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
