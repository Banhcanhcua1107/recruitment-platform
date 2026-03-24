import type {
  NormalizedOcrBlock,
  NormalizedOcrPage,
  NormalizedOcrResult,
} from "@/features/ocr-viewer/types";
import type {
  SemanticCertificationItem,
  SemanticContact,
  SemanticContactInfoItem,
  SemanticCvJson,
  SemanticEducationItem,
  SemanticExperienceItem,
  SemanticItem,
  SemanticLanguageItem,
  SemanticLink,
  SemanticListItem,
  SemanticOtherItem,
  SemanticParagraphItem,
  SemanticProjectItem,
  SemanticSection,
  SemanticSectionType,
  SemanticSkillGroupItem,
  SemanticSourceTrace,
} from "@/features/ocr-viewer/semantic-types";

type SemanticInput = NormalizedOcrResult | NormalizedOcrPage[] | NormalizedOcrBlock[];
type RunKind = "paragraph" | "list";

interface PreparedBlock extends NormalizedOcrBlock {
  cleanedText: string;
  normalizedText: string;
  normalizedType: string;
}

interface SectionHeaderMatch {
  title: string;
  type: SemanticSectionType;
}

interface SectionDraft {
  title: string;
  type: SemanticSectionType;
  headerBlock?: PreparedBlock;
  blocks: PreparedBlock[];
}

interface GroupedRun extends SemanticSourceTrace {
  id: string;
  kind: RunKind;
  text: string;
  lines: string[];
  blocks: PreparedBlock[];
  startY: number;
  endY: number;
  firstPageIndex: number;
}

interface DateRangeMatch {
  startDate: string;
  endDate: string;
  dateText: string;
}

interface ContactAccumulator {
  email: string;
  phone: string;
  address: string;
  links: SemanticLink[];
  sourceBlockIds: Set<string>;
  pageIndexes: Set<number>;
  otherLines: string[];
}

interface AliasDefinition {
  type: SemanticSectionType;
  canonicalTitle: string;
  aliases: string[];
}

const HEADER_TYPES = new Set(["title", "heading", "header", "section"]);
const NOISE_TYPES = new Set(["figure", "image", "icon", "watermark", "stamp", "seal", "page_number"]);

const SECTION_ALIASES: AliasDefinition[] = [
  {
    type: "section",
    canonicalTitle: "Career Objective",
    aliases: [
      "MUC TIEU NGHE NGHIEP",
      "CAREER OBJECTIVE",
      "CAREER GOAL",
      "OBJECTIVE",
      "PROFILE",
      "SUMMARY",
      "PROFESSIONAL SUMMARY",
      "TOM TAT",
      "GIOI THIEU BAN THAN",
    ],
  },
  {
    type: "education",
    canonicalTitle: "Education",
    aliases: ["HOC VAN", "EDUCATION", "ACADEMIC BACKGROUND", "EDUCATIONAL BACKGROUND"],
  },
  {
    type: "skill_group",
    canonicalTitle: "Skills",
    aliases: ["KY NANG", "SKILLS", "TECHNICAL SKILLS", "CORE SKILLS", "COMPETENCIES"],
  },
  {
    type: "project",
    canonicalTitle: "Projects",
    aliases: ["DU AN", "PROJECT", "PROJECTS", "ACADEMIC PROJECTS"],
  },
  {
    type: "experience",
    canonicalTitle: "Experience",
    aliases: [
      "KINH NGHIEM",
      "WORK EXPERIENCE",
      "EXPERIENCE",
      "PROFESSIONAL EXPERIENCE",
      "EMPLOYMENT HISTORY",
    ],
  },
  {
    type: "certification",
    canonicalTitle: "Certifications",
    aliases: ["CHUNG CHI", "CERTIFICATE", "CERTIFICATES", "CERTIFICATION", "CERTIFICATIONS"],
  },
  {
    type: "contact_info",
    canonicalTitle: "Contact Information",
    aliases: [
      "THONG TIN CA NHAN",
      "LIEN HE",
      "CONTACT",
      "CONTACT INFORMATION",
      "PERSONAL INFORMATION",
      "PERSONAL INFO",
    ],
  },
  {
    type: "language",
    canonicalTitle: "Languages",
    aliases: ["NGON NGU", "LANGUAGE", "LANGUAGES"],
  },
  {
    type: "other",
    canonicalTitle: "Other",
    aliases: ["SO THICH", "INTERESTS", "HOBBIES", "HOAT DONG", "ACTIVITIES", "AWARDS"],
  },
];

const SCHOOL_KEYWORDS = [
  "university",
  "college",
  "academy",
  "institute",
  "school",
  "faculty",
  "dai hoc",
  "cao dang",
  "hoc vien",
  "truong",
  "thpt",
];

const DEGREE_KEYWORDS = [
  "bachelor",
  "master",
  "phd",
  "engineer",
  "degree",
  "major",
  "field",
  "chuyen nganh",
  "cu nhan",
  "ky su",
  "thac si",
];

const ROLE_KEYWORDS = [
  "developer",
  "engineer",
  "intern",
  "manager",
  "analyst",
  "designer",
  "consultant",
  "specialist",
  "leader",
  "director",
  "tester",
  "devops",
  "frontend",
  "backend",
  "fullstack",
  "lap trinh vien",
  "thuc tap sinh",
  "ky su",
  "nhan vien",
];

