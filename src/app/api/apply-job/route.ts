import { NextResponse } from "next/server";
import { applyToJob } from "@/lib/applications";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = String(formData.get("job_id") ?? "").trim();
    const coverLetter = String(formData.get("cover_letter") ?? "").trim();
    const existingCvPath = String(formData.get("existing_cv_path") ?? "").trim();
    const builderResumeId = String(formData.get("builder_resume_id") ?? "").trim();
    const cvFile = formData.get("cv_file");

    if (!jobId) {
      return NextResponse.json({ error: "Thiếu mã tin tuyển dụng." }, { status: 400 });
    }

    const hasUploadedFile = cvFile instanceof File && cvFile.size > 0;

    if (!hasUploadedFile && !existingCvPath && !builderResumeId) {
      return NextResponse.json(
        { error: "Vui lòng tải lên CV mới, chọn CV đã upload, hoặc chọn CV từ CV Builder." },
        { status: 400 }
      );
    }

    if (hasUploadedFile) {
      if (cvFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "CV vượt quá giới hạn 10MB." }, { status: 400 });
      }

      if (cvFile.type && !ALLOWED_CONTENT_TYPES.has(cvFile.type)) {
        return NextResponse.json(
          { error: "Chỉ hỗ trợ PDF, DOC hoặc DOCX." },
          { status: 400 }
        );
      }
    }

    const result = await applyToJob({
      jobId,
      coverLetter: coverLetter || null,
      cvFile: hasUploadedFile ? cvFile : null,
      existingCvPath: existingCvPath || null,
      builderResumeId: builderResumeId || null,
    });

    return NextResponse.json({
      success: true,
      applicationId: result.applicationId,
      status: result.status,
      cvUrl: result.cvUrl,
      emailSent: result.emailSent,
      emailError: result.emailError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể nộp đơn.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
