export type CVThemePatternId = "dots" | "grid" | "diagonal" | "waves";

export const DEFAULT_TEMPLATE_PRIMARY_RGB = "15 118 110";
export const DEFAULT_TEMPLATE_PATTERN_RGB = "148 163 184";

const FALLBACK_PRIMARY_TRIPLET: [number, number, number] = [15, 118, 110];
const FALLBACK_PATTERN_TRIPLET: [number, number, number] = [148, 163, 184];

export const CV_THEME_PRIMARY_SWATCHES: string[] = [
  "#0f766e",
  "#0f4c81",
  "#b45309",
  "#be123c",
  "#4c1d95",
  "#14532d",
  "#6b21a8",
  "#374151",
  "#2563eb",
  "#0d9488",
  "#b91c1c",
  "#1d4ed8",
];

export const CV_THEME_PATTERN_OPTIONS: Array<{ id: CVThemePatternId; label: string; previewClassName: string }> = [
  { id: "dots", label: "Dots", previewClassName: "cv-f8-pattern-preview-dots" },
  { id: "grid", label: "Grid", previewClassName: "cv-f8-pattern-preview-grid" },
  { id: "diagonal", label: "Diagonal", previewClassName: "cv-f8-pattern-preview-diagonal" },
  { id: "waves", label: "Waves", previewClassName: "cv-f8-pattern-preview-waves" },
];

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseColorToRgbTriplet(value: string | undefined): [number, number, number] | null {
  const normalized = (value || "").trim();

  const hexMatch = normalized.match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
  if (hexMatch) {
    const hexValue = hexMatch[1];
    if (hexValue.length === 3) {
      return [
        clampColorChannel(Number.parseInt(hexValue[0] + hexValue[0], 16)),
        clampColorChannel(Number.parseInt(hexValue[1] + hexValue[1], 16)),
        clampColorChannel(Number.parseInt(hexValue[2] + hexValue[2], 16)),
      ];
    }

    return [
      clampColorChannel(Number.parseInt(hexValue.slice(0, 2), 16)),
      clampColorChannel(Number.parseInt(hexValue.slice(2, 4), 16)),
      clampColorChannel(Number.parseInt(hexValue.slice(4, 6), 16)),
    ];
  }

  const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) {
    return null;
  }

  return [
    clampColorChannel(Number.parseInt(rgbMatch[1], 10)),
    clampColorChannel(Number.parseInt(rgbMatch[2], 10)),
    clampColorChannel(Number.parseInt(rgbMatch[3], 10)),
  ];
}

function mixRgb(
  source: [number, number, number],
  target: [number, number, number],
  targetWeight: number,
): [number, number, number] {
  const clampedWeight = Math.min(1, Math.max(0, targetWeight));

  return [
    clampColorChannel(source[0] * (1 - clampedWeight) + target[0] * clampedWeight),
    clampColorChannel(source[1] * (1 - clampedWeight) + target[1] * clampedWeight),
    clampColorChannel(source[2] * (1 - clampedWeight) + target[2] * clampedWeight),
  ];
}

function toLinearChannel(value: number) {
  const normalized = value / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b);
}

