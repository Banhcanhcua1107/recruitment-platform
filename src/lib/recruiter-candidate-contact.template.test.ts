/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { buildRecruiterCandidateContactEmail } = require(
  path.join(process.cwd(), "src", "lib", "recruiter-candidate-contact"),
);

function assertNoUndefinedOrNull(value, label) {
  assert.equal(
    /undefined|null/i.test(value),
    false,
    `${label} must not contain undefined/null placeholders`,
  );
}

function assertOrderedLabels(content, labels, label) {
  let previousIndex = -1;
  for (const currentLabel of labels) {
    const currentIndex = content.indexOf(currentLabel);
    assert.notEqual(currentIndex, -1, `${label} must include: ${currentLabel}`);
    assert.equal(
      currentIndex > previousIndex,
      true,
      `${label} label order is invalid around: ${currentLabel}`,
    );
    previousIndex = currentIndex;
  }
}

const composed = buildRecruiterCandidateContactEmail({
  candidateName: "Pham Thi D",
  recruiterName: "Nguyen Van HR",
  recruiterEmail: "recruiter01@gmail.test",
  recruiterPhone: "0988111222",
  companyName: "Orion Talent",
  hiringPosition: "Senior QA Engineer",
  message: "Chung toi danh gia cao kinh nghiem cua ban va mong muon trao doi them.",
  sentAt: "13/04/2026 14:25",
});

assert.equal(
  composed.subject,
  "[TalentFlow] Lời mời kết nối từ Orion Talent cho vị trí Senior QA Engineer",
  "recruiter contact subject must clearly identify company and position",
);

assertOrderedLabels(
  composed.html,
  ["Vị trí cần tuyển:", "Trạng thái liên hệ:", "Công ty tuyển dụng:"],
  "recruiter contact html",
);
assertOrderedLabels(
  composed.text,
  ["Vị trí cần tuyển:", "Trạng thái liên hệ:", "Công ty tuyển dụng:"],
  "recruiter contact text",
);

assert.equal(
  composed.html.includes("mailto:recruiter01%40gmail.test"),
  true,
  "recruiter contact html must keep mailto CTA",
);

assertNoUndefinedOrNull(composed.subject, "recruiter contact subject");
assertNoUndefinedOrNull(composed.html, "recruiter contact html");
assertNoUndefinedOrNull(composed.text, "recruiter contact text");

console.log("recruiter contact email template tests passed");
