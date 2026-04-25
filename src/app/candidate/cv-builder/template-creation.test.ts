/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  shouldCreateResumeFromTemplateSelection,
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
assert.equal(shouldLoadResumeList("template-1"), true);

assert.equal(
  shouldStartTemplateCreation({
    templateId: "template-1",
    isCreating: false,
    startedTemplateId: null,
  }),
  false,
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

assert.equal(
  shouldCreateResumeFromTemplateSelection({
    templateId: "template-1",
    creatingTemplateId: null,
  }),
  true,
);

assert.equal(
  shouldCreateResumeFromTemplateSelection({
    templateId: "template-1",
    creatingTemplateId: "template-1",
  }),
  false,
);

assert.equal(
  shouldCreateResumeFromTemplateSelection({
    templateId: "template-1",
    creatingTemplateId: "template-2",
  }),
  false,
);

assert.equal(
  shouldCreateResumeFromTemplateSelection({
    templateId: null,
    creatingTemplateId: null,
  }),
  false,
);

console.log("template creation helper tests passed");
