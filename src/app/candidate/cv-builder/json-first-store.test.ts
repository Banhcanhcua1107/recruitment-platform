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
  appendTealTimelineItem,
  appendTealTimelineSkillItem,
  appendWorkExperienceItem,
  normalizeActivityItems,
  buildActivitiesPayload,
  normalizeLanguageItems,
  buildLanguagesPayload,
  normalizeAwardItems,
  buildAwardsPayload,
  normalizeWorkExperienceItems,
  buildWorkExperiencePayload,
  resolveTealSectionFrameClassName,
  shouldRenderExpandedAwardLine,
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
const {
  mapBuilderSectionsToPreviewData,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "adapters",
));
const {
  resolveSectionStyleConfig,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "section-renderers",
));
const {
  getTemplateConfig,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "template-config",
));
const {
  addProject,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "schema-driven-preview",
  "project-sections.controller",
));
const {
  mapSectionsToResumeBlocks,
  mapResumeBlocksToSections,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "api",
));
const {
  mergeSplitChunkItems,
  isPreviewBlockActive,
  shouldReusePaginatedPages,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "CVPreviewCanvas",
));
const {
  resolveSelectedSection,
  shouldJumpRightPanelToTop,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "components",
  "pro-editor",
  "EditorRightPanel",
));
const {
  buildResumeSaveInput,
  hasResumeTitleChanged,
  normalizeResumeTitleForCommit,
  resolveResumeEditorTitle,
} = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "resume-editor-persistence",
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
  const summarySection = createSectionFromSchema("summary");
  summarySection.id = "selected-summary";
  summarySection.data = {
    text: "Seed summary",
  };

  const projectSection = createSectionFromSchema("project_list");
  projectSection.id = "selected-project";
  projectSection.data = {
    items: [
      {
        id: "project-item-1",
        name: "Seed project",
      },
    ],
  };

  resetStore([summarySection, projectSection]);

  useCVStore.getState().setSelectedSection(projectSection.id);
  useCVStore.getState().updateSectionData(summarySection.id, { text: "Summary updated" });

  assert.equal(
    useCVStore.getState().selectedSectionId,
    projectSection.id,
    "selected section must remain stable after unrelated section updates",
  );

  useCVStore.getState().setSelectedSection(summarySection.id);
  assert.equal(
    useCVStore.getState().selectedSectionId,
    summarySection.id,
    "setSelectedSection must switch active section immediately",
  );
})();

(() => {
  const summarySection = createSectionFromSchema("summary");
  summarySection.id = "right-panel-summary";

  const projectSection = createSectionFromSchema("project_list");
  projectSection.id = "right-panel-project";

  const sections = [summarySection, projectSection];

  const resolvedProject = resolveSelectedSection(sections, "right-panel-project");
  assert.equal(
    resolvedProject?.id,
    "right-panel-project",
    "right panel resolver must map selectedSectionId to the exact section",
  );

  assert.equal(
    resolveSelectedSection(sections, "missing-section"),
    null,
    "right panel resolver must return null for unknown section id",
  );

  assert.equal(
    shouldJumpRightPanelToTop("summary-a", "project-b"),
    true,
    "right panel should jump to top when selected section changes",
  );

  assert.equal(
    shouldJumpRightPanelToTop("summary-a", "summary-a"),
    false,
    "right panel should not jump when selected section id is unchanged",
  );
})();

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

(() => {
  const seedItems = [
    {
      id: "act-1",
      name: "Mentor cong dong",
      role: "Speaker",
      startDate: "2024",
      endDate: "",
      description: "Huong dan sinh vien",
    },
  ];

  const appended = appendTealTimelineItem(seedItems, {
    fallbackNode: {
      id: "act-fallback",
      name: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "",
    },
    idPrefix: "act",
  });

  assert.equal(appended.length, 2, "generic Teal add helper must append one raw item");
  assert.deepEqual(appended[0], seedItems[0], "generic Teal add helper must preserve existing siblings");
  assert.equal(appended[1].name, "", "new generic Teal item must reset name");
  assert.equal(appended[1].role, "", "new generic Teal item must reset role");
  assert.equal(appended[1].startDate, "", "new generic Teal item must reset startDate");
  assert.equal(appended[1].description, "", "new generic Teal item must reset description");
  assert.notEqual(appended[1].id, seedItems[0].id, "new generic Teal item must generate a unique id");
})();

