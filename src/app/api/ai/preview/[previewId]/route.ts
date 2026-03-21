import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

const AI_SERVICE_ERROR_HINT = `Verify the AI service is reachable at ${AI_SERVICE_URL}.`;

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
    const headers = new Headers({
      "content-type": contentType,
      "cache-control": response.headers.get("cache-control") || "no-store",
    });

    for (const headerName of ["content-disposition", "content-length", "accept-ranges"]) {
      const value = response.headers.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    }

    return new NextResponse(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Proxy preview error:", error);
    return NextResponse.json(
      {
        detail: `Proxy preview failed. ${AI_SERVICE_ERROR_HINT}`,
      },
      { status: 502 }
    );
  }
}
