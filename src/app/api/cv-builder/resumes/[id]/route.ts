import { NextResponse } from "next/server";
import {
  deleteResume,
  getResumeById,
  saveResume,
} from "@/lib/resumes";

function getResumeRouteStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  if (message === "Resume not found") {
    return 404;
  }

  return 500;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getResumeById(id);

    if (!item) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: getResumeRouteStatusCode(message) });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      resume_data?: Array<{
        block_id: string;
        is_visible: boolean;
        data: Record<string, unknown>;
      }>;
      current_styling?: Record<string, unknown>;
    };

    await saveResume(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: getResumeRouteStatusCode(message) });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteResume(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: getResumeRouteStatusCode(message) });
  }
}