const COMPANY_KEYWORDS = [
  "company",
  "cong ty",
  "corp",
  "corporation",
  "co., ltd",
  "ltd",
  "llc",
  "inc",
  "group",
  "studio",
  "agency",
  "startup",
];

const CERTIFICATION_KEYWORDS = ["certificate", "certification", "certified", "chung chi", "credential"];

const LANGUAGE_NAMES = [
  "english",
  "vietnamese",
  "japanese",
  "korean",
  "chinese",
  "french",
  "german",
  "ielts",
  "toeic",
  "toefl",
];

const ADDRESS_KEYWORDS = [
  "address",
  "street",
  "district",
  "ward",
  "city",
  "road",
  "avenue",
  "quan",
  "phuong",
  "tp",
  "thanh pho",
  "hcm",
  "ha noi",
];

const TECH_KEYWORDS = [
  "html",
  "css",
  "sass",
  "scss",
  "less",
  "javascript",
  "typescript",
  "react",
  "reactjs",
  "next.js",
  "nextjs",
  "vue",
  "angular",
  "node.js",
  "nodejs",
  "express",
  "nestjs",
  "python",
  "java",
  "c#",
  "c++",
  "php",
  "laravel",
  "django",
  "flask",
  "spring",
  "spring boot",
  ".net",
  "dotnet",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "sqlite",
  "sql server",
  "firebase",
  "supabase",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "git",
  "github",
  "gitlab",
  "figma",
  "tailwind",
  "tailwindcss",
  "bootstrap",
  "material ui",
  "mui",
  "antd",
  "graphql",
  "rest api",
  "restful api",
  "prisma",
  "sequelize",
  "vite",
  "webpack",
  "linux",
  "postman",
  "jira",
  "notion",
  "photoshop",
  "illustrator",
  "figjam",
];

const DATE_RANGE_PATTERN =
  /\b((?:\d{1,2}\/)?\d{4}|present|current|now|hien tai)\s*(?:-|to|until|den)\s*((?:\d{1,2}\/)?\d{4}|present|current|now|hien tai)\b/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s,;]+/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const BULLET_PATTERN = /^(?:[-*+]|[0-9]+[.)]|[a-z][.)]|[\u2022])/i;

