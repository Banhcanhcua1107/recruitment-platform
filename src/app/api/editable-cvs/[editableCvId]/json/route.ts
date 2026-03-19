import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { updateEditableJsonForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const operationSchema = z.object({
  op: z.literal("replace"),
  path: z.string().min(1),
  value: z.unknown(),
});

const requestSchema = z.object({
  operations: z.array(operationSchema).min(1),
  client_mutation_id: z.string().min(1),
  expected_revision: z.number().int().min(0),
});

interface Params {
  params: Promise<{ editableCvId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
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
    const response = await updateEditableJsonForUser(user.id, editableCvId, body);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update editable JSON.";
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
