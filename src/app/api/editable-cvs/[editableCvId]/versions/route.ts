import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createEditableVersionForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  reason: z.string().min(1),
  change_summary: z.string().optional(),
});

interface Params {
  params: Promise<{ editableCvId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { editableCvId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const response = await createEditableVersionForUser(
      user.id,
      editableCvId,
      body.change_summary ?? body.reason
    );
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create version.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
