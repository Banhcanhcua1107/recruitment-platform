/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  normalizeParsedJsonRecord,
} = require(path.join(process.cwd(), "src", "features", "cv-import", "normalize-parsed-json"));

const normalized = normalizeParsedJsonRecord({
  profile: {
    full_name: "Nguyen Van A",
    job_title: "Frontend Developer",
    career_objective: "Become a fullstack engineer",
  },
  contacts: {
    email: "haidang@example.com",
    current_school: "PTIT",
  },
  summary: "Short summary",
  career_objective: "Become a fullstack engineer",
  skills: ["React", "Next.js"],
  awards: [{ name: "Hackathon Winner", year: "2024" }],
  hobbies: ["Reading"],
  others: ["Volunteer mentor"],
  mapped_sections: {
    candidate: {
      name: "Nguyen Van A",
      job_title: "Frontend Developer",
      avatar_url: "",
    },
    personal_info: {
      email: "haidang@example.com",
      phone: "",
      address: "",
      current_school: "PTIT",
      academic_year: "",
      location: "",
      links: [],
    },
    summary: { text: "Short summary" },
    career_objective: { text: "Become a fullstack engineer" },
    education: [],
    skills: {
      programming_languages: [],
      frontend: ["React", "Next.js"],
      backend: [],
      database: [],
      tools: [],
      soft_skills: [],
      others: [],
    },
    projects: [],
    experience: [],
    certificates: [],
    hobbies: ["Reading"],
    languages: [],
    awards: [{ name: "Hackathon Winner", year: "2024" }],
    others: ["Volunteer mentor"],
  },
});

assert.equal(normalized.summary, "Short summary");
assert.equal(normalized.career_objective, "Become a fullstack engineer");
assert.equal(normalized.contacts.current_school, "PTIT");
assert.deepEqual(normalized.awards, [{ name: "Hackathon Winner", year: "2024" }]);
assert.deepEqual(normalized.hobbies, ["Reading"]);
assert.deepEqual(normalized.others, ["Volunteer mentor"]);
assert.equal(normalized.mapped_sections.candidate.name, "Nguyen Van A");

const derived = normalizeParsedJsonRecord({
  mapped_sections: {
    candidate: {
      name: "Tran Thi B",
      job_title: "Backend Developer",
      avatar_url: "https://example.com/avatar.jpg",
    },
    personal_info: {
      email: "tran@example.com",
      phone: "0909000000",
      address: "",
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
        role: "Backend Developer",
        start_date: "2024",
        end_date: "2025",
        github: "https://github.com/tran/order-api",
        url: "",
        technologies: ["Node.js", "PostgreSQL"],
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
});

assert.equal(derived.profile.full_name, "Tran Thi B");
assert.equal(derived.profile.job_title, "Backend Developer");
assert.equal(derived.contacts.email, "tran@example.com");
assert.equal(derived.contacts.current_school, "HCMUT");
assert.equal(derived.summary, "Backend engineer focused on APIs.");
assert.equal(derived.career_objective, "Grow into distributed systems work.");
assert.deepEqual(derived.skills, [
  "TypeScript",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "Docker",
  "Communication",
]);
assert.equal(derived.projects[0].name, "Order API");
assert.equal(derived.experience[0].company, "Acme");
assert.equal(derived.certifications[0].name, "AWS CCP");
assert.deepEqual(derived.languages, ["English (IELTS 7.0)"]);
assert.deepEqual(derived.awards, [{ name: "Best Intern", issuer: "Acme", year: "2024", description: "" }]);
assert.deepEqual(derived.hobbies, ["Running"]);
assert.deepEqual(derived.others, ["Open source contributor"]);

console.log("cv-imports mapped_sections tests passed");
