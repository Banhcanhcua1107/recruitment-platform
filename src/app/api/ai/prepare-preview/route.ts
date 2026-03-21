import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

const AI_SERVICE_ERROR_HINT = `Verify the AI service is reachable at ${AI_SERVICE_URL}.`;

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const outgoing = new FormData();

    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "Missing file upload." }, { status: 400 });
    }

    outgoing.append("file", file, file.name);

    const response = await fetch(`${AI_SERVICE_URL}/preview/upload`, {
      method: "POST",
      body: outgoing,
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
  } catch (error) {
    console.error("Proxy prepare-preview error:", error);
    return NextResponse.json(
      {
        detail: `Proxy prepare-preview failed. ${AI_SERVICE_ERROR_HINT}`,
      },
      { status: 502 }
    );
  }
}
