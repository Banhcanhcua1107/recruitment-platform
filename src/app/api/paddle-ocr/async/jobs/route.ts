import { proxyJsonRequest, jsonError, requireAuthenticatedUser } from "@/app/api/paddle-ocr/_shared";

const DEFAULT_ASYNC_BASE_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as {
      fileData?: string;
      fileName?: string;
      fileMimeType?: string;
      fileUrl?: string;
    };

    const asyncBaseUrl = process.env.PADDLE_OCR_ASYNC_BASE_URL || DEFAULT_ASYNC_BASE_URL;
    const token = process.env.PADDLE_OCR_ASYNC_TOKEN;
    const model = process.env.PADDLE_OCR_ASYNC_MODEL || "PaddleOCR-VL-1.5";

    if (!token) {
      return jsonError("Missing PADDLE_OCR_ASYNC_TOKEN server environment variable.", 500);
    }

    if (!body.fileUrl && !body.fileData) {
      return jsonError("Either fileUrl or fileData is required.", 400);
    }

    const upstreamPayload = body.fileUrl
      ? {
          model,
          input: {
            file_url: body.fileUrl,
          },
        }
      : {
          model,
          input: {
            file_data: body.fileData,
            file_name: body.fileName,
            file_mime_type: body.fileMimeType,
          },
        };

    return proxyJsonRequest(asyncBaseUrl, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamPayload),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Async OCR submit proxy failed.",
      502,
    );
  }
}