function stripAccents(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(text: string) {
  return stripAccents(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normalizeInlineWhitespace(text: string) {
  return text.replace(/[ \\t]+/g, " ");
}

export function cleanSemanticText(text: string) {
  if (!text) return "";

  let cleaned = text.normalize("NFC");
  cleaned = cleaned.replace(/\r\n?/g, "\n");
  cleaned = cleaned.replace(/[\u2022\u25e6\u25aa\u00b7]/g, "*");
  cleaned = cleaned.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/([A-Za-z0-9])\s*@\s*([A-Za-z0-9])/g, "$1@$2");
  cleaned = cleaned.replace(/([A-Za-z0-9])\s*\.\s*(com|vn|org|net|io|dev|edu|me)\b/gi, "$1.$2");
  cleaned = cleaned.replace(/\bhttps?\s*:\s*\/\s*\//gi, "https://");
  cleaned = cleaned.replace(/\bwww\s*\.\s*/gi, "www.");
  cleaned = cleaned.replace(/(?<=\d)\s*-\s*(?=\d)/g, " - ");
  cleaned = cleaned.replace(/\s+([,.;:!?])/g, "$1");
  cleaned = cleaned.replace(/([,.;:!?])(?![\s\n]|$)/g, "$1 ");
  cleaned = cleaned
    .split("\n")
    .map((line) => normalizeInlineWhitespace(line).trim())
    .filter(Boolean)
    .join("\n");

  return cleaned.replace(/[ \\t]{2,}/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function buildSourceTraceFromBlocks(blocks: Array<Pick<NormalizedOcrBlock, "id" | "pageIndex">>): SemanticSourceTrace {
  return {
    sourceBlockIds: uniqueStrings(blocks.map((block) => block.id)),
    pageIndexes: Array.from(new Set(blocks.map((block) => block.pageIndex))).sort((left, right) => left - right),
  };
}

export function buildSourceTrace(
  blocks: Array<Pick<NormalizedOcrBlock, "id" | "pageIndex">> | Pick<NormalizedOcrBlock, "id" | "pageIndex">,
): SemanticSourceTrace {
  return buildSourceTraceFromBlocks(Array.isArray(blocks) ? blocks : [blocks]);
}

function isNormalizedResult(input: SemanticInput): input is NormalizedOcrResult {
  return Boolean(input) && !Array.isArray(input) && typeof input === "object" && Array.isArray(input.pages);
}

function isPageArray(input: SemanticInput): input is NormalizedOcrPage[] {
  return Array.isArray(input) && (input.length === 0 || "blocks" in input[0]);
}

function flattenInput(input: SemanticInput): NormalizedOcrBlock[] {
  if (isNormalizedResult(input)) {
    return input.pages.flatMap((page) => page.blocks);
  }

  if (isPageArray(input)) {
    return input.flatMap((page) => page.blocks);
  }

  return input;
}

function sortBlocks(blocks: PreparedBlock[]) {
  return [...blocks].sort((left, right) => {
    const pageDiff = left.pageIndex - right.pageIndex;
    if (pageDiff !== 0) return pageDiff;

    const topDiff = left.bbox.yMin - right.bbox.yMin;
    if (Math.abs(topDiff) > 1) return topDiff;

    const leftDiff = left.bbox.xMin - right.bbox.xMin;
    if (Math.abs(leftDiff) > 1) return leftDiff;

    return left.order - right.order;
  });
}

function normalizeBlockType(type: string) {
  return type.toLowerCase().replace(/\s+/g, "_");
}

function isLikelyNoise(block: NormalizedOcrBlock, cleanedText: string) {
  if (!cleanedText) return true;
  if (NOISE_TYPES.has(normalizeBlockType(block.type))) return true;
  if (/^(?:page|trang)\s*\d+$/i.test(cleanedText)) return true;
  if (/^\d+\s*(?:x|×)\s*\d+$/i.test(cleanedText)) return true;
  if (cleanedText.length <= 1 && !/[A-Za-z0-9]/.test(cleanedText)) return true;
  return false;
}

function prepareBlocks(input: SemanticInput) {
  return sortBlocks(
    flattenInput(input)
      .map((block) => {
        const cleanedText = cleanSemanticText(block.text);
        return {
          ...block,
          cleanedText,
          normalizedText: normalizeKey(cleanedText),
          normalizedType: normalizeBlockType(block.type),
        } satisfies PreparedBlock;
      })
      .filter((block) => !isLikelyNoise(block, block.cleanedText)),
  );
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function uppercaseRatio(text: string) {
  const letters = text.match(/[A-Za-z]/g) ?? [];
  const uppercase = text.match(/[A-Z]/g) ?? [];
  return letters.length ? uppercase.length / letters.length : 0;
}

function isHeaderLikeText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (wordCount(trimmed) > 9) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (uppercaseRatio(stripAccents(trimmed)) >= 0.62) return true;
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => /^[A-Z]/.test(word) || /^[0-9]+$/.test(word));
}

function matchSectionAlias(text: string) {
  const normalized = normalizeKey(text);
  if (!normalized) return null;

  for (const definition of SECTION_ALIASES) {
    const found = definition.aliases.some((alias) => {
      const aliasKey = normalizeKey(alias);
      return normalized === aliasKey || normalized.startsWith(aliasKey) || aliasKey.startsWith(normalized);
    });

    if (found) {
      return definition;
    }
  }

  return null;
}

export function detectSectionHeader(text: string, block?: Pick<NormalizedOcrBlock, "type" | "bbox">): SectionHeaderMatch | null {
  const cleaned = cleanSemanticText(text);
  if (!cleaned) return null;

  const aliasMatch = matchSectionAlias(cleaned);
  if (aliasMatch) {
    return {
      title: cleaned,
      type: aliasMatch.type,
    };
  }

  const normalizedType = block ? normalizeBlockType(block.type) : "";
  if (!HEADER_TYPES.has(normalizedType) && !isHeaderLikeText(cleaned)) {
    return null;
  }

  return {
    title: cleaned,
    type: "other",
  };
}

function partitionSections(blocks: PreparedBlock[]) {
  const sections: SectionDraft[] = [];
  let current: SectionDraft | null = null;

  for (const block of blocks) {
    const header = detectSectionHeader(block.cleanedText, block);
    if (header) {
      if (current) {
        sections.push(current);
      }
      current = {
        title: header.title,
        type: header.type,
        headerBlock: block,
        blocks: [],
      };
      continue;
    }

    if (!current) {
      current = {
        title: "Other",
        type: "other",
        blocks: [],
      };
    }

    current.blocks.push(block);
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripBullet(line: string) {
  return line.replace(/^(?:[-*+]|[0-9]+[.)]|[a-z][.)]|[\u2022])\s*/i, "").trim();
}

function isBulletLine(line: string) {
  return BULLET_PATTERN.test(line.trim());
}

function looksLikeIdentityLine(block: PreparedBlock) {
  if (block.pageIndex !== 0) return false;
  if (block.bbox.yMin > 280) return false;
  if (wordCount(block.cleanedText) > 8) return false;
  if (/[.@]/.test(block.cleanedText)) return false;
  return isHeaderLikeText(block.cleanedText);
}

function gapThreshold(previous: PreparedBlock) {
  const blockHeight = Math.max(1, previous.bbox.yMax - previous.bbox.yMin);
  return Math.max(18, blockHeight * 1.3);
}

function shouldStartNewRun(current: PreparedBlock[], candidate: PreparedBlock) {
  const previous = current[current.length - 1];
  if (!previous) return false;
  if (candidate.pageIndex !== previous.pageIndex) return true;

  const currentLines = splitLines(previous.cleanedText);
  const candidateLines = splitLines(candidate.cleanedText);
  const currentIsList = currentLines.every(isBulletLine);
  const candidateIsList = candidateLines.every(isBulletLine);
  if (currentIsList !== candidateIsList) return true;

  const verticalGap = candidate.bbox.yMin - previous.bbox.yMax;
  if (verticalGap > gapThreshold(previous)) return true;

  const horizontalShift = Math.abs(candidate.bbox.xMin - previous.bbox.xMin);
  if (horizontalShift > Math.max(32, (previous.bbox.xMax - previous.bbox.xMin) * 0.25)) return true;

  return false;
}

export function groupBlocksIntoRuns(input: PreparedBlock[] | NormalizedOcrBlock[]) {
  const blocks =
    input.length > 0 && "cleanedText" in input[0]
      ? (input as PreparedBlock[])
      : prepareBlocks(input as NormalizedOcrBlock[]);

  const runs: GroupedRun[] = [];
  let current: PreparedBlock[] = [];

  const pushRun = () => {
    if (!current.length) return;
    const kind: RunKind = current.every((block) => splitLines(block.cleanedText).every(isBulletLine)) ? "list" : "paragraph";
    const lines =
      kind === "list"
        ? current.flatMap((block) => splitLines(block.cleanedText).map(stripBullet).filter(Boolean))
        : current.flatMap((block) => splitLines(block.cleanedText));
    const text = kind === "list" ? lines.join("\n") : lines.join(" ");
    const trace = buildSourceTraceFromBlocks(current);
    runs.push({
      id: `run-${runs.length + 1}-${current[0].id}`,
      kind,
      text: cleanSemanticText(text),
      lines: kind === "list" ? lines : [cleanSemanticText(text)],
      blocks: [...current],
      startY: current[0].bbox.yMin,
      endY: current[current.length - 1].bbox.yMax,
      firstPageIndex: current[0].pageIndex,
      ...trace,
    });
    current = [];
  };

  for (const block of blocks) {
    if (!current.length) {
      current = [block];
      continue;
    }

    if (shouldStartNewRun(current, block)) {
      pushRun();
      current = [block];
      continue;
    }

    current.push(block);
  }

  pushRun();
  return runs.filter((run) => run.text);
}

function findDateRange(text: string): DateRangeMatch | null {
  const match = text.match(DATE_RANGE_PATTERN);
  if (!match) return null;

  return {
    startDate: cleanSemanticText(match[1]),
    endDate: cleanSemanticText(match[2]),
    dateText: cleanSemanticText(match[0]),
  };
}

function extractSingleValue(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  return match?.[1] ? cleanSemanticText(match[1]) : "";
}

function inferLinkLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("linkedin")) return "LinkedIn";
  if (normalized.includes("github")) return "GitHub";
  if (normalized.includes("facebook")) return "Facebook";
  if (normalized.includes("portfolio")) return "Portfolio";
  return undefined;
}

function extractLinks(text: string) {
  return uniqueStrings(text.match(URL_PATTERN) ?? []).map((url) => ({
    url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    label: inferLinkLabel(url),
  }));
}

function uniqueLinks(links: SemanticLink[]) {
  const seen = new Set<string>();
  const result: SemanticLink[] = [];

  for (const link of links) {
    const key = link.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(link);
  }

  return result;
}

function containsKeyword(text: string, keywords: string[]) {
  const normalized = normalizeKey(text).toLowerCase();
  return keywords.some((keyword) => normalized.includes(normalizeKey(keyword).toLowerCase()));
}

function isLikelyPhone(text: string) {
  const matches = text.match(PHONE_PATTERN) ?? [];
  return matches.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 12;
  });
}

