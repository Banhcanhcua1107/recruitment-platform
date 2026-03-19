import { NextResponse } from "next/server";
import { getTemplates } from "@/lib/resumes";

export async function GET() {
  try {
    const items = await getTemplates();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
