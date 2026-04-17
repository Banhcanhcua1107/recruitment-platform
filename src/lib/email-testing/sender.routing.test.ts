/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const originalLoad = Module._load;
const transportCalls = [];

const REAL_FROM = "no-reply@talentflow.vn";
const TEST_FROM = "no-reply@gmail.test";

const configMock = {
  getEmailMode: () => "test",
  getMailpitSmtpConfig: () => ({
    host: "mailpit.local",
    port: 1025,
    secure: false,
    from: TEST_FROM,
  }),
  getRealSmtpConfig: () => ({
    host: "smtp.real.local",
    port: 587,
    secure: false,
    user: "real-user",
    pass: "real-pass",
    from: REAL_FROM,
  }),
};

const nodemailerMock = {
  createTransport(options) {
    const route = options.host === "mailpit.local" ? "test" : "real";

    return {
      async sendMail(payload) {
        const toList = (Array.isArray(payload.to) ? payload.to : [payload.to])
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean);

        transportCalls.push({
          route,
          payload,
          toList,
        });

        return {
          messageId: `${route}-${transportCalls.length}`,
          accepted: toList,
          rejected: [],
        };
      },
    };
  },
};

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  if (request === "nodemailer") {
    return nodemailerMock;
  }

  if (
    request === "@/lib/email-testing/config"
    || request.endsWith("/email-testing/config")
    || request.endsWith("\\email-testing\\config")
  ) {
    return configMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};

const {
  sendModeAwareEmail,
  isMailpitRecipient,
  resolveMailTransportForRecipient,
} = require(path.join(process.cwd(), "src", "lib", "email-testing", "sender"));

function resetCalls() {
  transportCalls.length = 0;
}

function getModeByRecipient(deliveries) {
  const map = new Map();

  for (const delivery of deliveries) {
    for (const recipient of delivery.recipients) {
      map.set(String(recipient).trim().toLowerCase(), delivery.mode);
    }
  }

  return map;
}

function assertSystemSender(deliveries) {
  for (const delivery of deliveries) {
    const expectedFrom = delivery.mode === "test" ? TEST_FROM : REAL_FROM;
    assert.equal(
      delivery.from,
      expectedFrom,
      `Delivery for mode ${delivery.mode} must use system sender ${expectedFrom}`,
    );
  }
}

async function assertApplyCase(caseId, candidateEmail, hrEmail, expectedCandidateMode, expectedHrMode) {
  resetCalls();

  const result = await sendModeAwareEmail({
    to: [candidateEmail, hrEmail],
    subject: `Apply case ${caseId}`,
    text: "Apply email body",
    html: "<p>Apply email body</p>",
  });

  const modeByRecipient = getModeByRecipient(result.deliveries);
  assert.equal(modeByRecipient.get(candidateEmail.toLowerCase()), expectedCandidateMode);
  assert.equal(modeByRecipient.get(hrEmail.toLowerCase()), expectedHrMode);
  assertSystemSender(result.deliveries);
}

async function assertRecruiterContactCase(caseId, recruiterEmail, candidateEmail, expectedCandidateMode) {
  resetCalls();

  const result = await sendModeAwareEmail({
    from: recruiterEmail,
    to: candidateEmail,
    subject: `Recruiter contact case ${caseId}`,
    text: "Recruiter contact body",
    html: "<p>Recruiter contact body</p>",
  });

  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].mode, expectedCandidateMode);
  assertSystemSender(result.deliveries);

  assert.equal(transportCalls.length, 1);
  assert.equal(
    transportCalls[0].payload.from,
    expectedCandidateMode === "test" ? TEST_FROM : REAL_FROM,
    `Case ${caseId}: SMTP from must be system sender`,
  );
  assert.equal(
    transportCalls[0].payload.replyTo,
    recruiterEmail,
    `Case ${caseId}: recruiter email should be preserved as reply-to`,
  );
}

(async () => {
  assert.equal(isMailpitRecipient("candidate@gmail.test"), true);
  assert.equal(isMailpitRecipient("candidate@example.test"), true);
  assert.equal(isMailpitRecipient("candidate@example.com"), true);
  assert.equal(isMailpitRecipient("candidate@gmail.com"), false);

  assert.equal(resolveMailTransportForRecipient("candidate@gmail.test"), "test");
  assert.equal(resolveMailTransportForRecipient("candidate@example.com"), "test");
  assert.equal(resolveMailTransportForRecipient("candidate@gmail.com"), "real");

  // Apply Job matrix
  await assertApplyCase(
    1,
    "candidate-real@gmail.com",
    "hr-real@gmail.com",
    "real",
    "real",
  );
  await assertApplyCase(
    2,
    "candidate-real@gmail.com",
    "hr-mailpit@gmail.test",
    "real",
    "test",
  );
  await assertApplyCase(
    3,
    "candidate-mailpit@example.com",
    "hr-real@gmail.com",
    "test",
    "real",
  );
  await assertApplyCase(
    4,
    "candidate-mailpit@gmail.test",
    "hr-mailpit@example.com",
    "test",
    "test",
  );

  // Recruiter Contact matrix
  await assertRecruiterContactCase(
    5,
    "hr-real@gmail.com",
    "candidate-real@gmail.com",
    "real",
  );
  await assertRecruiterContactCase(
    6,
    "hr-real@gmail.com",
    "candidate-mailpit@gmail.test",
    "test",
  );
  await assertRecruiterContactCase(
    7,
    "hr-mailpit@gmail.test",
    "candidate-real@gmail.com",
    "real",
  );
  await assertRecruiterContactCase(
    8,
    "hr-mailpit@example.com",
    "candidate-mailpit@example.test",
    "test",
  );

  console.log("sender routing matrix tests passed (8/8)");
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    Module._load = originalLoad;
  });
