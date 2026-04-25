/* eslint-disable @typescript-eslint/no-require-imports */
import type { JobsPageFilters } from "./jobs-page.types";

const assert: typeof import("node:assert/strict") = require("node:assert/strict");
const path: typeof import("node:path") = require("node:path");

const utils: typeof import("./jobs-page.utils") = require(
  path.join(process.cwd(), "src", "app", "(public)", "jobs", "jobs-page.utils"),
);

const {
  filterJobs,
  paginateJobs,
  parseSalary,
  resolveRecommendedJobsData,
  uniqueIndustries,
  uniqueValues,
} = utils;

const jobs = [
  {
    id: "job-1",
    title: "Frontend Developer",
    company_name: "Blue Tech",
    logo_url: "",
    cover_url: "",
    salary: "15 - 25 triệu",
    location: "TP. Hồ Chí Minh",
    posted_date: "2026-03-26T08:00:00.000Z",
    source_url: "",
    description: [],
    requirements: [],
    benefits: [],
    industry: ["Công nghệ", "React"],
    experience_level: "2 năm",
    level: "Nhân viên",
    employment_type: "Toàn thời gian",
    deadline: "31/03/2026",
    education_level: "",
    age_range: "",
    full_address: "",
    employer_id: "employer-1",
  },
  {
    id: "job-2",
    title: "Backend Engineer",
    company_name: "Green Data",
    logo_url: "",
    cover_url: "",
    salary: "2,500 - 3,500 USD",
    location: "Hà Nội",
    posted_date: "2026-03-25T08:00:00.000Z",
    source_url: "",
    description: [],
    requirements: [],
    benefits: [],
    industry: ["Công nghệ", "Golang"],
    experience_level: "3 năm",
    level: "Trưởng nhóm",
    employment_type: "Remote",
    deadline: "",
    education_level: "",
    age_range: "",
    full_address: "",
    employer_id: "employer-2",
  },
  {
    id: "job-3",
    title: "Marketing Executive",
    company_name: "Sun Media",
    logo_url: "",
    cover_url: "",
    salary: "Thỏa thuận",
    location: "Đà Nẵng",
    posted_date: "2026-03-24T08:00:00.000Z",
    source_url: "",
    description: [],
    requirements: [],
    benefits: [],
    industry: ["Marketing"],
    experience_level: null,
    level: "Nhân viên",
    employment_type: "Toàn thời gian",
    deadline: "",
    education_level: "",
    age_range: "",
    full_address: "",
    employer_id: "employer-3",
  },
];

const baseFilters: JobsPageFilters = {
  q: "",
  selectedLocation: "",
  selectedLevels: [],
  selectedTypes: [],
  selectedIndustries: [],
  salaryMin: "",
  salaryMax: "",
  hideUnknownSalary: false,
  sort: "newest",
  onlyMyCompanyJobs: false,
  employerCompanyName: "",
};

assert.deepEqual(uniqueValues(jobs, "location"), ["Đà Nẵng", "Hà Nội", "TP. Hồ Chí Minh"]);
assert.deepEqual(uniqueIndustries(jobs), ["Công nghệ", "Golang", "Marketing", "React"]);

assert.deepEqual(parseSalary("15 - 25 triệu"), { min: 15, max: 25 });
assert.equal(parseSalary("Thỏa thuận"), null);
assert.deepEqual(parseSalary("Trên 20 triệu"), { min: 20, max: Infinity });

assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, q: "react" }).map((job) => job.id),
  ["job-1"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, selectedLocation: "Hà Nội" }).map((job) => job.id),
  ["job-2"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, selectedLevels: ["Nhân viên"] }).map((job) => job.id),
  ["job-1", "job-3"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, selectedTypes: ["Remote"] }).map((job) => job.id),
  ["job-2"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, selectedIndustries: ["Marketing"] }).map((job) => job.id),
  ["job-3"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, salaryMin: "20", hideUnknownSalary: true }).map((job) => job.id),
  ["job-1"],
);
assert.deepEqual(
  filterJobs(jobs, {
    ...baseFilters,
    onlyMyCompanyJobs: true,
    employerCompanyName: "green data",
  }).map((job) => job.id),
  ["job-2"],
);

assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, sort: "salary-high" }).map((job) => job.id),
  ["job-1", "job-2", "job-3"],
);
assert.deepEqual(
  filterJobs(jobs, { ...baseFilters, sort: "salary-low" }).map((job) => job.id),
  ["job-3", "job-2", "job-1"],
);

assert.deepEqual(paginateJobs(jobs, 2, 2).map((job) => job.id), ["job-3"]);

const recommendationJob = jobs[0];
const localRecommendation = {
  items: [
    {
      jobId: "job-1",
      matchScore: 93,
      fitLevel: "High",
      reasons: ["Phù hợp kỹ năng React"],
      matchedSkills: ["React"],
      missingSkills: [],
      job: recommendationJob,
    },
  ],
  candidateSummary: "Phù hợp nhóm frontend.",
  suggestedRoles: ["Frontend Developer"],
  suggestedCompanies: ["Công ty sản phẩm"],
};

const resolvedFromLocal = resolveRecommendedJobsData({
  apiPayload: { items: [] },
  localPayload: localRecommendation,
});
assert.equal(resolvedFromLocal?.source, "local");
assert.equal(resolvedFromLocal?.items[0]?.job.id, "job-1");

assert.equal(
  resolveRecommendedJobsData({
    apiPayload: { items: [] },
    localPayload: localRecommendation,
    allowLocalFallback: false,
  }),
  null,
);

const resolvedFromApi = resolveRecommendedJobsData({
  apiPayload: {
    items: [
      {
        jobId: "job-2",
        matchScore: 95,
        fitLevel: "High",
        reasons: ["Phù hợp Golang"],
        matchedSkills: ["Golang"],
        missingSkills: [],
        job: jobs[1],
      },
    ],
    candidateSummary: "Phù hợp backend.",
  },
  localPayload: localRecommendation,
});
assert.equal(resolvedFromApi?.source, "api");
assert.equal(resolvedFromApi?.items[0]?.job.id, "job-2");

assert.equal(
  resolveRecommendedJobsData({
    apiPayload: { items: [] },
    localPayload: { items: [] },
  }),
  null,
);

console.log("jobs-page utils tests passed");

export {};