(() => {
  const seedItems = [
    { id: "skill-main-1", name: "React", group: "main", level: 90 },
    { id: "skill-main-2", name: "Node.js", group: "main", level: 88 },
    { id: "skill-other-1", name: "Ruby", group: "other", level: 70 },
  ];

  const appended = appendTealTimelineSkillItem(seedItems, "main");

  assert.equal(appended.length, 4, "skills add helper must append one item into target group");
  assert.deepEqual(appended.slice(0, 2), seedItems.slice(0, 2), "skills add helper must preserve earlier main siblings");
  assert.equal(appended[2].group, "main", "skills add helper must insert into the clicked group");
  assert.equal(appended[2].name, "", "new main skill item must be empty");
  assert.equal(appended[2].level, 0, "new main skill item must reset numeric fields");
  assert.equal(appended[3].id, "skill-other-1", "skills add helper must keep later groups untouched");

  const afterSecondAdd = appendTealTimelineSkillItem(appended, "other");
  assert.equal(afterSecondAdd.length, 5, "repeated skills add must keep incrementing item count");
  assert.equal(afterSecondAdd[4].group, "other", "repeated skills add must append into the requested group");
  assert.deepEqual(afterSecondAdd.slice(0, 4), appended, "repeated skills add must preserve all previous items");
})();

(() => {
  const normalized = normalizeActivityItems({
    items: [
      {
        id: "act-1",
        name: "Mentor cong dong",
        role: "Speaker",
        startDate: "2024",
        endDate: "",
        description: "Huong dan sinh vien",
      },
    ],
  });

  const payload = buildActivitiesPayload("Hoat dong", normalized);
  assert.equal(
    payload.items[0].description,
    "Huong dan sinh vien",
    "activities payload roundtrip must preserve existing description instead of overwriting it with role",
  );
})();

(() => {
  const section = {
    id: "lang-sec-1",
    type: "custom_text",
    title: "Ngon ngu",
    isVisible: true,
    containerId: "main-column",
    data: {
      text: "English - Advanced",
      items: [
        { id: "lang-1", name: "English", level: "Advanced" },
      ],
    },
  };

  const previewBefore = mapBuilderSectionsToPreviewData([section]).sections[0];
  const nextItems = normalizeLanguageItems(previewBefore.data);
  nextItems.push({
    id: "lang-2",
    name: "",
    level: "",
  });
  const languagePayload = buildLanguagesPayload("Ngon ngu", nextItems);
  const previewAfter = mapBuilderSectionsToPreviewData([
    {
      ...section,
      data: languagePayload,
    },
  ]).sections[0];

  assert.equal(previewBefore.data.items.length, 1, "language seed must start with one row");
  assert.equal(previewAfter.data.items.length, 2, "language add must keep empty row visible after preview remap");
  assert.equal(previewAfter.data.items[1].name, "", "new language row must stay empty but visible");
  assert.equal(previewAfter.data.items[1].level, "", "new language level field must stay empty but visible");
})();

(() => {
  const seededProjects = [
    {
      id: "project-1",
      projectName: "Hiring Platform",
      duration: {
        from: "01/2024",
        to: "Present",
      },
      layoutVariant: "table",
      sections: [],
    },
  ];

  const nextProjects = addProject(seededProjects);
  assert.equal(nextProjects.length, 2, "project add controller must keep existing behavior");
  assert.equal(nextProjects[0].id, "project-1", "project add controller must preserve existing project");
  assert.notEqual(nextProjects[1].id, "project-1", "project add controller must append a new project");
})();

