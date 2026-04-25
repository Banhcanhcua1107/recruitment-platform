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

const {
  buildApplicationStatusUpdatedEmailContent,
  buildCandidateApplicationSubmittedEmailContent,
  buildRecruiterApplicationSubmittedEmailContent,
} = require(path.join(process.cwd(), "src", "lib", "email", "application-emails"));

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

(() => {
  const candidateApplicationsUrl = "https://talentflow.local/candidate/applications";

  const statusEmail = buildApplicationStatusUpdatedEmailContent({
    candidateName: "Nguyen Van A",
    jobTitle: "Chuyen vien Thu mua Nguyen lieu",
    statusLabel: "Dang xem xet",
    companyName: "NPC EntertainmentZ",
    message: "Bo phan tuyen dung dang danh gia ho so cua ban.",
    candidateApplicationsUrl,
  });

  assert.equal(
    statusEmail.subject,
    "[TalentFlow] Cập nhật trạng thái ứng tuyển: Dang xem xet",
    "status subject must be explicit and professional",
  );
  assert.equal(
    statusEmail.html.includes(candidateApplicationsUrl),
    true,
    "status email html must keep CTA link",
  );
  assert.equal(
    statusEmail.text.includes(candidateApplicationsUrl),
    true,
    "status email text must keep CTA link",
  );

  assertOrderedLabels(
    statusEmail.html,
    ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
    "status email html",
  );
  assertOrderedLabels(
    statusEmail.text,
    ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
    "status email text",
  );

  assertNoUndefinedOrNull(statusEmail.subject, "status subject");
  assertNoUndefinedOrNull(statusEmail.html, "status html");
  assertNoUndefinedOrNull(statusEmail.text, "status text");
})();

(() => {
  const candidateEmail = buildCandidateApplicationSubmittedEmailContent({
    candidateName: "Tran Thi B",
    jobTitle: "Nhan vien Ke toan",
    companyName: "TalentFlow Holdings",
    appliedAt: "13 thang 4, 2026 09:15",
    candidateApplicationsUrl: "https://talentflow.local/candidate/applications",
  });

  assert.equal(
    candidateEmail.subject,
    "[TalentFlow] Xác nhận đã nhận hồ sơ: Nhan vien Ke toan",
    "candidate subject must be clear",
  );

  assertOrderedLabels(
    candidateEmail.html,
    ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
    "candidate application html",
  );
  assertOrderedLabels(
    candidateEmail.text,
    ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
    "candidate application text",
  );

  assertNoUndefinedOrNull(candidateEmail.subject, "candidate subject");
  assertNoUndefinedOrNull(candidateEmail.html, "candidate html");
  assertNoUndefinedOrNull(candidateEmail.text, "candidate text");
})();

(() => {
  const recruiterEmail = buildRecruiterApplicationSubmittedEmailContent({
    candidateName: "Le Van C",
    candidateEmail: "candidate01@gmail.test",
    candidatePhone: "0909000111",
    jobTitle: "Backend Engineer",
    companyName: "Delta Labs",
    jobId: "job-2026-0099",
    applicationId: "app-2026-0005",
    appliedAt: "13 thang 4, 2026 10:00",
    introduction: "Toi quan tam vi tri nay va san sang trao doi them.",
    atsApplicationUrl: "https://talentflow.local/hr/candidates?view=pipeline&applicationId=app-2026-0005",
    cvReviewUrl: "https://talentflow.local/api/applications/app-2026-0005/cv",
    hasAttachment: true,
  });

  assert.equal(
    recruiterEmail.subject,
    "[TalentFlow] Hồ sơ ứng tuyển mới: Backend Engineer",
    "recruiter subject must be explicit",
  );

  assertOrderedLabels(
    recruiterEmail.html,
    ["Vị trí ứng tuyển:", "Trạng thái hồ sơ:", "Công ty tuyển dụng:"],
    "recruiter application html",
  );
  assertOrderedLabels(
    recruiterEmail.text,
    ["Vị trí ứng tuyển:", "Trạng thái hồ sơ:", "Công ty tuyển dụng:"],
    "recruiter application text",
  );

  assert.equal(
    recruiterEmail.html.includes(
      "https://talentflow.local/hr/candidates?view=pipeline&amp;applicationId=app-2026-0005",
    ),
    true,
    "recruiter html must keep ATS CTA",
  );
  assert.equal(
    recruiterEmail.html.includes("https://talentflow.local/api/applications/app-2026-0005/cv"),
    true,
    "recruiter html must keep CV CTA",
  );

  assertNoUndefinedOrNull(recruiterEmail.subject, "recruiter subject");
  assertNoUndefinedOrNull(recruiterEmail.html, "recruiter html");
  assertNoUndefinedOrNull(recruiterEmail.text, "recruiter text");
})();

console.log("application email template tests passed");
