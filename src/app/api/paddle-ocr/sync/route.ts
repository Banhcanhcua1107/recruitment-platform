import { proxyJsonRequest, jsonError, requireAuthenticatedUser } from "@/app/api/paddle-ocr/_shared";

const DEFAULT_SYNC_URL = "https://c2yeg2d9zfnduff0.aistudio-app.com/layout-parsing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const payload = (await request.json()) as Record<string, unknown>;
    const syncUrl = process.env.PADDLE_OCR_SYNC_URL || DEFAULT_SYNC_URL;
    const token = process.env.PADDLE_OCR_SYNC_TOKEN;

    if (!token) {
      return jsonError("Missing PADDLE_OCR_SYNC_TOKEN server environment variable.", 500);
    }

    return proxyJsonRequest(syncUrl, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Sync OCR proxy failed.",
      502,
    );
  }
}
