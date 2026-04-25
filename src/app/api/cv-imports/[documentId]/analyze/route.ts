import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { startCVDocumentProcessingForUser } from "@/lib/cv-imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ documentId: string }>;
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

    const payload = await startCVDocumentProcessingForUser(user.id, documentId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start CV analysis.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
