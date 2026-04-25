import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getValueAtPath,
  setValueAtPath,
} from "@/features/cv-import/sync/json-path";
import {
  composeTextForMapping,
  parseValueFromBlocks,
} from "@/features/cv-import/sync/strategies";
import {
  extractLayoutMeta,
  toGroupableLayoutBlockFromRecord,
  withLayoutMeta,
} from "@/features/cv-import/transforms/block-layout";
import {
  buildEditableDocumentRegionsFromBlocks,
  buildEditableRegionDraftsFromSource,
  filterLayoutImageCandidates,
  withEditableRegionChildren,
} from "@/features/cv-import/transforms/editable-regions";
import {
  getCVDocumentArtifactsForUser,
  getCVDocumentPagesForUser,
  getCVDocumentRecordForUser,
  normalizeParsedJSON,
} from "@/lib/cv-imports";
import { logger } from "@/lib/observability";
import type {
  BoundingBox,
  CreateEditableVersionResponse,
  CVArtifactRecord,
  CVLayoutBlockRecord,
  CVOCRBlockRecord,
  EditableCVBlockMappingRecord,
  EditableCVBlockRecord,
  EditableCVBlockSnapshot,
  EditableCVDetailResponse,
  EditableCVLockState,
  EditableCVPageRecord,
  EditableCVRecord,
  EditableCVStatus,
  EditableCVVersionRecord,
  ExportEditableCVResponse,
  JSONPatchOperation,
  NormalizedParsedCV,
  RestoreEditableVersionResponse,
  SaveEditableCVResponse,
  SyncStrategy,
  UpdateEditableBlockRequest,
  UpdateEditableBlockAssetResponse,
  UpdateEditableBlockResponse,
  UpdateEditableJSONRequest,
  UpdateEditableJSONResponse,
} from "@/types/cv-import";

type MappingRow = EditableCVBlockMappingRecord;
const EDITABLE_CV_ASSETS_BUCKET = "cv-exports";

function createConflictError(message: string, details?: Record<string, unknown>) {
  const error = new Error(message) as Error & {
    code?: string;
    details?: Record<string, unknown>;
  };
  error.code = "revision_conflict";
  error.details = details;
  return error;
}

async function createSignedUrl(bucket: string, path: string | null, expiresIn = 3600) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

function computeSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizeAssetExtension(fileName: string, contentType: string) {
  const fromName = fileName.split(".").pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }

  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function buildFallbackMapping(block: CVOCRBlockRecord): Array<{
  json_path: string;
  mapping_role: string;
  compose_strategy: SyncStrategy;
  parse_strategy: SyncStrategy;
  sequence: number;
  is_primary: boolean;
  confidence: number;
  metadata: Record<string, unknown>;
}> {
  if (block.suggested_json_path) {
    return [
      {
        json_path: block.suggested_json_path,
        mapping_role: block.suggested_mapping_role || "value",
        compose_strategy: block.suggested_compose_strategy || "plain_text",
        parse_strategy: block.suggested_parse_strategy || "plain_text",
        sequence: block.sequence,
        is_primary: true,
        confidence: block.mapping_confidence ?? block.confidence ?? 0.5,
        metadata: {},
      },
    ];
  }

  if (block.sequence === 0) {
    return [
      {
        json_path: "profile.full_name",
        mapping_role: "title",
        compose_strategy: "plain_text",
        parse_strategy: "plain_text",
        sequence: 0,
        is_primary: true,
        confidence: 0.25,
        metadata: { inferred: true },
      },
    ];
  }

  return [];
}