function extractPhone(text: string) {
  const matches = text.match(PHONE_PATTERN) ?? [];
  for (const candidate of matches) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 12) {
      return cleanSemanticText(candidate);
    }
  }
  return "";
}

function isLikelyAddress(text: string) {
  return containsKeyword(text, ADDRESS_KEYWORDS);
}

function isLikelyContactLink(text: string) {
  return /(linkedin|github|facebook|portfolio|behance|dribbble|www\.|https?:\/\/)/i.test(text);
}

export function extractContactInfo(input: PreparedBlock[] | NormalizedOcrBlock[]) {
  const blocks =
    input.length > 0 && "cleanedText" in input[0]
      ? (input as PreparedBlock[])
      : prepareBlocks(input as NormalizedOcrBlock[]);
  const sections = partitionSections(blocks);
  const contactSections = sections.filter((section) => section.type === "contact_info");
  const topRegionBlocks = blocks.filter((block) => block.pageIndex === 0 && block.bbox.yMin <= 420);
  const prioritized = contactSections.flatMap((section) => section.blocks);
  const scanBlocks = prioritized.length > 0 ? prioritized : topRegionBlocks;

  const accumulator: ContactAccumulator = {
    email: "",
    phone: "",
    address: "",
    links: [],
    sourceBlockIds: new Set<string>(),
    pageIndexes: new Set<number>(),
    otherLines: [],
  };

  for (const block of scanBlocks) {
    const text = block.cleanedText;
    if (!text || looksLikeIdentityLine(block)) continue;

    const emails = text.match(EMAIL_PATTERN) ?? [];
    const urls = extractLinks(text);
    const phone = extractPhone(text);
    const isAddress = isLikelyAddress(text);

    if (emails.length || urls.length || phone || isAddress) {
      accumulator.sourceBlockIds.add(block.id);
      accumulator.pageIndexes.add(block.pageIndex);
    }

    const primaryEmail = emails[0];
    if (!accumulator.email && primaryEmail) {
      accumulator.email = cleanSemanticText(primaryEmail);
      continue;
    }

    if (!accumulator.phone && phone) {
      accumulator.phone = phone;
      continue;
    }

    if (urls.length) {
      accumulator.links.push(...urls);
      continue;
    }

    if (!accumulator.address && isAddress) {
      accumulator.address = text;
      continue;
    }

    if (prioritized.length > 0) {
      accumulator.otherLines.push(text);
    }
  }

  return {
    email: accumulator.email,
    phone: accumulator.phone,
    address: accumulator.address,
    links: uniqueLinks(accumulator.links),
    sourceBlockIds: Array.from(accumulator.sourceBlockIds),
    pageIndexes: Array.from(accumulator.pageIndexes).sort((left, right) => left - right),
    otherLines: uniqueStrings(accumulator.otherLines),
  };
}

