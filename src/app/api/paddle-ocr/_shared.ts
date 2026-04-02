import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_PROXY_TIMEOUT_MS = Number.parseInt(
  process.env.PADDLE_OCR_PROXY_TIMEOUT_MS || "20000",
  10,
);

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

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Upstream OCR timeout", "TimeoutError"));
  }, timeoutMs);

  return {
    controller,
    clear: () => clearTimeout(timer),
  };
}

function bindAbortSignal(target: AbortController, source?: AbortSignal) {
  if (!source) {
    return () => {};
  }

  if (source.aborted) {
    target.abort(source.reason);
    return () => {};
  }

  const onAbort = () => target.abort(source.reason);
  source.addEventListener("abort", onAbort, { once: true });
  return () => source.removeEventListener("abort", onAbort);
}

function resolveProxyTimeout(overrideMs?: number) {
  if (typeof overrideMs === "number" && Number.isFinite(overrideMs) && overrideMs > 0) {
    return Math.floor(overrideMs);
  }

  if (Number.isFinite(DEFAULT_PROXY_TIMEOUT_MS) && DEFAULT_PROXY_TIMEOUT_MS > 0) {
    return Math.floor(DEFAULT_PROXY_TIMEOUT_MS);
  }

  return 20_000;
}

export async function proxyJsonRequest(
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number },
) {
  const timeoutMs = resolveProxyTimeout(options?.timeoutMs);
  const timeoutController = createTimeoutController(timeoutMs);
  const unbindSourceAbort = bindAbortSignal(timeoutController.controller, init.signal);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: timeoutController.controller.signal,
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
    const timeoutExceeded = Date.now() - startedAt >= timeoutMs;
    const timeoutAbort =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError") &&
      timeoutExceeded;

    if (timeoutAbort) {
      return jsonError(
        `Upstream OCR service timed out after ${timeoutMs}ms.`,
        504,
        { url },
      );
    }

    throw error;
  } finally {
    timeoutController.clear();
    unbindSourceAbort();
  }
}
