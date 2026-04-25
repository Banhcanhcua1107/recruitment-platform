import { NextResponse } from "next/server";
import { localizeApplicationMessage } from "@/lib/application-messages";
import { applyToJob } from "@/lib/applications";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("only candidates")) {
    return 403;
  }

  if (
    normalized.includes("required") ||
    normalized.includes("please enter at least email or phone number") ||
    normalized.includes("please upload or select a cv") ||
    normalized.includes("selected cv file is no longer available") ||
    normalized.includes("only pdf, doc, or docx files are supported") ||
    normalized.includes("exceeds the 10mb upload limit") ||
    normalized.includes("recruiter email is required")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = String(formData.get("job_id") ?? "").trim();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const introduction = String(formData.get("introduction") ?? "").trim();
    const existingCvPath = String(formData.get("existing_cv_path") ?? "").trim();
    const builderResumeId = String(formData.get("builder_resume_id") ?? "").trim();
    const cvFile = formData.get("cv_file");

    if (!jobId) {
      return NextResponse.json({ error: "Không tìm thấy tin tuyển dụng." }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "Vui lòng nhập họ và tên." }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Vui lòng nhập email và số điện thoại để nhà tuyển dụng có thể liên hệ." },
        { status: 400 }
      );
    }

    if (!introduction) {
      return NextResponse.json(
        { error: "Vui lòng giới thiệu ngắn gọn về bản thân." },
        { status: 400 }
      );
    }

    const hasUploadedFile = cvFile instanceof File && cvFile.size > 0;
    if (!hasUploadedFile && !existingCvPath && !builderResumeId) {
      return NextResponse.json(
        { error: "Vui lòng chọn CV có sẵn hoặc tải lên CV mới." },
        { status: 400 }
      );
    }

    if (hasUploadedFile) {
      if (cvFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "CV vượt quá dung lượng 10MB cho phép." },
          { status: 400 }
        );
      }

      if (cvFile.type && !ALLOWED_CONTENT_TYPES.has(cvFile.type)) {
        return NextResponse.json(
          { error: "Chỉ hỗ trợ tệp PDF, DOC hoặc DOCX." },
          { status: 400 }
        );
      }
    }

    const result = await applyToJob({
      jobId,
      fullName,
      email: email || null,
      phone: phone || null,
      introduction,
      cvFile: hasUploadedFile ? cvFile : null,
      existingCvPath: existingCvPath || null,
      builderResumeId: builderResumeId || null,
    });

    const includeDebug =
      process.env.NODE_ENV !== "production" || process.env.EMAIL_DEBUG === "true";

    return NextResponse.json({
      success: true,
      applicationId: result.applicationId,
      status: result.status,
      cvUrl: result.cvUrl,
      candidateEmailSent: result.candidateEmailSent,
      recruiterEmailSent: result.recruiterEmailSent,
      emailSent: result.emailSent,
      emailError: result.emailError,
      mailDelivery: {
        dbSaved: true,
        candidateEmailSent: result.candidateEmailSent,
        recruiterEmailSent: result.recruiterEmailSent,
        allRecipientsSent: !result.emailError,
      },
      emailDebug: includeDebug ? result.emailDebug : undefined,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unable to submit application.";
    return NextResponse.json(
      { error: localizeApplicationMessage(rawMessage) },
      { status: getStatusCode(rawMessage) }
    );
  }
}
