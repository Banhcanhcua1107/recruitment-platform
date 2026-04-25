/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const mappedRequest = path.join(process.cwd(), "src", request.slice(2));
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { buildSemanticJsonFromMappedSections } = require(
  path.join(process.cwd(), "src", "features", "ocr-viewer", "utils", "mappedSectionsSemantic"),
);

const semantic = buildSemanticJsonFromMappedSections({
  candidate: {
    name: "Tran Thi B",
    job_title: "Backend Developer",
    avatar_url: "",
  },
  personal_info: {
    email: "tran@example.com",
    phone: "0909000000",
    address: "Ho Chi Minh City",
    current_school: "HCMUT",
    academic_year: "2021-2025",
    location: "Ho Chi Minh City",
    links: [{ label: "GitHub", url: "https://github.com/tran" }],
  },
  summary: { text: "Backend engineer focused on APIs." },
  career_objective: { text: "Grow into distributed systems work." },
  education: [
    {
      school: "HCMUT",
      degree: "Bachelor",
      major: "Computer Science",
      gpa: "3.6",
      start_date: "2021",
      end_date: "2025",
      description: "",
    },
  ],
  skills: {
    programming_languages: ["TypeScript"],
    frontend: [],
    backend: ["Node.js", "NestJS"],
    database: ["PostgreSQL"],
    tools: ["Docker"],
    soft_skills: ["Communication"],
    others: [],
  },
  projects: [
    {
      name: "Order API",
      description: "Built order management APIs",
      technologies: ["Node.js", "PostgreSQL"],
      role: "Backend Developer",
      start_date: "2024",
      end_date: "2025",
      github: "https://github.com/tran/order-api",
      url: "",
    },
  ],
  experience: [
    {
      company: "Acme",
      role: "Backend Intern",
      description: "Implemented internal services",
      start_date: "2024",
      end_date: "2024",
    },
  ],
  certificates: [{ name: "AWS CCP", issuer: "AWS", year: "2025", url: "" }],
  hobbies: ["Running"],
  languages: [{ name: "English", proficiency: "IELTS 7.0" }],
  awards: [{ name: "Best Intern", issuer: "Acme", year: "2024", description: "" }],
  others: ["Open source contributor"],
});

assert.ok(semantic, "expected semantic json from mapped_sections");
assert.equal(semantic.contact.email, "tran@example.com");
assert.ok(semantic.sections.some((section) => section.title === "Education"));
assert.ok(semantic.sections.some((section) => section.title === "Skills"));
assert.ok(semantic.sections.some((section) => section.title === "Projects"));
assert.ok(semantic.sections.some((section) => section.title === "Experience"));
assert.ok(semantic.sections.some((section) => section.title === "Certificates"));
assert.ok(semantic.sections.some((section) => section.title === "Languages"));

const projectSection = semantic.sections.find((section) => section.title === "Projects");
assert.ok(projectSection);
assert.equal(projectSection.items[0].type, "project");
assert.equal(projectSection.items[0].name, "Order API");

console.log("mappedSectionsSemantic tests passed");
