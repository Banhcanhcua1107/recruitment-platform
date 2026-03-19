import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getEditableCVDetailForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ editableCvId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
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

    const detail = await getEditableCVDetailForUser(user.id, editableCvId);
    if (!detail) {
      return NextResponse.json({ error: "Editable CV not found." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load editable CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
