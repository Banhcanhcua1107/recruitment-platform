import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { restoreEditableVersionForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  version_id: z.string().uuid(),
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
    const response = await restoreEditableVersionForUser(user.id, editableCvId, body.version_id);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore version.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