function buildContactOutput(contactInfo: ReturnType<typeof extractContactInfo>): SemanticContact {
  return {
    email: contactInfo.email,
    phone: contactInfo.phone,
    address: contactInfo.address,
    links: contactInfo.links,
    sourceBlockIds: contactInfo.sourceBlockIds,
    pageIndexes: contactInfo.pageIndexes,
  };
}

function runHeight(run: GroupedRun) {
  return Math.max(1, run.endY - run.startY);
}

function splitByCommonSeparators(text: string) {
  return text
    .split(/[\n,;/|]+/g)
    .map((part) => cleanSemanticText(part))
    .filter(Boolean);
}

function normalizeTechToken(token: string) {
  return token.replace(/\s+/g, " ").trim();
}

function looksLikeTechToken(token: string) {
  const normalized = normalizeTechToken(token).toLowerCase();
  if (!normalized) return false;
  if (TECH_KEYWORDS.includes(normalized)) return true;
  return TECH_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function extractTechStack(textOrRuns: string | Array<{ text: string }>) {
  const sourceText =
    typeof textOrRuns === "string" ? textOrRuns : textOrRuns.map((run) => run.text).filter(Boolean).join("\n");
  const cleaned = cleanSemanticText(sourceText);
  if (!cleaned) return [];

  const candidates = splitByCommonSeparators(cleaned)
    .flatMap((part) => part.split(/\s+-\s+/g))
    .map(normalizeTechToken)
    .filter(Boolean);

  const techTokens = candidates.filter(looksLikeTechToken);
  return uniqueStrings(techTokens);
}

function techDensity(text: string) {
  const tokens = splitByCommonSeparators(text);
  if (!tokens.length) return 0;
  const techCount = tokens.filter(looksLikeTechToken).length;
  return techCount / tokens.length;
}

function splitDescriptionAndTech(text: string) {
  const cleaned = cleanSemanticText(text);
  if (!cleaned) {
    return { description: "", techStack: [] as string[] };
  }

  const markerMatch = cleaned.match(
    /(tech(?:nology)?(?: stack)?|cong nghe|stack|su dung|technologies?)\s*[:\-]\s*(.+)$/i,
  );
  if (markerMatch) {
    return {
      description: cleanSemanticText(cleaned.slice(0, markerMatch.index).replace(/[:\-]\s*$/, "")),
      techStack: extractTechStack(markerMatch[2]),
    };
  }

  const techStack = extractTechStack(cleaned);
  if (techStack.length >= 3 && techDensity(cleaned) >= 0.55) {
    return { description: "", techStack };
  }

  return { description: cleaned, techStack };
}

function isLikelySkillHeading(text: string) {
  const cleaned = cleanSemanticText(text);
  if (!cleaned || wordCount(cleaned) > 4) return false;
  return /:$/.test(cleaned) || isHeaderLikeText(cleaned);
}

function isPotentialItemAnchor(sectionType: SemanticSectionType, run: GroupedRun) {
  if (run.kind === "list") return false;
  if (wordCount(run.text) > 12) return false;
  if (/[.!?]$/.test(run.text)) return false;

  if (sectionType === "education") {
    return containsKeyword(run.text, SCHOOL_KEYWORDS) || containsKeyword(run.text, DEGREE_KEYWORDS) || isHeaderLikeText(run.text);
  }

  if (sectionType === "experience") {
    return containsKeyword(run.text, ROLE_KEYWORDS) || containsKeyword(run.text, COMPANY_KEYWORDS) || isHeaderLikeText(run.text);
  }

  if (sectionType === "project") {
    return /project|du an/i.test(run.text) || isHeaderLikeText(run.text);
  }

  if (sectionType === "certification") {
    return containsKeyword(run.text, CERTIFICATION_KEYWORDS) || isHeaderLikeText(run.text);
  }

  if (sectionType === "language") {
    return containsKeyword(run.text, LANGUAGE_NAMES) || isHeaderLikeText(run.text);
  }

  return isHeaderLikeText(run.text);
}

function clusterRunsForTypedSection(sectionType: SemanticSectionType, runs: GroupedRun[]) {
  const clusters: GroupedRun[][] = [];
  let current: GroupedRun[] = [];

  const pushCurrent = () => {
    if (!current.length) return;
    clusters.push(current);
    current = [];
  };

  for (const run of runs) {
    if (!current.length) {
      current = [run];
      continue;
    }

    const previous = current[current.length - 1];
    const verticalGap = run.startY - previous.endY;
    const repeatedDate = Boolean(findDateRange(run.text) && current.some((entry) => Boolean(findDateRange(entry.text))));
    const shouldBreak =
      (isPotentialItemAnchor(sectionType, run) && (current.length >= 2 || repeatedDate)) ||
      (verticalGap > Math.max(24, runHeight(previous) * 1.7) && isPotentialItemAnchor(sectionType, run)) ||
      repeatedDate;

    if (shouldBreak) {
      pushCurrent();
      current = [run];
      continue;
    }

    current.push(run);
  }

  pushCurrent();
  return clusters;
}

function firstMeaningfulLine(lines: string[]) {
  return lines.find(Boolean) ?? "";
}

function collectListHighlights(runs: GroupedRun[]) {
  return uniqueStrings(
    runs
      .filter((run) => run.kind === "list")
      .flatMap((run) => run.lines.map(stripBullet))
      .filter(Boolean),
  );
}

function collectTraceFromRuns(runs: GroupedRun[]) {
  const ids = uniqueStrings(runs.flatMap((run) => run.sourceBlockIds));
  const pages = Array.from(new Set(runs.flatMap((run) => run.pageIndexes))).sort((left, right) => left - right);
  return {
    sourceBlockIds: ids,
    pageIndexes: pages,
  };
}

function removeUsedLines(lines: string[], usedLines: string[]) {
  const used = new Set(usedLines.map((line) => line.toLowerCase()));
  return lines.filter((line) => !used.has(line.toLowerCase()));
}

export function parseEducationSection(runs: GroupedRun[]) {
  const items = clusterRunsForTypedSection("education", runs)
    .map((cluster) => {
      const lines = uniqueStrings(cluster.flatMap((run) => (run.kind === "list" ? run.lines : splitLines(run.text))));
      if (!lines.length) return null;

      const institution = lines.find((line) => containsKeyword(line, SCHOOL_KEYWORDS)) ?? firstMeaningfulLine(lines);
      const degreeLine = lines.find((line) => line !== institution && containsKeyword(line, DEGREE_KEYWORDS)) ?? "";
      const fieldOfStudy = extractSingleValue(/(?:major|field(?: of study)?|chuyen nganh)\s*[:\-]?\s*(.+)$/i, lines.join(" | "));
      const gpa = extractSingleValue(/\bGPA\b\s*[:\-]?\s*([A-Z0-9./, ]+)/i, lines.join(" | "));
      const dateRange = lines.map(findDateRange).find(Boolean) ?? null;
      const usedLines = [institution, degreeLine, gpa && lines.find((line) => /\bGPA\b/i.test(line))].filter(Boolean) as string[];
      const description = cleanSemanticText(removeUsedLines(lines, usedLines).join(" "));
      const trace = collectTraceFromRuns(cluster);

      if (!institution && !degreeLine && !description) return null;

      return {
        type: "education",
        institution,
        degree: degreeLine,
        fieldOfStudy,
        gpa,
        startDate: dateRange?.startDate ?? "",
        endDate: dateRange?.endDate ?? "",
        dateText: dateRange?.dateText ?? "",
        description,
        ...trace,
      } satisfies SemanticEducationItem;
    })
    .filter(Boolean) as SemanticEducationItem[];

  return items;
}

function isLikelyCompany(text: string) {
  return containsKeyword(text, COMPANY_KEYWORDS);
}

function isLikelyRole(text: string) {
  return containsKeyword(text, ROLE_KEYWORDS);
}

function splitHeadlineRoleCompany(line: string) {
  const atMatch = line.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return {
      position: cleanSemanticText(atMatch[1]),
      company: cleanSemanticText(atMatch[2]),
    };
  }

  const dashParts = line.split(/\s[-|@]\s/).map(cleanSemanticText).filter(Boolean);
  if (dashParts.length === 2) {
    const [left, right] = dashParts;
    if (isLikelyRole(left) || isLikelyCompany(right)) {
      return { position: left, company: right };
    }
    if (isLikelyCompany(left) || isLikelyRole(right)) {
      return { position: right, company: left };
    }
  }

  return {
    position: "",
    company: "",
  };
}

