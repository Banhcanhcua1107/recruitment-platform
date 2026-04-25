import { downloadPdfFromPreview, sanitizePdfFileName } from "./preview-pdf-export-v2";

function ensurePdfExtension(fileName: string) {
  return /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;
}

export async function downloadResumePdf(input: {
  resumeId: string;
  fallbackTitle?: string;
  previewRootElement?: HTMLElement | null;
}) {
  const resumeId = String(input.resumeId || "").trim();

  if (!resumeId) {
    throw new Error("Khong tim thay CV de tai.");
  }

  const previewRoot = input.previewRootElement;
  const normalizedFallbackTitle = ensurePdfExtension(
    sanitizePdfFileName(String(input.fallbackTitle || "cv-builder")),
  );

  if (!(previewRoot instanceof HTMLElement)) {
    throw new Error("Khong tim thay khung CV de tai PDF truc tiep.");
  }

  await downloadPdfFromPreview({
    rootElement: previewRoot,
    fallbackTitle: normalizedFallbackTitle,
  });
}
