/* eslint-disable @typescript-eslint/no-require-imports */
import type { NormalizedOcrBlock } from "@/features/ocr-viewer/types";
import type {
  SemanticMergedBlock,
  SemanticSection,
  SemanticSectionType,
} from "@/features/ocr-viewer/semantic-types";

const assert = require("node:assert/strict");
const path = require("node:path");
const semanticModule: {
  detectSectionHeader: (
    text: string,
    block?: Pick<NormalizedOcrBlock, "type" | "bbox">,
  ) => { title: string; type: SemanticSectionType } | null;
  canonicalizeSectionTitle?: (text: string) => { title: string; type: SemanticSectionType } | null;
  mergeBlocksIntoSemanticBlocks?: (blocks: NormalizedOcrBlock[]) => SemanticMergedBlock[];
  groupSemanticBlocksIntoSections?: (blocks: SemanticMergedBlock[]) => SemanticSection[];
  transformOcrToSemanticJson: (blocks: NormalizedOcrBlock[]) => {
    contact: { email: string; phone: string };
    sections: SemanticSection[];
  };
} = require(path.join(process.cwd(), "src", "features", "ocr-viewer", "utils", "ocrSemantic"));

function createBlock(
  id: string,
  text: string,
  type: string,
  yMin: number,
  yMax: number,
  options: Partial<NormalizedOcrBlock> = {},
): NormalizedOcrBlock {
  return {
    id,
    text,
    type,
    pageIndex: 0,
    order: Number(String(id).replace(/\D/g, "")) || 0,
    bbox: {
      xMin: 120,
      yMin,
      xMax: 540,
      yMax,
    },
    ...options,
  };
}

function sampleBlocks() {
  return [
    createBlock("b1", "Mục tiêu nghề nghiệp", "title", 20, 38, {
      bbox: { xMin: 160, yMin: 20, xMax: 360, yMax: 38 },
    }),
    createBlock("b2", "Mong muốn tham gia kỳ thực tập tại công ty công nghệ", "text", 50, 66),
    createBlock("b3", "để trải nghiệm môi trường làm việc thực tế và áp dụng kiến thức", "text", 68, 84),
    createBlock("b4", "đã học vào dự án cụ thể.", "text", 86, 102),
    createBlock("b5", "Kỹ năng", "title", 128, 146, {
      bbox: { xMin: 160, yMin: 128, xMax: 260, yMax: 146 },
    }),
    createBlock("b6", "- ReactJS, Next.js", "text", 158, 174),
    createBlock("b7", "- TypeScript, Node.js", "text", 178, 194),
    createBlock("b8", "Thông tin cá nhân", "title", 220, 238, {
      bbox: { xMin: 40, yMin: 220, xMax: 240, yMax: 238 },
    }),
    createBlock("b9", "haidang@example.com", "text", 248, 264, {
      bbox: { xMin: 40, yMin: 248, xMax: 240, yMax: 264 },
    }),
    createBlock("b10", "0329638454", "text", 268, 284, {
      bbox: { xMin: 40, yMin: 268, xMax: 200, yMax: 284 },
    }),
  ];
}

function runTests() {
  const header = semanticModule.detectSectionHeader("Mục tiêu nghề nghiệp", {
    type: "title",
    bbox: { xMin: 160, yMin: 20, xMax: 360, yMax: 38 },
  });

  assert.deepEqual(header, {
    title: "Mục tiêu nghề nghiệp",
    type: "summary",
  });

  const canonicalizeSectionTitle = semanticModule.canonicalizeSectionTitle;
  assert.equal(typeof canonicalizeSectionTitle, "function");
  if (!canonicalizeSectionTitle) {
    throw new Error("canonicalizeSectionTitle is not available");
  }
  assert.deepEqual(canonicalizeSectionTitle("Mục tiêu cá nhân"), {
    title: "Mục tiêu cá nhân",
    type: "summary",
  });

  assert.equal(typeof semanticModule.mergeBlocksIntoSemanticBlocks, "function");
  const mergeBlocksIntoSemanticBlocks = semanticModule.mergeBlocksIntoSemanticBlocks;
  if (!mergeBlocksIntoSemanticBlocks) {
    throw new Error("mergeBlocksIntoSemanticBlocks is not available");
  }

  const mergedBlocks = mergeBlocksIntoSemanticBlocks(sampleBlocks());
  const summaryParagraph = mergedBlocks.find(
    (block: SemanticMergedBlock) => block.sectionTitle === "Mục tiêu nghề nghiệp" && block.type === "paragraph",
  );
  const skillItems = mergedBlocks.filter(
    (block: SemanticMergedBlock) => block.sectionTitle === "Kỹ năng" && block.type === "list_item",
  );

  assert.ok(summaryParagraph);
  const resolvedSummaryParagraph = summaryParagraph!;
  assert.equal(
    resolvedSummaryParagraph.text,
    "Mong muốn tham gia kỳ thực tập tại công ty công nghệ để trải nghiệm môi trường làm việc thực tế và áp dụng kiến thức đã học vào dự án cụ thể.",
  );
  assert.deepEqual(resolvedSummaryParagraph.bbox, {
    xMin: 120,
    yMin: 50,
    xMax: 540,
    yMax: 102,
  });
  assert.equal(skillItems.length, 2);

  assert.equal(typeof semanticModule.groupSemanticBlocksIntoSections, "function");
  const groupSemanticBlocksIntoSections = semanticModule.groupSemanticBlocksIntoSections;
  if (!groupSemanticBlocksIntoSections) {
    throw new Error("groupSemanticBlocksIntoSections is not available");
  }

  const groupedSections = groupSemanticBlocksIntoSections(mergedBlocks);
  const groupedSummary = groupedSections.find((section: SemanticSection) => section.title === "Mục tiêu nghề nghiệp");
  assert.ok(groupedSummary);
  assert.equal(groupedSummary!.type, "summary");

  const result = semanticModule.transformOcrToSemanticJson(sampleBlocks());
  const summarySection = result.sections.find((section: SemanticSection) => section.title === "Mục tiêu nghề nghiệp");
  const skillSection = result.sections.find((section: SemanticSection) => section.title === "Kỹ năng");
  const otherSection = result.sections.find((section: SemanticSection) => /other|nội dung khác/i.test(section.title));

  assert.ok(summarySection);
  assert.equal(summarySection!.type, "summary");
  assert.equal(summarySection!.items.length, 1);
  assert.equal(summarySection!.items[0].type, "paragraph");

  assert.ok(skillSection);
  assert.equal(skillSection!.type, "skill_group");
  assert.equal(otherSection, undefined);
  assert.equal(result.contact.email, "haidang@example.com");
  assert.equal(result.contact.phone, "0329638454");
}

runTests();
console.log("ocrSemantic tests passed");
