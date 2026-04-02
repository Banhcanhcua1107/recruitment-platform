import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getCVDocumentArtifactsForUser,
  getCVDocumentRecordForUser,
} from "@/lib/cv-imports";
import { uploadCurrentCandidateProfileCv } from "@/lib/candidate-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ documentId: string }>;
}

function inferFileExtension(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".doc")) return ".doc";

  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "application/msword") return ".doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return ".docx";
  }

  return ".pdf";
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { documentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [document, artifacts] = await Promise.all([
      getCVDocumentRecordForUser(user.id, documentId),
      getCVDocumentArtifactsForUser(user.id, documentId),
    ]);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const originalArtifact = artifacts.find(
      (item) => item.kind === "original_file" && item.status === "ready",
    );

    if (!originalArtifact?.storage_bucket || !originalArtifact?.storage_path) {
      return NextResponse.json(
        { error: "Original CV artifact is not ready." },
        { status: 409 },
      );
    }

    const admin = createAdminClient();
    const { data: fileData, error: downloadError } = await admin.storage
      .from(originalArtifact.storage_bucket)
      .download(originalArtifact.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: downloadError?.message || "Failed to download original CV." },
        { status: 500 },
      );
    }

    const contentType = originalArtifact.content_type || document.mime_type || "application/pdf";
    const ext = inferFileExtension(document.file_name || "cv", contentType);
    const fileName = document.file_name?.trim() || `imported-cv-${document.id}${ext}`;

    const file = new File([await fileData.arrayBuffer()], fileName, {
      type: contentType,
    });

    const saved = await uploadCurrentCandidateProfileCv(file);

    return NextResponse.json({
      cvUrl: saved.cvUrl,
      filePath: saved.filePath,
      fileName: saved.fileName,
      message: "Đã lưu CV để dùng khi ứng tuyển nhà tuyển dụng.",
      links: {
        profile: "/candidate/profile",
        cvDownload: saved.cvUrl,
        cvBuilder: "/candidate/cv-builder",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save original CV to candidate profile.";

    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
