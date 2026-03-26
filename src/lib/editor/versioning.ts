const DOCUMENT_FILE_VERSION_UNIQUE_CONSTRAINT =
  "document_file_versions_doc_version_idx";

const DEFAULT_INSERT_RETRY_ATTEMPTS = 3;

export function isDocumentFileVersionConflictError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return (
    message.includes(DOCUMENT_FILE_VERSION_UNIQUE_CONSTRAINT) ||
    (message.includes("duplicate key value violates unique constraint") &&
      message.includes("document_file_versions"))
  );
}

export async function insertEditedVersionWithRetry<T>({
  getNextVersionNumber,
  insertVersion,
  maxAttempts = DEFAULT_INSERT_RETRY_ATTEMPTS,
}: {
  getNextVersionNumber: () => Promise<number | undefined>;
  insertVersion: (versionNumber: number) => Promise<T>;
  maxAttempts?: number;
}): Promise<T> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    const nextVersionNumber = await getNextVersionNumber();

    if (!Number.isFinite(nextVersionNumber)) {
      throw new Error("Unable to determine next document version number.");
    }

    try {
      return await insertVersion(nextVersionNumber as number);
    } catch (error) {
      const shouldRetry =
        isDocumentFileVersionConflictError(error) &&
        attempt < maxAttempts - 1;

      if (!shouldRetry) {
        throw error;
      }
    }

    attempt += 1;
  }

  throw new Error("Unable to insert edited document version after retries.");
}

export function buildEditedStoragePath({
  userId,
  documentId,
  uniqueToken,
  extension,
}: {
  userId: string;
  documentId: string;
  uniqueToken: string;
  extension: string;
}): string {
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  return `${userId}/${documentId}/edited/${uniqueToken}${safeExt}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
}
