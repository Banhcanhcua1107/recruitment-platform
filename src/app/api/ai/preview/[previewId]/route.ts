import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

interface Params {
  params: Promise<{
    previewId: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { previewId } = await params;
    const response = await fetch(`${AI_SERVICE_URL}/preview/${previewId}`, {
      method: "GET",
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Proxy preview error:", error);
    return NextResponse.json(
      {
        detail: "Proxy preview failed. Verify the AI service is running on http://localhost:8000.",
      },
      { status: 502 }
    );
  }
}
