/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const { normalizeOcrResult } = require(
  path.join(process.cwd(), "src", "features", "ocr-viewer", "utils", "ocrNormalize"),
);
const { transformOcrToSemanticJson } = require(
  path.join(process.cwd(), "src", "features", "ocr-viewer", "utils", "ocrSemantic"),
);

const normalized = normalizeOcrResult({
  parsed_json: {
    mapped_sections: {
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
    },
  },
  pages: [
    {
      page_number: 1,
      canonical_width_px: 840,
      canonical_height_px: 1188,
      background_url: null,
    },
  ],
});

assert.ok(normalized.pages.length >= 1);
const syntheticBlocks = normalized.pages.flatMap((page) => page.blocks);
assert.ok(syntheticBlocks.length >= 12, "expected synthetic review blocks from mapped_sections");
assert.ok(syntheticBlocks.some((block) => block.text === "Tran Thi B"));
assert.ok(syntheticBlocks.some((block) => /Skills/i.test(block.text)));
assert.ok(syntheticBlocks.some((block) => /Order API/i.test(block.text)));

const semantic = transformOcrToSemanticJson(normalized.pages);
assert.equal(semantic.contact.email, "tran@example.com");
assert.ok(semantic.sections.some((section) => /Education/i.test(section.title)));
assert.ok(semantic.sections.some((section) => /Skills/i.test(section.title)));
assert.ok(semantic.sections.some((section) => /Experience/i.test(section.title)));

const normalizedWithCleanedJson = normalizeOcrResult({
  parsed_json: {
    mapped_sections: {
      candidate: {
        name: "tran thi b",
        job_title: "backend developer",
        avatar_url: "",
      },
      personal_info: {
        email: "tran@example.com",
        phone: "",
        address: "",
        current_school: "",
        academic_year: "",
        location: "",
        links: [],
      },
      summary: { text: "backend engineer focused on apis" },
      career_objective: { text: "" },
      education: [],
      skills: {
        programming_languages: [],
        frontend: [],
        backend: ["node js"],
        database: [],
        tools: [],
        soft_skills: [],
        others: [],
      },
      projects: [],
      experience: [],
      certificates: [],
      hobbies: [],
      languages: [],
      awards: [],
      others: [],
    },
    cleaned_json: {
      candidate: {
        name: "Tran Thi B",
        job_title: "Backend Developer",
        avatar_url: "",
      },
      personal_info: {
        email: "tran@example.com",
        phone: "",
        address: "",
        current_school: "",
        academic_year: "",
        location: "",
        links: [],
      },
      summary: { text: "Backend Engineer focused on APIs." },
      career_objective: { text: "" },
      education: [],
      skills: {
        programming_languages: [],
        frontend: [],
        backend: ["Node.js"],
        database: [],
        tools: [],
        soft_skills: [],
        others: [],
      },
      projects: [],
      experience: [],
      certificates: [],
      hobbies: [],
      languages: [],
      awards: [],
      others: [],
    },
  },
  pages: [
    {
      page_number: 1,
      canonical_width_px: 840,
      canonical_height_px: 1188,
      background_url: null,
    },
  ],
});

const cleanedBlocks = normalizedWithCleanedJson.pages.flatMap((page) => page.blocks);
assert.ok(cleanedBlocks.some((block) => block.text === "Tran Thi B"));
assert.ok(cleanedBlocks.some((block) => block.text === "Backend Engineer focused on APIs."));
assert.ok(cleanedBlocks.some((block) => block.text === "- Back-End: Node.js"));
assert.ok(!cleanedBlocks.some((block) => block.text === "backend engineer focused on apis"));

console.log("ocrNormalize mapped_sections tests passed");
