export type JSONPathToken = string | number;

const PATH_SEGMENT_RE = /([^[.\]]+)|\[(\d+)\]/g;

export function parseJSONPath(path: string): JSONPathToken[] {
  const tokens: JSONPathToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = PATH_SEGMENT_RE.exec(path)) !== null) {
    if (match[1]) tokens.push(match[1]);
    if (match[2]) tokens.push(Number(match[2]));
  }
  return tokens;
}

export function getValueAtPath(input: unknown, path: string): unknown {
  const tokens = parseJSONPath(path);
  let current: unknown = input;
  for (const token of tokens) {
    if (current == null) return undefined;
    if (typeof token === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[token];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

export function setValueAtPath<T>(input: T, path: string, value: unknown): T {
  const tokens = parseJSONPath(path);
  if (tokens.length === 0) return input;

  const clone = structuredClone(input) as unknown;
  let current = clone as Record<string, unknown> | unknown[];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isLast = index === tokens.length - 1;
    const nextToken = tokens[index + 1];

    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        throw new Error(`Invalid JSON path ${path}`);
      }
      if (isLast) {
        current[token] = value;
        break;
      }
      if (current[token] == null) {
        current[token] = typeof nextToken === "number" ? [] : {};
      }
      current = current[token] as Record<string, unknown> | unknown[];
      continue;
    }

    if (Array.isArray(current)) {
      throw new Error(`Invalid JSON path ${path}`);
    }
    if (isLast) {
      current[token] = value;
      break;
    }
    if (current[token] == null) {
      current[token] = typeof nextToken === "number" ? [] : {};
    }
    current = current[token] as Record<string, unknown> | unknown[];
  }

  return clone as T;
}