(() => {
  const sourceItems = [
    { id: "work-1", company: "FREELANCER" },
    { id: "work-2", company: "AIST JSC" },
    { id: "work-3", company: "FB TECHNOLOGY EDUCATION., JSC" },
  ];

  const merged = mergeSplitChunkItems({
    sourceItems,
    splitContext: {
      startIndex: 2,
      itemCount: 1,
    },
    chunkItems: [
      sourceItems[2],
      { id: "work-new", company: "" },
    ],
  });

  assert.equal(merged.length, 4, "split merge must append from lower page chunk without dropping siblings");
  assert.deepEqual(merged.slice(0, 3), sourceItems, "split merge must preserve existing items before append");
  assert.equal(merged[3].id, "work-new", "split merge must place new work item at end");
})();

(() => {
  const sourceItems = [
    { id: "work-1", company: "FREELANCER" },
    { id: "work-2", company: "AIST JSC" },
    { id: "work-3", company: "FB TECHNOLOGY EDUCATION., JSC" },
  ];

  const merged = mergeSplitChunkItems({
    sourceItems,
    splitContext: {
      startIndex: 0,
      itemCount: 2,
    },
    chunkItems: [
      { id: "work-1", company: "FREELANCER (edited)" },
      sourceItems[1],
    ],
  });

  assert.equal(merged.length, 3, "split merge edit must keep total item count stable");
  assert.equal(merged[0].company, "FREELANCER (edited)", "split merge edit must update only target chunk item");
  assert.deepEqual(merged[1], sourceItems[1], "split merge edit must preserve second chunk item");
  assert.deepEqual(merged[2], sourceItems[2], "split merge edit must preserve tail sibling item");
})();

(() => {
  const previousPages = [
    {
      includeHeader: true,
      blocks: [
        {
          id: "experience__chunk_1",
          height: 1,
          section: {
            id: "experience-1__chunk_1",
            sourceSectionId: "experience-1",
            type: "experience",
            title: "Kinh nghiệm",
            visible: true,
            order: 0,
            data: {
              items: [
                { id: "we-1", company: "Acme" },
              ],
            },
          },
        },
      ],
    },
  ];

  const nextPagesWithUpdatedData = [
    {
      includeHeader: true,
      blocks: [
        {
          id: "experience__chunk_1",
          height: 1,
          section: {
            id: "experience-1__chunk_1",
            sourceSectionId: "experience-1",
            type: "experience",
            title: "Kinh nghiệm",
            visible: true,
            order: 0,
            data: {
              items: [
                { id: "we-1", company: "Acme Updated" },
              ],
            },
          },
        },
      ],
    },
  ];

  const nextPagesWithSameData = [
    {
      includeHeader: true,
      blocks: [
        {
          id: "experience__chunk_1",
          height: 1,
          section: {
            id: "experience-1__chunk_1",
            sourceSectionId: "experience-1",
            type: "experience",
            title: "Kinh nghiệm",
            visible: true,
            order: 0,
            data: {
              items: [
                { id: "we-1", company: "Acme" },
              ],
            },
          },
        },
      ],
    },
  ];

  assert.equal(
    shouldReusePaginatedPages(previousPages, nextPagesWithUpdatedData),
    false,
    "preview pagination cache must invalidate when section data changes even if block ids are unchanged",
  );

  assert.equal(
    shouldReusePaginatedPages(previousPages, nextPagesWithSameData),
    true,
    "preview pagination cache may be reused when section data is unchanged",
  );
})();

