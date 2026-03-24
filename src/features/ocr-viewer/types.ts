export interface OcrPoint {
  x: number;
  y: number;
}

export interface OcrBbox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface ScaledOcrBbox {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

export interface NormalizedOcrBlock {
  id: string;
  pageIndex: number;
  type: string;
  text: string;
  bbox: OcrBbox;
  polygon?: OcrPoint[];
  order: number;
  confidence?: number | null;
  meta?: Record<string, unknown>;
}

export interface NormalizedOcrPage {
  pageIndex: number;
  originalWidth: number;
  originalHeight: number;
  imageUrl?: string;
  blocks: NormalizedOcrBlock[];
  meta?: Record<string, unknown>;
}

export interface NormalizedOcrResult {
  pages: NormalizedOcrPage[];
  source: "sync" | "async" | "persisted" | "legacy" | "unknown";
  warnings: string[];
  meta?: Record<string, unknown>;
}

export interface OcrLogEntry {
  id: string;
  level: "info" | "success" | "error";
  message: string;
  createdAt: string;
}

export type ParseMode = "sync" | "async";

export type PreviewSourceKind = "pdf" | "image" | "page-images" | "none";
export type PreviewScaleMode = "fitPage" | "fitWidth" | "custom";

export interface DocumentPreviewSource {
  kind: PreviewSourceKind;
  url?: string | null;
}

export type AsyncParseStatus =
  | "idle"
  | "submitting"
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface AsyncParseProgress {
  jobId: string | null;
  status: string;
  totalPages: number | null;
  extractedPages: number | null;
  message: string | null;
  jsonUrl: string | null;
}
