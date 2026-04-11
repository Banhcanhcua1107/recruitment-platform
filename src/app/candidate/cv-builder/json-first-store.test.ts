/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const { useCVStore } = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "store",
));
const { createSectionFromSchema } = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "cv-json-system",
));
const {
  toSharedSectionPayload,
  fromSharedSectionPayload,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "shared-section-schema",
));
const {
  createEmptyNodeFromSchema,
  normalizeOverviewItems,
  buildOverviewPayload,
  appendWorkExperienceItem,
  normalizeWorkExperienceItems,
  buildWorkExperiencePayload,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "teal-timeline-sections",
));

function createBaseCV(sections) {
  return {
    meta: { pageSize: "A4", version: "1.0" },
    theme: {
      colors: { primary: "#00b14f", text: "#111827", background: "#ffffff" },
      fonts: { heading: "Manrope", body: "Manrope" },
      spacing: 4,
    },
    layout: { type: "fixed", columns: 12 },
    sections,
  };
}

function resetStore(sections) {
  const cv = createBaseCV(sections);
  useCVStore.setState({
    cv,
    mode: "template",
    metadata: { title: "Test CV" },
    selectedSectionId: null,
    isSidebarOpen: true,
    scale: 1,
    isSaving: false,
    isDirty: false,
    history: [cv],
    historyIndex: 0,
    aiSuggestions: [],
    jsonDebugEnabled: false,
    jsonDebugSnapshot: null,
  });
}

(() => {
  const summarySection = {
    id: "summary-1",
    type: "summary",
    title: "Tổng quan",
    isVisible: true,
    containerId: "main-column",
    data: { text: "Seed" },
  };

  resetStore([summarySection]);
  useCVStore.getState().addSection("experience_list");

  const sections = useCVStore.getState().cv.sections;
  assert.equal(sections.length, 2, "addSection must append a new section");
  assert.equal(sections[0].id, "summary-1", "addSection must keep existing section order and data");
  assert.equal(sections[1].type, "experience_list", "addSection must create requested section type");
  assert.equal(Array.isArray(sections[1].data.items), true, "new list section must contain items[]");
  assert.equal(sections[1].data.items.length, 1, "new list section must seed one editable item");
})();

(() => {
  const section = createSectionFromSchema("experience_list");
  section.data = {
    items: [
      {
        id: "exp-keep",
        company: "Acme",
        position: "Developer",
        startDate: "01/2022",
        endDate: "02/2024",
        description: "Build product",
      },
    ],
  };

  resetStore([section]);
  useCVStore.getState().addListItem(section.id);

  const items = useCVStore.getState().cv.sections[0].data.items;
  assert.equal(items.length, 2, "addListItem must append exactly one item");
  assert.equal(items[0].id, "exp-keep", "addListItem must not overwrite existing item");
  assert.equal(items[0].company, "Acme", "addListItem must preserve existing content");
  assert.notEqual(items[1].id, "exp-keep", "newly appended item must have a distinct id");
})();

(() => {
  const section = createSectionFromSchema("project_list");
  section.data = {};

  resetStore([section]);
  useCVStore.getState().addListItem(section.id);

  const items = useCVStore.getState().cv.sections[0].data.items;
  assert.equal(Array.isArray(items), true, "addListItem should auto-init missing items[]");
  assert.equal(items.length, 1, "addListItem should create first item when items[] is missing");
})();

(() => {
  const section = createSectionFromSchema("experience_list");
  section.data = {
    items: [
      {
        id: "exp-a",
        company: "Alpha",
        position: "Dev",
        startDate: "01/2021",
        endDate: "01/2022",
        description: "A",
      },
      {
        id: "exp-b",
        company: "Beta",
        position: "Dev",
        startDate: "02/2022",
        endDate: "03/2023",
        description: "B",
      },
      {
        id: "exp-c",
        company: "Gamma",
        position: "Lead",
        startDate: "04/2023",
        endDate: "Present",
        description: "C",
      },
    ],
  };

  resetStore([section]);
  useCVStore.getState().removeListItem(section.id, "exp-b");

  const idsAfterRemoveById = useCVStore.getState().cv.sections[0].data.items.map((item) => item.id);
  assert.deepEqual(idsAfterRemoveById, ["exp-a", "exp-c"], "removeListItem must remove correct item by id");

  useCVStore.getState().removeListItem(section.id, 0);
  const idsAfterRemoveByIndex = useCVStore.getState().cv.sections[0].data.items.map((item) => item.id);
  assert.deepEqual(idsAfterRemoveByIndex, ["exp-c"], "removeListItem should keep index fallback behavior");
})();