(() => {
  const sourceSections = [
    {
      type: "experience_list",
      isVisible: true,
      data: {
        title: "Kinh nghiệm làm việc",
        items: [
          {
            id: "we-1",
            type: "workItem",
            fields: {
              date: "01/2022 - Present",
              company: "Acme",
              role: "Senior Engineer",
              descriptions: ["Xây dựng hệ thống tuyển dụng"],
            },
          },
          {
            id: "we-2",
            type: "workItem",
            fields: {
              date: "",
              company: "",
              role: "",
              descriptions: [""],
            },
          },
        ],
      },
    },
    {
      type: "skill_list",
      isVisible: true,
      data: {
        title: "Kỹ năng",
        items: [
          { id: "skill-main-1", name: "React", group: "main", level: 90 },
          { id: "skill-main-2", name: "", group: "main", level: 0 },
          { id: "skill-other-1", name: "English", group: "other", level: 75 },
        ],
      },
    },
    {
      type: "custom_text",
      isVisible: true,
      data: {
        title: "Languages",
        items: [
          { id: "lang-1", name: "English", level: "Advanced" },
          { id: "lang-2", name: "", level: "" },
        ],
      },
    },
    {
      type: "education_list",
      isVisible: true,
      data: {
        title: "Học vấn",
        items: [
          { id: "edu-1", institution: "UIT", degree: "SE", startDate: "2018", endDate: "2022" },
          { id: "edu-2", institution: "", degree: "", startDate: "", endDate: "" },
        ],
      },
    },
    {
      type: "certificate_list",
      isVisible: true,
      data: {
        title: "Chứng chỉ",
        items: [
          { id: "cert-1", name: "AWS", issuer: "Amazon", date: "2024", url: "" },
          { id: "cert-2", name: "", issuer: "", date: "", url: "" },
        ],
      },
    },
    {
      type: "award_list",
      isVisible: true,
      data: {
        title: "Giải thưởng",
        items: [
          { id: "award-1", date: "2023", title: "Top Performer", issuer: "Acme", description: "" },
          { id: "award-2", date: "", title: "", issuer: "", description: "" },
        ],
      },
    },
    {
      type: "project_list",
      isVisible: true,
      data: {
        title: "Dự án",
        items: [
          {
            id: "proj-1",
            name: "Recruitment Platform",
            role: "Lead",
            startDate: "2024",
            endDate: "Present",
            description: "Build hiring workflow",
            technologies: "Next.js, Supabase",
          },
        ],
      },
    },
  ];

  const persistedBlocks = mapSectionsToResumeBlocks(sourceSections);
  assert.equal(persistedBlocks.length, sourceSections.length, "save mapping must persist all sections");
  assert.equal(persistedBlocks[1].data.items[1].name, "", "save mapping must keep empty repeatable rows");

  let idCounter = 0;
  const reloadedSections = mapResumeBlocksToSections(persistedBlocks, {
    createId: () => `reloaded-${++idCounter}`,
    containerId: "main-column",
  });

  const reducedReloaded = reloadedSections.map((section) => ({
    type: section.type,
    isVisible: section.isVisible,
    data: section.data,
  }));

  assert.deepEqual(
    reducedReloaded,
    sourceSections,
    "save/load/reload roundtrip must preserve full JSON payload for repeatable Teal sections",
  );
})();

(() => {
  const legacyBlocks = [
    {
      block_id: "experience",
      is_visible: true,
      data: {
        items: [
          { id: "exp-1", company: "Acme", position: "Engineer", startDate: "2021", endDate: "Present", description: "Build" },
        ],
      },
    },
    {
      block_id: "skills",
      is_visible: false,
      data: {
        items: [
          { id: "skill-1", name: "React", level: 90 },
          { id: "skill-2", name: "", level: 0 },
        ],
      },
    },
  ];

  let idCounter = 0;
  const sections = mapResumeBlocksToSections(legacyBlocks, {
    createId: () => `legacy-${++idCounter}`,
    containerId: "main-column",
  });

  assert.equal(sections[0].type, "experience_list", "legacy experience block_id must map to experience_list");
  assert.equal(sections[1].type, "skill_list", "legacy skills block_id must map to skill_list");
  assert.equal(sections[1].isVisible, false, "reload mapping must preserve block visibility");
  assert.equal(sections[1].data.items[1].name, "", "reload mapping must preserve empty skill row");

  const reSavedBlocks = mapSectionsToResumeBlocks(
    sections.map((section) => ({
      type: section.type,
      isVisible: section.isVisible,
      data: section.data,
    })),
  );
  assert.equal(reSavedBlocks[0].block_id, "experience_list", "resave must persist canonical experience block_id");
  assert.equal(reSavedBlocks[1].block_id, "skill_list", "resave must persist canonical skills block_id");
})();

