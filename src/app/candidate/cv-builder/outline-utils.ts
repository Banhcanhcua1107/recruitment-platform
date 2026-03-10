import { v4 as uuidv4 } from "uuid";
import type { RichOutlineNode, RichOutlineNodeKind } from "./types";

type OutlineLine = {
  level: number;
  text: string;
  kind: RichOutlineNodeKind;
};

const BULLET_PREFIX = /^([•●▪◦·*-]|[0-9]+[.)]|[a-zA-Z][.)])\s+/;
const META_PREFIX = /^(>|\/|\/\/)\s+/;

function clampLevel(level: number): number {
  return Math.max(0, Math.min(5, level));
}

function stripOutlinePrefix(text: string): { text: string; kind?: RichOutlineNodeKind } {
  if (BULLET_PREFIX.test(text)) {
    return { text: text.replace(BULLET_PREFIX, "").trim(), kind: "bullet" };
  }

  if (META_PREFIX.test(text)) {
    return { text: text.replace(META_PREFIX, "").trim(), kind: "meta" };
  }

  return { text: text.trim() };
}

function inferNodeKind(text: string, level: number): RichOutlineNodeKind {
  const stripped = text.trim();

  if (!stripped) return "paragraph";
  if (BULLET_PREFIX.test(stripped)) return "bullet";
  if (META_PREFIX.test(stripped)) return "meta";

  const headingLike =
    level === 0 &&
    stripped.length <= 72 &&
    !/[.!?]$/.test(stripped) &&
    !/@/.test(stripped) &&
    !/\d{2,}[%/.-]\d{2,}/.test(stripped);

  return headingLike ? "heading" : "paragraph";
}

function promoteParentKinds(nodes: RichOutlineNode[]): RichOutlineNode[] {
  return nodes.map((node) => {
    const children = promoteParentKinds(node.children);
    const shouldPromote =
      children.length > 0 &&
      node.kind === "paragraph" &&
      node.text.length <= 72 &&
      !/[.!?]$/.test(node.text);

    return {
      ...node,
      kind: shouldPromote ? "heading" : node.kind,
      children,
    };
  });
}

function buildOutlineTree(lines: OutlineLine[]): RichOutlineNode[] {
  const roots: RichOutlineNode[] = [];
  const stack: Array<{ level: number; node: RichOutlineNode }> = [];

  for (const line of lines) {
    const node: RichOutlineNode = {
      id: uuidv4(),
      text: line.text,
      kind: line.kind,
      children: [],
    };

    while (stack.length && stack[stack.length - 1].level >= line.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ level: line.level, node });
  }

  return promoteParentKinds(roots);
}

export function serializeRichOutlineNodes(
  nodes: RichOutlineNode[],
  level = 0
): string {
  const lines: string[] = [];

  for (const node of nodes) {
    const prefix =
      node.kind === "bullet" ? "- " : node.kind === "meta" ? "> " : "";
    lines.push(`${"  ".repeat(level)}${prefix}${node.text}`.trimEnd());

    if (node.children.length > 0) {
      lines.push(serializeRichOutlineNodes(node.children, level + 1));
    }
  }

  return lines.filter(Boolean).join("\n");
}

export function parseRichOutlineText(text: string): RichOutlineNode[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((raw) => raw.replace(/\t/g, "  "))
    .map((raw) => {
      const leadingSpaces = raw.match(/^ */)?.[0].length ?? 0;
      const level = clampLevel(Math.floor(leadingSpaces / 2));
      const stripped = raw.trim();
      if (!stripped) return null;

      const cleaned = stripOutlinePrefix(stripped);
      const kind = cleaned.kind ?? inferNodeKind(stripped, level);

      return {
        level,
        text: cleaned.text,
        kind,
      } satisfies OutlineLine;
    })
    .filter((line): line is OutlineLine => Boolean(line));

  return buildOutlineTree(lines);
}

export function buildRichOutlineNodesFromEntries(
  entries: Array<{ text: string; x: number }>
): RichOutlineNode[] {
  if (!entries.length) return [];

  const minX = Math.min(...entries.map((entry) => entry.x));
  const indentCandidates = entries
    .map((entry) => entry.x - minX)
    .filter((offset) => offset > 1.2)
    .sort((a, b) => a - b);
  const indentStep = Math.max(2.4, Math.min(indentCandidates[0] ?? 4.5, 8));

  const lines: OutlineLine[] = entries
    .map((entry) => {
      const text = entry.text.trim();
      if (!text) return null;

      const offset = Math.max(0, entry.x - minX);
      const level = clampLevel(Math.round(offset / indentStep));
      const cleaned = stripOutlinePrefix(text);
      const kind = cleaned.kind ?? inferNodeKind(text, level);

      return {
        level,
        text: cleaned.text,
        kind,
      } satisfies OutlineLine;
    })
    .filter((line): line is OutlineLine => Boolean(line));

  return buildOutlineTree(lines);
}
