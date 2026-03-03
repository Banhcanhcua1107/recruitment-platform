/**
 * Vietnamese-safe text normalization & tokenization.
 * Prevents junk tokens like "chi", "minh", "van", "nang" from ever appearing.
 */

import { VN_STOPWORDS, EN_STOPWORDS, JUNK_TOKENS } from "./stopwords";

/* ── Diacritics map for Vietnamese ── */
const DIACRITICS_MAP: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ằ: "a", ắ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ầ: "a", ấ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ề: "e", ế: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ồ: "o", ố: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ờ: "o", ớ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ừ: "u", ứ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
  // uppercase
  À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a",
  Ă: "a", Ằ: "a", Ắ: "a", Ẳ: "a", Ẵ: "a", Ặ: "a",
  Â: "a", Ầ: "a", Ấ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
  È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e",
  Ê: "e", Ề: "e", Ế: "e", Ể: "e", Ễ: "e", Ệ: "e",
  Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
  Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o",
  Ô: "o", Ồ: "o", Ố: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
  Ơ: "o", Ờ: "o", Ớ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
  Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u",
  Ư: "u", Ừ: "u", Ứ: "u", Ử: "u", Ữ: "u", Ự: "u",
  Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y",
  Đ: "d",
};

/** Remove Vietnamese diacritics → ASCII-safe lowercase */
export function removeDiacritics(str: string): string {
  return str
    .split("")
    .map((ch) => DIACRITICS_MAP[ch] ?? ch)
    .join("")
    .toLowerCase();
}

/** Lowercase + strip punctuation + collapse whitespace */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.]/gu, " ")  // keep letters, digits, +, #, .
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Multi-word location entities ── */
const LOCATION_ENTITIES: [RegExp, string][] = [
  [/h[oồ]\s*ch[ií]\s*minh/gi, "ho chi minh"],
  [/tp\.?\s*hcm/gi, "ho chi minh"],
  [/tphcm/gi, "ho chi minh"],
  [/h[àa]\s*n[oộ]i/gi, "ha noi"],
  [/[đd][àa]\s*n[aẵ]ng/gi, "da nang"],
  [/h[aả]i\s*ph[oò]ng/gi, "hai phong"],
  [/c[aầ]n\s*th[oơ]/gi, "can tho"],
  [/b[iì]nh\s*d[uư][oơ]ng/gi, "binh duong"],
  [/[đd][oồ]ng\s*nai/gi, "dong nai"],
  [/kh[aá]nh\s*h[oò]a/gi, "khanh hoa"],
  [/to[aà]n\s*qu[oố]c/gi, "toan quoc"],
];

/** Known location names (ascii) for filtering out of skill tags */
const LOCATION_PARTS = new Set([
  "ho", "chi", "minh", "ha", "noi", "da", "nang", "hai", "phong",
  "can", "tho", "binh", "duong", "dong", "nai", "khanh", "hoa",
  "toan", "quoc", "hcm", "tphcm", "hn", "sg", "tp",
]);

/** Build a combined stopword set (all lowercased, no-diacritics) */
const ALL_STOPWORDS = new Set<string>([
  ...VN_STOPWORDS.map(removeDiacritics),
  ...EN_STOPWORDS,
  ...JUNK_TOKENS,
  ...LOCATION_PARTS,
]);

/**
 * Extract multi-word location entities from text.
 * Returns the detected normalized city names.
 */
export function extractLocations(text: string): string[] {
  const found: string[] = [];

  // Multi-word regex patterns
  for (const [re, city] of LOCATION_ENTITIES) {
    if (re.test(text)) {
      if (!found.includes(city)) found.push(city);
    }
  }

  // Single-token abbreviation fallbacks (case-insensitive)
  const lower = text.toLowerCase();
  const abbrevMap: Record<string, string> = {
    hcm: "ho chi minh",
    tphcm: "ho chi minh",
    sg: "ho chi minh",
    hn: "ha noi",
  };
  for (const [abbr, city] of Object.entries(abbrevMap)) {
    // Match as whole word (surrounded by non-letter boundaries)
    const re = new RegExp(`\\b${abbr}\\b`, "i");
    if (re.test(lower) && !found.includes(city)) {
      found.push(city);
    }
  }

  return found;
}

/** Check if a token is purely numeric */
function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

/**
 * Tokenize Vietnamese/English text into meaningful tokens.
 * Filters stopwords, junk, short tokens, numeric-only tokens, and location sub-parts.
 */
export function tokenizeVi(text: string): string[] {
  const normalized = normalizeText(text);
  const ascii = removeDiacritics(normalized);

  // Split on whitespace + common delimiters
  const raw = ascii.split(/[\s,;|/()]+/);

  const tokens: string[] = [];
  for (const token of raw) {
    // Strip trailing dots
    const t = token.replace(/\.+$/, "");
    if (t.length <= 2) continue;       // ignore 1-2 char tokens
    if (isNumeric(t)) continue;         // ignore pure numbers
    if (ALL_STOPWORDS.has(t)) continue; // ignore stopwords + junk + location parts
    if (!tokens.includes(t)) tokens.push(t);
  }
  return tokens;
}

/* ── Synonym map for skill matching ── */
const SYNONYM_PAIRS: [string, string][] = [
  ["javascript", "js"],
  ["typescript", "ts"],
  ["reactjs", "react"],
  ["react.js", "react"],
  ["vuejs", "vue"],
  ["vue.js", "vue"],
  ["angularjs", "angular"],
  ["angular.js", "angular"],
  ["nodejs", "node"],
  ["node.js", "node"],
  ["nextjs", "next"],
  ["next.js", "next"],
  ["nuxtjs", "nuxt"],
  ["expressjs", "express"],
  ["python3", "python"],
  ["postgresql", "postgres"],
  ["csharp", "c#"],
  ["cplusplus", "c++"],
  ["tailwindcss", "tailwind"],
  ["mongodb", "mongo"],
  ["frontend", "front-end"],
  ["backend", "back-end"],
  ["fullstack", "full-stack"],
  ["mysql", "sql"],
  ["mssql", "sql"],
  ["devops", "dev-ops"],
  ["dotnet", ".net"],
  ["asp.net", ".net"],
];

/** Build bidirectional synonym lookup */
const SYNONYM_MAP = new Map<string, Set<string>>();
for (const [a, b] of SYNONYM_PAIRS) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (!SYNONYM_MAP.has(la)) SYNONYM_MAP.set(la, new Set());
  if (!SYNONYM_MAP.has(lb)) SYNONYM_MAP.set(lb, new Set());
  SYNONYM_MAP.get(la)!.add(lb);
  SYNONYM_MAP.get(lb)!.add(la);
}

/** Check if two skill tokens are synonyms */
export function areSynonyms(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return true;
  return SYNONYM_MAP.get(la)?.has(lb) ?? false;
}

/** Get all synonym variants for a token */
export function getSynonyms(token: string): string[] {
  const lt = token.toLowerCase();
  const syns = SYNONYM_MAP.get(lt);
  return syns ? [lt, ...syns] : [lt];
}

/** Check if a token looks like a valid skill (not junk) for display */
export function isDisplayableSkill(token: string): boolean {
  const t = token.toLowerCase().trim();
  if (t.length <= 2) return false;
  if (isNumeric(t)) return false;
  if (ALL_STOPWORDS.has(removeDiacritics(t))) return false;
  if (LOCATION_PARTS.has(removeDiacritics(t))) return false;
  return true;
}
