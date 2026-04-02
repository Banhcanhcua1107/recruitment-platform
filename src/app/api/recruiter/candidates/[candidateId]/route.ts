import { NextResponse } from "next/server";
import { getRecruiterCandidateProfile } from "@/lib/candidate-profiles";
import { sendRecruiterCandidateContact } from "@/lib/recruiter-candidate-contact";

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

function getContactStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("chỉ nhà tuyển dụng") || normalized.includes("chi nha tuyen dung")) {
    return 403;
  }

  if (normalized.includes("không tìm thấy") || normalized.includes("khong tim thay")) {
    return 404;
  }

  if (normalized.includes("vui lòng") || normalized.includes("required")) {
    return 400;
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

export async function POST(
  request: Request,
  context: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await context.params;
    const payload = (await request.json()) as {
      recruiterName?: string;
      recruiterEmail?: string;
      recruiterPhone?: string;
      companyName?: string;
      hiringPosition?: string;
      message?: string;
    };

    const result = await sendRecruiterCandidateContact({
      candidateId,
      recruiterName: String(payload.recruiterName ?? ""),
      recruiterEmail: String(payload.recruiterEmail ?? ""),
      recruiterPhone: String(payload.recruiterPhone ?? ""),
      companyName: String(payload.companyName ?? ""),
      hiringPosition: String(payload.hiringPosition ?? ""),
      message: String(payload.message ?? ""),
    });

    return NextResponse.json({
      success: true,
      candidateName: result.candidateName,
      candidateEmailSent: result.candidateEmailSent,
      candidateHasEmail: result.candidateHasEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi lời mời liên hệ.";
    return NextResponse.json({ error: message }, { status: getContactStatusCode(message) });
  }
}
