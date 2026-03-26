/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  normalizeCvSections,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "section-normalization",
));
const {
  useCVStore,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "store",
));

const duplicatedSections = [
  {
    id: "2025",
    type: "skill_list",
    title: "Skills",
    isVisible: true,
    containerId: "main-column",
    data: {
      items: [
        { id: "2025", name: "React" },
        { id: "2025", name: "Next.js" },
        { id: "", name: "TypeScript" },
      ],
    },
  },
  {
    id: "2025",
    type: "experience_list",
    title: "Experience",
    isVisible: true,
    containerId: "main-column",
    data: {
      items: [
        {
          id: "2025",
          company: "Acme",
          position: "Frontend Developer",
          startDate: "01/2024",
          endDate: "Present",
          description: "Built UI features",
        },
        {
          id: "2025",
          company: "Beta",
          position: "Intern",
          startDate: "06/2023",
          endDate: "12/2023",
          description: "Supported delivery",
        },
      ],
    },
  },
];

const normalizedSections = normalizeCvSections(duplicatedSections);
assert.equal(normalizedSections[0].id, "2025");
assert.notEqual(normalizedSections[1].id, "2025");
assert.equal(
  new Set(normalizedSections.map((section) => section.id)).size,
  normalizedSections.length,
);

const normalizedSkillIds = normalizedSections[0].data.items.map((item) => item.id);
assert.equal(normalizedSkillIds[0], "2025");
assert.equal(new Set(normalizedSkillIds).size, normalizedSkillIds.length);

const normalizedExperienceIds = normalizedSections[1].data.items.map((item) => item.id);
assert.equal(normalizedExperienceIds[0], "2025");
assert.equal(
  new Set(normalizedExperienceIds).size,
  normalizedExperienceIds.length,
);

useCVStore.getState().loadResumeIntoStore(duplicatedSections, undefined, "template-test");
const storedSections = useCVStore.getState().cv.sections;
const storedSkillIds = storedSections[0].data.items.map((item) => item.id);
const storedExperienceIds = storedSections[1].data.items.map((item) => item.id);

assert.equal(new Set(storedSkillIds).size, storedSkillIds.length);
assert.equal(new Set(storedExperienceIds).size, storedExperienceIds.length);
assert.notEqual(storedSections[0].id, storedSections[1].id);

console.log("section normalization tests passed");
