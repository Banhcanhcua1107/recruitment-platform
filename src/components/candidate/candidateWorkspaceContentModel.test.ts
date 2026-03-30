/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildCandidateActivityItems,
  resolveDefaultResumeId,
} = require(path.join(
  process.cwd(),
  "src",
  "components",
  "candidate",
  "candidateWorkspaceContentModel"
));

const activityItems = buildCandidateActivityItems({
  recentApplications: [
    {
      id: "application-1",
      created_at: "2026-03-25T08:00:00.000Z",
      status: "reviewing",
      job: {
        id: "job-1",
        title: "Frontend Developer",
        company_name: "TalentFlow",
      },
    },
  ],
  cvs: [
    {
      id: "resume-2",
      title: "CV Product",
      updated_at: "2026-03-26T08:00:00.000Z",
      url: "/candidate/cv-builder/resume-2/edit",
    },
    {
      id: "resume-1",
      title: "CV Backend",
      updated_at: "2026-03-24T08:00:00.000Z",
      url: "/candidate/cv-builder/resume-1/edit",
    },
  ],
});

assert.deepEqual(
  activityItems.map((item: { id: string }) => item.id),
  ["cv-resume-2", "application-application-1", "cv-resume-1"]
);

assert.equal(
  resolveDefaultResumeId({
    storedResumeId: "resume-2",
    resumes: [
      { id: "resume-1", updated_at: "2026-03-24T08:00:00.000Z" },
      { id: "resume-2", updated_at: "2026-03-26T08:00:00.000Z" },
    ],
  }),
  "resume-2"
);

assert.equal(
  resolveDefaultResumeId({
    storedResumeId: "missing",
    resumes: [
      { id: "resume-1", updated_at: "2026-03-26T08:00:00.000Z" },
      { id: "resume-2", updated_at: "2026-03-24T08:00:00.000Z" },
    ],
  }),
  "resume-1"
);

console.log("candidate workspace content model tests passed");

export {};