export function parseExperienceSection(runs: GroupedRun[]) {
  const items = clusterRunsForTypedSection("experience", runs)
    .map((cluster) => {
      const paragraphLines = uniqueStrings(cluster.flatMap((run) => splitLines(run.text)));
      const shortLines = paragraphLines.filter((line) => wordCount(line) <= 10 && !findDateRange(line));
      const headline = shortLines[0] ?? "";
      const secondary = shortLines[1] ?? "";
      const splitHeadline = splitHeadlineRoleCompany(headline);
      const dateRange = paragraphLines.map(findDateRange).find(Boolean) ?? null;
      const location = paragraphLines.find(
        (line) => line !== headline && line !== secondary && /,\s*[A-Za-z]/.test(line) && !findDateRange(line),
      ) ?? "";

      let position = splitHeadline.position;
      let company = splitHeadline.company;

      if (!position && !company) {
        if (isLikelyCompany(headline) && secondary) {
          company = headline;
          position = secondary;
        } else if (isLikelyRole(headline) && secondary) {
          position = headline;
          company = secondary;
        } else {
          position = headline;
          company = secondary;
        }
      }

      const highlights = collectListHighlights(cluster);
      const descriptionText = cleanSemanticText(
        paragraphLines
          .filter((line) => ![headline, secondary, location, dateRange?.dateText ?? ""].includes(line))
          .join(" "),
      );
      const descriptionSplit = splitDescriptionAndTech(descriptionText);
      const techStack = uniqueStrings([...extractTechStack(highlights.join(" ")), ...descriptionSplit.techStack]);
      const trace = collectTraceFromRuns(cluster);

      if (!position && !company && !descriptionSplit.description && !highlights.length) return null;

      return {
        type: "experience",
        company,
        position,
        location,
        startDate: dateRange?.startDate ?? "",
        endDate: dateRange?.endDate ?? "",
        dateText: dateRange?.dateText ?? "",
        description: descriptionSplit.description,
        highlights,
        techStack,
        ...trace,
      } satisfies SemanticExperienceItem;
    })
    .filter(Boolean) as SemanticExperienceItem[];

  return items;
}

