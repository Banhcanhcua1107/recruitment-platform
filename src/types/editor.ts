import type { CVDocumentStatus } from "@/types/cv-import";

export type SupportedFileType = "pdf" | "word" | "image";

export type DocumentEditorMode = "view" | "edit_all" | "edit_text" | "edit_image";

export interface DocumentFileVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_type: SupportedFileType;
  storage_bucket: string;
  storage_path: string;
  source: "upload" | "pipeline" | "edit";
  based_on_version_id: string | null;
  created_at: string;
  created_by: string | null;
  content_type: string;
  size_bytes: number | null;
}

export interface DocumentEditorMetadata {
  documentId: string;
  status: CVDocumentStatus;
  fileType: SupportedFileType;
  canEditSource: boolean;
  sourceFileVersionId: string;
  latestFileVersionId: string;
  lastParsedVersionId: string | null;
  fileUpdatedAfterParse: boolean;
  reparseRecommended: boolean;
  fileUrl: string;
  vendorConfig: {
    pdf?: {
      type: "apryse";
      licenseKey?: string;
      webviewerPath: string;
    };
    word?: {
      type: "onlyoffice";
      docServerUrl: string;
      config: Record<string, unknown>;
    };
    image?: {
      type: "local";
    };
  };
}

export interface EditorSaveResponse {
  metadata: DocumentEditorMetadata;
}

export interface SaveEditedBinaryArgs {
  documentId: string;
  fileType: SupportedFileType;
  baseVersionId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export interface SaveEditedBinarySystemArgs {
  documentId: string;
  fileType: SupportedFileType;
  baseVersionId: string | null;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}
