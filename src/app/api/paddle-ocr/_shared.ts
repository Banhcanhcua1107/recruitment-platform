import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user };
}

export function jsonError(message: string, status = 500, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}

export async function proxyJsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "application/json";
  const bodyText = await response.text();

  return new NextResponse(bodyText, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}
