import type {
  EditableCVBlockMappingRecord,
  EditableCVBlockRecord,
  SyncStrategy,
} from "@/types/cv-import";

function normalizeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.label === "string" && typeof candidate.value === "string") {
      return `${candidate.label}: ${candidate.value}`;
    }
    if (typeof candidate.start === "string" || typeof candidate.end === "string") {
      return [candidate.start, candidate.end].filter(Boolean).join(" - ");
    }
    return Object.values(candidate)
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function toLineArray(value: unknown): string[] {
  return normalizeText(value)
    .split(/\r?\n/)
    .map((item: string) => item.replace(/^[\s*-]+/, "").trim())
    .filter(Boolean);
}

export function parseValueFromBlocks(
  strategy: SyncStrategy,
  blocks: Array<Pick<EditableCVBlockRecord, "edited_text" | "original_text" | "sequence">>
): unknown {
  const ordered = [...blocks].sort((left, right) => left.sequence - right.sequence);
  const lines = ordered
    .map((block) => (block.edited_text ?? block.original_text ?? "").trim())
    .filter(Boolean);

  switch (strategy) {
    case "bullet_list":
      return lines.map((line) => line.replace(/^[\s*-]+/, "").trim()).filter(Boolean);
    case "multiline_join":
      return lines.join("\n");
    case "date_range":
      return lines.join(" - ");
    case "contact_pair":
      return lines.join(" ");
    case "title_subtitle":
      return lines.join("\n");
    case "plain_text":
    default:
      return lines[0] ?? "";
  }
}

export function composeTextForMapping(
  strategy: SyncStrategy,
  value: unknown,
  mapping: Pick<EditableCVBlockMappingRecord, "sequence" | "mapping_role">,
  allMappingsForPath: Array<Pick<EditableCVBlockMappingRecord, "sequence" | "mapping_role">>
): string {
  const orderedMappings = [...allMappingsForPath].sort((left, right) => left.sequence - right.sequence);
  const index = orderedMappings.findIndex(
    (candidate) =>
      candidate.sequence === mapping.sequence && candidate.mapping_role === mapping.mapping_role
  );

  switch (strategy) {
    case "multiline_join": {
      const lines = toLineArray(value);
      return lines[index] ?? "";
    }
    case "bullet_list": {
      const lines = toLineArray(value);
      return lines[index] ?? "";
    }
    case "date_range": {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const source = value as Record<string, unknown>;
        if (mapping.mapping_role === "start") return normalizeText(source.start ?? source.start_date);
        if (mapping.mapping_role === "end") return normalizeText(source.end ?? source.end_date);
      }
      const parts = normalizeText(value).split(/\s+-\s+/);
      return parts[index] ?? parts[0] ?? "";
    }
    case "contact_pair": {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const source = value as Record<string, unknown>;
        if (mapping.mapping_role === "label") return normalizeText(source.label);
        if (mapping.mapping_role === "value") return normalizeText(source.value);
      }
      return normalizeText(value);
    }
    case "title_subtitle": {
      const lines = toLineArray(value);
      return lines[index] ?? lines[0] ?? "";
    }
    case "plain_text":
    default:
      return normalizeText(value);
  }
}
