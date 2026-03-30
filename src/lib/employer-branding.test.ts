/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  applyEmployerBrandingToJob,
} = require(path.join(process.cwd(), "src", "lib", "employer-branding"));

const brandedJob = applyEmployerBrandingToJob(
  {
    id: "job-1",
    employer_id: "employer-1",
    company_name: "Old Company",
    logo_url: "https://old.example/logo.png",
  },
  {
    id: "employer-1",
    company_name: "New Company",
    logo_url: "https://new.example/logo.png",
  },
);

assert.equal(brandedJob.company_name, "New Company");
assert.equal(brandedJob.logo_url, "https://new.example/logo.png");

const fallbackJob = applyEmployerBrandingToJob(
  {
    id: "job-2",
    employer_id: "employer-2",
    company_name: "Current Company",
    logo_url: "https://current.example/logo.png",
  },
  {
    id: "employer-2",
    company_name: "",
    logo_url: "",
  },
);

assert.equal(fallbackJob.company_name, "Current Company");
assert.equal(fallbackJob.logo_url, "https://current.example/logo.png");

const untouchedJob = applyEmployerBrandingToJob(
  {
    id: "job-3",
    employer_id: "employer-3",
    company_name: "Standalone Company",
    logo_url: "",
  },
  null,
);

assert.equal(untouchedJob.company_name, "Standalone Company");

console.log("employer branding tests passed");
