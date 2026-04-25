/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  normalizeParsedJsonRecord,
} = require(path.join(process.cwd(), "src", "features", "cv-import", "normalize-parsed-json"));

const normalized = normalizeParsedJsonRecord({
  summary: "ky nang giao tiep tot",
  mapped_sections: {
    candidate: { name: "", job_title: "", avatar_url: "" },
    personal_info: {
      email: "",
      phone: "",
      address: "",
      current_school: "",
      academic_year: "",
      location: "",
      links: [],
    },
    summary: { text: "ky nang giao tiep tot" },
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
    candidate: { name: "", job_title: "", avatar_url: "" },
    personal_info: {
      email: "",
      phone: "",
      address: "",
      current_school: "",
      academic_year: "",
      location: "",
      links: [],
    },
    summary: { text: "Ká»¹ nÄƒng giao tiáº¿p tá»‘t." },
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
  document_analysis: {
    document_type: "cv",
    level: "intern",
    role: "frontend",
    render_folder: "/cv/intern/frontend/",
  },
  correction_log: [
    {
      field: "summary.text",
      before: "ky nang giao tiep tot",
      after: "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.",
      reason: "corrected OCR/spelling",
    },
  ],
});

assert.equal(normalized.summary, "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.");
assert.deepEqual(normalized.skills, ["Node.js"]);
assert.equal(normalized.cleaned_json.summary.text, "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.");
assert.deepEqual(normalized.document_analysis, {
  document_type: "cv",
  level: "intern",
  role: "frontend",
  render_folder: "/cv/intern/frontend/",
});
assert.deepEqual(normalized.correction_log, [
  {
    field: "summary.text",
    before: "ky nang giao tiep tot",
    after: "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.",
    reason: "corrected OCR/spelling",
  },
]);

console.log("cv-imports cleaned_json tests passed");
