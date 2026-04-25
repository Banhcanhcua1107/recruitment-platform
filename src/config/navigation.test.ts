/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  PRIMARY_NAV_ITEMS,
  getWorkspaceHomeHref,
  getWorkspaceNavigationByKey,
  getWorkspaceKeyFromPathname,
  isAuthRoute,
  isRoleSelectionRoute,
  canAccessWorkspace,
} = require(path.join(process.cwd(), "src", "config", "navigation"));

assert.deepEqual(
  PRIMARY_NAV_ITEMS.map((item) => item.href),
  ["/", "/jobs", "/contact"]
);

assert.equal(getWorkspaceHomeHref("candidate"), "/candidate/overview");
assert.equal(getWorkspaceHomeHref("hr"), "/hr/overview");
assert.equal(getWorkspaceHomeHref("GUEST"), "/role-selection");

const candidateWorkspace = getWorkspaceNavigationByKey("candidate");
assert.deepEqual(
  candidateWorkspace.sidebarItems.map((item) => item.href),
  [
    "/candidate/overview",
    "/candidate/profile",
    "/candidate/cv",
    "/candidate/jobs",
    "/candidate/settings",
  ]
);

const hrWorkspace = getWorkspaceNavigationByKey("hr");
assert.deepEqual(
  hrWorkspace.sidebarItems.map((item) => item.href),
  [
    "/hr/overview",
    "/hr/candidates",
    "/hr/jobs",
    "/hr/company",
    "/hr/settings",
  ]
);

assert.equal(getWorkspaceKeyFromPathname("/candidate/overview"), "candidate");
assert.equal(getWorkspaceKeyFromPathname("/candidate/dashboard"), "candidate");
assert.equal(getWorkspaceKeyFromPathname("/hr/overview"), "hr");
assert.equal(getWorkspaceKeyFromPathname("/hr/dashboard"), "hr");
assert.equal(getWorkspaceKeyFromPathname("/jobs"), null);

assert.equal(isAuthRoute("/login"), true);
assert.equal(isAuthRoute("/register"), true);
assert.equal(isAuthRoute("/role-selection"), false);

assert.equal(isRoleSelectionRoute("/role-selection"), true);
assert.equal(isRoleSelectionRoute("/register/role-selection"), true);
assert.equal(isRoleSelectionRoute("/candidate/overview"), false);

assert.equal(canAccessWorkspace("candidate", "candidate"), true);
assert.equal(canAccessWorkspace("candidate", "hr"), false);
assert.equal(canAccessWorkspace("hr", "candidate"), false);
assert.equal(canAccessWorkspace("hr", "hr"), true);

console.log("navigation config tests passed");

export {};
