export const CV_DOCUMENT_STATUSES = [
  "uploaded",
  "queued",
  "normalizing",
  "rendering_preview",
  "ocr_running",
  "layout_running",
  "vl_running",
  "parsing_structured",
  "persisting",
  "ready",
  "partial_ready",
  "failed",
  "retrying",
] as const;

export const CV_DOCUMENT_TYPES = ["unknown", "cv", "non_cv_document"] as const;

export const CV_FAILURE_STAGES = [
  "upload",
  "queue",
  "normalize",
  "render_preview",
  "ocr",
  "layout",
  "classification",
  "vl",
  "parse_structured",
  "persist",
  "export",
] as const;

export const CV_ARTIFACT_KINDS = [
  "original_file",
  "normalized_source",
  "preview_page",
  "preview_pdf",
  "thumbnail_page",
  "markdown_pages",
  "ocr_raw",
  "layout_raw",
  "vl_raw",
  "parser_raw",
  "normalized_json",
  "mapped_sections",
  "export_pdf",
] as const;

export const CV_ARTIFACT_STATUSES = ["pending", "ready", "stale", "failed"] as const;

export const EDITABLE_CV_STATUSES = [
  "draft",
  "ready",
  "partial_ready",
  "saving",
  "failed",
] as const;

export const EDITABLE_CV_LOCK_STATES = [
  "unlocked",
  "user_locked",
  "system_locked",
] as const;

export const SYNC_STRATEGIES = [
  "plain_text",
  "multiline_join",
  "bullet_list",
  "date_range",
  "contact_pair",
  "title_subtitle",
] as const;