(() => {
  const section = createSectionFromSchema("experience_list");
  section.data = {
    title: "Kinh nghiệm làm việc",
    items: [
      {
        id: "we-edit-1",
        type: "workItem",
        fields: {
          date: "01/2022 - Present",
          company: "Acme",
          role: "Engineer",
          descriptions: ["Build feature"],
        },
      },
    ],
  };

  resetStore([section]);

  const beforeNormalized = normalizeWorkExperienceItems({
    title: "Kinh nghiệm làm việc",
    items: useCVStore.getState().cv.sections[0].data.items,
  });
  const nextNormalized = beforeNormalized.map((item, index) =>
    index === 0
      ? {
          ...item,
          rightTitle: "Acme Updated",
        }
      : item,
  );

  useCVStore.getState().updateSectionData(
    section.id,
    buildWorkExperiencePayload("Kinh nghiệm làm việc", nextNormalized),
  );

  const savedItem = useCVStore.getState().cv.sections[0].data.items[0];
  assert.equal(savedItem.fields.company, "Acme Updated", "work edit must commit nested fields.company into raw JSON");
})();

(() => {
  const section = createSectionFromSchema("skill_list");
  section.data = {
    title: "Kỹ năng",
    items: [
      { id: "skill-main-1", name: "React", group: "main", level: 90 },
      { id: "skill-other-1", name: "English", group: "other", level: 70 },
    ],
  };

  resetStore([section]);

  const nextItems = useCVStore.getState().cv.sections[0].data.items.map((item, index) =>
    index === 0
      ? {
          ...item,
          name: "TypeScript",
        }
      : item,
  );

  useCVStore.getState().updateSectionData(section.id, {
    title: "Kỹ năng",
    items: nextItems,
  });

  const savedItems = useCVStore.getState().cv.sections[0].data.items;
  assert.equal(savedItems[0].name, "TypeScript", "skills edit must commit into raw JSON");
  assert.equal(savedItems[1].name, "English", "skills edit must preserve sibling items");
})();

(() => {
  const educationSection = createSectionFromSchema("education_list");
  educationSection.data = {
    title: "Học vấn",
    items: [
      { id: "edu-1", institution: "UIT", degree: "SE", startDate: "2018", endDate: "2022" },
    ],
  };

  resetStore([educationSection]);
  useCVStore.getState().updateSectionData(educationSection.id, {
    title: "Học vấn",
    items: [
      { id: "edu-1", institution: "HCMUT", degree: "SE", startDate: "2018", endDate: "2022" },
    ],
  });

  const savedEducation = useCVStore.getState().cv.sections[0].data.items[0];
  assert.equal(savedEducation.institution, "HCMUT", "education edit must commit into raw JSON");
})();

(() => {
  const awardSection = createSectionFromSchema("award_list");
  awardSection.data = {
    title: "Giải thưởng",
    items: [
      { id: "award-1", date: "2024", title: "Top Performer", issuer: "Acme", description: "Seed" },
    ],
  };

  resetStore([awardSection]);

  const normalizedAwards = normalizeAwardItems(useCVStore.getState().cv.sections[0].data);
  const nextAwards = normalizedAwards.map((item, index) =>
    index === 0
      ? {
          ...item,
          title: "Top Performer Updated",
        }
      : item,
  );

  useCVStore.getState().updateSectionData(
    awardSection.id,
    buildAwardsPayload("Giải thưởng", nextAwards),
  );

  const savedAward = useCVStore.getState().cv.sections[0].data.items[0];
  assert.equal(savedAward.title, "Top Performer Updated", "awards edit must commit into raw JSON");
})();

