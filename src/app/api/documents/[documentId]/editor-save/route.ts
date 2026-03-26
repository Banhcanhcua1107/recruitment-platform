import { NextResponse, type NextRequest } from "next/server";
import {
  getDefaultContentTypeForFileType,
  saveEditedDocumentBinaryForCurrentUser,
} from "@/lib/editor/metadata";
import type { SupportedFileType } from "@/types/editor";

const SUPPORTED_FILE_TYPES: SupportedFileType[] = ["pdf", "word", "image"];

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { documentId } = await params;

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const fileTypeValue = formData.get("fileType");
    const baseVersionId = formData.get("baseVersionId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (typeof fileTypeValue !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid fileType" },
        { status: 400 },
      );
    }

    if (typeof baseVersionId !== "string") {
      return NextResponse.json(
        { error: "Missing baseVersionId" },
        { status: 400 },
      );
    }

    if (!SUPPORTED_FILE_TYPES.includes(fileTypeValue as SupportedFileType)) {
      return NextResponse.json(
        { error: "Unsupported fileType" },
        { status: 400 },
      );
    }

    const fileType = fileTypeValue as SupportedFileType;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = file.type || getDefaultContentTypeForFileType(fileType);

    const metadata = await saveEditedDocumentBinaryForCurrentUser({
      documentId,
      fileType,
      baseVersionId,
      fileName: file.name || `edited-${documentId}`,
      contentType,
      buffer,
    });

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error("POST /api/documents/[documentId]/editor-save error", error);

    const message =
      error instanceof Error ? error.message : "Failed to save edited document";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message === "Document not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