function contrastRatio(first: [number, number, number], second: [number, number, number]) {
  const luminanceA = relativeLuminance(first);
  const luminanceB = relativeLuminance(second);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveContrastText(primaryRgb: [number, number, number]): [number, number, number] {
  const lightText: [number, number, number] = [255, 255, 255];
  const darkText: [number, number, number] = [15, 23, 42];

  const lightContrast = contrastRatio(primaryRgb, lightText);
  const darkContrast = contrastRatio(primaryRgb, darkText);

  return lightContrast >= darkContrast ? lightText : darkText;
}

function ensureContrastAgainstBackground(input: {
  candidate: [number, number, number];
  background: [number, number, number];
  anchor: [number, number, number];
  minimumContrast: number;
}): [number, number, number] {
  const { candidate, background, anchor, minimumContrast } = input;
  if (contrastRatio(candidate, background) >= minimumContrast) {
    return candidate;
  }

  const fallbackWeights = [0.28, 0.2, 0.12, 0.04, 0];
  for (const weight of fallbackWeights) {
    const nextCandidate = mixRgb(anchor, background, weight);
    if (contrastRatio(nextCandidate, background) >= minimumContrast) {
      return nextCandidate;
    }
  }

  return anchor;
}

function toRgbString(rgb: [number, number, number]) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

export function getContrastTextColor(backgroundColor: string): string {
  const backgroundTriplet = parseColorToRgbTriplet(backgroundColor) ?? FALLBACK_PRIMARY_TRIPLET;
  return toRgbString(resolveContrastText(backgroundTriplet));
}

export function getReadableMutedColor(backgroundColor: string): string {
  const backgroundTriplet = parseColorToRgbTriplet(backgroundColor) ?? FALLBACK_PRIMARY_TRIPLET;
  const contrastText = resolveContrastText(backgroundTriplet);
  const mutedCandidate = mixRgb(contrastText, backgroundTriplet, 0.4);

  return toRgbString(ensureContrastAgainstBackground({
    candidate: mutedCandidate,
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 3.2,
  }));
}

export interface CVTemplateSidebarPaletteTokens {
  sidebarBackgroundRgb: string;
  sidebarTextRgb: string;
  sidebarMutedRgb: string;
  sidebarIconRgb: string;
  sidebarDividerRgb: string;
  sidebarOverlayRgb: string;
  sidebarSkillTrackRgb: string;
  sidebarSkillFillRgb: string;
}

export function buildSidebarPalette(primaryColor?: string): CVTemplateSidebarPaletteTokens {
  const backgroundTriplet = parseColorToRgbTriplet(primaryColor) ?? FALLBACK_PRIMARY_TRIPLET;
  const contrastText = resolveContrastText(backgroundTriplet);
  const mutedText = ensureContrastAgainstBackground({
    candidate: mixRgb(contrastText, backgroundTriplet, 0.18),
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 4.6,
  });
  const divider = ensureContrastAgainstBackground({
    candidate: mixRgb(contrastText, backgroundTriplet, 0.6),
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 2.4,
  });
  const overlay = ensureContrastAgainstBackground({
    candidate: mixRgb(contrastText, backgroundTriplet, 0.74),
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 1.6,
  });
  const skillTrack = ensureContrastAgainstBackground({
    candidate: mixRgb(contrastText, backgroundTriplet, 0.66),
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 1.9,
  });
  const skillFill = ensureContrastAgainstBackground({
    candidate: mixRgb(contrastText, backgroundTriplet, 0.1),
    background: backgroundTriplet,
    anchor: contrastText,
    minimumContrast: 4.5,
  });

  return {
    sidebarBackgroundRgb: toRgbString(backgroundTriplet),
    sidebarTextRgb: toRgbString(contrastText),
    sidebarMutedRgb: toRgbString(mutedText),
    sidebarIconRgb: toRgbString(contrastText),
    sidebarDividerRgb: toRgbString(divider),
    sidebarOverlayRgb: toRgbString(overlay),
    sidebarSkillTrackRgb: toRgbString(skillTrack),
    sidebarSkillFillRgb: toRgbString(skillFill),
  };
}

export function resolveTemplatePatternClassName(patternId: string | undefined): string {
  switch (patternId) {
    case "grid":
      return "cv-f8-page-pattern-grid";
    case "diagonal":
      return "cv-f8-page-pattern-diagonal";
    case "waves":
      return "cv-f8-page-pattern-waves";
    case "dots":
    default:
      return "cv-f8-page-pattern-dots";
  }
}

export function resolveSidebarPatternClassName(patternId: string | undefined): string {
  switch (patternId) {
    case "grid":
      return "cv-f8-sidebar-pattern-grid";
    case "diagonal":
      return "cv-f8-sidebar-pattern-diagonal";
    case "waves":
      return "cv-f8-sidebar-pattern-waves";
    case "dots":
    default:
      return "cv-f8-sidebar-pattern-dots";
  }
}

export interface CVTemplatePaletteTokens extends CVTemplateSidebarPaletteTokens {
  primaryRgb: string;
  primarySoftRgb: string;
  primaryMutedRgb: string;
  primaryBorderRgb: string;
  primaryContrastRgb: string;
  patternRgb: string;
}

export function buildTemplatePaletteTokens(input: {
  primaryColor?: string;
  patternColor?: string;
  syncPatternWithPrimary?: boolean;
}): CVTemplatePaletteTokens {
  const primaryTriplet = parseColorToRgbTriplet(input.primaryColor) ?? FALLBACK_PRIMARY_TRIPLET;
  const borderTriplet = mixRgb(primaryTriplet, [255, 255, 255], 0.72);
  const mutedTriplet = mixRgb(primaryTriplet, [255, 255, 255], 0.18);
  const softTriplet = mixRgb(primaryTriplet, [255, 255, 255], 0.86);
  const contrastTriplet = resolveContrastText(primaryTriplet);
  const patternTriplet = input.syncPatternWithPrimary
    ? mixRgb(primaryTriplet, [255, 255, 255], 0.32)
    : parseColorToRgbTriplet(input.patternColor) ?? FALLBACK_PATTERN_TRIPLET;
  const sidebarPalette = buildSidebarPalette(input.primaryColor);

  return {
    primaryRgb: toRgbString(primaryTriplet),
    primarySoftRgb: toRgbString(softTriplet),
    primaryMutedRgb: toRgbString(mutedTriplet),
    primaryBorderRgb: toRgbString(borderTriplet),
    primaryContrastRgb: toRgbString(contrastTriplet),
    patternRgb: toRgbString(patternTriplet),
    ...sidebarPalette,
  };
}
