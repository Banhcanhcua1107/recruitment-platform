import type { SupportedFileType } from "@/types/editor";

const PDF_MIME_TYPES = ["application/pdf"];

const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function detectFileTypeFromMimeOrExtension(
  mimeType: string | null | undefined,
  fileNameOrExtension: string | null | undefined,
): SupportedFileType | null {
  const normalizedMime = mimeType?.toLowerCase() ?? null;
  const ext = (fileNameOrExtension ?? "")
    .toLowerCase()
    .trim()
    .replace(/^\./, "");

  if (normalizedMime) {
    if (PDF_MIME_TYPES.includes(normalizedMime)) return "pdf";
    if (WORD_MIME_TYPES.includes(normalizedMime)) return "word";
    if (IMAGE_MIME_TYPES.includes(normalizedMime)) return "image";
  }

  if (ext) {
    if (ext === "pdf") return "pdf";
    if (ext === "doc" || ext === "docx") return "word";
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  }

  return null;
}
