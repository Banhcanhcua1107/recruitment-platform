import type { SemanticItem } from "@/features/ocr-viewer/semantic-types";

function compactParts(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("|");
}

function buildItemSignature(item: SemanticItem) {
  switch (item.type) {
    case "paragraph":
      return item.text;
    case "list":
      return item.items.join("|");
    case "skill_group":
      return compactParts([item.groupName, item.skills.join("|")]);
    case "education":
      return compactParts([
        item.institution,
        item.degree,
        item.fieldOfStudy,
        item.dateText,
      ]);
    case "project":
      return compactParts([item.name, item.role, item.dateText]);
    case "experience":
      return compactParts([item.position, item.company, item.dateText]);
    case "certification":
      return compactParts([item.name, item.issuer, item.date, item.credentialId]);
    case "language":
      return compactParts([item.name, item.level, item.score]);
    case "contact_info":
      return compactParts([
        item.email,
        item.phone,
        item.address,
        item.links?.map((link) => compactParts([link.label, link.url])).join("|"),
        item.otherLines?.join("|"),
      ]);
    case "other":
    default:
      return item.text;
  }
}

export function buildSemanticItemKey(item: SemanticItem, index: number) {
  const sourceKey = item.sourceBlockIds.filter(Boolean).join(":");
  if (sourceKey) {
    return `${item.type}:${sourceKey}`;
  }

  const pageKey = item.pageIndexes.join(":");
  const signature = buildItemSignature(item) || "semantic-item";
  return `${item.type}:${pageKey}:${signature}:${index}`;
}
