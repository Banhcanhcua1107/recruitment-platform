/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildRecruiterJobPortfolioSummary,
  getRecruiterCandidateSignals,
  matchesRecruiterCandidateFilters,
} = require(path.join(
  process.cwd(),
  "src",
  "components",
  "hr",
  "hrWorkspaceContentModel"
));

assert.deepEqual(
  buildRecruiterJobPortfolioSummary([
    { status: "open", candidateCount: 12 },
    { status: "draft", candidateCount: 0 },
    { status: "closed", candidateCount: 4 },
    { status: "open", candidateCount: 7 },
  ]),
  {
    totalJobs: 4,
    openJobs: 2,
    draftJobs: 1,
    closedJobs: 1,
    totalApplicants: 23,
  }
);

const candidate = {
  candidateId: "candidate-1",
  fullName: "Nguyen Van Senior",
  avatarUrl: null,
  headline: "Senior React Developer",
  location: "TP. Ho Chi Minh",
  email: "candidate@example.com",
  phone: "0900000000",
  introduction:
    "Open to work ngay, uu tien hybrid va muc luong mong muon 35m.",
  skills: ["React", "TypeScript", "Next.js"],
  workExperiences: [
    {
      id: "exp-1",
      title: "Senior Frontend Engineer",
      company: "TalentFlow",
      startDate: "2022-01-01",
      endDate: "",
      isCurrent: true,
      description: "5 năm xây dựng hệ thống dashboard tuyển dụng B2B.",
    },
  ],
  educations: [],
  workExperience: "5 năm kinh nghiệm với React và TypeScript",
  education: "Đại học Công nghệ",
  cvUrl: null,
  updatedAt: "2026-03-29T09:00:00.000Z",
};

assert.deepEqual(getRecruiterCandidateSignals(candidate), {
  level: "senior",
  workMode: "hybrid",
  readiness: "ready_now",
  salary: "between_30_50",
});

assert.equal(
  matchesRecruiterCandidateFilters(candidate, {
    q: "react",
    skills: "typescript",
    experience: "5 nam",
    location: "Ho Chi Minh",
    salary: "between_30_50",
    level: "senior",
    workMode: "hybrid",
    readiness: "ready_now",
  }),
  true
);

assert.equal(
  matchesRecruiterCandidateFilters(candidate, {
    q: "product designer",
    skills: "",
    experience: "",
    location: "",
    salary: "all",
    level: "all",
    workMode: "all",
    readiness: "all",
  }),
  false
);

console.log("hr workspace content model tests passed");

export {};
