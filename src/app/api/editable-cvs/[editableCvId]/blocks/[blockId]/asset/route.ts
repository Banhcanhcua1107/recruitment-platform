import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { replaceEditableBlockAssetForUser } from "@/lib/editable-cvs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ editableCvId: string; blockId: string }>;
}

export async function POST(request: Request, { params }: Params) {
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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const response = await replaceEditableBlockAssetForUser(user.id, editableCvId, blockId, file);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to replace block image.";
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

export async function DELETE(_request: Request, { params }: Params) {
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

    const response = await replaceEditableBlockAssetForUser(user.id, editableCvId, blockId, null);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear block image.";
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