(() => {
  const previewSection = {
    id: "preview-project-1",
    sourceSectionId: "project-source-1",
    type: "projects",
    title: "Projects",
    visible: true,
    order: 0,
    data: {
      items: [
        {
          id: "project-1",
          name: "Hiring Platform",
          role: "Fullstack",
          startDate: "01/2024",
          endDate: "Present",
          description: "- Build APIs\n- Build UI",
          technologies: "React, Node.js",
        },
      ],
    },
  };

  const payload = toSharedSectionPayload(previewSection);
  assert.equal(payload.sections.length > 0, true, "projects payload should generate editable groups");

  const firstGroup = payload.sections[0];
  assert.equal(firstGroup.sectionType, "group", "projects payload root should be group");
  const durationNode = firstGroup.sections.find(
    (node) => node.sectionType === "group" && node.key === "duration",
  );
  assert.equal(Boolean(durationNode), true, "projects payload should preserve nested duration group");

  const rebuiltData = fromSharedSectionPayload(previewSection, payload);
  assert.equal(Array.isArray(rebuiltData.items), true, "shared payload commit must produce items[]");
  assert.equal(rebuiltData.items.length, 1, "shared payload commit must preserve project count");
})();

(() => {
  const overviewSeed = {
    id: "ov-seed-1",
    content: "Đã có nội dung",
  };
  const awardSeed = {
    id: "award-seed-1",
    date: "06/2024",
    title: "Top Performer",
    issuer: "Acme",
    detail: "Nội dung cũ",
  };

  const emptyOverview = createEmptyNodeFromSchema({
    sourceNode: overviewSeed,
    fallbackNode: { id: "ov-fallback", content: "" },
    idPrefix: "ov",
    indexHint: 1,
  });
  assert.deepEqual(
    Object.keys(emptyOverview).sort(),
    ["content", "id"],
    "overview empty clone must preserve the same shape keys",
  );
  assert.equal(emptyOverview.content, "", "overview empty clone must clear old content");
  assert.notEqual(emptyOverview.id, overviewSeed.id, "overview empty clone must get a new id");

  const emptyAward = createEmptyNodeFromSchema({
    sourceNode: awardSeed,
    fallbackNode: {
      id: "award-fallback",
      date: "",
      title: "",
      issuer: "",
      detail: "",
    },
    idPrefix: "award",
    indexHint: 2,
  });
  assert.deepEqual(
    Object.keys(emptyAward).sort(),
    ["date", "detail", "id", "issuer", "title"],
    "award empty clone must preserve field shape",
  );
  assert.equal(emptyAward.date, "", "award empty clone must clear date");
  assert.equal(emptyAward.title, "", "award empty clone must clear title");
  assert.equal(emptyAward.issuer, "", "award empty clone must clear issuer");
  assert.equal(emptyAward.detail, "", "award empty clone must clear detail");
})();

(() => {
  const nestedSeed = {
    id: "node-1",
    title: "Parent",
    score: 99,
    active: true,
    meta: {
      owner: "Alice",
      note: "Persisted text",
    },
    tags: ["frontend", "backend"],
    children: [
      {
        id: "child-1",
        label: "Child node",
      },
      {
        id: "child-2",
        label: "Child node 2",
      },
    ],
  };

  const emptyNested = createEmptyNodeFromSchema({
    sourceNode: nestedSeed,
    fallbackNode: nestedSeed,
    idPrefix: "node",
    indexHint: 0,
  });

  assert.equal(emptyNested.title, "", "clone must clear string fields");
  assert.equal(emptyNested.score, 0, "clone must clear number fields to zero");
  assert.equal(emptyNested.active, false, "clone must clear boolean fields to false");
  assert.deepEqual(
    emptyNested.meta,
    {
      owner: "",
      note: "",
    },
    "clone must recursively clear nested object content",
  );
  assert.deepEqual(emptyNested.tags, [""], "clone must keep one empty entry for nested arrays");
  assert.equal(emptyNested.children.length, 1, "clone must create exactly one empty child node");
  assert.deepEqual(
    emptyNested.children[0],
    {
      id: "",
      label: "",
    },
    "clone must keep child shape while removing content",
  );
})();