(() => {
  const languageSection = {
    id: "lang-edit-1",
    type: "custom_text",
    title: "Ngôn ngữ",
    isVisible: true,
    containerId: "main-column",
    data: {
      items: [
        { id: "lang-1", name: "English", level: "Advanced" },
      ],
    },
  };

  resetStore([languageSection]);

  const previewSection = mapBuilderSectionsToPreviewData(useCVStore.getState().cv.sections).sections[0];
  const nextItems = normalizeLanguageItems(previewSection.data).map((item, index) =>
    index === 0
      ? {
          ...item,
          level: "Native",
        }
      : item,
  );

  useCVStore.getState().updateSectionData(
    languageSection.id,
    buildLanguagesPayload("Ngôn ngữ", nextItems),
  );

  const savedLanguage = useCVStore.getState().cv.sections[0].data.items[0];
  assert.equal(savedLanguage.level, "Native", "languages edit must commit into raw JSON");
})();

(() => {
  const section = createSectionFromSchema("experience_list");
  section.data = {
    title: "Kinh nghiệm làm việc",
    items: [
      {
        id: "we-seed-1",
        type: "workItem",
        fields: {
          date: "01/2022 - Present",
          company: "Acme",
          role: "Engineer",
          descriptions: ["Seed"],
        },
      },
    ],
  };

  resetStore([section]);

  const rawItems = useCVStore.getState().cv.sections[0].data.items;
  const appended = appendWorkExperienceItem(rawItems);
  useCVStore.getState().updateSectionData(section.id, {
    title: "Kinh nghiệm làm việc",
    items: appended,
  });

  const normalizedAfterAdd = normalizeWorkExperienceItems({
    title: "Kinh nghiệm làm việc",
    items: useCVStore.getState().cv.sections[0].data.items,
  });
  const edited = normalizedAfterAdd.map((item, index) =>
    index === normalizedAfterAdd.length - 1
      ? {
          ...item,
          rightTitle: "New Company",
          rightSubtitle: "New Role",
          rightDescription: "New Description",
        }
      : item,
  );

  useCVStore.getState().updateSectionData(
    section.id,
    buildWorkExperiencePayload("Kinh nghiệm làm việc", edited),
  );

  const savedItems = useCVStore.getState().cv.sections[0].data.items;
  const newSavedItem = savedItems[savedItems.length - 1];
  assert.equal(savedItems.length, 2, "add then edit must keep appended work item");
  assert.equal(newSavedItem.fields.company, "New Company", "new work item edit must commit into source JSON");
  assert.equal(newSavedItem.fields.role, "New Role", "new work item role edit must commit into source JSON");
})();

