import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createEditableCVFromDocument } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  allow_partial: z.boolean().default(false),
  override_non_cv: z.boolean().default(false),
});

interface Params {
  params: Promise<{ documentId: string }>;
}

export async function POST(request: Request, { params }: Params) {
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

    const parsed = requestSchema.parse(await request.json());
    const response = await createEditableCVFromDocument(user.id, documentId, {
      allowPartial: parsed.allow_partial,
      overrideNonCv: parsed.override_non_cv,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save editable CV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
