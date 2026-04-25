/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const { buildEmailTemplate } = require(path.join(
  process.cwd(),
  "src",
  "lib",
  "email-testing",
  "templates",
));

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

const applyTemplate = buildEmailTemplate({
  template: "apply-job",
  recipientEmail: "recruiter01@gmail.test",
  senderEmail: "candidate01@gmail.test",
  data: {
    jobTitle: "Chuyen vien Thu mua Nguyen lieu",
    companyName: "NPC EntertainmentZ",
    reviewLink: "http://localhost:3000/hr/candidates?view=pipeline",
  },
});

assert.equal(
  applyTemplate.subject,
  "[TalentFlow] Mô phỏng đơn ứng tuyển: Chuyen vien Thu mua Nguyen lieu",
  "apply-job subject must be clear and professional",
);
assertOrderedLabels(
  applyTemplate.html,
  ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
  "apply-job html",
);
assertOrderedLabels(
  applyTemplate.text,
  ["Vị trí ứng tuyển:", "Trạng thái hiện tại:", "Công ty tuyển dụng:"],
  "apply-job text",
);
assert.equal(
  applyTemplate.html.includes("http://localhost:3000/hr/candidates?view=pipeline"),
  true,
  "apply-job html must keep CTA link",
);

const templateKinds = ["otp", "verification", "password-reset", "notification", "custom"];
for (const kind of templateKinds) {
  const payload =
    kind === "custom"
      ? {
          template: kind,
          recipientEmail: "candidate01@gmail.test",
          customSubject: "[TalentFlow] Thu nghiem mau tuy chinh",
          customText: "Noi dung test tuy chinh",
        }
      : {
          template: kind,
          recipientEmail: "candidate01@gmail.test",
          data: {
            verificationLink: "http://localhost:3000/verify?token=abc",
            resetLink: "http://localhost:3000/reset-password?token=def",
            notificationTitle: "Cap nhat moi",
            notificationMessage: "Trang thai ho so cua ban da thay doi.",
            ctaLink: "http://localhost:3000/candidate/applications",
          },
        };

  const built = buildEmailTemplate(payload);
  assert.equal(built.subject.length > 0, true, `${kind} must have subject`);
  assert.equal(built.html.length > 0, true, `${kind} must have html`);
  assert.equal(built.text.length > 0, true, `${kind} must have text`);
  assertNoUndefinedOrNull(built.subject, `${kind} subject`);
  assertNoUndefinedOrNull(built.html, `${kind} html`);
  assertNoUndefinedOrNull(built.text, `${kind} text`);
}

console.log("email testing templates tests passed");
