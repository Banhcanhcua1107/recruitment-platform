import type { PdfViewerInstanceLike } from "@/components/editor/pdfEditorRuntime";

const MAX_SAMPLED_PAGES = 5;
const MIN_MEANINGFUL_CHARACTERS = 40;
const MIN_MEANINGFUL_WORDS = 8;
const STRONG_TEXT_THRESHOLD = 120;
const SHORT_SINGLE_PAGE_THRESHOLD = 40;
const FRAGMENTED_SINGLE_CHAR_RATIO = 0.55;

export type PdfEditabilityLevel =
  | "fully_editable"
  | "partially_editable"
  | "scan_like";

export interface PdfEditabilityMetrics {
  sampledPages: number;
  pagesWithAnyText: number;
  pagesWithMeaningfulText: number;
  pagesWithTargetableText: number;
  averageCharsPerSampledPage: number;
  fragmentedTextPages: number;
}

export interface PdfEditabilityAssessment {
  level: PdfEditabilityLevel;
  headline: string;
  message: string;
  metrics: PdfEditabilityMetrics;
}

interface PdfEditabilityDocumentLike {
  getPageCount?: () => number;
  getTextPosition?: (
    pageNumber: number,
    textStartIndex: number,
    textEndIndex: number,
  ) => Promise<unknown[]>;
  loadPageText?: (pageNumber: number) => Promise<string>;
}

interface SampledPageAnalysis {
  characterCount: number;
  fragmentedText: boolean;
  hasAnyText: boolean;
  hasMeaningfulText: boolean;
  targetableText: boolean;
}

export async function analyzePdfEditability(
  instance: PdfViewerInstanceLike,
): Promise<PdfEditabilityAssessment> {
  const document = getEditabilityDocument(instance);

  if (!document?.getPageCount || !document?.loadPageText) {
    return buildAssessment(
      "partially_editable",
      {
        averageCharsPerSampledPage: 0,
        fragmentedTextPages: 0,
        pagesWithAnyText: 0,
        pagesWithMeaningfulText: 0,
        pagesWithTargetableText: 0,
        sampledPages: 0,
      },
    );
  }

  const pageCount = Math.max(0, document.getPageCount());
  if (pageCount === 0) {
    return buildAssessment(
      "partially_editable",
      {
        averageCharsPerSampledPage: 0,
        fragmentedTextPages: 0,
        pagesWithAnyText: 0,
        pagesWithMeaningfulText: 0,
        pagesWithTargetableText: 0,
        sampledPages: 0,
      },
    );
  }

  const sampledPages = buildSamplePages(pageCount, MAX_SAMPLED_PAGES);
  const sampledResults = await Promise.all(
    sampledPages.map((pageNumber) => analyzeSampledPage(document, pageNumber)),
  );

  return classifyPdfEditability(buildMetrics(sampledResults));
}

export function classifyPdfEditability(
  metrics: PdfEditabilityMetrics,
): PdfEditabilityAssessment {
  const meaningfulRatio = getSafeRatio(
    metrics.pagesWithMeaningfulText,
    metrics.sampledPages,
  );
  const targetableRatio = getSafeRatio(
    metrics.pagesWithTargetableText,
    Math.max(metrics.pagesWithAnyText, 1),
  );
  const fragmentedRatio = getSafeRatio(
    metrics.fragmentedTextPages,
    Math.max(metrics.pagesWithMeaningfulText, 1),
  );
  const hasStrongTextSignal =
    metrics.averageCharsPerSampledPage >= STRONG_TEXT_THRESHOLD ||
    (
      metrics.sampledPages === 1 &&
      metrics.pagesWithMeaningfulText === 1 &&
      metrics.averageCharsPerSampledPage >= SHORT_SINGLE_PAGE_THRESHOLD
    );

  if (
    metrics.pagesWithAnyText === 0 ||
    (
      meaningfulRatio <= 0.34 &&
      targetableRatio < 0.34 &&
      metrics.averageCharsPerSampledPage < STRONG_TEXT_THRESHOLD
    )
  ) {
    return buildAssessment("scan_like", metrics);
  }

  if (
    meaningfulRatio >= 0.8 &&
    targetableRatio >= 0.6 &&
    fragmentedRatio < 0.45 &&
    hasStrongTextSignal
  ) {
    return buildAssessment("fully_editable", metrics);
  }

  return buildAssessment("partially_editable", metrics);
}

export function buildStructuredEditorImportUrl(documentId: string) {
  return `/candidate/cv-builder?importReview=${encodeURIComponent(documentId)}`;
}

