import type { CVContent, CVThemePatternId } from "./types";

export function normalizeThemeFonts(rawFonts: unknown): CVContent["theme"]["fonts"] | undefined {
  if (typeof rawFonts === "string") {
    const normalized = rawFonts.trim();
    if (!normalized) {
      return undefined;
    }

    return {
      heading: normalized,
      body: normalized,
    };
  }

  if (!rawFonts || typeof rawFonts !== "object") {
    return undefined;
  }

  const fonts = rawFonts as Record<string, unknown>;
  const normalizedBody = typeof fonts.body === "string" ? fonts.body.trim() : "";
  const normalizedHeading = typeof fonts.heading === "string" ? fonts.heading.trim() : "";
  const body = normalizedBody || normalizedHeading;
  const heading = normalizedHeading || normalizedBody;

  if (!body || !heading) {
    return undefined;
  }

  return {
    heading,
    body,
  };
}

export function normalizeThemeSpacing(rawSpacing: unknown) {
  if (typeof rawSpacing !== "number" || !Number.isFinite(rawSpacing)) {
    return undefined;
  }

  if (rawSpacing <= 0) {
    return undefined;
  }

  return rawSpacing;
}

export function normalizeThemeAppearance(rawAppearance: unknown): CVContent["theme"]["appearance"] | undefined {
  if (!rawAppearance || typeof rawAppearance !== "object") {
    return undefined;
  }

  const appearance = rawAppearance as Record<string, unknown>;
  const validPatternIds = new Set<CVThemePatternId>(["dots", "grid", "diagonal", "waves"]);
  const patternId =
    typeof appearance.patternId === "string" && validPatternIds.has(appearance.patternId as CVThemePatternId)
      ? (appearance.patternId as CVThemePatternId)
      : undefined;
  const syncPatternWithPrimary =
    typeof appearance.syncPatternWithPrimary === "boolean"
      ? appearance.syncPatternWithPrimary
      : undefined;

  if (!patternId && typeof syncPatternWithPrimary !== "boolean") {
    return undefined;
  }

  return {
    patternId,
    syncPatternWithPrimary,
  };
}