(() => {
  const addSuites = [
    {
      name: "activities",
      idPrefix: "act",
      seed: [{ id: "act-1", name: "Seed activity", role: "Mentor", startDate: "2024", endDate: "", description: "Seed" }],
      fallback: { id: "act-fallback", name: "", role: "", startDate: "", endDate: "", description: "" },
      probeField: "name",
    },
    {
      name: "languages",
      idPrefix: "lang",
      seed: [{ id: "lang-1", name: "English", level: "Advanced" }],
      fallback: { id: "lang-fallback", name: "", level: "" },
      probeField: "name",
    },
    {
      name: "education",
      idPrefix: "edu",
      seed: [{ id: "edu-1", institution: "UIT", degree: "SE", startDate: "2018", endDate: "2022" }],
      fallback: { id: "edu-fallback", institution: "", degree: "", startDate: "", endDate: "" },
      probeField: "institution",
    },
    {
      name: "certificates",
      idPrefix: "cert",
      seed: [{ id: "cert-1", name: "AWS", issuer: "Amazon", date: "2024", url: "" }],
      fallback: { id: "cert-fallback", name: "", issuer: "", date: "", url: "" },
      probeField: "name",
    },
    {
      name: "awards",
      idPrefix: "award",
      seed: [{ id: "award-1", date: "2024", title: "Top Performer", issuer: "Acme", description: "" }],
      fallback: { id: "award-fallback", date: "", title: "", issuer: "", description: "" },
      probeField: "title",
    },
  ];

  addSuites.forEach((suite) => {
    const afterFirstAdd = appendTealTimelineItem(suite.seed, {
      fallbackNode: suite.fallback,
      idPrefix: suite.idPrefix,
    });
    const afterSecondAdd = appendTealTimelineItem(afterFirstAdd, {
      fallbackNode: suite.fallback,
      idPrefix: suite.idPrefix,
    });

    assert.equal(afterFirstAdd.length, 2, `${suite.name} add must append exactly one item`);
    assert.deepEqual(afterFirstAdd.slice(0, 1), suite.seed, `${suite.name} add must preserve existing sibling`);
    assert.equal(afterFirstAdd[1][suite.probeField], "", `${suite.name} add must create empty editable field`);
    assert.equal(afterSecondAdd.length, 3, `${suite.name} repeated add must increase count without collapsing list`);
    assert.deepEqual(afterSecondAdd.slice(0, 2), afterFirstAdd, `${suite.name} repeated add must keep previous entries intact`);
  });
})();

(() => {
  const sourceSections = [
    {
      type: "custom_text",
      isVisible: true,
      data: {
        title: "Ngôn ngữ",
        items: [
          { id: "lang-1", name: "English", level: "Advanced" },
        ],
      },
    },
  ];

  const nextLanguageItems = appendTealTimelineItem(sourceSections[0].data.items, {
    fallbackNode: { id: "lang-fallback", name: "", level: "" },
    idPrefix: "lang",
  });

  sourceSections[0].data.items = nextLanguageItems;

  const persistedBlocks = mapSectionsToResumeBlocks(sourceSections);
  let idCounter = 0;
  const reloadedSections = mapResumeBlocksToSections(persistedBlocks, {
    createId: () => `persist-reload-${++idCounter}`,
    containerId: "main-column",
  });

  assert.equal(reloadedSections.length, 1, "persistence reload must keep section count");
  assert.equal(reloadedSections[0].type, "custom_text", "persistence reload must preserve section type");
  assert.equal(reloadedSections[0].data.items.length, 2, "add + save + reload must preserve newly added language item");
  assert.equal(reloadedSections[0].data.items[1].name, "", "reloaded new language item must stay editable");
})();

(() => {
  const template = getTemplateConfig("teal-timeline");
  const defaultIcon = template.sectionStyleRules.experience.icon;

  const overridden = resolveSectionStyleConfig(template, "experience", "Kinh nghiệm", "projects");
  assert.equal(overridden.icon, "projects", "style resolver must accept valid user-picked icon token");

  const invalidOverride = resolveSectionStyleConfig(template, "experience", "Kinh nghiệm", "invalid-icon");
  assert.equal(invalidOverride.icon, defaultIcon, "style resolver must fallback to template icon when override is invalid");
})();

(() => {
  const sourceSections = [
    {
      type: "experience_list",
      isVisible: true,
      data: {
        title: "Kinh nghiệm làm việc",
        icon: "projects",
        items: [
          {
            id: "exp-1",
            company: "Acme",
            position: "Engineer",
            startDate: "01/2023",
            endDate: "Present",
            description: "Built features",
          },
        ],
      },
    },
  ];

  const persistedBlocks = mapSectionsToResumeBlocks(sourceSections);
  assert.equal(persistedBlocks[0].data.icon, "projects", "save mapping must keep section icon field");

  let idCounter = 0;
  const reloadedSections = mapResumeBlocksToSections(persistedBlocks, {
    createId: () => `icon-reload-${++idCounter}`,
    containerId: "main-column",
  });

  assert.equal(reloadedSections[0].data.icon, "projects", "reload mapping must preserve section icon field");
})();

