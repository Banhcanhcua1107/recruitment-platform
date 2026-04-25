/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildSemanticItemKey,
} = require(path.join(
  process.cwd(),
  "src",
  "features",
  "ocr-viewer",
  "components",
  "semanticReviewKeys",
));

const duplicatedCertification = {
  type: "certification",
  name: "2025",
  issuer: "",
  date: "",
  credentialId: "",
  sourceBlockIds: [],
  pageIndexes: [0],
};

const duplicatedCertificationTwo = {
  ...duplicatedCertification,
};

assert.notEqual(
  buildSemanticItemKey(duplicatedCertification, 0),
  buildSemanticItemKey(duplicatedCertificationTwo, 1),
);

const tracedProject = {
  type: "project",
  name: "MyCV",
  role: "Frontend",
  startDate: "",
  endDate: "",
  dateText: "2025",
  description: "",
  highlights: [],
  techStack: [],
  sourceBlockIds: ["block-1", "block-2"],
  pageIndexes: [0],
};

assert.equal(
  buildSemanticItemKey(tracedProject, 0),
  buildSemanticItemKey(tracedProject, 3),
);

console.log("semantic review key tests passed");
