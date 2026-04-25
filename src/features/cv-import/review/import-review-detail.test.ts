/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const mappedRequest = path.join(process.cwd(), "src", request.slice(2));
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const {
  buildOptimisticImportReviewDetail,
  shouldDeferReviewFetchError,
} = require(
  path.join(process.cwd(), "src", "features", "cv-import", "review", "import-review-detail"),
);

const optimistic = buildOptimisticImportReviewDetail({
  document: {
    id: "doc_123",
    status: "queued",
    document_type: "cv",
    file_name: "tran-thi-b.pdf",
    mime_type: "application/pdf",
    file_size: 1024,
    retry_count: 0,
    job_id: "job_123",
    review_required: false,
  },
  links: {
    self: "/api/cv-imports/doc_123",
    review: "/candidate/cv-builder?importReview=doc_123",
  },
});

assert.equal(optimistic.document.id, "doc_123");
assert.equal(optimistic.document.status, "queued");
assert.equal(optimistic.editor_eligibility.can_save_editable, false);
assert.equal(optimistic.editor_eligibility.reason, "document_not_ready");
assert.equal(optimistic.parsed_json.summary, "");
assert.deepEqual(optimistic.parsed_json.mapped_sections.skills.backend, []);
assert.equal(optimistic.pages.length, 0);
assert.equal(optimistic.artifacts.length, 0);

assert.equal(shouldDeferReviewFetchError(404, optimistic), true);
assert.equal(
  shouldDeferReviewFetchError(404, {
    ...optimistic,
    document: { ...optimistic.document, status: "failed" },
  }),
  false,
);
assert.equal(shouldDeferReviewFetchError(500, optimistic), false);

console.log("import review detail tests passed");
