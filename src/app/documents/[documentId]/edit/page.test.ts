/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const pageModule = require(path.join(
  process.cwd(),
  "src",
  "app",
  "documents",
  "[documentId]",
  "edit",
  "page",
));

async function main() {
  const element = await pageModule.default({
    params: Promise.resolve({ documentId: "doc-123" }),
  });

  assert.equal(element.props.documentId, "doc-123");
  console.log("document edit page params test passed");
}

void main();