export function parseProjectSection(runs: GroupedRun[]) {
  const items = clusterRunsForTypedSection("project", runs)
    .map((cluster) => {
      const lines = uniqueStrings(cluster.flatMap((run) => splitLines(run.text)));
      const headline = lines.find((line) => !findDateRange(line)) ?? "";
      const dateRange = lines.map(findDateRange).find(Boolean) ?? null;
      const role = extractSingleValue(/(?:role|vai tro)\s*[:\-]?\s*(.+)$/i, lines.join(" | "));
      const links = uniqueLinks(lines.flatMap(extractLinks));
      const highlights = collectListHighlights(cluster);
      const descriptionSource = lines.filter((line) => line !== headline && line !== dateRange?.dateText).join(" ");
      const descriptionSplit = splitDescriptionAndTech(descriptionSource);
      const techStack = uniqueStrings([...descriptionSplit.techStack, ...extractTechStack(highlights.join(" "))]);
      const trace = collectTraceFromRuns(cluster);

      if (!headline && !descriptionSplit.description && !highlights.length && !techStack.length) return null;

      return {
        type: "project",
        name: headline,
        role,
        startDate: dateRange?.startDate ?? "",
        endDate: dateRange?.endDate ?? "",
        dateText: dateRange?.dateText ?? "",
        description: descriptionSplit.description,
        highlights,
        techStack,
        links,
        ...trace,
      } satisfies SemanticProjectItem;
    })
    .filter(Boolean) as SemanticProjectItem[];

  return items;
}

function parseCertificationSection(runs: GroupedRun[]) {
  const items = clusterRunsForTypedSection("certification", runs)
    .map((cluster) => {
      const lines = uniqueStrings(cluster.flatMap((run) => splitLines(run.text)));
      const dateRange = lines.map(findDateRange).find(Boolean) ?? null;
      const dateLine = lines.find((line) => /(?:issued|earned|obtained|date|nam)\b/i.test(line) || Boolean(findDateRange(line))) ?? "";
      const name = lines.find((line) => !Boolean(findDateRange(line))) ?? "";
      const issuer = lines.find(
        (line) => line !== name && line !== dateLine && !Boolean(findDateRange(line)) && wordCount(line) <= 10,
      ) ?? "";
      const credentialId = extractSingleValue(/(?:credential id|ma|id)\s*[:\-]?\s*(.+)$/i, lines.join(" | "));
      const trace = collectTraceFromRuns(cluster);

      if (!name && !issuer && !dateLine) return null;

      return {
        type: "certification",
        name,
        issuer,
        date: dateRange?.dateText ?? dateLine,
        credentialId,
        ...trace,
      } satisfies SemanticCertificationItem;
    })
    .filter(Boolean) as SemanticCertificationItem[];

  return items;
}

function parseLanguageLine(line: string, trace: SemanticSourceTrace): SemanticLanguageItem | null {
  const cleaned = cleanSemanticText(line);
  if (!cleaned) return null;

  const parts = cleaned.split(/\s[-:|]\s/).map(cleanSemanticText).filter(Boolean);
  const head = parts[0] ?? cleaned;
  if (!containsKeyword(head, LANGUAGE_NAMES) && wordCount(head) > 4) {
    return null;
  }

  const scoreMatch = cleaned.match(/\b(?:ielts|toeic|toefl)\b[:\s-]*([A-Z0-9.]+)/i);
  const score = scoreMatch?.[1] ? cleanSemanticText(scoreMatch[1]) : "";
  const levelMatch = cleaned.match(/(beginner|intermediate|advanced|native|basic|professional|fluent)/i);
  const level = parts[1] ?? (levelMatch?.[1] ? cleanSemanticText(levelMatch[1]) : "");

  return {
    type: "language",
    name: head,
    level,
    score,
    ...trace,
  };
}

function parseLanguageSection(runs: GroupedRun[]) {
  const items: SemanticLanguageItem[] = [];

  for (const run of runs) {
    const runTrace = collectTraceFromRuns([run]);
    const lines = run.kind === "list" ? run.lines : splitLines(run.text);
    for (const line of lines) {
      const parsed = parseLanguageLine(line, runTrace);
      if (parsed) {
        items.push(parsed);
      }
    }
  }

  return items;
}

function parseSkillSection(runs: GroupedRun[]) {
  const items: SemanticItem[] = [];

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    const next = runs[index + 1];
    const runTrace = collectTraceFromRuns([run]);

    if (/:\s*/.test(run.text)) {
      const [groupName, ...rest] = run.text.split(":");
      const techStack = extractTechStack(rest.join(":"));
      if (techStack.length > 0) {
        items.push({
          type: "skill_group",
          groupName: cleanSemanticText(groupName) || "Skills",
          skills: techStack,
          ...runTrace,
        } satisfies SemanticSkillGroupItem);
        continue;
      }
    }

    if (isLikelySkillHeading(run.text) && next && techDensity(next.text) >= 0.5) {
      const trace = collectTraceFromRuns([run, next]);
      items.push({
        type: "skill_group",
        groupName: cleanSemanticText(run.text.replace(/:$/, "")) || "Skills",
        skills: extractTechStack(next.text),
        ...trace,
      } satisfies SemanticSkillGroupItem);
      index += 1;
      continue;
    }

    const skills = extractTechStack(run.text);
    if (skills.length >= 2 || techDensity(run.text) >= 0.5) {
      items.push({
        type: "skill_group",
        groupName: "Skills",
        skills,
        ...runTrace,
      } satisfies SemanticSkillGroupItem);
      continue;
    }

    if (run.kind === "list") {
      items.push({
        type: "list",
        items: run.lines.map(stripBullet).filter(Boolean),
        ...runTrace,
      } satisfies SemanticListItem);
      continue;
    }

    items.push({
      type: "paragraph",
      text: run.text,
      ...runTrace,
    } satisfies SemanticParagraphItem);
  }

  return items;
}

