/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  getGlobalHeaderModel,
} = require(path.join(process.cwd(), "src", "components", "shared", "headerModel"));

assert.deepEqual(
  getGlobalHeaderModel(null).primaryLinks.map((item: { href: string }) => item.href),
  ["/", "/jobs", "/contact"]
);

const candidateModel = getGlobalHeaderModel({
  id: "candidate-1",
  email: "candidate@example.com",
  fullName: "Nguyen Thi Candidate",
  avatarUrl: null,
  role: "candidate",
  companyName: null,
});

assert.equal(candidateModel.accountMenu.workspaceLabel, "Khong gian ung vien");
assert.deepEqual(
  candidateModel.accountMenu.items.map((item: { label: string }) => item.label),
  [
    "Khong gian ung vien",
    "Ho so ca nhan",
    "CV cua toi",
    "Viec da ung tuyen",
    "Cai dat",
    "Dang xuat",
  ]
);
assert.equal(candidateModel.accountMenu.items[0].href, "/candidate/overview");
assert.equal(candidateModel.accountMenu.items[2].href, "/candidate/cv");
assert.equal(candidateModel.accountMenu.items[3].href, "/candidate/jobs");
assert.equal(candidateModel.accountMenu.items[4].href, "/candidate/settings");

const hrModel = getGlobalHeaderModel({
  id: "hr-1",
  email: "hr@example.com",
  fullName: "Tran Van HR",
  avatarUrl: null,
  role: "hr",
  companyName: "TalentFlow HR",
});

assert.equal(hrModel.accountMenu.workspaceLabel, "Khong gian tuyen dung");
assert.deepEqual(
  hrModel.accountMenu.items.map((item: { label: string }) => item.label),
  [
    "Khong gian tuyen dung",
    "Kho ung vien",
    "Tin tuyen dung",
    "Ho so cong ty",
    "Cai dat",
    "Dang xuat",
  ]
);
assert.equal(hrModel.accountMenu.items[0].href, "/hr/overview");
assert.equal(hrModel.accountMenu.items[4].href, "/hr/settings");

console.log("header model tests passed");

export {};
