/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  getHrWorkspaceModel,
} = require(path.join(process.cwd(), "src", "components", "hr", "hrWorkspaceModel"));

const overviewModel = getHrWorkspaceModel("/hr/overview");

assert.equal(overviewModel.useWorkspaceShell, true);
assert.equal(overviewModel.activeItemId, "overview");
assert.deepEqual(
  overviewModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Tong quan"]
);

const candidatesModel = getHrWorkspaceModel("/hr/candidates");

assert.equal(candidatesModel.activeItemId, "candidates");
assert.deepEqual(
  candidatesModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Kho ung vien"]
);

const candidateDetailModel = getHrWorkspaceModel("/hr/candidates/candidate-1");

assert.equal(candidateDetailModel.headerVariant, "compact");
assert.equal(candidateDetailModel.activeItemId, "candidates");
assert.deepEqual(
  candidateDetailModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Kho ung vien", "Ho so ung vien"]
);

const createJobModel = getHrWorkspaceModel("/hr/jobs/create");

assert.equal(createJobModel.activeItemId, "jobs");
assert.equal(createJobModel.headerVariant, "compact");
assert.deepEqual(
  createJobModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Tin tuyen dung", "Tao tin tuyen dung"]
);

const settingsModel = getHrWorkspaceModel("/hr/settings");

assert.equal(settingsModel.headerVariant, "full");
assert.equal(settingsModel.activeItemId, "settings");
assert.deepEqual(
  settingsModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Cai dat"]
);

const calendarModel = getHrWorkspaceModel("/hr/calendar");

assert.equal(calendarModel.useWorkspaceShell, true);
assert.equal(calendarModel.activeItemId, null);
assert.deepEqual(
  calendarModel.breadcrumbs.map((item: { label: string }) => item.label),
  ["Khong gian tuyen dung", "Lich phong van"]
);

const legacyDashboardModel = getHrWorkspaceModel("/hr/dashboard");
assert.equal(legacyDashboardModel.activeItemId, "overview");

console.log("hr workspace model tests passed");

export {};
