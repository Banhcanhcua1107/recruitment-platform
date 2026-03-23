import { NextResponse } from "next/server";
import { jsonError, requireAuthenticatedUser } from "@/app/api/paddle-ocr/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return jsonError("Missing url query parameter.", 400);
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return jsonError("Invalid result url.", 400);
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return jsonError("Only http/https result URLs are supported.", 400);
    }

    const asyncToken = process.env.PADDLE_OCR_ASYNC_TOKEN;
    const shouldAttachToken = Boolean(asyncToken) && /aistudio-app\.com$/i.test(targetUrl.hostname);
    const response = await fetch(targetUrl.toString(), {
      headers: shouldAttachToken ? { Authorization: `bearer ${asyncToken}` } : undefined,
      cache: "no-store",
    });

    const contentType =
      response.headers.get("content-type") ||
      "application/x-ndjson; charset=utf-8";
    const bodyText = await response.text();

    return new NextResponse(bodyText, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "OCR result proxy failed.",
      502,
    );
  }
}