(() => {
  const summarySection = {
    id: "summary-nested-1",
    type: "summary",
    title: "Tổng quan",
    isVisible: true,
    containerId: "main-column",
    data: {
      title: "Tổng quan",
      text: "Mục đã có",
      items: [
        {
          id: "ov-keep-1",
          content: "Mục đã có",
        },
      ],
    },
  };

  resetStore([summarySection]);

  const stateBefore = useCVStore.getState();
  const sectionBefore = stateBefore.cv.sections[0];
  const itemsBefore = sectionBefore.data.items;

  const appendedEmptyItem = createEmptyNodeFromSchema({
    sourceNode: itemsBefore[itemsBefore.length - 1],
    fallbackNode: {
      id: "ov-fallback",
      content: "",
    },
    idPrefix: "ov",
    indexHint: itemsBefore.length,
  });
  const payload = buildOverviewPayload(summarySection.title, [...itemsBefore, appendedEmptyItem]);

  stateBefore.updateSectionData(summarySection.id, payload);

  const sectionAfter = useCVStore.getState().cv.sections[0];
  const itemsAfter = sectionAfter.data.items;

  assert.equal(itemsAfter.length, 2, "dispatch add must increase nested item count by exactly one");
  assert.equal(itemsBefore.length, 1, "previous items array must remain unchanged");
  assert.notEqual(itemsAfter, itemsBefore, "dispatch add must create a new items array reference");
  assert.equal(itemsAfter[0].content, "Mục đã có", "existing item content must be preserved");
  assert.equal(itemsAfter[1].content, "", "new nested item must be empty");
})();

(() => {
  const summarySection = {
    id: "summary-parent-1",
    type: "summary",
    title: "Tổng quan",
    isVisible: true,
    containerId: "main-column",
    data: {
      title: "Tổng quan",
      text: "Dòng đầu",
      items: [
        {
          id: "ov-parent-1",
          content: "Dòng đầu",
        },
      ],
    },
  };

  resetStore([summarySection]);

  useCVStore.getState().updateSectionData(summarySection.id, {
    ...buildOverviewPayload("Tổng quan", [
      {
        id: "ov-parent-1",
        content: "Dòng đầu",
      },
      {
        id: "ov-parent-2",
        content: "",
      },
    ]),
  });

  const rootJson = useCVStore.getState().exportRootJson();
  const parentSection = rootJson.sections.find((section) => section.id === summarySection.id);
  assert.equal(Boolean(parentSection), true, "updated summary section must exist in root JSON");

  const itemsNode = parentSection.children.find((child) => child.type === "items");
  assert.equal(Boolean(itemsNode), true, "new nested item must be inserted under summary.items parent");
  assert.equal(itemsNode.data.count, 2, "summary.items node must report updated child count");
  assert.equal(itemsNode.children.length, 2, "summary.items node must contain both children");
  assert.equal(itemsNode.children[1].data.content, "", "nested inserted child must remain empty");
})();

(() => {
  const normalized = normalizeOverviewItems({
    title: "Tổng quan",
    text: "Dòng text cũ",
    items: [
      {
        id: "ov-visible-1",
        content: "",
      },
    ],
  });

  assert.equal(normalized.length, 1, "overview normalization must keep empty item for rendering");
  assert.equal(normalized[0].content, "", "overview empty item must stay visible after normalization");
})();

(() => {
  const workItems = [
    {
      id: "work-1",
      type: "workItem",
      fields: {
        date: "01/2015 - 07/2015",
        company: "FREELANCER",
        role: "Full-stack Developer",
        descriptions: ["Develop web module on given projects."],
      },
    },
    {
      id: "work-2",
      type: "workItem",
      fields: {
        date: "07/2015 - 03/2018",
        company: "AIST JSC",
        role: "Full-stack Developer",
        descriptions: [
          "Programme outsourcing projects.",
          "Create coding frames and design database based on project descriptions.",
        ],
      },
    },
    {
      id: "work-3",
      type: "workItem",
      fields: {
        date: "01/2018 - Present",
        company: "FB TECHNOLOGY EDUCATION., JSC",
        role: "Full-stack Developer",
        descriptions: [
          "Programme outsourcing projects.",
          "Create coding frames and design database based on project descriptions.",
        ],
      },
    },
  ];

  const appended = appendWorkExperienceItem(workItems);
  assert.equal(appended.length, 4, "work experience add must increase item count by one");
  assert.deepEqual(appended.slice(0, 3), workItems, "work experience add must preserve all sibling items");

  const lastItem = appended[3];
  assert.equal(lastItem.type, "workItem", "new work item must preserve structural type metadata");
  assert.deepEqual(
    lastItem.fields,
    {
      date: "",
      company: "",
      role: "",
      descriptions: [""],
    },
    "new work item must keep workItem shape with empty values",
  );
})();

