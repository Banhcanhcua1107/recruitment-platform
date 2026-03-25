/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(
  process.cwd(),
  "src",
  "features",
  "ocr-viewer",
  "PersistedOcrReviewPanel.tsx",
);

const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /xl:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/);
assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,1\.04fr\)_minmax\(0,0\.96fr\)\]/);
assert.match(source, /<div className="min-h-0 overflow-hidden rounded-\[22px\] border border-slate-200 bg-slate-50\/90 p-1\.5 md:p-2">/);
assert.match(source, /<div className="min-h-0 overflow-y-auto rounded-\[22px\] border border-slate-200 bg-\[#f8fbff\] px-2 py-1\.5 md:px-2\.5">/);

console.log("PersistedOcrReviewPanel layout tests passed");