(() => {
  assert.equal(
    shouldRenderExpandedAwardLine(
      { id: "award-empty", date: "", title: "", issuer: "", detail: "" },
      true,
    ),
    true,
    "empty award item must render expanded editor layout while section is active",
  );

  assert.equal(
    shouldRenderExpandedAwardLine(
      { id: "award-title-only", date: "", title: "Top Performer", issuer: "", detail: "" },
      false,
    ),
    false,
    "title-only award can stay compact in readonly mode",
  );

  assert.equal(
    shouldRenderExpandedAwardLine(
      { id: "award-full", date: "06/2016", title: "", issuer: "", detail: "" },
      false,
    ),
    true,
    "award with structured fields must keep expanded layout",
  );
})();

(() => {
  assert.equal(
    isPreviewBlockActive("split-experience", { sourceSectionId: "split-experience" }),
    true,
    "preview selection must activate the root chunk when ids match",
  );

  assert.equal(
    isPreviewBlockActive("split-experience", {
      sourceSectionId: "split-experience",
      data: { __splitContext: { isContinuation: true } },
    }),
    true,
    "preview selection must activate continuation chunks through the same sourceSectionId",
  );

  assert.equal(
    resolveTealSectionFrameClassName({ showSectionChrome: false, isActive: true }),
    "border-teal-200 bg-white pt-0",
    "active split continuation must render the same selected frame as its root component",
  );

  assert.equal(
    resolveTealSectionFrameClassName({ showSectionChrome: false, isActive: false }),
    "border-transparent bg-transparent pt-0",
    "inactive split continuation must stay visually neutral",
  );
})();

(() => {
  assert.equal(
    resolveResumeEditorTitle({
      draftTitle: "CV Backend Senior",
      persistedTitle: "CV Teal Timeline",
      fallbackTitle: "CV của tôi",
    }),
    "CV Backend Senior",
    "editor title resolver must prefer the live edited title",
  );

  assert.equal(
    resolveResumeEditorTitle({
      draftTitle: "",
      persistedTitle: "CV Teal Timeline",
      fallbackTitle: "CV của tôi",
    }),
    "CV Teal Timeline",
    "editor title resolver must fall back to the persisted resume title",
  );

  assert.equal(
    normalizeResumeTitleForCommit("   ", "CV Teal Timeline", "CV của tôi"),
    "CV Teal Timeline",
    "blank title commits must preserve the previous saved title",
  );

  assert.equal(
    hasResumeTitleChanged("CV Backend Senior", "CV Teal Timeline"),
    true,
    "title change detection must flag edited names",
  );

  assert.equal(
    hasResumeTitleChanged("CV Teal Timeline", "CV Teal Timeline"),
    false,
    "title change detection must stay false when the title is unchanged",
  );

  const cv = createBaseCV([
    {
      id: "resume-title-exp",
      type: "experience_list",
      title: "Kinh nghiệm làm việc",
      isVisible: true,
      containerId: "main-column",
      data: {
        items: [
          {
            id: "resume-title-item-1",
            company: "Acme",
            position: "Engineer",
            startDate: "01/2023",
            endDate: "Present",
            description: "Built features",
          },
        ],
      },
    },
  ]);

  const saveInput = buildResumeSaveInput({
    cv,
    title: "CV Backend Senior",
    rootJson: {
      meta: { templateId: "teal-timeline" },
      sections: [],
    },
  });

  assert.equal(saveInput.title, "CV Backend Senior", "save payload must include the edited CV title");
  assert.equal(saveInput.resume_data.length, 1, "save payload must keep existing section data");
  assert.equal(
    saveInput.current_styling.editorTemplateId,
    null,
    "save payload must preserve template id fallback when the editor has no explicit template",
  );
  assert.deepEqual(
    saveInput.current_styling.editorRootJson,
    { meta: { templateId: "teal-timeline" }, sections: [] },
    "save payload must keep exported root json together with the title",
  );
})();

console.log("json-first store tests passed");
