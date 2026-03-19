import { NextResponse } from "next/server";
import {
  listViewerNotifications,
  markViewerNotificationsRead,
} from "@/lib/notifications";

export async function GET() {
  try {
    const items = await listViewerNotifications();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

export async function POST() {
  try {
    await markViewerNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
