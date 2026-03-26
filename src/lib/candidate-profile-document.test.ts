/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  resolveCandidateProfileDocument,
  getPublicRenderableSections,
  buildLegacyProfilePatchFromDocument,
  buildPublicProfileViewModel,
} = require(path.join(process.cwd(), "src", "lib", "candidate-profile-document"));

const explicitDocument = {
  meta: { version: 1 },
  sections: [
    {
      id: "skills-1",
      type: "skills",
      order: 2,
      isHidden: false,
      content: {
        skills: [{ id: "skill-react", name: "React", category: "frontend" }],
      },
    },
    {
      id: "summary-1",
      type: "summary",
      order: 0,
      isHidden: false,
      content: { content: "Giới thiệu ngắn" },
    },
    {
      id: "experience-1",
      type: "experience",
      order: 1,
      isHidden: true,
      content: {
        items: [
          {
            id: "exp-1",
            title: "Frontend Developer",
            company: "Acme",
            startDate: "2024-01-01",
            endDate: "2025-01-01",
            isCurrent: false,
            description: ["Build UI"],
          },
        ],
      },
    },
    {
      id: "languages-1",
      type: "languages",
      order: 3,
      isHidden: false,
      content: { languages: [] },
    },
  ],
};

const publicSections = getPublicRenderableSections(explicitDocument);
assert.deepEqual(publicSections.map((section) => section.type), ["summary", "skills"]);

const fallbackDocument = resolveCandidateProfileDocument({
  document: null,
  fullName: "Nguyen Van A",
  email: "a@example.com",
  phone: "0909123456",
  location: "Ho Chi Minh City",
  introduction: "Frontend engineer",
  skills: ["React", "Next.js"],
  workExperiences: [
    {
      id: "work-1",
      title: "Frontend Intern",
      company: "Acme",
      startDate: "2024-05-01",
      endDate: "2024-09-01",
      isCurrent: false,
      description: "Built landing pages",
    },
  ],
  educations: [
    {
      id: "edu-1",
      school: "HCMUT",
      degree: "Bachelor",
      startDate: "2021-09-01",
      endDate: "2025-06-01",
      description: "Computer Science",
    },
  ],
});

assert.deepEqual(
  fallbackDocument.sections.map((section) => section.type),
  ["personal_info", "summary", "skills", "experience", "education"],
);

const patch = buildLegacyProfilePatchFromDocument(fallbackDocument);
assert.equal(patch.full_name, "Nguyen Van A");
assert.equal(patch.email, "a@example.com");
assert.equal(patch.phone, "0909123456");
assert.equal(patch.location, "Ho Chi Minh City");
assert.equal(patch.introduction, "Frontend engineer");
assert.deepEqual(patch.skills, ["React", "Next.js"]);
assert.equal(patch.work_experiences[0].title, "Frontend Intern");
assert.equal(patch.educations[0].school, "HCMUT");

const documentWinsOverLegacy = resolveCandidateProfileDocument({
  document: explicitDocument,
  fullName: "Legacy Name",
  introduction: "Legacy intro",
});

assert.deepEqual(
  documentWinsOverLegacy.sections.map((section) => section.type),
  explicitDocument.sections.map((section) => section.type),
);

const contactOnlyDocument = resolveCandidateProfileDocument({
  document: {
    meta: { version: 1 },
    sections: [
      {
        id: "personal-info",
        type: "personal_info",
        order: 0,
        isHidden: false,
        content: {
          fullName: "",
          email: "",
          phone: "",
          address: "Da Nang",
          dateOfBirth: "",
          gender: "",
        },
      },
    ],
  },
});

assert.deepEqual(
  getPublicRenderableSections(contactOnlyDocument).map((section) => section.type),
  ["personal_info"],
);

const previewSource = {
  document: {
    meta: { version: 1 },
    sections: [
      {
        id: "personal-info",
        type: "personal_info",
        order: 0,
        isHidden: false,
        content: {
          fullName: "Preview Candidate",
          email: "preview@example.com",
          phone: "0909123456",
          address: "Da Nang",
          dateOfBirth: "",
          gender: "",
        },
      },
      {
        id: "summary-2",
        type: "summary",
        order: 1,
        isHidden: false,
        content: {
          content: "Focused frontend engineer",
        },
      },
      {
        id: "skills-2",
        type: "skills",
        order: 2,
        isHidden: false,
        content: {
          skills: [
            { id: "skill-next", name: "Next.js" },
          ],
        },
      },
      {
        id: "career-goal-hidden",
        type: "career_goal",
        order: 3,
        isHidden: true,
        content: {
          content: "Become a team lead",
        },
      },
    ],
  },
  fullName: "Legacy Candidate",
  headline: "",
  email: "legacy@example.com",
  phone: "",
  location: "Ho Chi Minh City",
  cvUrl: "https://example.com/cv.pdf",
  updatedAt: "2026-03-26T10:00:00.000Z",
  workExperiences: [
    {
      id: "exp-current",
      title: "Frontend Engineer",
      company: "Acme",
      startDate: "2025-01-01",
      endDate: "",
      isCurrent: true,
      description: "Build product UI",
    },
  ],
};

const previewViewModel = buildPublicProfileViewModel(previewSource);
assert.equal(previewViewModel.displayName, "Preview Candidate");
assert.equal(previewViewModel.displayEmail, "preview@example.com");
assert.equal(previewViewModel.displayPhone, "0909123456");
assert.equal(previewViewModel.displayLocation, "Da Nang");
assert.equal(previewViewModel.displayHeadline, "Frontend Engineer");
assert.equal(previewViewModel.hasContactCard, true);
assert.deepEqual(
  previewViewModel.mainSections.map((section) => section.type),
  ["summary", "skills"],
);
assert.equal(previewViewModel.personalInfoSection?.type, "personal_info");

console.log("candidate profile document tests passed");