function buildGenericItems(runs: GroupedRun[], sectionType: SemanticSectionType = "other") {
  const items: SemanticItem[] = [];

  for (const run of runs) {
    const trace = collectTraceFromRuns([run]);
    if (run.kind === "list") {
      items.push({
        type: "list",
        items: run.lines.map(stripBullet).filter(Boolean),
        ...trace,
      } satisfies SemanticListItem);
      continue;
    }

    if (techDensity(run.text) >= 0.6 && extractTechStack(run.text).length >= 2) {
      items.push({
        type: "skill_group",
        groupName: "Skills",
        skills: extractTechStack(run.text),
        ...trace,
      } satisfies SemanticSkillGroupItem);
      continue;
    }

    if (sectionType === "other") {
      items.push({
        type: "other",
        text: run.text,
        ...trace,
      } satisfies SemanticOtherItem);
      continue;
    }

    items.push({
      type: "paragraph",
      text: run.text,
      ...trace,
    } satisfies SemanticParagraphItem);
  }

  return items;
}

function buildContactSectionItem(section: SectionDraft, contact: ReturnType<typeof extractContactInfo>) {
  const runs = groupBlocksIntoRuns(section.blocks);
  const trace = buildSourceTraceFromBlocks(section.blocks);
  const sectionLines = uniqueStrings(runs.flatMap((run) => (run.kind === "list" ? run.lines : splitLines(run.text))));
  const otherLines = sectionLines.filter(
    (line) =>
      !(line.match(EMAIL_PATTERN)?.length) &&
      !isLikelyPhone(line) &&
      !isLikelyContactLink(line) &&
      !isLikelyAddress(line),
  );

  if (!contact.email && !contact.phone && !contact.address && !contact.links.length && !otherLines.length) {
    return null;
  }

  return {
    type: "contact_info",
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    address: contact.address || undefined,
    links: contact.links.length ? contact.links : undefined,
    otherLines: otherLines.length ? otherLines : undefined,
    ...trace,
  } satisfies SemanticContactInfoItem;
}

function buildSectionItems(section: SectionDraft, contact: ReturnType<typeof extractContactInfo>) {
  if (!section.blocks.length) return [] as SemanticItem[];

  if (section.type === "contact_info") {
    const contactItem = buildContactSectionItem(section, contact);
    return contactItem ? [contactItem] : [];
  }

  const runs = groupBlocksIntoRuns(section.blocks);
  if (!runs.length) return [];

  if (section.type === "skill_group") {
    return parseSkillSection(runs);
  }

  if (section.type === "education") {
    const items = parseEducationSection(runs);
    return items.length ? items : buildGenericItems(runs, section.type);
  }

  if (section.type === "experience") {
    const items = parseExperienceSection(runs);
    return items.length ? items : buildGenericItems(runs, section.type);
  }

  if (section.type === "project") {
    const items = parseProjectSection(runs);
    return items.length ? items : buildGenericItems(runs, section.type);
  }

  if (section.type === "certification") {
    const items = parseCertificationSection(runs);
    return items.length ? items : buildGenericItems(runs, section.type);
  }

  if (section.type === "language") {
    const items = parseLanguageSection(runs);
    return items.length ? items : buildGenericItems(runs, section.type);
  }

  return buildGenericItems(runs, section.type);
}

function createSection(section: SectionDraft, contact: ReturnType<typeof extractContactInfo>): SemanticSection | null {
  const nonIdentityBlocks =
    section.type === "other" ? section.blocks.filter((block) => !looksLikeIdentityLine(block)) : section.blocks;
  const sourceBlocks = section.headerBlock ? [section.headerBlock, ...nonIdentityBlocks] : nonIdentityBlocks;
  const items = buildSectionItems({ ...section, blocks: nonIdentityBlocks }, contact).filter((item) => {
    if (item.type === "paragraph") return Boolean(item.text);
    if (item.type === "list") return item.items.length > 0;
    if (item.type === "skill_group") return item.skills.length > 0;
    if (item.type === "contact_info") {
      return Boolean(item.email || item.phone || item.address || item.links?.length || item.otherLines?.length);
    }
    if (item.type === "education") {
      return Boolean(item.institution || item.degree || item.fieldOfStudy || item.description);
    }
    if (item.type === "experience") {
      return Boolean(item.company || item.position || item.description || item.highlights.length);
    }
    if (item.type === "project") {
      return Boolean(item.name || item.description || item.highlights.length || item.techStack.length);
    }
    if (item.type === "certification") {
      return Boolean(item.name || item.issuer || item.date);
    }
    if (item.type === "language") {
      return Boolean(item.name || item.level || item.score);
    }
    return Boolean(item.text);
  });

  if (!items.length) return null;

  return {
    title: section.title || "Other",
    type: section.type,
    items,
    ...buildSourceTraceFromBlocks(sourceBlocks),
  };
}

export function transformOcrToSemanticJson(input: SemanticInput): SemanticCvJson {
  const preparedBlocks = prepareBlocks(input);
  const contactInfo = extractContactInfo(preparedBlocks);
  const contact = buildContactOutput(contactInfo);
  const sections = partitionSections(preparedBlocks)
    .map((section) => createSection(section, contactInfo))
    .filter(Boolean) as SemanticSection[];

  return {
    contact,
    sections,
  };
}
