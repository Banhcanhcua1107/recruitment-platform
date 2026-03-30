/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  shouldLoadResumeList,
  shouldStartTemplateCreation,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "template-creation",
));

assert.equal(shouldLoadResumeList(null), true);
assert.equal(shouldLoadResumeList("template-1"), false);

assert.equal(
  shouldStartTemplateCreation({
    templateId: "template-1",
    isCreating: false,
    startedTemplateId: null,
  }),
  true,
);

assert.equal(
  shouldStartTemplateCreation({
    templateId: "template-1",
    isCreating: true,
    startedTemplateId: null,
  }),
  false,
);

assert.equal(
  shouldStartTemplateCreation({
    templateId: "template-1",
    isCreating: false,
    startedTemplateId: "template-1",
  }),
  false,
);

assert.equal(
  shouldStartTemplateCreation({
    templateId: null,
    isCreating: false,
    startedTemplateId: null,
  }),
  false,
);

console.log("template creation helper tests passed");
