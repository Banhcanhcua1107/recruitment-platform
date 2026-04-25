import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createCVImportFromUpload } from "@/lib/cv-imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    ACCEPTED_TYPES.has(file.type) ||
    /\.(pdf|jpe?g|png|webp|docx)$/.test(name)
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const startProcessingRaw = String(formData.get("start_processing") ?? "").trim().toLowerCase();
    const startProcessing = ["1", "true", "yes", "on"].includes(startProcessingRaw);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    if (!isAcceptedFile(file)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, image, or DOCX." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    const payload = await createCVImportFromUpload(user.id, file, {
      startProcessing,
    });
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create CV import.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