export type CVDocumentStatus = (typeof CV_DOCUMENT_STATUSES)[number];
export type CVDocumentType = (typeof CV_DOCUMENT_TYPES)[number];
export type CVFailureStage = (typeof CV_FAILURE_STAGES)[number];
export type CVArtifactKind = (typeof CV_ARTIFACT_KINDS)[number];
export type CVArtifactStatus = (typeof CV_ARTIFACT_STATUSES)[number];
export type EditableCVStatus = (typeof EDITABLE_CV_STATUSES)[number];
export type EditableCVLockState = (typeof EDITABLE_CV_LOCK_STATES)[number];
export type SyncStrategy = (typeof SYNC_STRATEGIES)[number];

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CVArtifactRecord {
  id: string;
  document_id: string;
  artifact_key: string;
  kind: CVArtifactKind;
  status: CVArtifactStatus;
  page_number: number | null;
  storage_bucket: string;
  storage_path: string;
  content_type: string;
  byte_size: number | null;
  sha256: string | null;
  source_stage: CVFailureStage | null;
  producer_model: string | null;
  producer_version: string | null;
  prompt_version: string | null;
  input_fingerprint: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CVDocumentPageRecord {
  id: string;
  document_id: string;
  page_number: number;
  canonical_width_px: number;
  canonical_height_px: number;
  background_artifact_id: string | null;
  thumbnail_artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CVDocumentRecord {
  id: string;
  user_id: string;
  status: CVDocumentStatus;
  document_type: CVDocumentType;
  classification_confidence: number | null;
  classification_signals: string[];
  review_required: boolean;
  review_reason_code: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  file_sha256: string;
  source_kind: string;
  page_count: number | null;
  raw_text: string | null;
  parsed_json: NormalizedParsedCV | null;
  failure_stage: CVFailureStage | null;
  failure_code: string | null;
  retry_count: number;
  job_id: string | null;
  processing_lock_token: string | null;
  last_heartbeat_at: string | null;
  uploaded_at: string;
  queued_at: string | null;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  queue_wait_ms: number | null;
  total_processing_ms: number | null;
  stage_durations: Record<string, number>;
  pipeline_version: string;
  created_at: string;
  updated_at: string;
}

export interface CVDocumentStageRunRecord {
  id: string;
  document_id: string;
  job_id: string;
  stage_name: string;
  attempt: number;
  state: string;
  page_number: number | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  queue_wait_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
}

export interface CVOCRBlockRecord {
  id: string;
  document_id: string;
  page_id: string;
  text: string;
  confidence: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  polygon_px: Array<{ x: number; y: number }> | null;
  type: string;
  editable: boolean;
  layout_group_id: string | null;
  sequence: number;
  suggested_json_path: string | null;
  suggested_mapping_role: string | null;
  suggested_compose_strategy: SyncStrategy | null;
  suggested_parse_strategy: SyncStrategy | null;
  mapping_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface CVLayoutBlockRecord {
  id: string;
  document_id: string;
  page_id: string;
  type: string;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EditableCVRecord {
  id: string;
  user_id: string;
  document_id: string;
  status: EditableCVStatus;
  parsed_json: NormalizedParsedCV;
  updated_json: NormalizedParsedCV;
  current_version_number: number;
  autosave_revision: number;
  last_client_mutation_id: string | null;
  last_saved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditableCVPageRecord {
  id: string;
  editable_cv_id: string;
  document_page_id: string;
  page_number: number;
  canonical_width_px: number;
  canonical_height_px: number;
  background_artifact_id: string;
  created_at: string;
  updated_at: string;
}

export interface EditableCVBlockRecord {
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
  asset_artifact_id: string | null;
  locked: boolean;
  sequence: number;
  version?: number | null;
  lock_state?: EditableCVLockState | null;
  level?: number | null;
  parent_id?: string | null;
  region_id?: string | null;
  reading_order?: number | null;
  source_line_ids?: string[] | null;
  source_block_ids?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface EditableCVBlockMappingRecord {
  id: string;
  editable_cv_id: string;
  block_id: string;
  json_path: string;
  mapping_role: string;
  compose_strategy: SyncStrategy;
  parse_strategy: SyncStrategy;
  sequence: number;
  is_primary: boolean;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EditableCVVersionRecord {
  id: string;
  editable_cv_id: string;
  version_number: number;
  snapshot_updated_json: NormalizedParsedCV;
  snapshot_blocks: Array<EditableCVBlockSnapshot>;
  snapshot_sync_map: Array<EditableCVBlockMappingRecord>;
  change_summary: string | null;
  restored_from_version_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EditableCVBlockSnapshot {
  id: string;
  page_id: string;
  type: string;
  original_text: string | null;
  edited_text: string | null;
  confidence: number | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  style_json: Record<string, unknown>;
  asset_artifact_id: string | null;
  locked: boolean;
  sequence: number;
  version?: number | null;
  lock_state?: EditableCVLockState | null;
  level?: number | null;
  parent_id?: string | null;
  region_id?: string | null;
  reading_order?: number | null;
  source_line_ids?: string[] | null;
  source_block_ids?: string[] | null;
}

export interface EditableCVExportRecord {
  id: string;
  editable_cv_id: string;
  version_number: number;
  artifact_id: string;
  status: string;
  created_at: string;
}

export interface MappedSectionLink {
  label: string;
  url: string;
}

export interface MappedSectionText {
  text: string;
}

export interface MappedSectionCandidate {
  name: string;
  job_title: string;
  avatar_url: string;
}

export interface MappedSectionPersonalInfo {
  email: string;
  phone: string;
  address: string;
  current_school: string;
  academic_year: string;
  location: string;
  links: MappedSectionLink[];
}

export interface MappedSectionEducation {
  school: string;
  degree: string;
  major: string;
  gpa: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface MappedSectionProject {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  start_date: string;
  end_date: string;
  github: string;
  url: string;
}

export interface MappedSectionExperience {
  company: string;
  role: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface MappedSectionCertificate {
  name: string;
  issuer: string;
  year: string;
  url: string;
}

export interface MappedSectionLanguage {
  name: string;
  proficiency: string;
}

export interface MappedSectionAward {
  name: string;
  issuer: string;
  year: string;
  description: string;
}

export interface MappedSectionSkills {
  programming_languages: string[];
  frontend: string[];
  backend: string[];
  database: string[];
  tools: string[];
  soft_skills: string[];
  others: string[];
}

export interface MappedSections {
  candidate: MappedSectionCandidate;
  personal_info: MappedSectionPersonalInfo;
  summary: MappedSectionText;
  career_objective: MappedSectionText;
  education: MappedSectionEducation[];
  skills: MappedSectionSkills;
  projects: MappedSectionProject[];
  experience: MappedSectionExperience[];
  certificates: MappedSectionCertificate[];
  hobbies: string[];
  languages: MappedSectionLanguage[];
  awards: MappedSectionAward[];
  others: string[];
}

export interface CorrectionLogEntry {
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface DocumentAnalysis {
  document_type: "cv" | "resume" | "profile" | "unknown";
  level: "student" | "intern" | "fresher" | "junior" | "middle" | "senior" | "unknown";
  role:
    | "frontend"
    | "backend"
    | "fullstack"
    | "mobile"
    | "tester"
    | "devops"
    | "data"
    | "uiux"
    | "software-engineer"
    | "unknown";
  render_folder: string;
}

export interface NormalizedParsedCV {
  profile: Record<string, unknown>;
  contacts: Record<string, unknown>;
  summary: string;
  career_objective?: string;
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown> | string>;
  projects: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown> | string>;
  awards?: Array<Record<string, unknown>>;
  hobbies?: string[];
  others?: string[];
  mapped_sections?: MappedSections;
  cleaned_json?: MappedSections;
  document_analysis?: DocumentAnalysis;
  correction_log?: CorrectionLogEntry[];
  avatar: Record<string, unknown>;
  raw_ocr_blocks: Array<Record<string, unknown>>;
  layout_blocks: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface CVImportSummaryResponse {
  document: Pick<
    CVDocumentRecord,
    | "id"
    | "status"
    | "document_type"
    | "file_name"
    | "mime_type"
    | "file_size"
    | "retry_count"
    | "job_id"
    | "review_required"
  >;
  links: {
    self: string;
    review: string;
  };
}

export interface CVDocumentPageView {
  page_number: number;
  canonical_width_px: number;
  canonical_height_px: number;
  background_url: string | null;
  thumbnail_url?: string | null;
}

export interface CVDocumentArtifactView {
  id?: string;
  kind: CVArtifactKind;
  page_number: number | null;
  status: CVArtifactStatus;
  download_url: string | null;
}

export interface CVDocumentDetailResponse {
  document: Pick<
    CVDocumentRecord,
    | "id"
    | "status"
    | "document_type"
    | "classification_confidence"
    | "classification_signals"
    | "review_required"
    | "failure_stage"
    | "failure_code"
    | "retry_count"
    | "job_id"
    | "last_heartbeat_at"
    | "queue_wait_ms"
    | "total_processing_ms"
    | "stage_durations"
  >;
  pages: CVDocumentPageView[];
  parsed_json: NormalizedParsedCV | Record<string, never>;
  artifacts: CVDocumentArtifactView[];
  editor_eligibility: {
    can_save_original: boolean;
    can_save_editable: boolean;
    reason: string | null;
  };
}

export interface EditableCVBlockView {
  id: string;
  type: string;
  original_text: string | null;
  edited_text: string | null;
  bbox_px: BoundingBox;
  bbox_normalized: BoundingBox;
  confidence: number | null;
  locked: boolean;
  version?: number | null;
  lock_state?: EditableCVLockState | null;
  level?: number | null;
  parent_id?: string | null;
  region_id?: string | null;
  reading_order?: number | null;
  source_line_ids?: string[] | null;
  source_block_ids?: string[] | null;
  style_json: Record<string, unknown>;
  asset_artifact_id?: string | null;
  asset_image_url?: string | null;
  mappings: Array<{
    json_path: string;
    mapping_role: string;
    compose_strategy: SyncStrategy;
    parse_strategy: SyncStrategy;
    sequence: number;
  }>;
}

export interface EditableCVPageView {
  page_number: number;
  canonical_width_px: number;
  canonical_height_px: number;
  background_image_url: string | null;
  blocks: EditableCVBlockView[];
}

export interface EditableCVDetailResponse {
  editable_cv_id: string;
  status: EditableCVStatus;
  autosave_revision: number;
  source_document: {
    id: string;
    document_type: CVDocumentType;
    status: CVDocumentStatus;
  };
  parsed_json: NormalizedParsedCV;
  updated_json: NormalizedParsedCV;
  pages: EditableCVPageView[];
  versions: Array<{
    id: string;
    version_number: number;
    created_at: string;
    restored_from_version_id: string | null;
  }>;
}

export interface SaveEditableCVRequest {
  allow_partial: boolean;
  override_non_cv: boolean;
}

export interface SaveEditableCVResponse {
  editable_cv_id: string;
  status: EditableCVStatus;
  source_document_id: string;
  current_version_number: number;
  links: {
    self: string;
    editor: string;
  };
}

export interface SaveOriginalCVResponse {
  cvUrl: string;
  filePath: string;
  message: string;
}

export interface UpdateEditableBlockRequest {
  edited_text?: string;
  locked?: boolean;
  client_mutation_id: string;
  expected_revision: number;
  expected_block_version?: number;
}

export interface UpdateEditableBlockResponse {
  block: {
    id: string;
    edited_text: string | null;
    locked: boolean;
    version?: number;
    lock_state?: EditableCVLockState;
    updated_at: string;
  };
  updated_json_delta: Record<string, unknown>;
  autosave_revision: number;
}

export interface JSONPatchOperation {
  op: "replace";
  path: string;
  value: unknown;
}

export interface UpdateEditableJSONRequest {
  operations: JSONPatchOperation[];
  client_mutation_id: string;
  expected_revision: number;
}

export interface UpdateEditableJSONResponse {
  updated_json: NormalizedParsedCV;
  affected_blocks: string[];
  skipped_locked_blocks: string[];
  autosave_revision: number;
}

export interface CreateEditableVersionRequest {
  reason: string;
  change_summary?: string;
}

export interface CreateEditableVersionResponse {
  version: {
    id: string;
    version_number: number;
    created_at: string;
  };
}

export interface RestoreEditableVersionRequest {
  version_id: string;
}

export interface RestoreEditableVersionResponse {
  restored_from_version_id: string;
  new_version: {
    id: string;
    version_number: number;
  };
  editable_cv_id: string;
  updated_json: NormalizedParsedCV;
}

export interface ExportEditableCVRequest {
  format: "pdf";
  version_id?: string;
}

export interface ExportEditableCVResponse {
  export_id: string;
  status: string;
  artifact: {
    file_name: string;
    content_type: string;
    download_url: string | null;
    sha256: string | null;
  };
}
