/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(
  process.cwd(),
  "src",
  "features",
  "ocr-viewer",
  "components",
  "OcrProcessingState.tsx",
);

const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /w-full/);
assert.match(source, /rounded-\[28px\]/);
assert.match(source, /min-h-\[460px\]/);
assert.doesNotMatch(source, /max-w-\[920px\]/);

console.log("OcrProcessingState layout tests passed");
