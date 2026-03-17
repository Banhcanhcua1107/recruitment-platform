import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Please enter at least email or phone number" },
        { status: 400 }
      );
    }

    if (!introduction) {
      return NextResponse.json({ error: "Introduction is required" }, { status: 400 });
    }

    const hasUploadedFile = cvFile instanceof File && cvFile.size > 0;
    if (!hasUploadedFile && !existingCvPath && !builderResumeId) {
      return NextResponse.json({ error: "Please upload or select a CV" }, { status: 400 });
    }

    if (hasUploadedFile) {
      if (cvFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "CV exceeds the 10MB upload limit." }, { status: 400 });
      }

      if (cvFile.type && !ALLOWED_CONTENT_TYPES.has(cvFile.type)) {
        return NextResponse.json(
          { error: "Only PDF, DOC, or DOCX files are supported." },
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

    return NextResponse.json({
      success: true,
      applicationId: result.applicationId,
      status: result.status,
      cvUrl: result.cvUrl,
      candidateEmailSent: result.candidateEmailSent,
      emailSent: result.emailSent,
      emailError: result.emailError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
