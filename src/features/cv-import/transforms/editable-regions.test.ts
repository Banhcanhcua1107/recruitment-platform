/* eslint-disable @typescript-eslint/no-require-imports */
import type { EditableCVBlockView } from "@/types/cv-import";
import type { GroupableLayoutBlock } from "@/features/cv-import/transforms/block-layout";

const assert = require("node:assert/strict");
const path = require("node:path");

const regionsModule: {
  buildEditableRegionDraftsFromSource: (
    blocks: GroupableLayoutBlock[],
    imageCandidates?: Array<{
      id: string;
      page: number;
      type?: string | null;
      confidence?: number | null;
      bbox_px: { x: number; y: number; width: number; height: number };
      bbox_normalized: { x: number; y: number; width: number; height: number };
    }>,
  ) => Array<{
    id: string;
    type: "text" | "image";
    text: string | null;
    block_ids: string[];
    children: Array<{ id: string; level: string; text?: string | null; block_ids?: string[] }>;
    meta: { source_block_ids: string[]; reading_order: number };
  }>;
  buildEditableDocumentRegionsFromBlocks: (blocks: EditableCVBlockView[]) => Array<{
    id: string;
    type: "text" | "image";
    block_ids: string[];
    children?: Array<{ id: string; level: string; text?: string | null }>;
  }>;
  withEditableRegionChildren: (
    styleJson: Record<string, unknown>,
    children: Array<{
      id: string;
      level: "line" | "block" | "image";
      type: "text" | "image";
      bbox: { x: number; y: number; width: number; height: number };
      text?: string | null;
      confidence?: number | null;
      block_ids?: string[];
    }>,
  ) => Record<string, unknown>;
} = require(path.join(process.cwd(), "src", "features", "cv-import", "transforms", "editable-regions"));

function createSourceBlock(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  sequence: number,
): GroupableLayoutBlock {
  return {
    id,
    page: 1,
    text,
    confidence: 0.96,
    bbox_px: {
      x: x * 1000,
      y: y * 1000,
      width: width * 1000,
      height: height * 1000,
    },
    bbox_normalized: { x, y, width, height },
    type: "text",
    sequence,
    source_line_ids: [id],
    source_block_ids: [id],
    suggested_json_path: null,
    suggested_mapping_role: null,
    suggested_compose_strategy: null,
    suggested_parse_strategy: null,
    mapping_confidence: null,
  };
}

function runTests() {
  const sourceBlocks: GroupableLayoutBlock[] = [
    createSourceBlock("w1", "Senior", 0.1, 0.1, 0.08, 0.022, 0),
    createSourceBlock("w2", "Frontend", 0.19, 0.101, 0.1, 0.022, 1),
    createSourceBlock("w3", "Engineer", 0.3, 0.099, 0.1, 0.022, 2),
    createSourceBlock("w4", "Built", 0.1, 0.132, 0.06, 0.022, 3),
    createSourceBlock("w5", "document", 0.17, 0.132, 0.09, 0.022, 4),
    createSourceBlock("w6", "editors.", 0.27, 0.132, 0.08, 0.022, 5),
  ];

  const drafts = regionsModule.buildEditableRegionDraftsFromSource(sourceBlocks, [
    {
      id: "img-1",
      page: 1,
      type: "image",
      confidence: 0.9,
      bbox_px: { x: 650, y: 180, width: 180, height: 220 },
      bbox_normalized: { x: 0.65, y: 0.18, width: 0.18, height: 0.22 },
    },
  ]);

  assert.equal(drafts.length, 2);

  const textRegion = drafts.find((draft) => draft.type === "text");
  assert.ok(textRegion);
  assert.equal(
    textRegion!.text,
    "Senior Frontend Engineer\nBuilt document editors.",
  );
  assert.deepEqual(textRegion!.meta.source_block_ids, ["w1", "w2", "w3", "w4", "w5", "w6"]);
  assert.equal(textRegion!.children.length, 2);
  assert.equal(textRegion!.children[0].level, "line");
  assert.equal(textRegion!.children[0].text, "Senior Frontend Engineer");

  const imageRegion = drafts.find((draft) => draft.type === "image");
  assert.ok(imageRegion);
  assert.deepEqual(imageRegion!.block_ids, ["img-1"]);

  const blockView: EditableCVBlockView = {
    id: "editable-1",
    type: "text",
    original_text: textRegion!.text,
    edited_text: textRegion!.text,
    bbox_px: { x: 100, y: 100, width: 300, height: 60 },
    bbox_normalized: { x: 0.1, y: 0.1, width: 0.3, height: 0.06 },
    confidence: 0.95,
    locked: false,
    version: 1,
    lock_state: "unlocked",
    level: 3,
    parent_id: null,
    region_id: "region:1:left",
    reading_order: 0,
    source_line_ids: ["line-1", "line-2"],
    source_block_ids: ["w1", "w2", "w3", "w4", "w5", "w6"],
    style_json: regionsModule.withEditableRegionChildren({}, textRegion!.children as never[]),
    asset_artifact_id: null,
    asset_image_url: null,
    mappings: [],
  };

  const viewRegions = regionsModule.buildEditableDocumentRegionsFromBlocks([blockView]);
  assert.equal(viewRegions.length, 1);
  assert.equal(viewRegions[0].type, "text");
  assert.deepEqual(viewRegions[0].block_ids, ["editable-1"]);
  assert.equal(viewRegions[0].children?.length, 2);
}

runTests();
console.log("editable-regions tests passed");
