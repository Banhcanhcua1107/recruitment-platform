/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { CandidateRow } = require(path.join(
  process.cwd(),
  "src",
  "components",
  "recruitment",
  "CandidateRow",
));

const candidate = {
  applicationId: "application-1",
  candidateId: "candidate-1",
  candidateCode: "CAND-2026-0001",
  fullName: "Nguyen Van A",
  email: "a@example.com",
  phone: "0900000000",
  appliedPosition: "Frontend Engineer",
  status: "new",
  appliedAt: "2026-03-27T04:48:00.000Z",
  jobUrl: "/hr/jobs/job-1",
};

const html = renderToStaticMarkup(
  React.createElement(
    "table",
    null,
    React.createElement(
      "tbody",
      null,
      React.createElement(CandidateRow, {
        candidate,
        onOpenDetail: () => undefined,
      }),
    ),
  ),
);

assert.match(
  html,
  /(11:48[^<]*27\/03\/2026)|(27\/03\/2026[^<]*11:48)/,
  "CandidateRow should render appliedAt in Asia/Ho_Chi_Minh time to avoid hydration mismatch",
);

console.log("candidate row time formatting test passed");
