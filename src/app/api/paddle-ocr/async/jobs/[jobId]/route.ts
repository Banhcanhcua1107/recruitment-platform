import { proxyJsonRequest, jsonError, requireAuthenticatedUser } from "@/app/api/paddle-ocr/_shared";

const DEFAULT_ASYNC_BASE_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { jobId } = await params;
    const asyncBaseUrl = process.env.PADDLE_OCR_ASYNC_BASE_URL || DEFAULT_ASYNC_BASE_URL;
    const token = process.env.PADDLE_OCR_ASYNC_TOKEN;

    if (!token) {
      return jsonError("Missing PADDLE_OCR_ASYNC_TOKEN server environment variable.", 500);
    }

    return proxyJsonRequest(`${asyncBaseUrl}/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: {
        Authorization: `bearer ${token}`,
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Async OCR status proxy failed.",
      502,
    );
  }
}
