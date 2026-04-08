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

assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.28fr\)\]/);
assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\]/);
assert.match(source, /<div className="min-h-0 overflow-y-auto rounded-\[22px\] border border-slate-200 bg-\[#f8fbff\] px-3 py-2 md:px-3\.5">/);
assert.match(source, /<div className="min-h-0 overflow-hidden rounded-\[22px\] border border-slate-200 bg-slate-50\/90 p-1\.5 md:p-2">/);

console.log("PersistedOcrReviewPanel layout tests passed");
