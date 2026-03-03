/**
 * Normalize a Vietnamese string into a URL‑safe slug.
 *
 * "CÔNG TY TNHH KHÁCH SẠN 34" → "cong-ty-tnhh-khach-san-34"
 */
export function toSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove non‑alpha
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse dashes
}