(() => {
  const section = createSectionFromSchema("experience_list");
  section.data = {
    items: [
      {
        id: "work-1",
        type: "workItem",
        fields: {
          date: "01/2015 - 07/2015",
          company: "FREELANCER",
          role: "Full-stack Developer",
          descriptions: ["Develop web module on given projects."],
        },
      },
      {
        id: "work-2",
        type: "workItem",
        fields: {
          date: "07/2015 - 03/2018",
          company: "AIST JSC",
          role: "Full-stack Developer",
          descriptions: ["Programme outsourcing projects."],
        },
      },
      {
        id: "work-3",
        type: "workItem",
        fields: {
          date: "01/2018 - Present",
          company: "FB TECHNOLOGY EDUCATION., JSC",
          role: "Full-stack Developer",
          descriptions: ["Create coding frames and design database based on project descriptions."],
        },
      },
    ],
  };

  resetStore([section]);
  const beforeItems = useCVStore.getState().cv.sections[0].data.items;
  const appendedItems = appendWorkExperienceItem(beforeItems);

  useCVStore.getState().updateSectionData(section.id, { items: appendedItems });

  const afterItems = useCVStore.getState().cv.sections[0].data.items;
  assert.equal(afterItems.length, 4, "store update must append one work item");
  assert.deepEqual(afterItems.slice(0, 3), beforeItems, "store update must not replace existing work array content");
})();

(() => {
  const workItems = [
    {
      id: "work-1",
      type: "workItem",
      fields: {
        date: "01/2015 - 07/2015",
        company: "FREELANCER",
        role: "Full-stack Developer",
        descriptions: ["Develop web module on given projects."],
      },
    },
    {
      id: "work-2",
      type: "workItem",
      fields: {
        date: "07/2015 - 03/2018",
        company: "AIST JSC",
        role: "Full-stack Developer",
        descriptions: ["Programme outsourcing projects."],
      },
    },
    {
      id: "work-3",
      type: "workItem",
      fields: {
        date: "01/2018 - Present",
        company: "FB TECHNOLOGY EDUCATION., JSC",
        role: "Full-stack Developer",
        descriptions: ["Create coding frames and design database based on project descriptions."],
      },
    },
  ];

  const appended = appendWorkExperienceItem(workItems);
  const lastItem = appended[3];
  const ids = new Set(appended.map((item) => item.id));
  assert.equal(ids.size, appended.length, "new work item id must be unique");
  assert.equal(lastItem.fields.date, "", "new work item date must be empty");
  assert.equal(lastItem.fields.company, "", "new work item company must be empty");
  assert.equal(lastItem.fields.role, "", "new work item role must be empty");
  assert.deepEqual(lastItem.fields.descriptions, [""], "new work item descriptions must be initialized as one empty line");
})();

(() => {
  const appended = appendWorkExperienceItem([
    {
      id: "work-1",
      type: "workItem",
      fields: {
        date: "01/2015 - 07/2015",
        company: "FREELANCER",
        role: "Full-stack Developer",
        descriptions: ["Develop web module on given projects."],
      },
    },
  ]);

  const normalized = normalizeWorkExperienceItems({
    title: "Work experience",
    items: appended,
  });
  const payload = buildWorkExperiencePayload("Work experience", normalized);
  const roundtrip = normalizeWorkExperienceItems(payload);

  assert.equal(roundtrip.length, 2, "renderer normalization must keep appended empty work item visible");
  assert.equal(roundtrip[1].leftDate, "", "empty work item date input must remain visible");
  assert.equal(roundtrip[1].rightTitle, "", "empty work item company input must remain visible");
  assert.equal(roundtrip[1].rightSubtitle, "", "empty work item role input must remain visible");
  assert.equal(roundtrip[1].rightDescription, "", "empty work item description input must remain visible");
})();

(() => {
  const seedItems = [
    {
      id: "work-1",
      type: "workItem",
      fields: {
        date: "01/2015 - 07/2015",
        company: "FREELANCER",
        role: "Full-stack Developer",
        descriptions: ["Develop web module on given projects."],
      },
    },
    {
      id: "work-2",
      type: "workItem",
      fields: {
        date: "07/2015 - 03/2018",
        company: "AIST JSC",
        role: "Full-stack Developer",
        descriptions: ["Programme outsourcing projects."],
      },
    },
    {
      id: "work-3",
      type: "workItem",
      fields: {
        date: "01/2018 - Present",
        company: "FB TECHNOLOGY EDUCATION., JSC",
        role: "Full-stack Developer",
        descriptions: ["Create coding frames and design database based on project descriptions."],
      },
    },
  ];

  const afterFirstAdd = appendWorkExperienceItem(seedItems);
  const afterSecondAdd = appendWorkExperienceItem(afterFirstAdd);

  assert.equal(afterSecondAdd.length, seedItems.length + 2, "repeated add must increment work items by +2");
  assert.deepEqual(afterSecondAdd.slice(0, seedItems.length), seedItems, "repeated add must preserve original work siblings");
})();

console.log("json-first store tests passed");
