import { NextResponse, type NextRequest } from "next/server";
import {
  getDefaultContentTypeForFileType,
  saveEditedDocumentBinaryAsSystem,
} from "@/lib/editor/metadata";

interface OnlyOfficeCallbackPayload {
  status?: number;
  key?: string;
  url?: string;
}

function parseDocumentKey(key: string | undefined): { documentId: string; baseVersionId: string | null } {
  if (!key) {
    throw new Error("Missing ONLYOFFICE document key.");
  }

  // key format: doc:{documentId}:base:{baseVersionId}
  const parts = key.split(":");
  if (parts.length >= 4 && parts[0] === "doc" && parts[2] === "base") {
    return {
      documentId: parts[1],
      baseVersionId: parts[3] || null,
    };
  }

  // Backward-compatible fallback: key itself is documentId
  return {
    documentId: key,
    baseVersionId: null,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as OnlyOfficeCallbackPayload;

    // ONLYOFFICE statuses:
    // 2: Must save document; 6: Must force save document
    if (payload.status !== 2 && payload.status !== 6) {
      return NextResponse.json({ error: 0 });
    }

    if (!payload.url) {
      throw new Error("Missing ONLYOFFICE download URL.");
    }

    const { documentId, baseVersionId } = parseDocumentKey(payload.key);

    const fileResponse = await fetch(payload.url, { cache: "no-store" });
    if (!fileResponse.ok) {
      throw new Error("Khong the tai file tu ONLYOFFICE callback URL.");
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get("content-type") || getDefaultContentTypeForFileType("word");

    await saveEditedDocumentBinaryAsSystem({
      documentId,
      fileType: "word",
      baseVersionId,
      fileName: "edited.docx",
      contentType,
      buffer: Buffer.from(arrayBuffer),
    });

    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error("ONLYOFFICE callback error", error);
    return NextResponse.json({ error: 1 }, { status: 500 });
  }
}
