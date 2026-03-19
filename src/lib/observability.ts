type LogLevel = "info" | "warn" | "error";

type Payload = Record<string, unknown>;

function emit(level: LogLevel, event: string, payload: Payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export const logger = {
  info(event: string, payload?: Payload) {
    emit("info", event, payload);
  },
  warn(event: string, payload?: Payload) {
    emit("warn", event, payload);
  },
  error(event: string, payload?: Payload) {
    emit("error", event, payload);
  },
};

export async function measureAsync<T>(
  event: string,
  payload: Payload,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const started = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - started;
    logger.info(event, { ...payload, duration_ms: durationMs });
    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    logger.error(`${event}.failed`, {
      ...payload,
      duration_ms: durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
