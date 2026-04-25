import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { CVDocumentRecord, CVDocumentStatus } from "@/types/cv-import";
import type {
  DocumentEditorMetadata,
  DocumentFileVersion,
  SaveEditedBinaryArgs,
  SaveEditedBinarySystemArgs,
  SupportedFileType,
} from "@/types/editor";
import { detectFileTypeFromMimeOrExtension } from "@/lib/editor/fileType";
import {
  buildEditedStoragePath,
  insertEditedVersionWithRetry,
  isDocumentFileVersionConflictError,
} from "@/lib/editor/versioning";

const ORIGINALS_BUCKET = "cv-originals";
const DEFAULT_SIGNED_URL_SECONDS = 60 * 60;

interface CVDocumentWithEditorMetadata extends CVDocumentRecord {
  source_file_version_id?: string | null;
  latest_file_version_id?: string | null;
  last_parsed_version_id?: string | null;
  file_updated_after_parse?: boolean | null;
  reparse_recommended?: boolean | null;
}

type DocumentFileVersionRow = DocumentFileVersion;

async function getAuthenticatedUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user: data.user };
}

async function getDocumentById(admin: SupabaseClient, documentId: string) {
  const { data, error } = await admin
    .from("cv_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CVDocumentWithEditorMetadata | null) ?? null;
}

async function getDocumentForUser(admin: SupabaseClient, userId: string, documentId: string) {
  const { data, error } = await admin
    .from("cv_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CVDocumentWithEditorMetadata | null) ?? null;
}

async function getOriginalArtifact(admin: SupabaseClient, documentId: string) {
  const { data, error } = await admin
    .from("cv_document_artifacts")
    .select("id, storage_bucket, storage_path, content_type, byte_size")
    .eq("document_id", documentId)
    .eq("kind", "original_file")
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as
    | {
        id: string;
        storage_bucket: string;
        storage_path: string;
        content_type: string;
        byte_size: number | null;
      }
    | null;
}

async function getFileVersions(admin: SupabaseClient, documentId: string) {
  const { data, error } = await admin
    .from("document_file_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentFileVersionRow[];
}

async function createInitialFileVersionIfMissing(
  admin: SupabaseClient,
  document: CVDocumentWithEditorMetadata,
  fileType: SupportedFileType,
): Promise<DocumentFileVersionRow> {
  const existing = await getFileVersions(admin, document.id);
  if (existing.length > 0) {
    const latestExistingVersion = existing[existing.length - 1];
    await syncDocumentVersionPointersIfNeeded(admin, document, existing[0], latestExistingVersion);
    return latestExistingVersion;
  }

  const artifact = await getOriginalArtifact(admin, document.id);
  if (!artifact) {
    throw new Error("Original file artifact not found for document.");
  }

  const id = randomUUID();
  const version_number = 1;

  const insertPayload = {
    id,
    document_id: document.id,
    version_number,
    file_type: fileType,
    storage_bucket: artifact.storage_bucket || ORIGINALS_BUCKET,
    storage_path: artifact.storage_path,
    source: "upload" as const,
    based_on_version_id: null,
    content_type: artifact.content_type || "application/octet-stream",
    size_bytes: artifact.byte_size ?? null,
  };

  const { error } = await admin.from("document_file_versions").insert(insertPayload);
  if (error) {
    if (!isDocumentFileVersionConflictError(error)) {
      throw new Error(error.message);
    }

    const latestVersions = await getFileVersions(admin, document.id);
    const firstVersion = latestVersions[0];
    const latestVersion = latestVersions[latestVersions.length - 1];

    if (!firstVersion || !latestVersion) {
      throw new Error(error.message);
    }

    await syncDocumentVersionPointersIfNeeded(admin, document, firstVersion, latestVersion, {
      fileUpdatedAfterParse: false,
      reparseRecommended: false,
    });

    return latestVersion;
  }

  await syncDocumentVersionPointersIfNeeded(
    admin,
    document,
    insertPayload as DocumentFileVersionRow,
    insertPayload as DocumentFileVersionRow,
    {
      fileUpdatedAfterParse: false,
      reparseRecommended: false,
    },
  );

  return insertPayload as DocumentFileVersionRow;
}

async function createSignedUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, DEFAULT_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl as string;
}

function resolveFileType(document: CVDocumentRecord): SupportedFileType {
  const fromMime = detectFileTypeFromMimeOrExtension(document.mime_type, document.file_name);
  if (fromMime) return fromMime;

  const sourceKind = (document as CVDocumentWithEditorMetadata).source_kind ?? undefined;
  const lower = sourceKind?.toLowerCase();
  if (lower === "pdf") return "pdf";
  if (lower === "doc" || lower === "docx") return "word";
  if (lower === "image") return "image";

  return "pdf";
}

function canEditStatus(status: CVDocumentStatus): boolean {
  return status === "ready" || status === "partial_ready";
}

function buildVendorConfig(
  fileType: SupportedFileType,
  document: CVDocumentWithEditorMetadata,
  baseVersionId: string,
) {
  const pdfLicense = process.env.APRYSE_LICENSE_KEY;
  const webviewerPath = process.env.APRYSE_WEBVIEWER_PATH || "/webviewer";
  const onlyofficeUrl = process.env.ONLYOFFICE_DOC_SERVER_URL || "";
  const callbackUrl = process.env.ONLYOFFICE_CALLBACK_URL || "";

  const baseTitle = document.file_name ?? `Document ${document.id}`;
  const onlyOfficeKey = `doc:${document.id}:base:${baseVersionId}`;

  return {
    pdf:
      fileType === "pdf"
        ? {
            type: "apryse" as const,
            licenseKey: pdfLicense,
            webviewerPath,
          }
        : undefined,
    word:
      fileType === "word"
        ? {
            type: "onlyoffice" as const,
            docServerUrl: onlyofficeUrl,
            // TODO: adjust to your project (ONLYOFFICE config & JWT)
            config: {
              document: {
                fileType: "docx",
                title: baseTitle,
                url: "", // sẽ dùng metadata.fileUrl phía client
                key: onlyOfficeKey,
              },
              editorConfig: {
                mode: "edit",
                callbackUrl,
              },
            },
          }
        : undefined,
    image:
      fileType === "image"
        ? {
            type: "local" as const,
          }
        : undefined,
  } as DocumentEditorMetadata["vendorConfig"];
}

export async function getDocumentEditorMetadataForCurrentUser(
  documentId: string,
): Promise<DocumentEditorMetadata> {
  const { user } = await getAuthenticatedUser();
  const admin = createAdminClient();

  const document = await getDocumentForUser(admin, user.id, documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  const fileType = resolveFileType(document);

  const lastVersion = await createInitialFileVersionIfMissing(admin, document, fileType);
  const versions = await getFileVersions(admin, document.id);
  const latestVersion = versions[versions.length - 1] ?? lastVersion;
  const sourceFileVersionId =
    document.source_file_version_id ?? versions[0]?.id ?? lastVersion.id;
  const latestFileVersionId = document.latest_file_version_id ?? latestVersion.id;

  const signedUrl = await createSignedUrl(
    latestVersion.storage_bucket,
    latestVersion.storage_path,
  );

  if (!signedUrl) {
    throw new Error("Unable to create signed URL for source file");
  }

  const canEdit = canEditStatus(document.status);

  const vendorConfig = buildVendorConfig(fileType, document, latestFileVersionId);

  return {
    documentId: document.id,
    status: document.status,
    fileType,
    canEditSource: canEdit,
    sourceFileVersionId,
    latestFileVersionId,
    lastParsedVersionId: document.last_parsed_version_id ?? null,
    fileUpdatedAfterParse: Boolean(document.file_updated_after_parse ?? false),
    reparseRecommended: Boolean(document.reparse_recommended ?? false),
    fileUrl: signedUrl,
    vendorConfig,
  };
}

export async function saveEditedDocumentBinaryForCurrentUser(
  args: SaveEditedBinaryArgs,
): Promise<DocumentEditorMetadata> {
  const { user } = await getAuthenticatedUser();
  const admin = createAdminClient();

  const document = await getDocumentForUser(admin, user.id, args.documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  await saveEditedDocumentBinaryCore(admin, document, {
    fileType: args.fileType,
    baseVersionId: args.baseVersionId,
    fileName: args.fileName,
    contentType: args.contentType,
    buffer: args.buffer,
  });

  return getDocumentEditorMetadataForCurrentUser(document.id);
}

export async function saveEditedDocumentBinaryAsSystem(
  args: SaveEditedBinarySystemArgs,
): Promise<void> {
  const admin = createAdminClient();
  const document = await getDocumentById(admin, args.documentId);

  if (!document) {
    throw new Error("Document not found");
  }

  await saveEditedDocumentBinaryCore(admin, document, {
    fileType: args.fileType,
    baseVersionId: args.baseVersionId,
    fileName: args.fileName,
    contentType: args.contentType,
    buffer: args.buffer,
  });
}

async function saveEditedDocumentBinaryCore(
  admin: SupabaseClient,
  document: CVDocumentWithEditorMetadata,
  input: {
    fileType: SupportedFileType;
    baseVersionId: string | null;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  },
): Promise<void> {
  const versions = await getFileVersions(admin, document.id);

  if (versions.length === 0) {
    throw new Error("No source file version available.");
  }

  const baseVersion = input.baseVersionId
    ? versions.find((v) => v.id === input.baseVersionId)
    : versions[versions.length - 1];

  if (!baseVersion) {
    throw new Error("Base version not found for document");
  }

  const extension = inferExtensionForFileType(input.fileType, input.fileName);
  const storagePath = buildEditedStoragePath({
    userId: document.user_id,
    documentId: document.id,
    uniqueToken: randomUUID(),
    extension,
  });

  const { error: uploadError } = await admin.storage
    .from(baseVersion.storage_bucket || ORIGINALS_BUCKET)
    .upload(storagePath, input.buffer, {
      // TODO: adjust to your project (maybe use dedicated bucket for edited files)
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const shouldMarkUpdatedAfterParse = Boolean(
    document.last_parsed_version_id && document.last_parsed_version_id === baseVersion.id,
  );
  try {
    const insertedVersion = await insertEditedVersionWithRetry({
      getNextVersionNumber: async () => {
        const currentVersions = await getFileVersions(admin, document.id);
        if (currentVersions.length === 0) {
          return undefined;
        }

        return Math.max(...currentVersions.map((version) => version.version_number)) + 1;
      },
      insertVersion: async (versionNumber) => {
        const newId = randomUUID();
        const insertPayload = {
          id: newId,
          document_id: document.id,
          version_number: versionNumber,
          file_type: input.fileType,
          storage_bucket: baseVersion.storage_bucket || ORIGINALS_BUCKET,
          storage_path: storagePath,
          source: "edit" as const,
          based_on_version_id: baseVersion.id,
          content_type: input.contentType,
          size_bytes: input.buffer.byteLength,
        } satisfies Omit<DocumentFileVersionRow, "created_at" | "created_by">;

        const { error: insertError } = await admin
          .from("document_file_versions")
          .insert(insertPayload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        return insertPayload as DocumentFileVersionRow;
      },
    });

    const { error: updateDocError } = await admin
      .from("cv_documents")
      .update({
        latest_file_version_id: insertedVersion.id,
        file_updated_after_parse: shouldMarkUpdatedAfterParse,
        reparse_recommended: shouldMarkUpdatedAfterParse,
      })
      .eq("id", document.id);

    if (updateDocError) {
      throw new Error(updateDocError.message);
    }
  } catch (error) {
    await admin.storage
      .from(baseVersion.storage_bucket || ORIGINALS_BUCKET)
      .remove([storagePath]);

    throw error;
  }
}

function inferExtensionForFileType(fileType: SupportedFileType, fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".doc")) return ".doc";
  if (/[.](png|jpe?g|webp)$/.test(lower)) {
    return lower.slice(lower.lastIndexOf("."));
  }

  switch (fileType) {
    case "pdf":
      return ".pdf";
    case "word":
      return ".docx";
    case "image":
      return ".png";
    default:
      return "";
  }
}

export function getDefaultContentTypeForFileType(fileType: SupportedFileType): string {
  switch (fileType) {
    case "pdf":
      return "application/pdf";
    case "word":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "image":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function syncDocumentVersionPointersIfNeeded(
  admin: SupabaseClient,
  document: CVDocumentWithEditorMetadata,
  firstVersion: DocumentFileVersionRow,
  latestVersion: DocumentFileVersionRow,
  overrides?: {
    fileUpdatedAfterParse?: boolean;
    reparseRecommended?: boolean;
  },
) {
  const nextSourceFileVersionId = document.source_file_version_id ?? firstVersion.id;
  const nextLatestFileVersionId = latestVersion.id;
  const nextFileUpdatedAfterParse =
    overrides?.fileUpdatedAfterParse ?? Boolean(document.file_updated_after_parse ?? false);
  const nextReparseRecommended =
    overrides?.reparseRecommended ?? Boolean(document.reparse_recommended ?? false);

  const shouldUpdate =
    document.source_file_version_id !== nextSourceFileVersionId ||
    document.latest_file_version_id !== nextLatestFileVersionId ||
    Boolean(document.file_updated_after_parse ?? false) !== nextFileUpdatedAfterParse ||
    Boolean(document.reparse_recommended ?? false) !== nextReparseRecommended;

  if (!shouldUpdate) {
    return;
  }

  const { error: updateDocError } = await admin
    .from("cv_documents")
    .update({
      source_file_version_id: nextSourceFileVersionId,
      latest_file_version_id: nextLatestFileVersionId,
      file_updated_after_parse: nextFileUpdatedAfterParse,
      reparse_recommended: nextReparseRecommended,
    })
    .eq("id", document.id);

  if (updateDocError) {
    throw new Error(updateDocError.message);
  }
}
