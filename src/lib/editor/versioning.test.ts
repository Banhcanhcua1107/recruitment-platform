/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildEditedStoragePath,
  insertEditedVersionWithRetry,
  isDocumentFileVersionConflictError,
} = require(path.join(
  process.cwd(),
  "src",
  "lib",
  "editor",
  "versioning",
));

assert.equal(
  isDocumentFileVersionConflictError(
    new Error(
      'duplicate key value violates unique constraint "document_file_versions_doc_version_idx"',
    ),
  ),
  true,
);

assert.equal(
  isDocumentFileVersionConflictError(new Error("some other database error")),
  false,
);

const storagePath = buildEditedStoragePath({
  userId: "user-1",
  documentId: "doc-1",
  uniqueToken: "abc123",
  extension: ".pdf",
});

assert.equal(storagePath, "user-1/doc-1/edited/abc123.pdf");

async function run() {
  const attemptedVersionNumbers = [];
  const nextVersionNumbers = [2, 3];

  const inserted = await insertEditedVersionWithRetry({
    getNextVersionNumber: async () => nextVersionNumbers.shift(),
    insertVersion: async (versionNumber) => {
      attemptedVersionNumbers.push(versionNumber);

      if (versionNumber === 2) {
        throw new Error(
          'duplicate key value violates unique constraint "document_file_versions_doc_version_idx"',
        );
      }

      return { versionNumber };
    },
  });

  assert.deepEqual(attemptedVersionNumbers, [2, 3]);
  assert.deepEqual(inserted, { versionNumber: 3 });

  let attempts = 0;
  await assert.rejects(
    insertEditedVersionWithRetry({
      getNextVersionNumber: async () => 9,
      insertVersion: async () => {
        attempts += 1;
        throw new Error("upload metadata insert failed");
      },
    }),
    /upload metadata insert failed/,
  );
  assert.equal(attempts, 1);

  console.log("editor versioning tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
