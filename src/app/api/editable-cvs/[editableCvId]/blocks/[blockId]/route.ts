import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { updateEditableBlockForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  edited_text: z.string().optional(),
  locked: z.boolean().optional(),
  client_mutation_id: z.string().min(1),
  expected_revision: z.number().int().min(0),
  expected_block_version: z.number().int().min(1).optional(),
});

interface Params {
  params: Promise<{ editableCvId: string; blockId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { editableCvId, blockId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const response = await updateEditableBlockForUser(user.id, editableCvId, blockId, body);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update editable block.";
    const details =
      error && typeof error === "object" && "details" in error
        ? (error as { details?: Record<string, unknown> }).details
        : undefined;
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    const status = message.toLowerCase().includes("conflict") ? 409 : 400;
    return NextResponse.json({ error: message, code, details }, { status });
  }
}
