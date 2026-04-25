import { NextRequest, NextResponse } from "next/server";
import { buildServerTimingHeader, fetchWithTimeout, UpstreamTimeoutError } from "@/lib/upstream-http";

export const dynamic = "force-dynamic";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "http://localhost:8000";

const AI_PROXY_TIMEOUT_MS = Number.parseInt(process.env.AI_PROXY_TIMEOUT_MS || "20000", 10);
const AI_SERVICE_ERROR_HINT = `Verify the AI service is reachable at ${AI_SERVICE_URL}.`;

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const outgoing = new FormData();

    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { detail: "Missing file upload." },
        { status: 400 },
      );
    }

    outgoing.append("file", file, file.name);

    const minConfidence = incoming.get("min_confidence");
    const params = new URLSearchParams();
    if (typeof minConfidence === "string" && minConfidence.trim()) {
      params.set("min_confidence", minConfidence);
    }

    const targetUrl = `${AI_SERVICE_URL}/upload-cv${
      params.size ? `?${params.toString()}` : ""
    }`;

    const { response, durationMs } = await fetchWithTimeout(
      targetUrl,
      {
        method: "POST",
        body: outgoing,
        cache: "no-store",
        signal: req.signal,
      },
      {
        timeoutMs: AI_PROXY_TIMEOUT_MS,
        timeoutMessage: `CV upload timed out after ${AI_PROXY_TIMEOUT_MS}ms.`,
      },
    );

    const contentType = response.headers.get("content-type") || "application/json";
    const bodyText = await response.text();
    const headers = new Headers({
      "content-type": contentType,
    });
    const serverTiming = buildServerTimingHeader([
      { name: "ai_upload_cv", dur: durationMs, desc: "AI upload CV" },
    ]);
    if (serverTiming) {
      headers.set("Server-Timing", serverTiming);
    }

    return new NextResponse(bodyText, {
      status: response.status,
      headers,
    });
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) {
      return NextResponse.json(
        { detail: error.message },
        { status: 504 },
      );
    }

    console.error("Proxy upload-cv error:", error);
    return NextResponse.json(
      {
        detail: `Proxy upload-cv failed. ${AI_SERVICE_ERROR_HINT}`,
      },
      { status: 502 },
    );
  }
}
