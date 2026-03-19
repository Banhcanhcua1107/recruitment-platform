import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCVDocumentDetailForUser } from "@/lib/cv-imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ documentId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
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

    const detail = await getCVDocumentDetailForUser(user.id, documentId);
    if (!detail) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load CV document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
