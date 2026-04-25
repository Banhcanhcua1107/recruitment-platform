import "server-only";

const DEFAULT_UPSTREAM_TIMEOUT_MS = Number.parseInt(
  process.env.UPSTREAM_FETCH_TIMEOUT_MS || "20000",
  10,
);

export interface ServerTimingMetric {
  name: string;
  dur: number;
  desc?: string;
}

export class UpstreamTimeoutError extends Error {
  timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "UpstreamTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function resolveTimeoutMs(overrideMs?: number) {
  if (typeof overrideMs === "number" && Number.isFinite(overrideMs) && overrideMs > 0) {
    return Math.floor(overrideMs);
  }

  if (Number.isFinite(DEFAULT_UPSTREAM_TIMEOUT_MS) && DEFAULT_UPSTREAM_TIMEOUT_MS > 0) {
    return Math.floor(DEFAULT_UPSTREAM_TIMEOUT_MS);
  }

  return 20_000;
}

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Upstream request timeout", "TimeoutError"));
  }, timeoutMs);

  return {
    controller,
    clear: () => clearTimeout(timer),
  };
}

function bindAbortSignal(target: AbortController, source?: AbortSignal | null) {
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

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options?: {
    timeoutMs?: number;
    timeoutMessage?: string;
  },
) {
  const timeoutMs = resolveTimeoutMs(options?.timeoutMs);
  const timeoutController = createTimeoutController(timeoutMs);
  const unbindSourceAbort = bindAbortSignal(timeoutController.controller, init.signal);
  const startedAt = performance.now();

  try {
    const response = await fetch(input, {
      ...init,
      signal: timeoutController.controller.signal,
    });

    return {
      response,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    const timedOut =
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError") &&
      durationMs >= timeoutMs;

    if (timedOut) {
      throw new UpstreamTimeoutError(
        options?.timeoutMessage || `Upstream request timed out after ${timeoutMs}ms.`,
        timeoutMs,
      );
    }

    throw error;
  } finally {
    timeoutController.clear();
    unbindSourceAbort();
  }
}

function sanitizeMetricToken(value: string) {
  const normalized = value.trim().replace(/[^A-Za-z0-9_]/g, "_");
  return normalized || "metric";
}

function sanitizeMetricDescription(value: string) {
  return value.replace(/["\\]/g, "").trim();
}

export function buildServerTimingHeader(metrics: Array<ServerTimingMetric | null | undefined>) {
  return metrics
    .filter((metric): metric is ServerTimingMetric => Boolean(metric) && Number.isFinite(metric?.dur))
    .map((metric) => {
      const token = sanitizeMetricToken(metric.name);
      const duration = Math.max(0, Number(metric.dur.toFixed(1)));
      const description = metric.desc ? `;desc="${sanitizeMetricDescription(metric.desc)}"` : "";
      return `${token};dur=${duration}${description}`;
    })
    .join(", ");
}