function buildAssessment(
  level: PdfEditabilityLevel,
  metrics: PdfEditabilityMetrics,
): PdfEditabilityAssessment {
  switch (level) {
    case "fully_editable":
      return {
        level,
        headline: "This PDF looks ready for direct editing.",
        message:
          "Apryse should be able to edit most text and image content directly in this file.",
        metrics,
      };
    case "scan_like":
      return {
        level,
        headline: "This PDF looks more like a scan or flattened export.",
        message:
          "Direct text editing may be limited or unavailable because the source file does not expose a strong editable text layer. You can still review the PDF here, but the structured editor is usually a better fit.",
        metrics,
      };
    case "partially_editable":
    default:
      return {
        level,
        headline: "Only part of this PDF may be directly editable.",
        message:
          "Some text or images may edit normally, while other areas can stay locked depending on how the original PDF was created. You can continue here, or switch to the structured editor for a safer fallback.",
        metrics,
      };
  }
}

function buildMetrics(sampledResults: SampledPageAnalysis[]): PdfEditabilityMetrics {
  const totalCharacters = sampledResults.reduce(
    (sum, page) => sum + page.characterCount,
    0,
  );

  return {
    sampledPages: sampledResults.length,
    pagesWithAnyText: sampledResults.filter((page) => page.hasAnyText).length,
    pagesWithMeaningfulText: sampledResults.filter((page) => page.hasMeaningfulText).length,
    pagesWithTargetableText: sampledResults.filter((page) => page.targetableText).length,
    averageCharsPerSampledPage:
      sampledResults.length > 0 ? totalCharacters / sampledResults.length : 0,
    fragmentedTextPages: sampledResults.filter((page) => page.fragmentedText).length,
  };
}

function buildSamplePages(pageCount: number, maxPages: number) {
  if (pageCount <= maxPages) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const samplePages = new Set<number>([1, pageCount]);
  const spread = pageCount - 1;

  for (let index = 1; samplePages.size < maxPages; index += 1) {
    const pageNumber = Math.round(1 + (spread * index) / (maxPages - 1));
    samplePages.add(Math.min(pageCount, Math.max(1, pageNumber)));
  }

  return [...samplePages].sort((left, right) => left - right);
}

async function analyzeSampledPage(
  document: PdfEditabilityDocumentLike,
  pageNumber: number,
): Promise<SampledPageAnalysis> {
  const rawText = await document.loadPageText?.(pageNumber).catch(() => "") ?? "";
  const normalizedText = normalizeExtractedText(rawText);
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const characterCount = normalizedText.length;
  const hasAnyText = characterCount > 0;
  const hasMeaningfulText =
    characterCount >= MIN_MEANINGFUL_CHARACTERS || words.length >= MIN_MEANINGFUL_WORDS;
  const fragmentedText = isFragmentedText(words);
  const targetableText = await canTargetExtractedText(
    document,
    pageNumber,
    rawText,
    hasMeaningfulText,
  );

  return {
    characterCount,
    fragmentedText,
    hasAnyText,
    hasMeaningfulText,
    targetableText,
  };
}

async function canTargetExtractedText(
  document: PdfEditabilityDocumentLike,
  pageNumber: number,
  rawText: string,
  hasMeaningfulText: boolean,
) {
  const range = findMeaningfulRange(rawText);
  if (!range) {
    return false;
  }

  if (!document.getTextPosition) {
    return hasMeaningfulText;
  }

  try {
    const positions = await document.getTextPosition(
      pageNumber,
      range.start,
      range.end,
    );
    return Array.isArray(positions) && positions.length > 0;
  } catch {
    return hasMeaningfulText;
  }
}

function findMeaningfulRange(rawText: string) {
  const start = rawText.search(/\S/);
  if (start < 0) {
    return null;
  }

  const targetLength = 32;
  let end = Math.min(rawText.length, start + targetLength);

  while (end > start && /^\s*$/.test(rawText.slice(start, end))) {
    end -= 1;
  }

  if (end <= start) {
    return null;
  }

  return { end, start };
}

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isFragmentedText(words: string[]) {
  if (words.length < 10) {
    return false;
  }

  const singleCharacterWords = words.filter((word) => word.length === 1).length;
  return getSafeRatio(singleCharacterWords, words.length) >= FRAGMENTED_SINGLE_CHAR_RATIO;
}

function getEditabilityDocument(instance: PdfViewerInstanceLike) {
  return instance.Core?.documentViewer?.getDocument?.() as PdfEditabilityDocumentLike | null;
}

function getSafeRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return value / total;
}
