import { NextResponse, type NextRequest } from "next/server";
import { getDocumentEditorMetadataForCurrentUser } from "@/lib/editor/metadata";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { documentId } = await params;

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
    const metadata = await getDocumentEditorMetadataForCurrentUser(documentId);

    if (!metadata.canEditSource) {
      return NextResponse.json(
        { error: "Document is not editable in current state." },
        { status: 409 },
      );
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("GET /api/documents/[documentId]/editor-metadata error", error);

    const message =
      error instanceof Error ? error.message : "Failed to load editor metadata";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message === "Document not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