async function getOcrBlocksForDocument(documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_ocr_blocks")
    .select("*")
    .eq("document_id", documentId)
    .order("sequence", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CVOCRBlockRecord[];
}

async function getLayoutBlocksForDocument(documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cv_layout_blocks")
    .select("*")
    .eq("document_id", documentId)
    .order("order_index", { ascending: true });

  if (error) {
    logger.warn("editable-cvs.layout-blocks.unavailable", {
      document_id: documentId,
      error: error.message,
    });
    return [];
  }
  return (data ?? []) as CVLayoutBlockRecord[];
}

async function getEditableCVRecordForUser(userId: string, editableCvId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("editable_cvs")
    .select("*")
    .eq("id", editableCvId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EditableCVRecord | null) ?? null;
}

async function getEditableCVPages(editableCvId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("editable_cv_pages")
    .select("*")
    .eq("editable_cv_id", editableCvId)
    .order("page_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EditableCVPageRecord[];
}

async function getEditableCVBlocks(editableCvId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("editable_cv_blocks")
    .select("*")
    .eq("editable_cv_id", editableCvId)
    .order("sequence", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EditableCVBlockRecord[];
}

async function getEditableCVMappings(editableCvId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("editable_cv_block_mappings")
    .select("*")
    .eq("editable_cv_id", editableCvId)
    .order("sequence", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EditableCVBlockMappingRecord[];
}

async function getEditableCVVersions(editableCvId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("editable_cv_versions")
    .select("*")
    .eq("editable_cv_id", editableCvId)
    .order("version_number", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as EditableCVVersionRecord[];
}

function snapshotBlocks(blocks: EditableCVBlockRecord[]): EditableCVBlockSnapshot[] {
  return blocks.map((block) => ({
    id: block.id,
    page_id: block.page_id,
    type: block.type,
    original_text: block.original_text,
    edited_text: block.edited_text,
    confidence: block.confidence,
    bbox_px: block.bbox_px,
    bbox_normalized: block.bbox_normalized,
    style_json: block.style_json,
    asset_artifact_id: block.asset_artifact_id,
    locked: block.locked,
    sequence: block.sequence,
    version: extractLayoutMeta(block.style_json ?? {}).version,
    lock_state: extractLayoutMeta(block.style_json ?? {}).lock_state,
    level: extractLayoutMeta(block.style_json ?? {}).level,
    parent_id: extractLayoutMeta(block.style_json ?? {}).parent_id,
    region_id: extractLayoutMeta(block.style_json ?? {}).region_id,
    reading_order: extractLayoutMeta(block.style_json ?? {}).reading_order,
    source_line_ids: extractLayoutMeta(block.style_json ?? {}).source_line_ids,
    source_block_ids: extractLayoutMeta(block.style_json ?? {}).source_block_ids,
  }));
}

async function createVersionInternal(
  editableCv: EditableCVRecord,
  blocks: EditableCVBlockRecord[],
  mappings: EditableCVBlockMappingRecord[],
  options: {
    userId: string;
    changeSummary?: string;
    restoredFromVersionId?: string;
  }
) {
  const admin = createAdminClient();
  const nextVersionNumber = (editableCv.current_version_number ?? 0) + 1;
  const versionId = randomUUID();

  const { error: versionError } = await admin.from("editable_cv_versions").insert({
    id: versionId,
    editable_cv_id: editableCv.id,
    version_number: nextVersionNumber,
    snapshot_updated_json: editableCv.updated_json,
    snapshot_blocks: snapshotBlocks(blocks),
    snapshot_sync_map: mappings,
    change_summary: options.changeSummary ?? null,
    restored_from_version_id: options.restoredFromVersionId ?? null,
    created_by: options.userId,
  });

  if (versionError) throw new Error(versionError.message);

  const { error: updateEditableError } = await admin
    .from("editable_cvs")
    .update({
      current_version_number: nextVersionNumber,
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", editableCv.id)
    .eq("user_id", options.userId);

  if (updateEditableError) throw new Error(updateEditableError.message);

  return {
    id: versionId,
    version_number: nextVersionNumber,
    created_at: new Date().toISOString(),
  };
}

function groupMappingsByPath(mappings: MappingRow[]) {
  const grouped = new Map<string, MappingRow[]>();
  for (const mapping of mappings) {
    const list = grouped.get(mapping.json_path) ?? [];
    list.push(mapping);
    grouped.set(mapping.json_path, list);
  }
  return grouped;
}

function groupMappingsByBlock(mappings: MappingRow[]) {
  const grouped = new Map<string, MappingRow[]>();
  for (const mapping of mappings) {
    const list = grouped.get(mapping.block_id) ?? [];
    list.push(mapping);
    grouped.set(mapping.block_id, list);
  }
  return grouped;
}

function buildDelta(path: string, value: unknown) {
  return { [path]: value };
}

function assertRevision(expected: number, current: number) {
  if (expected !== current) {
    throw createConflictError("Revision conflict", {
      expected_revision: expected,
      current_revision: current,
    });
  }
}

function resolveBlockVersion(
  block: Pick<EditableCVBlockRecord, "style_json">,
  expectedVersion?: number
) {
  const meta = extractLayoutMeta(block.style_json ?? {});
  const currentVersion = meta.version;
  if (typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
    throw createConflictError("Block version conflict", {
      expected_block_version: expectedVersion,
      current_block_version: currentVersion,
    });
  }
  return meta;
}

function resolveLockState(
  current: EditableCVLockState,
  nextText: string | null | undefined,
  previousText: string | null | undefined,
  locked: boolean
): EditableCVLockState {
  if (locked) return "user_locked";
  if ((nextText ?? "") !== (previousText ?? "")) {
    return "user_locked";
  }
  return current;
}

function uniqueMappingsForGroupedBlocks(blocks: CVOCRBlockRecord[]) {
  const deduped = new Map<
    string,
    {
      json_path: string;
      mapping_role: string;
      compose_strategy: SyncStrategy;
      parse_strategy: SyncStrategy;
      sequence: number;
      is_primary: boolean;
      confidence: number;
      metadata: Record<string, unknown>;
    }
  >();

  for (const block of blocks) {
    for (const mapping of buildFallbackMapping(block)) {
      const key = [
        mapping.json_path,
        mapping.mapping_role,
        mapping.compose_strategy,
        mapping.parse_strategy,
      ].join("::");
      const previous = deduped.get(key);
      if (!previous || mapping.confidence >= previous.confidence) {
        deduped.set(key, mapping);
      }
    }
  }

  return [...deduped.values()].sort((left, right) => left.sequence - right.sequence);
}

function layoutBlockLooksLikeImage(block: CVLayoutBlockRecord) {
  if (/(avatar|image|figure|photo|picture|graphic|logo|illustration|signature)/i.test(block.type)) {
    return true;
  }

  const kind =
    block.metadata && typeof block.metadata === "object" && typeof block.metadata.kind === "string"
      ? block.metadata.kind
      : "";
  const category =
    block.metadata &&
    typeof block.metadata === "object" &&
    typeof block.metadata.category === "string"
      ? block.metadata.category
      : "";

  return /(avatar|image|figure|photo|picture|graphic|logo|illustration|signature)/i.test(
    `${kind} ${category}`,
  );
}

function editableBlockLooksLikeImage(type: string) {
  return /(avatar|image|figure|photo|picture|graphic|logo|illustration|signature)/i.test(type);
}

export async function createEditableCVFromDocument(
  userId: string,
  documentId: string,
  options: {
    allowPartial: boolean;
    overrideNonCv: boolean;
  }
): Promise<SaveEditableCVResponse> {
  const admin = createAdminClient();

  const existing = await admin
    .from("editable_cvs")
    .select("*")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    const row = existing.data as EditableCVRecord;
    return {
      editable_cv_id: row.id,
      status: row.status,
      source_document_id: row.document_id,
      current_version_number: row.current_version_number,
      links: {
        self: `/api/editable-cvs/${row.id}`,
        editor: `/candidate/cv-builder/editable/${row.id}`,
      },
    };
  }

  const document = await getCVDocumentRecordForUser(userId, documentId);
  if (!document) throw new Error("Document not found.");

  if (document.document_type === "non_cv_document" && !options.overrideNonCv) {
    throw new Error("This document was classified as non-CV and requires override.");
  }

  if (document.status === "partial_ready" && !options.allowPartial) {
    throw new Error("Partial results require explicit allow_partial.");
  }

  if (!["ready", "partial_ready"].includes(document.status)) {
    throw new Error("Document is not ready to be converted into an editable CV.");
  }

  const [pages, ocrBlocks, layoutBlocks] = await Promise.all([
    getCVDocumentPagesForUser(userId, documentId),
    getOcrBlocksForDocument(documentId),
    getLayoutBlocksForDocument(documentId),
  ]);

  const editableCvId = randomUUID();
  const normalizedParsed = normalizeParsedJSON(document.parsed_json);
  const editableStatus: EditableCVStatus =
    document.status === "partial_ready" ? "partial_ready" : "ready";

  const pageIdByDocumentPageId = new Map<string, string>();
  const pageNumberByDocumentPageId = new Map<string, number>();
  const editablePageIdByPageNumber = new Map<number, string>();
  const editablePages = pages.map((page) => {
    const id = randomUUID();
    pageIdByDocumentPageId.set(page.id, id);
    pageNumberByDocumentPageId.set(page.id, page.page_number);
    editablePageIdByPageNumber.set(page.page_number, id);
    return {
      id,
      editable_cv_id: editableCvId,
      document_page_id: page.id,
      page_number: page.page_number,
      canonical_width_px: page.canonical_width_px,
      canonical_height_px: page.canonical_height_px,
      background_artifact_id: page.background_artifact_id,
    };
  });

  const groupableOcrBlocks = ocrBlocks
    .filter((block) => pageIdByDocumentPageId.has(block.page_id))
    .map((block) =>
      toGroupableLayoutBlockFromRecord(block, pageNumberByDocumentPageId.get(block.page_id) ?? 1)
    );
  const imageLayoutCandidates = filterLayoutImageCandidates(
    layoutBlocks
      .filter(
        (block) => pageIdByDocumentPageId.has(block.page_id) && layoutBlockLooksLikeImage(block),
      )
      .map((block) => ({
        id: block.id,
        page: pageNumberByDocumentPageId.get(block.page_id) ?? 1,
        type: block.type,
        confidence:
          typeof block.metadata?.confidence === "number"
            ? (block.metadata.confidence as number)
            : null,
        bbox_px: block.bbox_px,
        bbox_normalized: block.bbox_normalized,
      })),
    groupableOcrBlocks,
  );
  const regionDrafts = buildEditableRegionDraftsFromSource(
    groupableOcrBlocks,
    imageLayoutCandidates,
  );
  const sourceOcrBlockById = new Map(ocrBlocks.map((block) => [block.id, block]));
  const groupedEditablePairs = regionDrafts
    .map((draft) => {
      const pageId = editablePageIdByPageNumber.get(draft.page);
      if (!pageId) return null;
      const timestamp = new Date().toISOString();
      return {
        grouped: draft,
        editable: {
          id: randomUUID(),
          editable_cv_id: editableCvId,
          page_id: pageId,
          source_ocr_block_id: draft.type === "text" ? draft.block_ids[0] ?? null : null,
          type: draft.block_type || (draft.type === "image" ? "image" : "text"),
          original_text: draft.type === "text" ? draft.text : null,
          edited_text: draft.type === "text" ? draft.text : null,
          confidence: draft.confidence,
          bbox_px: draft.bbox_px as BoundingBox,
          bbox_normalized: draft.bbox_normalized as BoundingBox,
          style_json: withEditableRegionChildren(withLayoutMeta({}, draft.meta), draft.children),
          asset_artifact_id: null,
          locked: false,
          sequence: draft.meta.reading_order,
          created_at: timestamp,
          updated_at: timestamp,
        },
      };
    })
    .filter(Boolean) as Array<{
    grouped: (typeof regionDrafts)[number];
    editable: {
      id: string;
      editable_cv_id: string;
      page_id: string;
      source_ocr_block_id: string | null;
      type: string;
      original_text: string | null;
      edited_text: string | null;
      confidence: number | null;
      bbox_px: BoundingBox;
      bbox_normalized: BoundingBox;
      style_json: Record<string, unknown>;
      asset_artifact_id: null;
      locked: false;
      sequence: number;
      created_at: string;
      updated_at: string;
    };
  }>;
  const editableBlocks = groupedEditablePairs.map((pair) => pair.editable);

  const editableMappings = groupedEditablePairs.flatMap(({ grouped, editable }) => {
    if (grouped.type !== "text") return [];
    const sourceBlocks = grouped.meta.source_block_ids
      .map((sourceId) => sourceOcrBlockById.get(sourceId))
      .filter(Boolean) as CVOCRBlockRecord[];
    return uniqueMappingsForGroupedBlocks(sourceBlocks).map((mapping, mappingIndex) => ({
      id: randomUUID(),
      editable_cv_id: editableCvId,
      block_id: editable.id,
      json_path: mapping.json_path,
      mapping_role: mapping.mapping_role,
      compose_strategy: mapping.compose_strategy,
      parse_strategy: mapping.parse_strategy,
      sequence: mappingIndex,
      is_primary: mapping.is_primary,
      confidence: mapping.confidence,
      metadata: {
        ...mapping.metadata,
        source_block_ids: grouped.meta.source_block_ids,
        region_id: grouped.meta.region_id,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  });

  const { error: insertEditableError } = await admin.from("editable_cvs").insert({
    id: editableCvId,
    user_id: userId,
    document_id: documentId,
    status: editableStatus,
    parsed_json: normalizedParsed,
    updated_json: normalizedParsed,
    current_version_number: 0,
    autosave_revision: 0,
  });

  if (insertEditableError) throw new Error(insertEditableError.message);

  if (editablePages.length > 0) {
    const { error: pageError } = await admin.from("editable_cv_pages").insert(editablePages);
    if (pageError) throw new Error(pageError.message);
  }

  if (editableBlocks.length > 0) {
    const { error: blockError } = await admin.from("editable_cv_blocks").insert(editableBlocks);
    if (blockError) throw new Error(blockError.message);
  }

  if (editableMappings.length > 0) {
    const { error: mappingError } = await admin
      .from("editable_cv_block_mappings")
      .insert(editableMappings);
    if (mappingError) throw new Error(mappingError.message);
  }

  await createVersionInternal(
    {
      id: editableCvId,
      user_id: userId,
      document_id: documentId,
      status: editableStatus,
      parsed_json: normalizedParsed,
      updated_json: normalizedParsed,
      current_version_number: 0,
      autosave_revision: 0,
      last_client_mutation_id: null,
      last_saved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    editableBlocks as EditableCVBlockRecord[],
    editableMappings as EditableCVBlockMappingRecord[],
    { userId, changeSummary: "Initial editable CV snapshot" }
  );

  logger.info("editable-cvs.created", {
    editable_cv_id: editableCvId,
    user_id: userId,
    source_document_id: documentId,
    status: editableStatus,
  });

  return {
    editable_cv_id: editableCvId,
    status: editableStatus,
    source_document_id: documentId,
    current_version_number: 1,
    links: {
      self: `/api/editable-cvs/${editableCvId}`,
      editor: `/candidate/cv-builder/editable/${editableCvId}`,
    },
  };
}

export async function getEditableCVDetailForUser(
  userId: string,
  editableCvId: string
): Promise<EditableCVDetailResponse | null> {
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) return null;

  const document = await getCVDocumentRecordForUser(userId, editableCv.document_id);
  if (!document) return null;

  const [pages, blocks, mappings, versions, artifacts] = await Promise.all([
    getEditableCVPages(editableCvId),
    getEditableCVBlocks(editableCvId),
    getEditableCVMappings(editableCvId),
    getEditableCVVersions(editableCvId),
    getCVDocumentArtifactsForUser(userId, editableCv.document_id),
  ]);

  const mappingsByBlock = groupMappingsByBlock(mappings);
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  const pageViews = await Promise.all(
    pages.map(async (page) => {
      const backgroundArtifact = artifactById.get(page.background_artifact_id);
      const pageBlocks = await Promise.all(
        blocks
          .filter((block) => block.page_id === page.id)
          .map(async (block) => {
            const meta = extractLayoutMeta(block.style_json ?? {});
            return {
              id: block.id,
              type: block.type,
              original_text: block.original_text,
              edited_text: block.edited_text,
              bbox_px: block.bbox_px,
              bbox_normalized: block.bbox_normalized,
              confidence: block.confidence,
              locked: block.locked,
              version: meta.version,
              lock_state: meta.lock_state,
              level: meta.level,
              parent_id: meta.parent_id,
              region_id: meta.region_id,
              reading_order: meta.reading_order,
              source_line_ids: meta.source_line_ids,
              source_block_ids: meta.source_block_ids,
              style_json: block.style_json ?? {},
              asset_artifact_id: block.asset_artifact_id,
              asset_image_url: block.asset_artifact_id
                ? await createSignedUrl(
                    artifactById.get(block.asset_artifact_id)?.storage_bucket ?? "",
                    artifactById.get(block.asset_artifact_id)?.storage_path ?? null
                  )
                : null,
              mappings: (mappingsByBlock.get(block.id) ?? []).map((mapping) => ({
                json_path: mapping.json_path,
                mapping_role: mapping.mapping_role,
                compose_strategy: mapping.compose_strategy,
                parse_strategy: mapping.parse_strategy,
                sequence: mapping.sequence,
              })),
            };
          })
      );
      const orderedBlocks = pageBlocks.sort(
        (left, right) =>
          (left.reading_order ?? left.mappings[0]?.sequence ?? 0) -
          (right.reading_order ?? right.mappings[0]?.sequence ?? 0),
      );

      return {
        page_number: page.page_number,
        canonical_width_px: page.canonical_width_px,
        canonical_height_px: page.canonical_height_px,
        background_image_url: await createSignedUrl(
          backgroundArtifact?.storage_bucket ?? "",
          backgroundArtifact?.storage_path ?? null
        ),
        blocks: orderedBlocks,
        regions: buildEditableDocumentRegionsFromBlocks(orderedBlocks),
      };
    })
  );

  return {
    editable_cv_id: editableCv.id,
    status: editableCv.status,
    autosave_revision: editableCv.autosave_revision,
    source_document: {
      id: document.id,
      document_type: document.document_type,
      status: document.status,
    },
    parsed_json: normalizeParsedJSON(editableCv.parsed_json),
    updated_json: normalizeParsedJSON(editableCv.updated_json),
    pages: pageViews,
    versions: versions.map((version) => ({
      id: version.id,
      version_number: version.version_number,
      created_at: version.created_at,
      restored_from_version_id: version.restored_from_version_id,
    })),
  };
}

export async function updateEditableBlockForUser(
  userId: string,
  editableCvId: string,
  blockId: string,
  payload: UpdateEditableBlockRequest
): Promise<UpdateEditableBlockResponse> {
  const admin = createAdminClient();
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");

  if (
    editableCv.last_client_mutation_id &&
    editableCv.last_client_mutation_id === payload.client_mutation_id
  ) {
    const blockDetail = await getEditableCVDetailForUser(userId, editableCvId);
    const block = blockDetail?.pages.flatMap((page) => page.blocks).find((item) => item.id === blockId);
    return {
      block: {
        id: blockId,
        edited_text: block?.edited_text ?? null,
        locked: block?.locked ?? false,
        version: block?.version ?? 1,
        lock_state: block?.lock_state ?? "unlocked",
        updated_at: new Date().toISOString(),
      },
      updated_json_delta: {},
      autosave_revision: editableCv.autosave_revision,
    };
  }

  assertRevision(payload.expected_revision, editableCv.autosave_revision);

  const blocks = await getEditableCVBlocks(editableCvId);
  const block = blocks.find((item) => item.id === blockId);
  if (!block) throw new Error("Editable block not found.");
  const blockMeta = resolveBlockVersion(block, payload.expected_block_version);

  const mappings = await getEditableCVMappings(editableCvId);
  const nextEditedText = payload.edited_text ?? block.edited_text;
  const nextLocked = payload.locked ?? block.locked;
  const nextBlockVersion = blockMeta.version + 1;
  const nextLockState = resolveLockState(
    blockMeta.lock_state,
    nextEditedText,
    block.edited_text ?? block.original_text,
    nextLocked
  );
  const updatedBlock = {
    ...block,
    edited_text: nextEditedText,
    locked: nextLocked,
    style_json: withLayoutMeta(block.style_json ?? {}, {
      version: nextBlockVersion,
      lock_state: nextLockState,
    }),
    updated_at: new Date().toISOString(),
  };

  const updatedBlocks = blocks.map((item) => (item.id === blockId ? updatedBlock : item));
  const mappingsByPath = groupMappingsByPath(mappings);

  let nextJson = normalizeParsedJSON(editableCv.updated_json);
  let delta: Record<string, unknown> = {};

  for (const [jsonPath, pathMappings] of mappingsByPath.entries()) {
    const touchesBlock = pathMappings.some((mapping) => mapping.block_id === blockId);
    if (!touchesBlock) continue;

    const relatedBlocks = pathMappings
      .map((mapping) => updatedBlocks.find((candidate) => candidate.id === mapping.block_id))
      .filter(Boolean) as EditableCVBlockRecord[];

    if (relatedBlocks.length === 0) continue;
    const parsedValue = parseValueFromBlocks(pathMappings[0].parse_strategy, relatedBlocks);
    nextJson = setValueAtPath(nextJson, jsonPath, parsedValue);
    delta = { ...delta, ...buildDelta(jsonPath, parsedValue) };
  }

  const nextRevision = editableCv.autosave_revision + 1;

  const { data: updatedBlockRow, error: blockUpdateError } = await admin
    .from("editable_cv_blocks")
    .update({
      edited_text: updatedBlock.edited_text,
      locked: updatedBlock.locked,
      style_json: updatedBlock.style_json,
      updated_at: updatedBlock.updated_at,
    })
    .eq("id", blockId)
    .eq("editable_cv_id", editableCvId)
    .eq("updated_at", block.updated_at)
    .select("id")
    .maybeSingle();

  if (blockUpdateError) throw new Error(blockUpdateError.message);
  if (!updatedBlockRow) {
    throw createConflictError("Block version conflict", {
      expected_block_version: payload.expected_block_version ?? blockMeta.version,
      current_block_version: blockMeta.version,
    });
  }

  const { data: updatedEditableRow, error: editableUpdateError } = await admin
    .from("editable_cvs")
    .update({
      updated_json: nextJson,
      autosave_revision: nextRevision,
      last_client_mutation_id: payload.client_mutation_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", editableCvId)
    .eq("user_id", userId)
    .eq("autosave_revision", editableCv.autosave_revision)
    .select("id")
    .maybeSingle();

  if (editableUpdateError) throw new Error(editableUpdateError.message);
  if (!updatedEditableRow) {
    throw createConflictError("Revision conflict", {
      expected_revision: payload.expected_revision,
      current_revision: editableCv.autosave_revision,
    });
  }

  return {
    block: {
      id: updatedBlock.id,
      edited_text: updatedBlock.edited_text,
      locked: updatedBlock.locked,
      version: nextBlockVersion,
      lock_state: nextLockState,
      updated_at: updatedBlock.updated_at,
    },
    updated_json_delta: delta,
    autosave_revision: nextRevision,
  };
}

export async function replaceEditableBlockAssetForUser(
  userId: string,
  editableCvId: string,
  blockId: string,
  file: File | null,
): Promise<UpdateEditableBlockAssetResponse> {
  const admin = createAdminClient();
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");

  const blocks = await getEditableCVBlocks(editableCvId);
  const block = blocks.find((item) => item.id === blockId);
  if (!block) throw new Error("Editable block not found.");
  if (!editableBlockLooksLikeImage(block.type) && !block.asset_artifact_id) {
    throw new Error("This block does not support image replacement.");
  }

  const blockMeta = extractLayoutMeta(block.style_json ?? {});
  const nextBlockVersion = blockMeta.version + 1;
  const nextUpdatedAt = new Date().toISOString();
  let nextAssetArtifactId: string | null = null;
  let nextAssetImageUrl: string | null = null;

  if (file) {
    const contentType = file.type || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      throw new Error("Only image files can replace an image region.");
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sha256 = computeSha256(fileBuffer);
    const artifactId = randomUUID();
    const extension = normalizeAssetExtension(file.name, contentType);
    const storagePath = `${userId}/${editableCvId}/assets/${blockId}/${artifactId}.${extension}`;

    const { error: uploadError } = await admin.storage
      .from(EDITABLE_CV_ASSETS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { error: artifactError } = await admin.from("cv_document_artifacts").insert({
      id: artifactId,
      document_id: editableCv.document_id,
      artifact_key: `${editableCv.document_id}:normalized_source:block-${blockId}:${sha256}`,
      kind: "normalized_source",
      status: "ready",
      storage_bucket: EDITABLE_CV_ASSETS_BUCKET,
      storage_path: storagePath,
      content_type: contentType,
      byte_size: fileBuffer.length,
      sha256,
      source_stage: "export",
      metadata: {
        editable_cv_id: editableCvId,
        block_id: blockId,
        source: "editable_block_asset",
      },
    });
    if (artifactError) throw new Error(artifactError.message);

    nextAssetArtifactId = artifactId;
    nextAssetImageUrl = await createSignedUrl(EDITABLE_CV_ASSETS_BUCKET, storagePath);
  }

  const { data: updatedBlockRow, error: blockUpdateError } = await admin
    .from("editable_cv_blocks")
    .update({
      asset_artifact_id: nextAssetArtifactId,
      style_json: withLayoutMeta(block.style_json ?? {}, {
        version: nextBlockVersion,
        lock_state: blockMeta.lock_state,
      }),
      updated_at: nextUpdatedAt,
    })
    .eq("id", blockId)
    .eq("editable_cv_id", editableCvId)
    .eq("updated_at", block.updated_at)
    .select("id")
    .maybeSingle();

  if (blockUpdateError) throw new Error(blockUpdateError.message);
  if (!updatedBlockRow) {
    throw createConflictError("Block version conflict", {
      expected_block_version: blockMeta.version,
      current_block_version: blockMeta.version,
    });
  }

  const nextRevision = editableCv.autosave_revision + 1;
  const { data: updatedEditableRow, error: editableUpdateError } = await admin
    .from("editable_cvs")
    .update({
      autosave_revision: nextRevision,
      updated_at: nextUpdatedAt,
    })
    .eq("id", editableCvId)
    .eq("user_id", userId)
    .eq("autosave_revision", editableCv.autosave_revision)
    .select("id")
    .maybeSingle();

  if (editableUpdateError) throw new Error(editableUpdateError.message);
  if (!updatedEditableRow) {
    throw createConflictError("Revision conflict", {
      expected_revision: editableCv.autosave_revision,
      current_revision: editableCv.autosave_revision,
    });
  }

  return {
    block: {
      id: blockId,
      asset_artifact_id: nextAssetArtifactId,
      asset_image_url: nextAssetImageUrl,
      version: nextBlockVersion,
      lock_state: blockMeta.lock_state,
      updated_at: nextUpdatedAt,
    },
    autosave_revision: nextRevision,
  };
}

export async function updateEditableJsonForUser(
  userId: string,
  editableCvId: string,
  payload: UpdateEditableJSONRequest
): Promise<UpdateEditableJSONResponse> {
  const admin = createAdminClient();
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");

  if (
    editableCv.last_client_mutation_id &&
    editableCv.last_client_mutation_id === payload.client_mutation_id
  ) {
    return {
      updated_json: normalizeParsedJSON(editableCv.updated_json),
      affected_blocks: [],
      skipped_locked_blocks: [],
      autosave_revision: editableCv.autosave_revision,
    };
  }

  assertRevision(payload.expected_revision, editableCv.autosave_revision);

  const blocks = await getEditableCVBlocks(editableCvId);
  const mappings = await getEditableCVMappings(editableCvId);
  const nextRevision = editableCv.autosave_revision + 1;

  let nextJson = normalizeParsedJSON(editableCv.updated_json);
  for (const operation of payload.operations) {
    nextJson = applyJsonOperation(nextJson, operation);
  }

  const mappingsByPath = groupMappingsByPath(mappings);
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const updatesByBlockId = new Map<string, Partial<EditableCVBlockRecord>>();
  const affectedBlocks = new Set<string>();
  const skippedLockedBlocks = new Set<string>();

  for (const operation of payload.operations) {
    const pathMappings = mappingsByPath.get(operation.path) ?? [];
    if (pathMappings.length === 0) continue;
    const value = getValueAtPath(nextJson, operation.path);
    for (const mapping of pathMappings) {
      const block = blocksById.get(mapping.block_id);
      if (!block) continue;
      const blockMeta = extractLayoutMeta(block.style_json ?? {});
      if (block.locked || blockMeta.lock_state === "user_locked") {
        skippedLockedBlocks.add(block.id);
        continue;
      }
      const text = composeTextForMapping(
        mapping.compose_strategy,
        value,
        mapping,
        pathMappings
      );
      const updatedAt = new Date().toISOString();
      updatesByBlockId.set(block.id, {
        edited_text: text,
        style_json: withLayoutMeta(block.style_json ?? {}, {
          version: blockMeta.version + 1,
          lock_state: blockMeta.lock_state === "system_locked" ? "system_locked" : "unlocked",
        }),
        updated_at: updatedAt,
      });
      affectedBlocks.add(block.id);
    }
  }

  for (const [blockId, updates] of updatesByBlockId.entries()) {
    const { error } = await admin
      .from("editable_cv_blocks")
      .update(updates)
      .eq("id", blockId)
      .eq("editable_cv_id", editableCvId);
    if (error) throw new Error(error.message);
  }

  const { data: updatedEditableRow, error: editableUpdateError } = await admin
    .from("editable_cvs")
    .update({
      updated_json: nextJson,
      autosave_revision: nextRevision,
      last_client_mutation_id: payload.client_mutation_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", editableCvId)
    .eq("user_id", userId)
    .eq("autosave_revision", editableCv.autosave_revision)
    .select("id")
    .maybeSingle();

  if (editableUpdateError) throw new Error(editableUpdateError.message);
  if (!updatedEditableRow) {
    throw createConflictError("Revision conflict", {
      expected_revision: payload.expected_revision,
      current_revision: editableCv.autosave_revision,
    });
  }

  return {
    updated_json: nextJson,
    affected_blocks: [...affectedBlocks],
    skipped_locked_blocks: [...skippedLockedBlocks],
    autosave_revision: nextRevision,
  };
}

function applyJsonOperation(input: NormalizedParsedCV, operation: JSONPatchOperation) {
  if (operation.op !== "replace") {
    throw new Error(`Unsupported JSON operation: ${operation.op}`);
  }
  return setValueAtPath(input, operation.path, operation.value);
}

export async function createEditableVersionForUser(
  userId: string,
  editableCvId: string,
  changeSummary?: string
): Promise<CreateEditableVersionResponse> {
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");

  const [blocks, mappings] = await Promise.all([
    getEditableCVBlocks(editableCvId),
    getEditableCVMappings(editableCvId),
  ]);

  const version = await createVersionInternal(editableCv, blocks, mappings, {
    userId,
    changeSummary,
  });

  return { version };
}

export async function restoreEditableVersionForUser(
  userId: string,
  editableCvId: string,
  versionId: string
): Promise<RestoreEditableVersionResponse> {
  const admin = createAdminClient();
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");

  const { data: version, error: versionError } = await admin
    .from("editable_cv_versions")
    .select("*")
    .eq("id", versionId)
    .eq("editable_cv_id", editableCvId)
    .maybeSingle();

  if (versionError) throw new Error(versionError.message);
  if (!version) throw new Error("Version not found.");

  const snapshotBlocks = (version.snapshot_blocks ?? []) as EditableCVBlockSnapshot[];
  const snapshotMappings = (version.snapshot_sync_map ?? []) as EditableCVBlockMappingRecord[];
  const liveBlocks = await getEditableCVBlocks(editableCvId);
  const liveBlockIds = new Set(liveBlocks.map((block) => block.id));
  const snapshotBlockIds = new Set(snapshotBlocks.map((block) => block.id));

  const toDelete = [...liveBlockIds].filter((id) => !snapshotBlockIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await admin
      .from("editable_cv_blocks")
      .delete()
      .in("id", toDelete)
      .eq("editable_cv_id", editableCvId);
    if (error) throw new Error(error.message);
  }

  if (snapshotBlocks.length > 0) {
    const { error } = await admin.from("editable_cv_blocks").upsert(
      snapshotBlocks.map((block) => ({
        ...block,
        editable_cv_id: editableCvId,
      })),
      { onConflict: "id" }
    );
    if (error) throw new Error(error.message);
  }

  const { error: deleteMappingsError } = await admin
    .from("editable_cv_block_mappings")
    .delete()
    .eq("editable_cv_id", editableCvId);
  if (deleteMappingsError) throw new Error(deleteMappingsError.message);

  if (snapshotMappings.length > 0) {
    const { error } = await admin.from("editable_cv_block_mappings").insert(
      snapshotMappings.map((mapping) => ({
        ...mapping,
        id: mapping.id || randomUUID(),
        editable_cv_id: editableCvId,
      }))
    );
    if (error) throw new Error(error.message);
  }

  const restoredJson = normalizeParsedJSON(version.snapshot_updated_json);

  const { error: editableUpdateError } = await admin
    .from("editable_cvs")
    .update({
      updated_json: restoredJson,
      status: editableCv.status,
      autosave_revision: editableCv.autosave_revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", editableCvId)
    .eq("user_id", userId);

  if (editableUpdateError) throw new Error(editableUpdateError.message);

  const refreshedEditable = {
    ...editableCv,
    updated_json: restoredJson,
    autosave_revision: editableCv.autosave_revision + 1,
  };

  const refreshedBlocks = (await getEditableCVBlocks(editableCvId)).map((block) => ({
    ...block,
    editable_cv_id: editableCvId,
  }));
  const refreshedMappings = await getEditableCVMappings(editableCvId);
  const newVersion = await createVersionInternal(
    refreshedEditable,
    refreshedBlocks,
    refreshedMappings,
    {
      userId,
      changeSummary: `Restored from version ${version.version_number}`,
      restoredFromVersionId: version.id,
    }
  );

  return {
    restored_from_version_id: version.id,
    new_version: {
      id: newVersion.id,
      version_number: newVersion.version_number,
    },
    editable_cv_id: editableCvId,
    updated_json: restoredJson,
  };
}

export async function getEditableBackgroundArtifacts(
  userId: string,
  editableCvId: string
): Promise<Map<string, CVArtifactRecord>> {
  const editableCv = await getEditableCVRecordForUser(userId, editableCvId);
  if (!editableCv) throw new Error("Editable CV not found.");
  const artifacts = await getCVDocumentArtifactsForUser(userId, editableCv.document_id);
  return new Map(artifacts.map((artifact) => [artifact.id, artifact]));
}

export async function buildEditableCVExportResponse(
  exportId: string,
  fileName: string,
  contentType: string,
  downloadUrl: string | null,
  sha256: string | null
): Promise<ExportEditableCVResponse> {
  return {
    export_id: exportId,
    status: "ready",
    artifact: {
      file_name: fileName,
      content_type: contentType,
      download_url: downloadUrl,
      sha256,
    },
  };
}
