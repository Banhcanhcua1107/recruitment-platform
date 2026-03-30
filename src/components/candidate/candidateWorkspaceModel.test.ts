/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  getCandidateWorkspaceModel,
} = require(path.join(
  process.cwd(),
  "src",
  "components",
  "candidate",
  "candidateWorkspaceModel"
));

const overviewModel = getCandidateWorkspaceModel("/candidate/overview");

assert.equal(overviewModel.useWorkspaceShell, true);
assert.equal(overviewModel.headerVariant, "full");
assert.equal(overviewModel.activeItemId, "overview");
assert.deepEqual(
  overviewModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian ung vien", "Tong quan"]
);

const jobsModel = getCandidateWorkspaceModel("/candidate/jobs");

assert.equal(jobsModel.useWorkspaceShell, true);
assert.equal(jobsModel.activeItemId, "jobs");
assert.deepEqual(
  jobsModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian ung vien", "Viec cua toi"]
);

const legacyApplicationsModel = getCandidateWorkspaceModel("/candidate/applications/abc-123");

assert.equal(legacyApplicationsModel.useWorkspaceShell, true);
assert.equal(legacyApplicationsModel.headerVariant, "compact");
assert.equal(legacyApplicationsModel.activeItemId, "jobs");

const settingsModel = getCandidateWorkspaceModel("/candidate/settings");

assert.equal(settingsModel.activeItemId, "settings");
assert.deepEqual(
  settingsModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian ung vien", "Cai dat"]
);

const immersiveEditorModel = getCandidateWorkspaceModel("/candidate/cv-builder/resume-1/edit");

assert.equal(immersiveEditorModel.useWorkspaceShell, false);
assert.equal(immersiveEditorModel.showFooter, false);

const cvModel = getCandidateWorkspaceModel("/candidate/cv");
assert.equal(cvModel.activeItemId, "cv");

const legacyDashboardModel = getCandidateWorkspaceModel("/candidate/dashboard");
assert.equal(legacyDashboardModel.activeItemId, "overview");

console.log("candidate workspace model tests passed");

export {};
